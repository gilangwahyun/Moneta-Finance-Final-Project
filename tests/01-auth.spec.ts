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
    test.setTimeout(60000);
    await page.goto('/register');
    
    // Fill registration form
    await page.fill('#email', testEmail);
    await page.fill('#username', testUsername);
    await page.fill('#password', testPassword);
    await page.fill('#confirm-password', testPassword);
    
    // Submit form
    await page.click('button[type="submit"]:has-text("Buat Akun")');
    
    // Wait for redirect to dashboard
    await expect(page).toHaveURL('http://localhost:3000/', { timeout: 120000 });
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
    await page.goto('/login');
    
    // Use the demo credentials as they are guaranteed to exist, or use the newly created one.
    // We'll use the newly created one to prove the full flow works.
    await page.fill('#identifier', testEmail);
    await page.fill('#password', testPassword);
    
    // Submit form
    await page.click('button[type="submit"]:has-text("Masuk")');
    
    // Wait for redirect to dashboard
    await page.waitForURL('/');
    expect(page.url()).toBe('http://localhost:3000/');
  });

  test('[AU-02-01_02] Masuk (Login) Invalid: System rejects invalid credentials', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('#identifier', 'wrong_user@moneta.app');
    await page.fill('#password', 'WrongPassword123!');
    
    await page.click('button[type="submit"]:has-text("Masuk")');
    
    // Expect error message
    const errorMessage = page.locator('.bg-red-50');
    await expect(errorMessage).toBeVisible();
  });

  test('[AU-03-01_01] Keluar (Logout): Session persists and user can log out', async ({ page }) => {
    // 1. First, login
    await page.goto('/login');
    await page.fill('#identifier', 'user_test@moneta.app'); // Using demo user here for simplicity
    await page.fill('#password', 'password123');
    await page.click('button[type="submit"]:has-text("Masuk")');
    await page.waitForURL('/');
    
    // 2. Session persists across page reload
    await page.reload();
    await expect(page).toHaveURL('http://localhost:3000/');
    
    // Wait for hydration or specific element if needed
    // The logout button is in the /profile page
    await page.goto('/profile');
    
    // Find and click the logout button
    // It's a button with the text "Keluar"
    const logoutLocator = page.locator('button', { hasText: 'Keluar' }).first();
    
    // Accept any confirm dialogs (e.g., if there are pending sync changes)
    page.once('dialog', dialog => dialog.accept());
    
    // Wait for the button to appear then click it
    await expect(logoutLocator).toBeVisible();
    await logoutLocator.click();
    
    await page.waitForURL('/login');
    expect(page.url()).toContain('/login');
  });

});
