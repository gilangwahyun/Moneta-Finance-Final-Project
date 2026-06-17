/********** Helpers **********/
const CSRF_COOKIE_NAME = "moneta-csrf-token";
const CSRF_HEADER_NAME = "X-CSRF-Token";

/**
 * Reads the CSRF token from document.cookie.
 *
 * @returns The decoded CSRF token or null if it doesn't exist or not in a browser environment.
 */
export function getCsrfToken(): string | null {
  if (typeof document === "undefined") return null;

  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${CSRF_COOKIE_NAME}=`));

  return match ? decodeURIComponent(match.split("=")[1]) : null;
}

/**
 * A fetch wrapper that automatically attaches the CSRF token header
 * on non-GET requests. Acts as a drop-in replacement for `fetch()`.
 *
 * @param input - The resource URL or Request object.
 * @param init - Optional configuration for the fetch request.
 * @returns A Promise resolving to the Response.
 */
export async function csrfFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const method = (init?.method || "GET").toUpperCase();

  /********** Only attach CSRF header on state-changing methods. */
  if (method !== "GET" && method !== "HEAD" && method !== "OPTIONS") {
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      const headers = new Headers(init?.headers);
      headers.set(CSRF_HEADER_NAME, csrfToken);
      init = { ...init, headers };
    }
  }

  return fetch(input, init);
}
