// ─── POST /api/auth/logout ──────────────────────────────
// Clears the auth and CSRF cookies to end the session.

import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth/middleware";
import { clearCsrfCookie } from "@/lib/auth/csrf";

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ success: true });

  // Detect actual HTTPS
  const isSecure = request.headers.get("x-forwarded-proto") === "https" ||
    request.url.startsWith("https://");

  // Clear the auth cookie by setting it to empty with maxAge 0
  response.cookies.set(AUTH_COOKIE_NAME, "", {
    httpOnly: true,
    secure: isSecure,
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });

  // Clear the CSRF cookie
  clearCsrfCookie(response, isSecure);

  return response;
}
