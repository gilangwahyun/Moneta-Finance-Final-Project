/*
 * File: src/lib/utils/csrf-fetch.ts
 * Description: Utilitas pembantu untuk mengambil token CSRF dari cookie browser dan menyediakan wrapper fetch
 * (csrfFetch) yang menyisipkan header token CSRF secara otomatis pada request HTTP yang merubah state (non-GET).
 */

/********** Konstanta & Pengambilan Token **********/
const CSRF_COOKIE_NAME = "moneta-csrf-token";
const CSRF_HEADER_NAME = "X-CSRF-Token";

/**
 * Membaca token CSRF dari document.cookie pada lingkungan browser.
 *
 * @returns Token CSRF yang telah didekode, atau null jika tidak ditemukan atau berada di luar browser.
 */
export function getCsrfToken(): string | null {
  if (typeof document === "undefined") return null;

  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${CSRF_COOKIE_NAME}=`));

  return match ? decodeURIComponent(match.split("=")[1]) : null;
}

/********** Wrapper Fetch CSRF **********/

/**
 * Pembungkus (wrapper) fetch yang secara otomatis menyisipkan header token CSRF
 * pada request non-GET (POST, PUT, DELETE, dll). Berfungsi sebagai pengganti drop-in untuk `fetch()`.
 *
 * @param input - URL atau objek Request tujuan.
 * @param init - Konfigurasi opsional untuk request fetch.
 * @returns Promise yang menghasilkan objek Response.
 */
export async function csrfFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const method = (init?.method || "GET").toUpperCase();

  /********** Hanya sisipkan header CSRF pada metode HTTP yang mengubah data (selain GET, HEAD, OPTIONS). */
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
