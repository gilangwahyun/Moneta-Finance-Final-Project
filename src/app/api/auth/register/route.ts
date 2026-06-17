// ─── POST /api/auth/register ────────────────────────────
// Creates a new user with hashed password, copies default
// categories to their account, and returns JWT.
// Rate-limited: 5 req/60min per IP.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { hashPassword } from '@/lib/auth/password';
import { signToken } from '@/lib/auth/jwt';
import { AUTH_COOKIE_NAME } from '@/lib/auth/middleware';
import { generateCsrfToken, setCsrfCookie } from '@/lib/auth/csrf';
import { DEFAULT_CATEGORIES } from '@/lib/db/default-categories';
import { randomUUID } from 'crypto';
import { checkRateLimit, getClientIP, rateLimitResponse, REGISTER_IP_LIMIT } from '@/lib/auth/rate-limiter';
import { MIN_USERNAME_LENGTH, MAX_USERNAME_LENGTH, USERNAME_PATTERN } from '@/lib/utils/constants';

export async function POST(request: NextRequest) {
  try {
    // ── Rate limit: IP check (before body parsing) ──────
    const ip = getClientIP(request);
    const ipResult = checkRateLimit(`register:ip:${ip}`, REGISTER_IP_LIMIT);
    if (!ipResult.allowed) {
      console.warn(`[Rate Limit] Register IP blocked: ${ip}`);
      return rateLimitResponse(
        ipResult,
        REGISTER_IP_LIMIT,
        `Terlalu banyak percobaan pendaftaran. Coba lagi dalam ${ipResult.retryAfterSeconds > 60 ? Math.ceil(ipResult.retryAfterSeconds / 60) + ' menit' : ipResult.retryAfterSeconds + ' detik'}.`,
      );
    }

    const { email, username, password } = await request.json();

    // ── Field presence validation ───────────────────────
    if (!email || !username || !password) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Email, username, dan kata sandi wajib diisi.' } },
        { status: 400 },
      );
    }

    // ── Email format validation ─────────────────────────
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const trimmedEmail = email.trim().toLowerCase();

    if (!emailRegex.test(trimmedEmail)) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Format alamat email tidak valid.' } },
        { status: 400 },
      );
    }

    // ── Username validation ─────────────────────────────
    const trimmedUsername = username.trim();

    if (trimmedUsername.length < MIN_USERNAME_LENGTH) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: `Username minimal ${MIN_USERNAME_LENGTH} karakter.` } },
        { status: 400 },
      );
    }

    if (trimmedUsername.length > MAX_USERNAME_LENGTH) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: `Username maksimal ${MAX_USERNAME_LENGTH} karakter.` } },
        { status: 400 },
      );
    }

    if (!USERNAME_PATTERN.test(trimmedUsername)) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Username hanya boleh berisi huruf, angka, dan garis bawah.' } },
        { status: 400 },
      );
    }

    // ── Password validation ─────────────────────────────
    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Kata sandi minimal 6 karakter.' } },
        { status: 400 },
      );
    }

    // ── Uniqueness check (email OR username) ─────────────
    // Single query with OR — returns the conflicting record if any exists.
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email: trimmedEmail }, { username: trimmedUsername }],
      },
      select: { email: true, username: true },
    });

    if (existingUser) {
      const emailConflict = existingUser.email === trimmedEmail;
      const usernameConflict = existingUser.username === trimmedUsername;

      let message = 'Email atau Username sudah terdaftar.';
      if (emailConflict && !usernameConflict) {
        message = 'Alamat email ini sudah digunakan. Coba masuk atau gunakan email lain.';
      } else if (usernameConflict && !emailConflict) {
        message = 'Username ini sudah diambil. Silakan pilih username lain.';
      }

      return NextResponse.json({ success: false, error: { code: 'USER_EXISTS', message } }, { status: 409 });
    }

    // ── Create user + default categories (atomic) ────────
    const passwordHash = await hashPassword(password);

    const user = await prisma.$transaction(async (tx) => {
      // 1. Create the user
      const newUser = await tx.user.create({
        data: { email: trimmedEmail, username: trimmedUsername, passwordHash },
      });

      // 2. Copy all default categories to the new user
      await tx.category.createMany({
        data: DEFAULT_CATEGORIES.map((cat) => ({
          clientId: randomUUID(), // Server-generated clientId for defaults
          name: cat.name,
          type: cat.type,
          icon: cat.icon,
          color: cat.color,
          isDefault: true,
          userId: newUser.id,
          syncStatus: 'SYNCED',
        })),
      });

      return newUser;
    });

    // Sign JWT
    const token = await signToken({ userId: user.id, username: user.username });

    // Build response payload (include email for client-side IndexedDB store)
    const response = NextResponse.json(
      {
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            createdAt: user.createdAt.toISOString(),
            updatedAt: user.updatedAt.toISOString(),
          },
        },
      },
      { status: 201 },
    );

    // Detect actual HTTPS
    const isSecure = request.headers.get('x-forwarded-proto') === 'https' || request.url.startsWith('https://');

    response.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    // Set CSRF cookie (double-submit defense)
    setCsrfCookie(response, generateCsrfToken(), isSecure);

    return response;
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Terjadi kesalahan tak terduga. Silakan coba lagi.' } },
      { status: 500 },
    );
  }
}
