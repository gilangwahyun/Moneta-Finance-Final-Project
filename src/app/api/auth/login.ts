/********** Handler API (POST /api/auth/login) yang memverifikasi kredensial dan mengembalikan token JWT dalam httpOnly cookie.
 *  Menerima email atau username pada field `identifier`.
 *  Dibatasi rate-limit: 10 req/15menit per IP, 20 req/15menit per identifier.
 */

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

/********** POST /api/auth/login **********/

/**
 * Memproses permintaan login pengguna.
 *
 * @param request - NextRequest berisi body JSON (`identifier` dan `password`).
 * @returns NextResponse dengan cookie autentikasi dan data user jika sukses, atau pesan error jika gagal/rate-limited.
 */
export async function POST(request: NextRequest) {
  try {
    /********** 1. Pengecekan Rate Limit per IP (sebelum parsing body). */
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

    /********** 2. Validasi Parameter Input. */
    if (!identifier || !password) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Identitas (email atau username) dan kata sandi wajib diisi." } },
        { status: 400 }
      );
    }

    /********** 3. Pengecekan Rate Limit per Identifier (setelah parsing body). */
    /********** Normalisasi agar karakter huruf besar/kecil masuk ke bucket yang sama. */
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

    /********** Pencarian User & Pembuktian Kredensial **********/
    /********** Cari user berdasarkan email ATAU username (case-insensitive untuk email). */
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: normalizedIdentifier },
          { username: identifier.trim() },
        ],
      },
    });

    /* Error generik — jangan ungkap apakah akun ada atau tidak demi keamanan. */
    const invalidCredentialsResponse = NextResponse.json(
      { success: false, error: { code: "INVALID_CREDENTIALS", message: "Email/username atau kata sandi salah." } },
      { status: 401 }
    );

    if (!user) {
      return invalidCredentialsResponse;
    }

    /********** Verifikasi kecocokan kata sandi dengan hash di DB. */
    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return invalidCredentialsResponse;
    }

    /********** Pembuatan Session & Respons **********/
    /********** Buat dan tangani penandatanganan token JWT. */
    const token = await signToken({ userId: user.id, username: user.username });

    /********** Susun respons JSON yang memuat data user. */
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

    /********** Deteksi koneksi HTTPS aktual (kompatibel untuk akses LAN/HTTP di mode produksi). */
    const isSecure =
      request.headers.get("x-forwarded-proto") === "https" ||
      request.url.startsWith("https://");

    response.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, /* 7 hari. */
      path: "/",
    });

    /********** Pasang cookie CSRF sebagai perlindungan double-submit. */
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
