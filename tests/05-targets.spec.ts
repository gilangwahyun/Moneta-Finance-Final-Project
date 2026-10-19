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

    // Create an unlinked Income Transaction (General Income: Rp 2.000.000 Gaji)
    // To verify that unallocated income does not automatically bleed into newly created targets.
    await page.goto('/transactions');
    await page.click('button:has-text("Tambah Transaksi")');
    const modal = page.locator('.relative.z-10').filter({ hasText: 'Tambah Transaksi' });
    await expect(modal).toBeVisible();
    await modal.locator('button:has-text("Pemasukan")').first().click();
    await page.fill('#txn-amount', '2000000');
    await page.locator('button[aria-label="Gaji"]').click();
    await page.fill('#txn-desc', 'Gaji Pokok Awal (Umum)');
    await page.click('button[type="submit"]:has-text("Simpan")');
    await expect(modal).not.toBeVisible();
    await expect(page.locator('div, p').filter({ hasText: 'Gaji Pokok Awal (Umum)' }).first()).toBeVisible({ timeout: 10000 });
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('[AU-09-01_01] Tambah Target Finansial: User can create multiple targets under the same category', async () => {
    await page.goto('/targets');

    // --- 1. Create Target 1: 'Target Gaji Pokok' under category 'Gaji' ---
    await page.click('button:has-text("Tambah Target Pemasukan")');
    const modal = page.locator('h2:has-text("Buat Target Baru")');
    await expect(modal).toBeVisible();

    await page.fill('input[placeholder="Gaji bulanan"]', 'Target Gaji Pokok');
    const amountInput = page.locator('input[placeholder="0"]');
    await amountInput.clear();
    await amountInput.fill('10000000'); // 10 Million

    await page.locator('span:text-is("Gaji")').locator('..').dispatchEvent('click');
    await page.click('button[type="submit"]:has-text("Simpan Target")');
    await expect(modal).not.toBeVisible();

    // Verify Target 1 is listed and starts at Rp 0 (unlinked transactions are not counted)
    const row1 = page.locator('div.group.relative').filter({ hasText: 'Target Gaji Pokok' });
    await expect(row1).toBeVisible();
    await expect(row1.locator('span', { hasText: 'Rp 0' }).first()).toBeVisible();
    await expect(row1.locator('span', { hasText: '10.000.000' }).first()).toBeVisible();

    // --- 2. Create Target 2: 'Target Bonus Kinerja' under the SAME category 'Gaji' ---
    await page.click('button:has-text("Tambah Target Pemasukan")');
    await expect(modal).toBeVisible();

    await page.fill('input[placeholder="Gaji bulanan"]', 'Target Bonus Kinerja');
    const amountInput2 = page.locator('input[placeholder="0"]');
    await amountInput2.clear();
    await amountInput2.fill('5000000'); // 5 Million

    // Select the SAME category 'Gaji'
    await page.locator('span:text-is("Gaji")').locator('..').dispatchEvent('click');
    await page.click('button[type="submit"]:has-text("Simpan Target")');
    await expect(modal).not.toBeVisible();

    // Verify Target 2 is also listed under Category Gaji
    const row2 = page.locator('div.group.relative').filter({ hasText: 'Target Bonus Kinerja' });
    await expect(row2).toBeVisible();
    await expect(row2.locator('span', { hasText: 'Rp 0' }).first()).toBeVisible();
    await expect(row2.locator('span', { hasText: '5.000.000' }).first()).toBeVisible();
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

  test('[AU-09-01_03] Alokasi Transaksi ke Target Spesifik: User can record income directly to a target', async () => {
    await page.goto('/targets');

    const row1 = page.locator('div.group.relative').filter({ hasText: 'Target Gaji Pokok' });
    await expect(row1).toBeVisible();

    // Click quick action "Catat Pemasukan" on Target 1
    await row1.locator('button:has-text("Catat Pemasukan")').click();

    const txnModal = page.locator('.relative.z-10').filter({ hasText: 'Tambah Transaksi' });
    await expect(txnModal).toBeVisible();

    // Fill amount Rp 5.000.000
    await page.fill('#txn-amount', '5000000');

    // Verify Target Gaji Pokok is selected in the target selector
    const targetBadge = txnModal.locator('button', { hasText: 'Target Gaji Pokok' });
    await expect(targetBadge).toBeVisible();

    await page.fill('#txn-desc', 'Gaji Pokok Bulan Ini');
    await page.click('button[type="submit"]:has-text("Simpan")');
    await expect(txnModal).not.toBeVisible();

    // 1. Target 1 ('Target Gaji Pokok') should reflect the 5.000.000 achievement (50%)
    await expect(row1.locator('span', { hasText: '5.000.000' }).first()).toBeVisible({ timeout: 10000 });
    await expect(row1.locator('span', { hasText: '10.000.000' }).first()).toBeVisible();
    await expect(row1.locator('span:has-text("Belum Tercapai")').first()).toBeVisible();

    // 2. Target 2 ('Target Bonus Kinerja') MUST STAY AT 0 (even though it shares the category 'Gaji')
    const row2 = page.locator('div.group.relative').filter({ hasText: 'Target Bonus Kinerja' });
    await expect(row2.locator('span', { hasText: 'Rp 0' }).first()).toBeVisible();
    await expect(row2.locator('span', { hasText: '5.000.000' }).first()).toBeVisible();
  });

  test('[AU-09-04_01] Pengujian Progress Bar Target: Visual tracking reflects target-specific percentage', async () => {
    await page.goto('/targets');

    // Target 1: 5.000.000 / 10.000.000 = 50%
    const row1 = page.locator('div.group.relative').filter({ hasText: 'Target Gaji Pokok' });
    await expect(row1).toBeVisible();
    const progressBar1 = row1.locator('div.rounded-full[style*="width:"]');
    await expect(progressBar1).toHaveAttribute('style', /width:\s*50%/);

    // Target 2: 0 / 5.000.000 = 0%
    const row2 = page.locator('div.group.relative').filter({ hasText: 'Target Bonus Kinerja' });
    await expect(row2).toBeVisible();
    const progressBar2 = row2.locator('div.rounded-full[style*="width:"]');
    await expect(progressBar2).toHaveAttribute('style', /width:\s*0%/);
  });

  test('[AU-09-02_01] Ubah Target Finansial: User can edit an existing target', async () => {
    await page.goto('/targets');

    const row = page.locator('div.group.relative').filter({ hasText: 'Target Gaji Pokok' });
    await row.locator('button[aria-label="Buka menu aksi"]').click();
    await page.locator('button:has-text("Ubah")').and(page.locator(':visible')).first().click();

    const modal = page.locator('h2:has-text("Ubah Target")');
    await expect(modal).toBeVisible();

    // Change limit to 5 Million so it reaches 100% (already has 5M allocated)
    const amountInput = page.locator('input[placeholder="0"]');
    await amountInput.clear();
    await amountInput.pressSequentially('5000000', { delay: 10 });

    await page.click('button[type="submit"]:has-text("Simpan Perubahan")');
    await expect(modal).not.toBeVisible();

    // Verify target is now achieved ("Tercapai")
    await expect(row.locator('span:has-text("Tercapai")').first()).toBeVisible();
  });

  test('[AU-09-03_01] Hapus Target Finansial: User can delete targets', async () => {
    await page.goto('/targets');

    // Delete Target 1
    const row1 = page.locator('div.group.relative').filter({ hasText: 'Target Gaji Pokok' });
    await row1.locator('button[aria-label="Buka menu aksi"]').click();
    await page.locator('button:has-text("Hapus")').and(page.locator(':visible')).first().click();

    const confirmModal = page.locator('h3:has-text("Hapus Target?")');
    await expect(confirmModal).toBeVisible();
    const dialogContainer = page.locator('.fixed.inset-0.z-\\[200\\]');
    await dialogContainer.locator('button:has-text("Hapus")').click();
    await expect(confirmModal).not.toBeVisible();
    await expect(page.locator('div.group.relative').filter({ hasText: 'Target Gaji Pokok' })).not.toBeVisible();

    // Delete Target 2
    const row2 = page.locator('div.group.relative').filter({ hasText: 'Target Bonus Kinerja' });
    await row2.locator('button[aria-label="Buka menu aksi"]').click();
    await page.locator('button:has-text("Hapus")').and(page.locator(':visible')).first().click();
    await expect(confirmModal).toBeVisible();
    await dialogContainer.locator('button:has-text("Hapus")').click();
    await expect(confirmModal).not.toBeVisible();
    await expect(page.locator('div.group.relative').filter({ hasText: 'Target Bonus Kinerja' })).not.toBeVisible();
  });
});
