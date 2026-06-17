// ─── POST /api/auth/login ───────────────────────────────
// Verifies credentials and returns JWT in httpOnly cookie.
// Accepts either email or username as the `identifier` field.
// Rate-limited: 10 req/15min per IP, 20 req/15min per identifier.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { signToken } from "@/lib/auth/jwt";
import { AUTH_COOKIE_NAME } from "@/lib/auth/middleware";
import { generateCsrfToken, setCsrfCookie } from "@/lib/auth/csrf";
import {
  checkRateLimit,
  getClientIP,
  rateLimitResponse,
  LOGIN_IP_LIMIT,
  LOGIN_USERNAME_LIMIT,
} from "@/lib/auth/rate-limiter";

export async function POST(request: NextRequest) {
  try {
    // ── Rate limit: IP check (before body parsing) ──────
    const ip = getClientIP(request);
    const ipResult = checkRateLimit(`login:ip:${ip}`, LOGIN_IP_LIMIT);
    if (!ipResult.allowed) {
      console.warn(`[Rate Limit] Login IP blocked: ${ip}`);
      return rateLimitResponse(
        ipResult,
        LOGIN_IP_LIMIT,
        `Terlalu banyak percobaan masuk. Coba lagi dalam ${ipResult.retryAfterSeconds > 60 ? Math.ceil(ipResult.retryAfterSeconds / 60) + " menit" : ipResult.retryAfterSeconds + " detik"}.`
      );
    }

    const { identifier, password } = await request.json();

    // ── Validation ──────────────────────────────────────
    if (!identifier || !password) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Identitas (email atau username) dan kata sandi wajib diisi." } },
        { status: 400 }
      );
    }

    // ── Rate limit: per-identifier check (after parsing) ─
    // Normalise so "User@Example.com" and "user@example.com" hit the same bucket.
    const normalizedIdentifier = identifier.trim().toLowerCase();
    const identifierResult = checkRateLimit(
      `login:user:${normalizedIdentifier}`,
      LOGIN_USERNAME_LIMIT
    );
    if (!identifierResult.allowed) {
      console.warn(`[Rate Limit] Login identifier blocked: ${normalizedIdentifier}`);
      return rateLimitResponse(
        identifierResult,
        LOGIN_USERNAME_LIMIT,
        `Terlalu banyak percobaan untuk akun ini. Coba lagi dalam ${identifierResult.retryAfterSeconds > 60 ? Math.ceil(identifierResult.retryAfterSeconds / 60) + " menit" : identifierResult.retryAfterSeconds + " detik"}.`
      );
    }

    // ── Find user by email OR username ──────────────────
    // We query both fields so users can log in with either one.
    // Email comparison is case-insensitive (stored lowercase at register time).
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: normalizedIdentifier },
          { username: identifier.trim() },
        ],
      },
    });

    // Generic error — don't reveal whether the account exists
    const invalidCredentialsResponse = NextResponse.json(
      { success: false, error: { code: "INVALID_CREDENTIALS", message: "Email/username atau kata sandi salah." } },
      { status: 401 }
    );

    if (!user) {
      return invalidCredentialsResponse;
    }

    // ── Verify password ─────────────────────────────────
    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return invalidCredentialsResponse;
    }

    // ── Sign JWT ────────────────────────────────────────
    const token = await signToken({ userId: user.id, username: user.username });

    // ── Build response ──────────────────────────────────
    const response = NextResponse.json({
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
    });

    // Detect actual HTTPS (works for LAN/HTTP access in production mode)
    const isSecure =
      request.headers.get("x-forwarded-proto") === "https" ||
      request.url.startsWith("https://");

    response.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    // Set CSRF cookie (double-submit defense)
    setCsrfCookie(response, generateCsrfToken(), isSecure);

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Terjadi kesalahan tak terduga. Silakan coba lagi." } },
      { status: 500 }
    );
  }
}
