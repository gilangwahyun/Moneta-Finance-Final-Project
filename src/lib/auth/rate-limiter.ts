//********** START: Rate Limiter **********
//********** In-memory sliding window rate limiter for auth endpoints.
//********** Protects against brute-force login and registration spam.
//**********
//********** Usage:
//**********   const result = checkRateLimit("login:ip:192.168.1.1", LOGIN_IP_LIMIT);
//**********   if (!result.allowed) return 429 response;
//********** END: Rate Limiter **********

import { NextRequest } from "next/server";

//********** TYPES **********

export interface RateLimitConfig {
  /** Maximum number of requests allowed within the window */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
}

export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Number of remaining requests in the window */
  remaining: number;
  /** When the window resets */
  resetAt: Date;
  /** Seconds until the client can retry (0 if allowed) */
  retryAfterSeconds: number;
}

interface RateLimitEntry {
  count: number;
  resetAt: number; //********** Unix timestamp in ms
}

//********** Pre-configured Limits **********

/** Login: 10 requests per 15 minutes per IP */
export const LOGIN_IP_LIMIT: RateLimitConfig = {
  maxRequests: 10,
  windowMs: 15 * 60 * 1000, //********** 15 minutes
};

/** Login: 20 requests per 15 minutes per username */
export const LOGIN_USERNAME_LIMIT: RateLimitConfig = {
  maxRequests: 20,
  windowMs: 15 * 60 * 1000, //********** 15 minutes
};

/** Register: 5 requests per 60 minutes per IP */
export const REGISTER_IP_LIMIT: RateLimitConfig = {
  maxRequests: 5,
  windowMs: 60 * 60 * 1000, //********** 60 minutes
};

//********** In-Memory Store **********

const store = new Map<string, RateLimitEntry>();

//********** Periodic cleanup every 5 minutes to prevent memory leaks
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

if (typeof globalThis !== "undefined") {
  //********** Avoid multiple intervals in hot-reload (Next.js dev mode)
  const globalStore = globalThis as typeof globalThis & {
    __rateLimitCleanupStarted?: boolean;
  };

  if (!globalStore.__rateLimitCleanupStarted) {
    globalStore.__rateLimitCleanupStarted = true;
    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of store) {
        if (entry.resetAt <= now) {
          store.delete(key);
        }
      }
    }, CLEANUP_INTERVAL_MS);
  }
}

//********** Core Logic **********

/**
 * Check if a request is allowed under the rate limit.
 *
 * @param key - Unique identifier (e.g. "login:ip:192.168.1.1")
 * @param config - Rate limit configuration
 * @returns Rate limit result with allowed status and metadata
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  if (process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test" || process.env.E2E_TEST_MODE === "true") {
    return {
      allowed: true,
      remaining: config.maxRequests,
      resetAt: new Date(Date.now() + config.windowMs),
      retryAfterSeconds: 0,
    };
  }

  const now = Date.now();
  const entry = store.get(key);

  //********** If no entry or window expired, start a new window
  if (!entry || entry.resetAt <= now) {
    const resetAt = now + config.windowMs;
    store.set(key, { count: 1, resetAt });
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: new Date(resetAt),
      retryAfterSeconds: 0,
    };
  }

  //********** Window is still active - increment count
  entry.count += 1;

  if (entry.count > config.maxRequests) {
    //********** Over the limit
    const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(entry.resetAt),
      retryAfterSeconds,
    };
  }

  //********** Under the limit
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetAt: new Date(entry.resetAt),
    retryAfterSeconds: 0,
  };
}

//********** HTTP Helpers **********

/**
 * Build rate-limit headers for the HTTP response.
 */
function getRateLimitHeaders(
  result: RateLimitResult,
  config: RateLimitConfig
): Record<string, string> {
  const headers: Record<string, string> = {
    "X-RateLimit-Limit": String(config.maxRequests),
    "X-RateLimit-Remaining": String(Math.max(0, result.remaining)),
    "X-RateLimit-Reset": String(Math.floor(result.resetAt.getTime() / 1000)),
  };

  if (!result.allowed) {
    headers["Retry-After"] = String(result.retryAfterSeconds);
  }

  return headers;
}

/**
 * Build a 429 JSON response with rate-limit headers.
 */
export function rateLimitResponse(
  result: RateLimitResult,
  config: RateLimitConfig,
  message: string
) {
  //********** Import NextResponse inline to avoid circular deps in edge cases
  const { NextResponse } = require("next/server");

  return NextResponse.json(
    {
      success: false,
      error: {
        code: "RATE_LIMITED",
        message,
        retryAfter: result.retryAfterSeconds,
      },
    },
    {
      status: 429,
      headers: getRateLimitHeaders(result, config),
    }
  );
}

//********** IP Extraction **********

/**
 * Extract the client IP address from a Next.js request.
 *
 * Checks in order:
 * 1. x-forwarded-for (first IP — set by reverse proxy / Vercel)
 * 2. x-real-ip
 * 3. Fallback to "unknown"
 */
export function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    //********** x-forwarded-for can be a comma-separated list - take the first
    return forwarded.split(",")[0].trim();
  }

  const realIP = request.headers.get("x-real-ip");
  if (realIP) {
    return realIP.trim();
  }

  return "unknown";
}
