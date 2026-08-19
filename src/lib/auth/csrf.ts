//********** START: CSRF Protection **********
//********** Double-submit cookie pattern for CSRF protection.
//**********
//********** How it works:
//********** 1. On login/register, server sets a non-httpOnly CSRF cookie
//********** 2. Client reads cookie and sends value as X-CSRF-Token header
//********** 3. Server validates that cookie value === header value
//**********
//********** This is stateless - no server-side token storage needed.
//********** END: CSRF Protection **********

import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

//********** Constants **********

const CSRF_COOKIE_NAME = "moneta-csrf-token";
const CSRF_HEADER_NAME = "x-csrf-token";

//********** Token Generation **********

/**
 * Generate a cryptographically random CSRF token.
 */
export function generateCsrfToken(): string {
  return randomUUID();
}

//********** Cookie Helpers **********

/**
 * Set the CSRF token cookie on a response.
 * The cookie is NOT httpOnly — the client must read it.
 */
export function setCsrfCookie(
  response: NextResponse,
  token: string,
  isSecure: boolean
): void {
  response.cookies.set(CSRF_COOKIE_NAME, token, {
    httpOnly: false, //********** Client needs to read this
    secure: isSecure,
    sameSite: "strict",
    maxAge: 60 * 60 * 24 * 7, //********** 7 days - matches auth cookie
    path: "/",
  });
}

/**
 * Clear the CSRF cookie (on logout).
 */
export function clearCsrfCookie(
  response: NextResponse,
  isSecure: boolean
): void {
  response.cookies.set(CSRF_COOKIE_NAME, "", {
    httpOnly: false,
    secure: isSecure,
    sameSite: "strict",
    maxAge: 0,
    path: "/",
  });
}

//********** Validation **********

/**
 * Validate the CSRF token by comparing the cookie value
 * against the X-CSRF-Token header value.
 *
 * Returns null if valid, or a NextResponse (403) if invalid.
 *
 * Usage in API route:
 *   const csrfError = validateCsrfToken(request);
 *   if (csrfError) return csrfError;
 */
export function validateCsrfToken(request: NextRequest): NextResponse | null {
  //********** Skip CSRF check for Bearer token auth (no cookies involved)
  const authHeader = request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return null; //********** Bearer token auth - CSRF not applicable
  }

  const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;
  const headerToken = request.headers.get(CSRF_HEADER_NAME);

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "CSRF_VALIDATION_FAILED",
          message: "Invalid or missing CSRF token.",
        },
      },
      { status: 403 }
    );
  }

  return null; //********** Valid
}
