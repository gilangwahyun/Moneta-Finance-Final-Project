import { test, expect } from '@playwright/test';
import { setupFreshUser } from './helpers';

test.describe.serial('2.5 Financial Targets (Target Keuangan)', () => {
  test.setTimeout(120000); // 2 minutes

  let page: any;
  let context: any;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
    page.setDefaultTimeout(60000);

    // Register unique user and login to initialize IndexedDB
    await setupFreshUser(page, 'target');

    
    // Create Wallet 'Dompet Utama'
    await page.goto('/wallets');
    await page.click('button:has-text("Tambah Dompet")');
    await page.fill('input[placeholder="contoh: BCA, GoPay"]', 'Dompet Utama');
    await page.locator('input[placeholder="0"]').clear();
    await page.locator('input[placeholder="0"]').pressSequentially('1000000', { delay: 10 });
    await page.click('button[type="submit"]:has-text("Simpan Dompet")');
    await expect(page.locator('h2:has-text("Tambah Dompet Baru")')).not.toBeVisible();
    await expect(page.locator('div, a').filter({ hasText: 'Dompet Utama' }).first()).toBeVisible({ timeout: 10000 });
    
    // Create Income Transaction (Gaji 5M)
    await page.goto('/transactions');
    await page.click('button:has-text("Tambah Transaksi")');
    const modal = page.locator('.relative.z-10').filter({ hasText: 'Tambah Transaksi' });
    await expect(modal).toBeVisible();
    await modal.locator('button:has-text("Pemasukan")').first().click();
    await page.fill('#txn-amount', '5000000');
    // Wallet "Dompet Utama" is auto-selected because it is the only wallet
    await page.locator('button[aria-label="Gaji"]').click();
    await page.fill('#txn-desc', 'Gaji QA');
    await page.click('button[type="submit"]:has-text("Simpan")');
    await expect(modal).not.toBeVisible();
    await expect(page.locator('div, p').filter({ hasText: 'Gaji QA' }).first()).toBeVisible({ timeout: 10000 });
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('[AU-09-01_01] Tambah Target Finansial: User can set an Income target', async () => {
    await page.goto('/targets');
    
    await page.click('button:has-text("Tambah Target Pemasukan")');
    
    const modal = page.locator('h2:has-text("Buat Target Baru")');
    await expect(modal).toBeVisible();
    
    // Name
    await page.fill('input[placeholder="Gaji bulanan"]', 'Target Pemasukan Bulanan');
    
    // Amount
    const amountInput = page.locator('input[placeholder="0"]');
    await amountInput.clear();
    await amountInput.fill('10000000'); // 10 Million
    
    // Period is MONTHLY by default.
    // Select category (required)
    await page.locator('span:text-is("Gaji")').locator('..').dispatchEvent('click');

    
    await page.click('button[type="submit"]:has-text("Simpan Target")');
    await expect(modal).not.toBeVisible();
    
    // Verify target is listed
    await expect(page.locator('p:has-text("Target Pemasukan Bulanan")')).toBeVisible();
    
    // Verify Progress (5 Million from 10 Million = 50%) -> should be "Belum Tercapai"
    await expect(page.locator('span:has-text("Belum Tercapai")').first()).toBeVisible();
    
    const row = page.locator('div.group.relative').filter({ hasText: 'Target Pemasukan Bulanan' });
    await expect(row.locator('span', { hasText: '5.000.000' }).first()).toBeVisible();
    await expect(row.locator('span', { hasText: '10.000.000' }).first()).toBeVisible();
  });

  test('[AU-09-01_02] Tambah Target Finansial Invalid: Cannot set target with 0 amount', async () => {
    await page.goto('/targets');
    await page.click('button:has-text("Tambah Target Pemasukan")');
    
    const modal = page.locator('h2:has-text("Buat Target Baru")');
    await expect(modal).toBeVisible();
    
    await page.fill('input[placeholder="Gaji bulanan"]', 'Target Invalid');
    const amountInput = page.locator('input[placeholder="0"]');
    await amountInput.clear();
    await amountInput.pressSequentially('0', { delay: 10 });
    
    await page.locator('span:text-is("Gaji")').locator('..').click();
    
    // The submit button should be disabled because amount is 0
    await expect(page.locator('button[type="submit"]:has-text("Simpan Target")')).toBeDisabled();
    
    await page.click('button:has-text("Batal")');
  });

  test('[AU-09-04_01] Pengujian Progress Bar Target: User can see visual tracking for financial targets', async () => {
    await page.goto('/targets');
    
    const row = page.locator('div.group.relative').filter({ hasText: 'Target Pemasukan Bulanan' });
    await expect(row).toBeVisible();
    
    // Progress bar element
    // Target is 10,000,000. Achieved is 5,000,000. 5M/10M = 50%.
    // Memvalidasi "Benar lho" (Exact value validation of the CSS width)
    const progressBar = row.locator('div.rounded-full[style*="width:"]');
    await expect(progressBar).toHaveAttribute('style', /width:\s*50%/);
    
    // Status text
    await expect(row.locator('span', { hasText: 'Belum Tercapai' }).first()).toBeVisible();
  });

  test('[AU-09-02_01] Ubah Target Finansial: User can edit an existing target', async () => {
    await page.goto('/targets');
    
    const row = page.locator('div.group.relative').filter({ hasText: 'Target Pemasukan Bulanan' });
    await row.locator('button[aria-label="Buka menu aksi"]').click();
    await page.locator('button:has-text("Ubah")').and(page.locator(':visible')).first().click();
    
    const modal = page.locator('h2:has-text("Ubah Target")');
    await expect(modal).toBeVisible();
    
    // Change limit to 5 Million so it reaches 100%
    const amountInput = page.locator('input[placeholder="0"]');
    await amountInput.clear();
    await amountInput.pressSequentially('5000000', { delay: 10 });
    
    await page.click('button[type="submit"]:has-text("Simpan Perubahan")');
    await expect(modal).not.toBeVisible();
    
    // Verify target is now achieved
    await expect(page.locator('span:has-text("Tercapai")').first()).toBeVisible();
  });

  test('[AU-09-03_01] Hapus Target Finansial: User can delete a target', async () => {
    await page.goto('/targets');
    
    const row = page.locator('div.group.relative').filter({ hasText: 'Target Pemasukan Bulanan' });
    await row.locator('button[aria-label="Buka menu aksi"]').click();
    await page.locator('button:has-text("Hapus")').and(page.locator(':visible')).first().click();
    
    const confirmModal = page.locator('h3:has-text("Hapus Target?")');
    await expect(confirmModal).toBeVisible();
    
    const dialogContainer = page.locator('.fixed.inset-0.z-\\[200\\]');
    await dialogContainer.locator('button:has-text("Hapus")').click();
    
    await expect(confirmModal).not.toBeVisible();
    
    await expect(page.locator('div.group.relative').filter({ hasText: 'Target Pemasukan Bulanan' })).not.toBeVisible();
  });
});
