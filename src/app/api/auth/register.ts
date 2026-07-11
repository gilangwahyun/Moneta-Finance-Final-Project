/********** Handler API (POST /api/auth/register) yang membuat user baru dengan kata sandi ter-hash,
 *  menyalin kategori default ke akun mereka, dan mengembalikan token JWT.
 *  Dibatasi rate-limit: 5 req/60menit per IP.
 */

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
import { seedDemoDataForUser } from '@/lib/db/seed-demo-data';

/********** POST /api/auth/register **********/

/**
 * Memproses pendaftaran akun pengguna baru.
 *
 * @param request - NextRequest berisi body JSON (`email`, `username`, dan `password`).
 * @returns NextResponse dengan cookie autentikasi dan data user jika sukses, atau pesan error jika gagal/rate-limited.
 */
export async function POST(request: NextRequest) {
  try {
    /********** 1. Pengecekan Rate Limit per IP (sebelum parsing body). */
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

    const { email, username, password, seedDemoData } = await request.json();

    /********** 2. Validasi Kelengkapan Data. */
    if (!email || !username || !password) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Email, username, dan kata sandi wajib diisi.' } },
        { status: 400 },
      );
    }

    /********** 3. Validasi Format Alamat Email. */
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const trimmedEmail = email.trim().toLowerCase();

    if (!emailRegex.test(trimmedEmail)) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Format alamat email tidak valid.' } },
        { status: 400 },
      );
    }

    /********** 4. Validasi Format Username. */
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

    /********** 5. Validasi Panjang Kata Sandi. */
    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Kata sandi minimal 6 karakter.' } },
        { status: 400 },
      );
    }

    /********** 6. Pengecekan Keunikan Akun (Email ATAU Username). */
    /********** Satu query menggunakan OR — mengembalikan rekod yang konflik jika sudah ada. */
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

    /********** Pembuatan Akun & Kategori Default (Atomik) **********/
    /********** Transaksi atomik untuk membuat user dan kategori default sekaligus. */
    const passwordHash = await hashPassword(password);

    const user = await prisma.$transaction(async (tx) => {
      /********** Buat rekod user baru di database. */
      const newUser = await tx.user.create({
        data: { email: trimmedEmail, username: trimmedUsername, passwordHash },
      });

      /********** Salin semua kategori default ke akun user baru. */
      await tx.category.createMany({
        data: DEFAULT_CATEGORIES.map((cat) => ({
          clientId: randomUUID(), /* ClientId dari server untuk kategori default. */
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
    }, { timeout: 15000 });

    /********** Jika opsi seedDemoData aktif (mode uji/evaluasi), suntikkan data skenario UCD di luar interactive transaction agar tidak timeout di serverless Vercel. */
    if (seedDemoData) {
      await seedDemoDataForUser(user.id, prisma);
    }

    /********** Buat dan tangani penandatanganan token JWT. */
    const token = await signToken({ userId: user.id, username: user.username });

    /********** Susun payload respons (termasuk email untuk penyimpanan IndexedDB sisi klien). */
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

    /********** Deteksi koneksi HTTPS aktual. */
    const isSecure = request.headers.get('x-forwarded-proto') === 'https' || request.url.startsWith('https://');

    response.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, /* 7 hari. */
      path: '/',
    });

    /********** Pasang cookie CSRF sebagai perlindungan double-submit. */
    setCsrfCookie(response, generateCsrfToken(), isSecure);

    return response;
  } catch (error: any) {
    console.error('Register error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan tak terduga. Silakan coba lagi.';
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: errorMessage } },
      { status: 500 },
    );
  }

}
