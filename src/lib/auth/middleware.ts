//********** START: Auth Middleware Helper **********
//********** Extracts and verifies the JWT from the request.
//********** Used by protected API routes.
//********** END: Auth Middleware Helper **********

import { NextRequest } from "next/server";
import { verifyToken, TokenPayload } from "./jwt";

const AUTH_COOKIE_NAME = "moneta-auth-token";

/**
 * Extract the authenticated user from a request.
 * Checks the Authorization header first, then falls back to cookies.
 * Returns null if no valid token is found.
 */
export async function getAuthUser(
  request: NextRequest
): Promise<TokenPayload | null> {
  //********** 1. Try Authorization header (Bearer token)
  const authHeader = request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    return verifyToken(token);
  }

  //********** 2. Try httpOnly cookie
  const cookieToken = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (cookieToken) {
    return verifyToken(cookieToken);
  }

  return null;
}

/**
 * Cookie name for the auth token.
 */
export { AUTH_COOKIE_NAME };
