import { test, expect } from '@playwright/test';
import { setupFreshUser } from './helpers';

test.describe.serial('2.2 Categories (Kategori)', () => {
  test.setTimeout(120000); // 2 minutes

  let page: any;
  let context: any;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
    page.setDefaultTimeout(60000);

    // Register unique user and login to initialize IndexedDB
    await setupFreshUser(page, 'category');

  });

  test.afterAll(async () => {
    await context.close();
  });

  test('[AU-05-01_01] Tambah Kategori: User can create a new category', async () => {
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

  test('[AU-05-02_01] Ubah Kategori: User can edit an existing custom category', async () => {
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

  test('[AU-05-03_01] Hapus Kategori: User can delete a custom category', async () => {
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

  test('[AU-05-01_02] Tambah Kategori Cepat: User can create a new category directly from the Transaction Modal', async () => {
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

  test('[AU-05-04_01] Tampil Kategori: User can view and filter categories by type', async () => {
    await page.goto('/categories');

    // Default tab = EXPENSE (Pengeluaran) — verify heading visible
    await expect(page.locator('h1:has-text("Kategori")')).toBeVisible({ timeout: 10000 });

    // At least one default expense category should exist (e.g., "Makanan")
    await expect(page.locator('span', { hasText: 'Makanan' }).first()).toBeVisible({ timeout: 10000 });

    // Switch to INCOME tab (Pemasukan)
    await page.locator('button:has-text("Pemasukan")').first().click();

    // At least one default income category should be visible (e.g., "Gaji")
    await expect(page.locator('span', { hasText: 'Gaji' }).first()).toBeVisible({ timeout: 10000 });

    // Switch back to Pengeluaran — expense categories reappear
    await page.locator('button:has-text("Pengeluaran")').first().click();
    await expect(page.locator('span', { hasText: 'Makanan' }).first()).toBeVisible({ timeout: 5000 });
  });

});
