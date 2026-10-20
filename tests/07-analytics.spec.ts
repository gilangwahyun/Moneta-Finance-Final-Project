import { test, expect } from '@playwright/test';
import { setupFreshUser } from './helpers';

// Helpers to get dates
const todayStr = new Date().toISOString().split('T')[0];
const lastMonthDate = new Date();
lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
const lastMonthStr = lastMonthDate.toISOString().split('T')[0];

test.describe.serial('3. Analytics & Export', () => {
  test.setTimeout(120000);

  let page: any;
  let context: any;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({
      acceptDownloads: true // Crucial for Export XLSX test
    });
    page = await context.newPage();
    page.setDefaultTimeout(60000);

    // Register unique user and login to initialize IndexedDB
    await setupFreshUser(page, 'analytics');


    // Create Wallet
    await page.goto('/wallets');
    await page.click('button:has-text("Tambah Dompet")');
    await page.fill('input[placeholder="contoh: BCA, GoPay"]', 'Dompet Utama');
    const balanceInput = page.locator('input[placeholder="0"]');
    await balanceInput.clear();
    await balanceInput.pressSequentially('0', { delay: 10 });
    await page.click('button[type="submit"]:has-text("Simpan Dompet")');
    await expect(page.locator('h2:has-text("Tambah Dompet Baru")')).not.toBeVisible();
    await expect(page.locator('div, a').filter({ hasText: 'Dompet Utama' }).first()).toBeVisible({ timeout: 10000 });

    // Create Transactions
    await page.goto('/transactions');
    
    // T1: Income this month
    await page.click('button:has-text("Tambah Transaksi")');
    const modal1 = page.locator('.relative.z-10').filter({ hasText: 'Tambah Transaksi' });
    await expect(modal1).toBeVisible();
    await modal1.locator('button:has-text("Pemasukan")').first().click();
    await page.fill('#txn-amount', '10000000');
    await page.locator('button[aria-label="Gaji"]').click();
    await page.fill('#txn-desc', 'Gaji Bulan Ini');
    await page.locator('form button[type="submit"]:has-text("Simpan")').dispatchEvent('click');
    await expect(modal1).not.toBeVisible();

    // T2: Expense this month
    await page.click('button:has-text("Tambah Transaksi")');
    const modal2 = page.locator('.relative.z-10').filter({ hasText: 'Tambah Transaksi' });
    await expect(modal2).toBeVisible();
    await modal2.locator('button:has-text("Pengeluaran")').first().click();
    await page.fill('#txn-amount', '2000000');
    await page.fill('#txn-desc', 'Makan Enak');
    await page.locator('form button[type="submit"]:has-text("Simpan")').dispatchEvent('click');
    await expect(modal2).not.toBeVisible();

    // T3: Expense LAST month
    await page.click('button:has-text("Tambah Transaksi")');
    const modal3 = page.locator('.relative.z-10').filter({ hasText: 'Tambah Transaksi' });
    await expect(modal3).toBeVisible();
    await modal3.locator('button:has-text("Pengeluaran")').first().click();
    await page.fill('#txn-amount', '1000000');
    await page.fill('#txn-date', lastMonthStr);
    await page.fill('#txn-desc', 'Tiket Pesawat Lama');
    await page.locator('form button[type="submit"]:has-text("Simpan")').dispatchEvent('click');
    await expect(modal3).not.toBeVisible();
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('[AU-10-01_01] Tampil Analisis Keuangan: Time Filters & Charts: User can view analytics and change time periods', async () => {
    await page.goto('/analytics');
    
    // By default it should show This Month
    // We expect Expense to be 2.000.000
    await expect(page.locator('div.group', { hasText: 'Total Pengeluaran' }).first()).toContainText(/2\.000\.000/);
    
    // Change to "3 Bulan Terakhir"
    // In desktop view, click the pill
    const threeMonthBtn = page.locator('button:has-text("3 Bulan Terakhir")').first();
    await threeMonthBtn.click();
    
    // Now the total expense should be 3.000.000 (2M this month + 1M last month)
    await expect(page.locator('div.group', { hasText: 'Total Pengeluaran' }).first()).toContainText(/3\.000\.000/);

    // Verify Donut Chart canvas or SVG is rendered
    // Recharts uses SVG
    const chartSvg = page.locator('.recharts-surface').first();
    await expect(chartSvg).toBeVisible();
  });

  test('[AU-10-02_01] Tampil Analisis Keuangan: Category Drilldown: User can open the drilldown drawer from the category list', async () => {
    await page.goto('/analytics');
    
    // Wait for the total value to appear to ensure data is loaded
    await expect(page.locator('.group', { hasText: 'Total Pengeluaran' }).first()).toBeVisible({ timeout: 10000 });
    
    // Click the first category button in the list below the chart
    // We target the button containing the percentage %
    const categoryBtn = page.locator('button', { hasText: /%/ }).first();
    await expect(categoryBtn).toBeVisible();
    
    const categoryName = await categoryBtn.locator('p').first().textContent();
    await categoryBtn.click();
    
    // The drawer should open with the category name
    const drawerTitle = page.locator('h2', { hasText: categoryName || '' });
    await expect(drawerTitle).toBeVisible();
    
    // Check if the summary section is rendered, which implies data is loaded
    await expect(page.locator('p', { hasText: 'Total Nominal' }).first()).toBeVisible();
    
    // Close the drawer by clicking the button containing the X icon
    await page.locator('button').filter({ has: page.locator('svg.lucide-x') }).first().click();
    await expect(drawerTitle).not.toBeVisible();
  });
  test('[AU-10-03_01] Pengujian Tampil Tren Pengeluaran/Pemasukan: User can view the bar chart and daily average', async () => {
    await page.goto('/analytics');
    
    // Check if the "Tren Pengeluaran" title is visible
    await expect(page.locator('p', { hasText: 'Tren Pengeluaran' }).first()).toBeVisible({ timeout: 10000 });
    
    // Check if daily average text is visible
    await expect(page.locator('span', { hasText: 'Rata-rata:' }).first()).toBeVisible();
    
    // Recharts Bar chart container
    const chartSvg = page.locator('.recharts-surface').nth(1);
    await expect(chartSvg).toBeVisible();
  });

  test('[AU-10-04_01] Pengujian Indikator Ringkasan Metrik: User can see the compact summary row with cashflow and trend arrows', async () => {
    await page.goto('/analytics');
    
    // Wait for page to load
    await expect(page.locator('h1', { hasText: 'Analisis Keuangan' })).toBeVisible({ timeout: 10000 });
    
    // The default view is "Bulan Ini" (This Month).
    // Based on test.beforeAll data:
    // Pemasukan this month = 10.000.000
    // Pengeluaran this month = 2.000.000
    // Selisih = 8.000.000
    
    // Memvalidasi "Benar lho" (Exact value validation)
    const rowGroupPemasukan = page.locator('div.group').filter({ hasText: 'Total Pemasukan' });
    await expect(rowGroupPemasukan).toContainText('10.000.000');
    
    const rowGroupPengeluaran = page.locator('div.group').filter({ hasText: 'Total Pengeluaran' });
    await expect(rowGroupPengeluaran).toContainText('2.000.000');
    
    const rowGroupSelisih = page.locator('div.group').filter({ hasText: 'Selisih Bersih' });
    await expect(rowGroupSelisih).toContainText('8.000.000');
  });

  test('[AU-17-01_01] Ekspor Data Keuangan: Export XLSX: User can download transactions in excel format from Profile', async () => {
    await page.goto('/profile');
    
    // Ensure all local transactions have synced to server before export
    const syncBtn = page.locator('button', { hasText: /Sinkronisasi Paksa/i }).first();
    await syncBtn.click();
    await expect(page.locator('text="Sinkronisasi berhasil!"')).toBeVisible({ timeout: 25000 });

    // Start waiting for download before clicking
    const downloadPromise = page.waitForEvent('download');
    
    // Click the Export button
    await page.locator('button:has-text("Unduh Laporan Excel")').click();
    
    // Wait for the download process to complete
    const download = await downloadPromise;
    
    // Verify file name ends with .xlsx
    expect(download.suggestedFilename()).toContain('.xlsx');
  });
});
