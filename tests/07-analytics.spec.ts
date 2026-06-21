import { test, expect } from '@playwright/test';

const timestamp = Date.now();
const randomStr = Math.random().toString(36).substring(7);
const testEmail = `analytics_qa_${timestamp}_${randomStr}@moneta.app`;
const testUsername = `analytics_qa_${timestamp}_${randomStr}`;
const testPassword = 'SecurePassword123!';

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
    test.setTimeout(120000);
    context = await browser.newContext({
      acceptDownloads: true // Crucial for Export XLSX test
    });
    page = await context.newPage();
    page.setDefaultTimeout(60000);
    
    // 1. Register a fresh user
    await page.goto('http://localhost:3000/register');
    await page.fill('#email', testEmail);
    await page.fill('#username', testUsername);
    await page.fill('#password', testPassword);
    await page.fill('#confirm-password', testPassword);
    await page.click('button[type="submit"]:has-text("Buat Akun")');
    await expect(page).toHaveURL('http://localhost:3000/', { timeout: 120000 });
    await page.waitForTimeout(2000);

    // 2. Create Wallet
    await page.goto('/wallets');
    await page.click('button:has-text("Tambah Dompet")');
    await page.fill('input[placeholder="contoh: BCA, GoPay"]', 'Dompet Utama');
    const balanceInput = page.locator('input[placeholder="0"]');
    await balanceInput.fill('0');
    await page.click('button[type="submit"]:has-text("Simpan Dompet")');
    await page.waitForTimeout(1000);

    // 3. Create Transactions
    await page.goto('/transactions');
    
    // T1: Income this month
    await page.click('button:has-text("Tambah Transaksi")');
    await expect(page.locator('h2:has-text("Tambah Transaksi")')).toBeVisible();
    await page.locator('form button:has-text("Pemasukan")').click();
    await page.fill('#txn-amount', '10000000');
    await page.locator('button[aria-label="Gaji"]').click();
    await page.fill('#txn-desc', 'Gaji Bulan Ini');
    await page.locator('form button[type="submit"]:has-text("Simpan")').click();
    await expect(page.locator('h2:has-text("Tambah Transaksi")')).not.toBeVisible();

    // T2: Expense this month
    await page.click('button:has-text("Tambah Transaksi")');
    await expect(page.locator('h2:has-text("Tambah Transaksi")')).toBeVisible();
    await page.fill('#txn-amount', '2000000');
    // 'Makan & Minum' is auto-selected by default, skipping explicit click to prevent timeouts.
    await page.fill('#txn-desc', 'Makan Enak');
    await page.locator('form button[type="submit"]:has-text("Simpan")').click();
    await expect(page.locator('h2:has-text("Tambah Transaksi")')).not.toBeVisible();

    // T3: Expense LAST month
    await page.click('button:has-text("Tambah Transaksi")');
    await expect(page.locator('h2:has-text("Tambah Transaksi")')).toBeVisible();
    await page.fill('#txn-amount', '1000000');
    await page.fill('#txn-date', lastMonthStr);
    // Rely on default category for this transaction as well.
    await page.fill('#txn-desc', 'Tiket Pesawat Lama');
    await page.locator('form button[type="submit"]:has-text("Simpan")').click();
    await expect(page.locator('h2:has-text("Tambah Transaksi")')).not.toBeVisible();
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('Time Filters & Charts: User can view analytics and change time periods', async () => {
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

  test('Category Drilldown: User can open the drilldown drawer from the category list', async () => {
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

  test('Export XLSX: User can download transactions in excel format from Profile', async () => {
    await page.goto('/profile');
    
    // Start waiting for download before clicking
    const downloadPromise = page.waitForEvent('download');
    
    // Click the Export button
    await page.locator('button:has-text("Unduh Laporan Excel")').click();
    
    // Wait for the download process to complete
    const download = await downloadPromise;
    
    // Verify file name ends with .xlsx
    expect(download.suggestedFilename()).toContain('.xlsx');
    
    // You can also check if there's no error toaster if the download fails
    // Here we just verify the download event fired properly with correct extension
  });
});
