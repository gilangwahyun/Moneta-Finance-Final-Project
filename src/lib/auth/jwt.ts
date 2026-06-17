//********** START: JWT Utilities **********
//********** Uses `jose` for Edge-compatible JWT signing & verification.
//********** END: JWT Utilities **********

import { SignJWT, jwtVerify, JWTPayload } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "moneta-dev-secret-change-in-production"
);

const JWT_ISSUER = "moneta-finance";
const JWT_EXPIRATION = "7d"; //********** Token valid for 7 days

export interface TokenPayload extends JWTPayload {
  sub: string; //********** userId
  username: string;
}

/**
 * Sign a JWT token with the given payload.
 */
export async function signToken(payload: {
  userId: string;
  username: string;
}): Promise<string> {
  return new SignJWT({ username: payload.username })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer(JWT_ISSUER)
    .setSubject(payload.userId)
    .setExpirationTime(JWT_EXPIRATION)
    .sign(JWT_SECRET);
}

/**
 * Verify and decode a JWT token.
 * Returns null if the token is invalid or expired.
 */
export async function verifyToken(
  token: string
): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      issuer: JWT_ISSUER,
    });
    return payload as TokenPayload;
  } catch {
    return null;
  }
}
