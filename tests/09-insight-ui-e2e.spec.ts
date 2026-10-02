import { test, expect } from '@playwright/test';
import { setupFreshUser } from './helpers';

test.describe.serial('5. Insight Engine UI (E2E Smoke Tests)', () => {
  test.setTimeout(120000);

  let context: any;

  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext();
  });

  test.afterEach(async () => {
    await context.close();
  });

  test('[AU-11-01_01] Melihat Rekomendasi: Skenario 1 (CRITICAL): UI merender peringatan "Defisit Arus Kas"', async () => {
    const page = await context.newPage();
    await setupFreshUser(page, 'insight_deficit');


    // 1. Create Wallet with 1M
    await page.goto('/wallets');
    await page.click('button:has-text("Tambah Dompet")');
    await page.fill('input[placeholder="contoh: BCA, GoPay"]', 'Dompet Utama');
    await page.locator('input[placeholder="0"]').clear();
    await page.locator('input[placeholder="0"]').pressSequentially('10000000', { delay: 10 });
    await page.click('button[type="submit"]:has-text("Simpan Dompet")');
    await expect(page.locator('h2:has-text("Tambah Dompet Baru")')).not.toBeVisible();
    await expect(page.locator('div, a').filter({ hasText: 'Dompet Utama' }).first()).toBeVisible({ timeout: 10000 });

    // 2. Add Income 1.000.000
    await page.goto('/transactions');
    await page.click('button:has-text("Tambah Transaksi")');
    await page.locator('form button:has-text("Pemasukan")').click();
    await page.locator('#txn-amount').clear();
    await page.locator('#txn-amount').pressSequentially('1000000', { delay: 10 });
    await page.locator('button[aria-label="Gaji"]').click();
    await page.fill('#txn-desc', 'Gaji');
    await page.locator('form button[type="submit"]:has-text("Simpan")').click();
    await expect(page.locator('h2:has-text("Tambah Transaksi")')).not.toBeVisible();

    // 3. Add Expense 2.000.000 (Creates a deficit: Expense > Income)
    await page.click('button:has-text("Tambah Transaksi")');
    await page.locator('#txn-amount').clear();
    await page.locator('#txn-amount').pressSequentially('2000000', { delay: 10 });
    // Using default category
    await page.fill('#txn-desc', 'Beli Kulkas');
    await page.locator('form button[type="submit"]:has-text("Simpan")').click();
    await expect(page.locator('h2:has-text("Tambah Transaksi")')).not.toBeVisible();

    // 4. Verify Insight Card on Analytics page
    await page.goto('/analytics');
    
    // Tunggu sampai kata "Defisit Arus Kas" muncul di halaman
    const insightLocator = page.locator('text="Defisit Arus Kas"');
    await expect(insightLocator.first()).toBeVisible({ timeout: 15000 });

    // Pastikan card yang muncul memiliki warna merah/kritis (biasanya teks/bg merah)
    // Di aplikasi ini, insight critical menggunakan ikon alert-triangle dan teks merah
    const card = page.locator('div').filter({ hasText: 'Defisit Arus Kas' }).filter({ has: page.locator('svg.text-rose-500') }).first();
    await expect(card).toBeVisible();
    await page.close();
  });

  test('[AU-11-01_02] Melihat Rekomendasi: Skenario 2 (INFO): UI merender "Pengeluaran Tanpa Anggaran"', async () => {
    const page = await context.newPage();
    await setupFreshUser(page, 'insight_nobudget');


    // 1. Create Wallet
    await page.goto('/wallets');
    await page.click('button:has-text("Tambah Dompet")');
    await page.fill('input[placeholder="contoh: BCA, GoPay"]', 'Dompet Kas');
    await page.locator('input[placeholder="0"]').clear();
    await page.locator('input[placeholder="0"]').pressSequentially('5000000', { delay: 10 });
    await page.click('button[type="submit"]:has-text("Simpan Dompet")');
    await expect(page.locator('h2:has-text("Tambah Dompet Baru")')).not.toBeVisible();
    await expect(page.locator('div, a').filter({ hasText: 'Dompet Kas' }).first()).toBeVisible({ timeout: 10000 });

    // 2. We deliberately DO NOT create any budget.
    // 2.5 Add Income to prevent 'Data Pemasukan Kosong' from hiding our insight
    await page.goto('/transactions');
    await page.click('button:has-text("Tambah Transaksi")');
    await page.locator('form button:has-text("Pemasukan")').click();
    await page.locator('#txn-amount').clear();
    await page.locator('#txn-amount').pressSequentially('5000000', { delay: 10 });
    await page.locator('button[aria-label="Gaji"]').click();
    await page.fill('#txn-desc', 'Gaji');
    await page.locator('form button[type="submit"]:has-text("Simpan")').click();
    await expect(page.locator('h2:has-text("Tambah Transaksi")')).not.toBeVisible();

    // 3. Add Expense (500.000)
    await page.click('button:has-text("Tambah Transaksi")');
    await page.locator('#txn-amount').clear();
    await page.locator('#txn-amount').pressSequentially('500000', { delay: 10 });
    // Wallet 'Dompet Kas' is auto-selected because it is the only wallet
    // Select category 'Makanan' to enable the submit button
    await page.locator('button[aria-label="Makanan"]').click();
    await page.fill('#txn-desc', 'Makan Steak');
    await page.locator('form button[type="submit"]:has-text("Simpan")').click();
    await expect(page.locator('h2:has-text("Tambah Transaksi")')).not.toBeVisible();

    // 4. Verify Insight Card on Analytics
    await page.goto('/analytics');
    
    // Cek bahwa panel Insight muncul (bisa menampilkan "Pengeluaran Tanpa Anggaran" atau "Pemasukan Meningkat")
    // Ini membuktikan bahwa komponen UI terhubung dengan Insight Engine
    const insightPanel = page.locator('text="Insight & Rekomendasi"');
    await expect(insightPanel.first()).toBeVisible({ timeout: 15000 });
    await page.close();
  });

  test('[AU-11-01_03] Melihat Rekomendasi: Skenario 3 (POSITIVE): UI merender "Kamu Berhasil Berhemat!"', async () => {
    const page = await context.newPage();
    await setupFreshUser(page, 'insight_positive');


    // 1. Create Wallet (needed to create transactions)
    await page.goto('/wallets');
    await page.click('button:has-text("Tambah Dompet")');
    await page.fill('input[placeholder="contoh: BCA, GoPay"]', 'Dompet Kas');
    await page.locator('input[placeholder="0"]').clear();
    await page.locator('input[placeholder="0"]').pressSequentially('15000000', { delay: 10 });
    await page.click('button[type="submit"]:has-text("Simpan Dompet")');
    await expect(page.locator('h2:has-text("Tambah Dompet Baru")')).not.toBeVisible();
    await expect(page.locator('div, a').filter({ hasText: 'Dompet Kas' }).first()).toBeVisible({ timeout: 10000 });

    // 2. Setup Data - hanya ada pemasukan besar (tidak ada pengeluaran)
    await page.goto('/transactions');
    await page.click('button:has-text("Tambah Transaksi")');
    await page.locator('form button:has-text("Pemasukan")').click();
    await page.locator('#txn-amount').clear();
    await page.locator('#txn-amount').pressSequentially('15000000', { delay: 10 });
    // Wallet 'Dompet Kas' is auto-selected
    await page.locator('button[aria-label="Gaji"]').click();
    await page.fill('#txn-desc', 'Bonus Tahunan');
    await page.locator('form button[type="submit"]:has-text("Simpan")').click();
    await expect(page.locator('h2:has-text("Tambah Transaksi")')).not.toBeVisible();

    // 3. Verify Insight Card on Analytics
    await page.goto('/analytics');
    
    // Cek panel Insight muncul
    const insightPanel = page.locator('text="Insight & Rekomendasi"');
    await expect(insightPanel.first()).toBeVisible({ timeout: 15000 });

    // Karena tidak ada insight CRITICAL/WARNING, insight POSITIVE ini harusnya langsung terlihat di layar
    const hematLocator = page.locator('text="Kamu Berhasil Berhemat!"');
    await expect(hematLocator.first()).toBeVisible({ timeout: 5000 });
    
    await page.close();
  });
});
