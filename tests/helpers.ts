/**
 * tests/helpers.ts
 *
 * Shared test helpers. Each spec file should use `setupFreshUser` in its
 * `beforeAll` hook to:
 *   1. Register a unique user via the API (fast — no browser form fill needed).
 *   2. Log in via the browser (essential for initializing IndexedDB, which the
 *      app uses as its primary offline-first storage).
 *
 * This pattern is necessary because Playwright's `storageState` only persists
 * cookies/localStorage, NOT IndexedDB. Without a browser login, `getCurrentUser()`
 * inside the app returns null, causing all wallet/transaction/budget operations to
 * fail silently.
 */

import { request as apiRequest, expect } from '@playwright/test';

export const DEFAULT_PASSWORD = 'SecurePassword123!';

/**
 * Registers a unique user via the API, then logs in via the browser to
 * initialize IndexedDB. Call this in your spec's `beforeAll`.
 *
 * @param page  - A Playwright Page object (already created from a fresh context).
 * @param prefix - Short prefix for the generated email/username (e.g. "wallet_qa").
 */
export async function setupFreshUser(page: any, prefix: string): Promise<{ email: string; username: string }> {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 6);
  // Ensure username is <= 30 chars. prefix might be long, so substring it.
  const safePrefix = prefix.substring(0, 10);
  const email = `${safePrefix}_${timestamp}_${random}@moneta.internal`;
  const username = `${safePrefix}_${timestamp}_${random}`;

  // 1. Register via HTTP API — no browser navigation, no UI form fills.
  //    page.request inherits the same baseURL from playwright.config.ts.
  const res = await page.request.post('/api/auth/register', {
    data: {
      email,
      username,
      password: DEFAULT_PASSWORD,
      seedDemoData: false,
    },
  });
  
  if (!res.ok()) {
    throw new Error(`Register failed: ${res.status()} ${await res.text()}`);
  }

  // 2. Log in via browser. This is critical: the login handler calls
  //    `upsertLocalUser(userData)` which writes the user record into IndexedDB.
  //    Without this step, all subsequent hook calls (useWallets, etc.) will
  //    call `getCurrentUser()` → null → all mutations fail silently.
  //
  //    /login is already compiled by global-setup warm-up, so this is fast.
  await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.fill('#identifier', email);
  await page.fill('#password', DEFAULT_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/$/, { timeout: 60000 });

  // Brief wait to let IndexedDB writes settle (useAuthUser → upsertLocalUser).
  await page.waitForTimeout(1000);

  return { email, username };
}
