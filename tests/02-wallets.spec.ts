import { test, expect } from '@playwright/test';

const timestamp = Date.now();
const randomStr = Math.random().toString(36).substring(7);
const testEmail = `wallet_qa_${timestamp}_${randomStr}@moneta.app`;
const testUsername = `wallet_qa_${timestamp}_${randomStr}`;
const testPassword = 'SecurePassword123!';

test.describe.serial('2.1 Wallets (Dompet)', () => {

  let page: any;
  let context: any;

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(120000);
    // Create a shared context and page for all tests in this serial suite
    context = await browser.newContext();
    page = await context.newPage();
    page.setDefaultTimeout(60000);
    
    // Register the user
    await page.goto('http://localhost:3000/register');
    await page.fill('#email', testEmail);
    await page.fill('#username', testUsername);
    await page.fill('#password', testPassword);
    await page.fill('#confirm-password', testPassword);
    await page.click('button[type="submit"]:has-text("Buat Akun")');
    await expect(page).toHaveURL('http://localhost:3000/', { timeout: 120000 });
  });

  test.afterAll(async () => {
    await context.close();
  });

  // 1. Create Wallet
  test('[AU-06-01_01] Tambah Dompet: User can create a new wallet', async () => {
    await page.goto('/wallets');
    
    await page.click('button:has-text("Tambah Dompet")');
    
    const modal = page.locator('h2:has-text("Tambah Dompet Baru")');
    await expect(modal).toBeVisible();
    
    // Fill wallet details
    await page.fill('input[placeholder="contoh: BCA, GoPay"]', 'Dompet BCA QA');
    await page.selectOption('select', 'BANK');
    const amountInput = page.locator('input[placeholder="0"]');
    await amountInput.clear();
    await amountInput.pressSequentially('1500000', { delay: 10 });
    
    await page.click('button[type="submit"]:has-text("Simpan Dompet")');
    
    // Wait for modal to close
    await expect(modal).not.toBeVisible();
    
    const newWallet = page.locator('div, a').filter({ hasText: 'Dompet BCA QA' }).first();
    await expect(newWallet).toBeVisible({ timeout: 10000 });
  });

  test('[AU-06-01_02] Tambah Dompet Invalid: Wallet name cannot be empty', async () => {
    await page.goto('/wallets');
    await page.click('button:has-text("Tambah Dompet")');
    
    const modal = page.locator('h2:has-text("Tambah Dompet Baru")');
    await expect(modal).toBeVisible();
    
    const submitBtn = page.locator('button[type="submit"]:has-text("Simpan Dompet")');
    
    // Button should be disabled when name is empty
    await expect(submitBtn).toBeDisabled();
    
    // Fill with spaces
    await page.fill('input[placeholder="contoh: BCA, GoPay"]', '   ');
    await expect(submitBtn).toBeDisabled();
    
    // Close the modal so it doesn't block the next test
    await page.click('button:has-text("Batal")');
    await expect(modal).not.toBeVisible();
  });

  test('[AU-06-01_03] Tambah Dompet Invalid: Initial balance ignores non-numeric input', async () => {
    await page.goto('/wallets');
    await page.click('button:has-text("Tambah Dompet")');
    
    const modal = page.locator('h2:has-text("Tambah Dompet Baru")');
    await expect(modal).toBeVisible();
    
    await page.fill('input[placeholder="contoh: BCA, GoPay"]', 'Dompet Uji Validasi');
    
    // Fill initial balance with letters
    const balanceInput = page.locator('input[placeholder="0"]');
    await balanceInput.fill('abc123xyz');
    
    // CurrencyInput should filter letters and only keep '123'
    await expect(balanceInput).toHaveValue('123');
    
    // Close the modal
    await page.click('button:has-text("Batal")');
    await expect(modal).not.toBeVisible();
  });

  test('[AU-06-02_01] Ubah Dompet: User can edit wallet details', async () => {
    await page.goto('/wallets');
    
    // Find the wallet row
    const row = page.locator('div.group.relative').filter({ hasText: 'Dompet BCA QA' });
    await expect(row).toBeVisible();
    
    // Click action menu
    await row.locator('button[aria-label="Buka menu aksi"]').click();
    
    // Click edit
    await page.locator('button:has-text("Ubah")').and(page.locator(':visible')).first().click();
    
    const modal = page.locator('h2:has-text("Ubah Dompet")');
    await expect(modal).toBeVisible();
    
    // Change the name
    await page.fill('input[placeholder="contoh: BCA, GoPay"]', 'Dompet BCA QA Edited');
    await page.click('button[type="submit"]:has-text("Simpan Perubahan")');
    
    await expect(modal).not.toBeVisible();
    
    // Verify updated name
    await expect(page.locator('p:has-text("Dompet BCA QA Edited")')).toBeVisible();
    await expect(page.locator('p:text-is("Dompet BCA QA")')).not.toBeVisible();
  });

  test('[AU-06-03_01] Hapus Dompet: User can delete a wallet', async () => {
    await page.goto('/wallets');
    
    const row = page.locator('div.group.relative').filter({ hasText: 'Dompet BCA QA Edited' });
    await expect(row).toBeVisible();
    
    // Click action menu
    await row.locator('button[aria-label="Buka menu aksi"]').click();
    
    // Click delete
    await page.locator('button:has-text("Hapus")').and(page.locator(':visible')).first().click();
    
    const confirmModal = page.locator('h3:has-text("Hapus Dompet?")');
    await expect(confirmModal).toBeVisible();
    
    // Click confirm delete in dialog
    const confirmBtn = page.locator('button:has-text("Hapus")').nth(1); // Since the first one is the dropdown button, we use the one in the modal
    // To be safer, scope it to the dialog container
    const dialogContainer = page.locator('.fixed.inset-0.z-\\[200\\]');
    await dialogContainer.locator('button:has-text("Hapus")').click();
    
    // Verify wallet is removed from the list
    await expect(confirmModal).not.toBeVisible();
    await expect(page.locator('p:has-text("Dompet BCA QA Edited")')).not.toBeVisible();
  });

});
