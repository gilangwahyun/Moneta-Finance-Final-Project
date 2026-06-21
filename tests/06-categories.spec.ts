import { test, expect } from '@playwright/test';

const timestamp = Date.now();
const randomStr = Math.random().toString(36).substring(7);
const testEmail = `category_qa_${timestamp}_${randomStr}@moneta.app`;
const testUsername = `category_qa_${timestamp}_${randomStr}`;
const testPassword = 'SecurePassword123!';

test.describe.serial('2.2 Categories (Kategori)', () => {
  test.setTimeout(120000); // 2 minutes

  let page: any;
  let context: any;

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(120000); // Extend hook timeout to 2 minutes
    context = await browser.newContext();
    page = await context.newPage();
    page.setDefaultTimeout(60000);
    
    // Register a fresh user
    await page.goto('http://localhost:3000/register');
    await page.fill('#email', testEmail);
    await page.fill('#username', testUsername);
    await page.fill('#password', testPassword);
    await page.fill('#confirm-password', testPassword);
    await page.click('button[type="submit"]:has-text("Buat Akun")');
    await expect(page).toHaveURL('http://localhost:3000/', { timeout: 120000 });
    
    // Wait for hydration
    await page.waitForTimeout(2000);
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('Create: User can create a new category', async () => {
    await page.goto('/categories');
    
    // Default tab is EXPENSE. Create an expense category.
    await page.click('button:has-text("Tambah Kategori")');
    
    const modal = page.locator('h2:has-text("Kategori Baru")');
    await expect(modal).toBeVisible();
    
    // Set name
    await page.fill('input[placeholder="Contoh: Makan & Minum"]', 'Langganan Spesial');
    
    // Choose color (purple)
    await page.locator('button[aria-label="Ungu"]').click();
    
    // Choose icon (gaming)
    await page.locator('button[aria-label="Gaming"]').click();
    
    // Save
    await page.click('button[type="submit"]:has-text("Simpan Kategori")');
    
    await expect(modal).not.toBeVisible();
    
    // Verify category exists in the list
    await expect(page.locator('span', { hasText: 'Langganan Spesial' }).first()).toBeVisible();
  });

  test('Edit: User can edit an existing custom category', async () => {
    await page.goto('/categories');
    
    const categoryRow = page.locator('.group.relative').filter({ hasText: 'Langganan Spesial' });
    await categoryRow.locator('button[aria-label="Buka menu aksi"]').first().click();
    await page.locator('button:has-text("Ubah")').and(page.locator(':visible')).first().click();
    
    const modal = page.locator('h2:has-text("Ubah Kategori")');
    await expect(modal).toBeVisible();
    
    // Change name
    await page.fill('input[placeholder="Contoh: Makan & Minum"]', 'Langganan Pro');
    
    // Choose another color (pink)
    await page.locator('button[aria-label="Pink"]').click();
    
    // Save
    await page.click('button[type="submit"]:has-text("Simpan Perubahan")');
    
    await expect(modal).not.toBeVisible();
    
    // Verify updated name exists
    await expect(page.locator('span', { hasText: 'Langganan Pro' }).first()).toBeVisible();
  });

  test('Delete: User can delete a custom category', async () => {
    await page.goto('/categories');
    
    const categoryRow = page.locator('.group.relative').filter({ hasText: 'Langganan Pro' });
    await categoryRow.locator('button[aria-label="Buka menu aksi"]').first().click();
    await page.locator('button:has-text("Hapus")').and(page.locator(':visible')).first().click();
    
    const deleteModal = page.locator('h3:has-text("Hapus Kategori?")');
    await expect(deleteModal).toBeVisible();
    
    // Confirm delete
    await page.locator('button[type="button"]:has-text("Hapus")').and(page.locator(':visible')).first().click();
    
    // Wait for modal to disappear
    await expect(deleteModal).not.toBeVisible();
    
    // Verify category is gone
    await expect(page.locator('span', { hasText: 'Langganan Pro' })).toHaveCount(0);
  });

  test('Quick Add: User can create a new category directly from the Transaction Modal', async () => {
    await page.goto('/transactions');
    await page.click('button:has-text("Tambah Transaksi")');
    
    const modal = page.locator('.relative.z-10').filter({ hasText: 'Tambah Transaksi' });
    await expect(modal).toBeVisible();
    
    // Open category selector
    await page.locator('button', { hasText: /^Tambah$/ }).click();
    
    // The CategoryBuilder view opens.
    await page.fill('input[placeholder="Contoh: Makan Siang"]', 'Snack Malam');
    await page.locator('button[aria-label="Biru"]').click();
    await page.locator('button[aria-label="Minuman"]').click(); // coffee
    
    // Save new category
    await page.click('button[type="button"]:has-text("Simpan Kategori")');
    
    // Wait for the modal view to switch back to form
    await expect(page.locator('h2:has-text("Tambah Transaksi")')).toBeVisible();
    
    // Verify that the category is selected (aria-pressed="true")
    const snackMalamBtn = page.locator('button[aria-pressed="true"]', { hasText: 'Snack Malam' });
    await expect(snackMalamBtn).toBeVisible();
    
    // Close the transaction modal
    await page.locator('button[aria-label="Tutup form"]').click();
  });

});
