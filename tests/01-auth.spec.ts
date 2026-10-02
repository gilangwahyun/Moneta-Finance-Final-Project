import { test, expect } from '@playwright/test';

// Use a dynamically generated timestamp to ensure unique user creation per test run
const timestamp = Date.now();
const randomStr = Math.random().toString(36).substring(7);
const testEmail = `qa_user_${timestamp}_${randomStr}@moneta.app`;
const testUsername = `qa_user_${timestamp}_${randomStr}`;
const testPassword = 'SecurePassword123!';

test.describe.serial('1. Authentication & User Management', () => {



  test('[AU-01-01_01] Registrasi Akun Valid: User can register with a valid email and username', async ({ page }) => {
    // Increase timeout for the first test to allow Next.js dev server compilation
    test.setTimeout(180000);
    await page.goto('/register', { waitUntil: 'domcontentloaded' });

    // Fill registration form
    await page.fill('#email', testEmail);
    await page.fill('#username', testUsername);
    await page.fill('#password', testPassword);
    await page.fill('#confirm-password', testPassword);

    // Uncheck seed demo data — we don't want the heavy seeding during E2E tests
    // as it causes slow responses and Prisma unique constraint errors on re-runs.
    const seedCheckbox = page.locator('#seed-demo-data');
    if (await seedCheckbox.isChecked()) {
      await seedCheckbox.uncheck();
    }

    // Submit form
    await page.click('button[type="submit"]:has-text("Buat Akun")');

    // Wait for redirect to dashboard and for the page to be fully compiled
    await expect(page).toHaveURL(/.*\/$/, { timeout: 120000 });

    // Give Next.js time to finish compiling the dashboard + /login pages in dev mode
    // so subsequent tests don't hit ERR_ABORTED while the server is busy.
    await page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {
      // networkidle might not resolve in dev mode, that's OK
    });
  });

  test('[AU-01-01_02] Registrasi Akun Invalid: System rejects duplicate emails/usernames', async ({ page }) => {
    await page.goto('/register');

    // Attempt to register with the EXACT SAME credentials as the previous test
    await page.fill('#email', testEmail);
    await page.fill('#username', testUsername);
    await page.fill('#password', testPassword);
    await page.fill('#confirm-password', testPassword);

    // Submit form
    await page.click('button[type="submit"]:has-text("Buat Akun")');

    // Expect error message to appear
    const errorMessage = page.locator('.bg-red-50');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText(/sudah terdaftar/i); // Actual error: "Email atau Username sudah terdaftar."
  });

  test('[AU-02-01_01] Masuk (Login) Valid: User can login successfully', async ({ page }) => {
    test.setTimeout(180000);

    // Next.js dev server might be compiling (especially after registering and being redirected
    // to the dashboard for the first time). Retry navigation until it succeeds.
    let navigated = false;
    for (let attempt = 0; attempt < 5 && !navigated; attempt++) {
      try {
        await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 30000 });
        navigated = true;
      } catch {
        await page.waitForTimeout(3000);
      }
    }
    if (!navigated) {
      await page.goto('/login', { waitUntil: 'domcontentloaded' });
    }

    // Use the demo credentials as they are guaranteed to exist, or use the newly created one.
    // We'll use the newly created one to prove the full flow works.
    await page.fill('#identifier', testEmail);
    await page.fill('#password', testPassword);

    // Submit form
    await page.click('button[type="submit"]:has-text("Masuk")');

    // Wait for redirect to dashboard
    await page.waitForURL('/');
    expect(page.url()).toMatch(/.*\/$/);
  });

  test('[AU-02-01_02] Masuk (Login) Invalid: System rejects invalid credentials', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });

    await page.fill('#identifier', 'wrong_user@moneta.app');
    await page.fill('#password', 'WrongPassword123!');

    await page.click('button[type="submit"]:has-text("Masuk")');

    // Expect error message
    const errorMessage = page.locator('.bg-red-50');
    await expect(errorMessage).toBeVisible();
  });

  test('[AU-03-01_01] Keluar (Logout): Session persists and user can log out', async ({ page }) => {
    // 1. First, login
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.fill('#identifier', testEmail);
    await page.fill('#password', testPassword);
    await page.click('button[type="submit"]:has-text("Masuk")');
    await page.waitForURL('/');

    // 2. Session persists across page reload
    await page.reload();
    await expect(page).toHaveURL(/.*\/$/);

    // Wait for hydration or specific element if needed
    // The logout button is in the /profile page
    await page.goto('/profile');

    // Find and click the logout button
    // It's a button with the text "Keluar"
    const logoutLocator = page.locator('button', { hasText: 'Keluar' }).first();

    // Accept any confirm dialogs (e.g., if there are pending sync changes)
    page.once('dialog', (dialog) => dialog.accept());

    // Wait for the button to appear then click it
    await expect(logoutLocator).toBeVisible();
    await logoutLocator.click();

    await page.waitForURL('/login');
    expect(page.url()).toContain('/login');
  });
});
