import { test, expect } from '@playwright/test';
import { setupFreshUser } from './helpers';

test.describe.serial('2.4 Budgets (Anggaran)', () => {
  test.setTimeout(120000); // 2 minutes

  let page: any;
  let context: any;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
    page.setDefaultTimeout(60000);

    // Register unique user and login to initialize IndexedDB
    await setupFreshUser(page, 'budget');

    
    // Create Wallet 'Dompet A'
    await page.goto('/wallets');
    await page.click('button:has-text("Tambah Dompet")');
    await page.fill('input[placeholder="contoh: BCA, GoPay"]', 'Dompet A');
    await page.locator('input[placeholder="0"]').clear();
    await page.locator('input[placeholder="0"]').pressSequentially('5000000', { delay: 10 });
    await page.click('button[type="submit"]:has-text("Simpan Dompet")');
    await expect(page.locator('h2:has-text("Tambah Dompet Baru")')).not.toBeVisible();
    await expect(page.locator('div, a').filter({ hasText: 'Dompet A' }).first()).toBeVisible({ timeout: 10000 });
    // Create Expense Transaction (500k for Makanan)
    await page.goto('/transactions');
    await page.click('button:has-text("Tambah Transaksi")');
    const modal = page.locator('.relative.z-10').filter({ hasText: 'Tambah Transaksi' });
    await expect(modal).toBeVisible();
    await modal.locator('button:has-text("Pengeluaran")').first().click();
    await page.fill('#txn-amount', '500000');
    // Wallet "Dompet A" is auto-selected because it is the only wallet
    await page.locator('button[aria-label="Makanan"]').click();
    await page.fill('#txn-desc', 'Pengeluaran Awal');
    await page.click('button[type="submit"]:has-text("Simpan")');
    await expect(modal).not.toBeVisible();
    await expect(page.locator('div, p').filter({ hasText: 'Pengeluaran Awal' }).first()).toBeVisible({ timeout: 10000 });
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('[AU-08-01_01] Tambah Anggaran: User can set a monthly limit for a specific Expense category', async () => {
    await page.goto('/budgets');
    
    await page.click('button:has-text("Atur Anggaran")');
    
    const modal = page.locator('h2:has-text("Buat Anggaran Baru")');
    await expect(modal).toBeVisible();
    
    // Select Category "Makanan"
    await page.locator('span:text-is("Makanan")').locator('..').click();
    
    // Set limit 2.000.000
    await page.locator('input[placeholder="0"]').clear();
    await page.locator('input[placeholder="0"]').pressSequentially('2000000', { delay: 10 });
    
    await page.click('button[type="submit"]:has-text("Simpan Anggaran")');
    
    await expect(modal).not.toBeVisible();
    
    // Verify budget is created
    await expect(page.locator('p:has-text("Makanan")')).toBeVisible();
    
    // Verify progress UI (500k from 2M is 25%, Status should be "Aman")
    await expect(page.locator('span:has-text("Aman")').first()).toBeVisible();
  });

  test('[AU-08-06_01] Tampil Progress Bar Anggaran: User can see visual nudging via progress bar', async () => {
    await page.goto('/budgets');
    
    // Ensure "Makanan" budget is visible
    const row = page.locator('div.group.relative').filter({ hasText: 'Makanan' });
    await expect(row).toBeVisible();
    
    // Progress bar element
    // Total budget is 2,000,000. Spent is 500,000. 500k/2M = 25%.
    // Memvalidasi "Benar lho" (Exact value validation of the CSS width)
    const progressBar = row.locator('div.rounded-full[style*="width:"]');
    await expect(progressBar).toHaveAttribute('style', /width:\s*25%/);
    
    // Check the text "Aman" which is part of the nudging
    await expect(row.locator('span', { hasText: 'Aman' }).first()).toBeVisible();
  });

  test('[AU-08-04_01] Tampil Anggaran: User can view list of monthly budgets', async () => {
    await page.goto('/budgets');
    await expect(page.locator('h1', { hasText: 'Anggaran' })).toBeVisible();
    await expect(page.locator('div.group.relative').first()).toBeVisible({ timeout: 10000 });
  });

  test('[AU-08-02_01] Ubah Anggaran: User can edit budget limit', async () => {
    await page.goto('/budgets');
    const row = page.locator('div.group.relative').filter({ hasText: 'Makanan' });
    await row.locator('button[aria-label="Buka menu aksi"]').click();
    await page.locator('button:has-text("Ubah")').and(page.locator(':visible')).first().click();
    const modal = page.locator('h2:has-text("Ubah Batas Anggaran")');
    await expect(modal).toBeVisible();
    const amountInput = page.locator('input[placeholder="0"]');
    await amountInput.clear();
    await amountInput.pressSequentially('2500000', { delay: 10 });
    await page.click('button[type="submit"]:has-text("Simpan Perubahan")');
    await expect(modal).not.toBeVisible();
    await expect(page.locator('span', { hasText: '2.500.000' }).first()).toBeVisible();
  });

  test('[AU-08-01_02] Tambah Anggaran Invalid: Cannot select a category that already has a budget', async () => {
    // Because Makanan already has a budget, it should not be available in the new budget modal
    await page.goto('/budgets');
    await page.click('button:has-text("Atur Anggaran")');
    
    const modal = page.locator('h2:has-text("Buat Anggaran Baru")');
    await expect(modal).toBeVisible();

    // Verify "Makanan" category button is not present/visible
    await expect(page.locator('span:text-is("Makanan")')).not.toBeVisible();
    
    // Close modal
    await page.click('button:has-text("Batal")');
  });

  test('[AU-08-05_01] Realokasi Anggaran: User can transfer budget limits to another category', async () => {
    // Create an empty budget for Transportasi first
    await page.goto('/budgets');
    await page.click('button:has-text("Atur Anggaran")');
    await page.locator('span:text-is("Transportasi")').locator('..').click();
    await page.locator('input[placeholder="0"]').clear();
    await page.locator('input[placeholder="0"]').pressSequentially('500000', { delay: 10 });
    await page.click('button[type="submit"]:has-text("Simpan Anggaran")');
    await expect(page.locator('h2:has-text("Buat Anggaran Baru")')).not.toBeVisible();
    
    // Start reallocation from Makanan
    const row = page.locator('div.group.relative').filter({ hasText: 'Makanan' });
    await row.locator('button[aria-label="Buka menu aksi"]').first().click();
    await page.locator('button:has-text("Subsidi Silang")').and(page.locator(':visible')).first().click();
    
    const reallocateModal = page.locator('div.fixed.inset-0').filter({ hasText: 'Subsidi Silang' });
    await expect(reallocateModal).toBeVisible();
    
    // Source should be Makanan. Select Destination "Transportasi"
    await reallocateModal.locator('button:has-text("Pilih anggaran tujuan...")').click();
    await reallocateModal.locator('button:has-text("Transportasi")').click();
    
    // Try to transfer 200.000
    const reallocateInput = reallocateModal.locator('input[placeholder="0"]');
    await reallocateInput.clear();
    await reallocateInput.pressSequentially('200000', { delay: 10 });
    
    // Confirm
    await reallocateModal.locator('button[type="submit"]:has-text("Konfirmasi")').click();
    
    await expect(page.locator('h2:has-text("Subsidi Silang")')).not.toBeVisible();
    
    // Verify Makanan limit decreased from 2.500.000 to 2.300.000
    await expect(page.locator('div.group.relative').filter({ hasText: 'Makanan' }).locator('span', { hasText: '2.300.000' }).first()).toBeVisible();
    
    // Verify Transportasi limit increased from 500.000 to 700.000
    await expect(page.locator('div.group.relative').filter({ hasText: 'Transportasi' }).locator('span', { hasText: '700.000' }).first()).toBeVisible();
  });

  test('[AU-08-05_02] Realokasi Anggaran Invalid: Cannot exceed safe limit', async () => {
    await page.goto('/budgets');
    
    // Start reallocation from Makanan
    const row = page.locator('div.group.relative').filter({ hasText: 'Makanan' });
    await row.locator('button[aria-label="Buka menu aksi"]').first().click();
    await page.locator('button:has-text("Subsidi Silang")').and(page.locator(':visible')).first().click();
    
    const reallocateModal = page.locator('div.fixed.inset-0').filter({ hasText: 'Subsidi Silang' });
    await expect(reallocateModal).toBeVisible();
    
    await reallocateModal.locator('button:has-text("Pilih anggaran tujuan...")').click();
    await reallocateModal.locator('button:has-text("Transportasi")').click();
    
    // Try to transfer more than allowed. Limit is 2.300.000, spent is 500.000. 
    // Remaining is 1.800.000. Safe limit requires 20% of 2.300.000 = 460.000.
    // Let's try to transfer 1.500.000 (remaining would be 300.000 < 460.000)
    const invalidAmountInput = reallocateModal.locator('input[placeholder="0"]');
    await invalidAmountInput.clear();
    await invalidAmountInput.pressSequentially('1500000', { delay: 10 });
    
    // Expect the submit button to be disabled
    await expect(reallocateModal.locator('button[type="submit"]:has-text("Konfirmasi")')).toBeDisabled();
    
    // Close modal
    await reallocateModal.locator('button:has-text("Batal")').click();
  });

  test('[DEFENSIVE-GUARD] Realokasi Anggaran: Cannot submit zero or negative amount', async () => {
    await page.goto('/budgets');
    
    // Start reallocation from Makanan
    const row = page.locator('div.group.relative').filter({ hasText: 'Makanan' });
    await row.locator('button[aria-label="Buka menu aksi"]').first().click();
    await page.locator('button:has-text("Subsidi Silang")').and(page.locator(':visible')).first().click();
    
    const reallocateModal = page.locator('div.fixed.inset-0').filter({ hasText: 'Subsidi Silang' });
    await expect(reallocateModal).toBeVisible();
    
    await reallocateModal.locator('button:has-text("Pilih anggaran tujuan...")').click();
    await reallocateModal.locator('button:has-text("Transportasi")').click();
    
    // Try to transfer 0 amount
    const zeroAmountInput = reallocateModal.locator('input[placeholder="0"]');
    await zeroAmountInput.clear();
    await zeroAmountInput.pressSequentially('0', { delay: 10 });
    
    // Expect the submit button to be disabled
    await expect(reallocateModal.locator('button[type="submit"]:has-text("Konfirmasi")')).toBeDisabled();
    
    // Close modal
    await reallocateModal.locator('button:has-text("Batal")').click();
  });

  test('[AU-08-03_01] Hapus Anggaran: User can delete a budget', async () => {
    await page.goto('/budgets');
    
    // Delete Transportasi
    const row = page.locator('div.group.relative').filter({ hasText: 'Transportasi' });
    await row.locator('button[aria-label="Buka menu aksi"]').first().click();
    await page.locator('button:has-text("Hapus")').and(page.locator(':visible')).first().click();
    
    const confirmModal = page.locator('h3:has-text("Hapus Anggaran?")');
    await expect(confirmModal).toBeVisible();
    
    const dialogContainer = page.locator('.fixed.inset-0.z-\\[200\\]');
    await dialogContainer.locator('button:has-text("Hapus")').click();
    
    await expect(confirmModal).not.toBeVisible();
    
    await expect(page.locator('div.group.relative').filter({ hasText: 'Transportasi' })).not.toBeVisible();
  });

});
