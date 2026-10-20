import { test, expect } from '@playwright/test';
import { setupFreshUser } from './helpers';
import * as fs from 'fs';
import * as path from 'path';

test.describe.serial('Screenshot Capture Suite for Calm UI & Nudging', () => {
  let page: any;
  let context: any;
  const screenshotDir = path.resolve(process.cwd(), 'docs/screenshots');

  test.beforeAll(async ({ browser }) => {
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }

    context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });
    page = await context.newPage();
    page.setDefaultTimeout(60000);

    // Setup user
    await setupFreshUser(page, 'shot');

    // 1. Setup Wallet: Dompet Utama = Rp 5.000.000
    await page.goto('/wallets');
    await page.click('button:has-text("Tambah Dompet")');
    await page.fill('input[placeholder="contoh: BCA, GoPay"]', 'Dompet Utama');
    await page.locator('input[placeholder="0"]').clear();
    await page.locator('input[placeholder="0"]').pressSequentially('5000000', { delay: 10 });
    await page.click('button[type="submit"]:has-text("Simpan Dompet")');
    await expect(page.locator('h2:has-text("Tambah Dompet Baru")')).not.toBeVisible();

    // 2. Setup Budgets:
    // Makanan: Rp 1.000.000
    // Belanja: Rp 800.000
    await page.goto('/budgets');
    await page.click('button:has-text("Atur Anggaran")');
    await expect(page.locator('h2:has-text("Buat Anggaran Baru")')).toBeVisible();
    await expect(page.locator('span:text-is("Makanan")').first()).toBeVisible({ timeout: 15000 });
    await page.locator('span:text-is("Makanan")').locator('..').click();
    await page.locator('input[placeholder="0"]').clear();
    await page.locator('input[placeholder="0"]').pressSequentially('1000000', { delay: 10 });
    await page.click('button[type="submit"]:has-text("Simpan Anggaran")');
    await expect(page.locator('h2:has-text("Buat Anggaran Baru")')).not.toBeVisible();

    // 3. Transactions:
    // Expense 1: Makanan Rp 400.000 (spent 400k / 1M => remaining 600k)
    await page.goto('/transactions');
    await page.click('button:has-text("Tambah Transaksi")');
    await page.locator('#txn-amount').clear();
    await page.locator('#txn-amount').pressSequentially('400000', { delay: 10 });
    await page.locator('button[aria-label="Makanan"]').click();
    await page.fill('#txn-desc', 'Makan Siang Resto');
    await page.locator('form button[type="submit"]:has-text("Simpan")').click();
    await expect(page.locator('h2:has-text("Tambah Transaksi")')).not.toBeVisible();
  });

  test('Screenshot 1: Modal Transaksi - Sisa Alokasi Positif', async () => {
    await page.goto('/transactions');
    await page.click('button:has-text("Tambah Transaksi")');
    await page.locator('button[aria-label="Makanan"]').click();

    const cue = page.locator('#budget-cue-container');
    await expect(cue).toBeVisible({ timeout: 10000 });
    await expect(cue).toContainText('Sisa alokasi bulan ini:');
    await cue.scrollIntoViewIfNeeded();

    await page.waitForTimeout(500);

    const modalContent = page.locator('div[role="dialog"], .relative.z-10.w-full.max-h-\\[90vh\\]');
    if (await modalContent.isVisible()) {
      await modalContent.screenshot({
        path: path.join(screenshotDir, '01-modal-transaksi-sisa-positif.png'),
      });
    } else {
      await page.screenshot({
        path: path.join(screenshotDir, '01-modal-transaksi-sisa-positif.png'),
      });
    }

    await page.locator('button[aria-label="Tutup form"]').click();
  });

  test('Screenshot 2: Modal Transaksi - Alokasi Sudah Terpakai Penuh', async () => {
    // Add transaction to reach 100% of Makanan (add 600.000)
    await page.goto('/transactions');
    await page.click('button:has-text("Tambah Transaksi")');
    await page.locator('#txn-amount').clear();
    await page.locator('#txn-amount').pressSequentially('600000', { delay: 10 });
    await page.locator('button[aria-label="Makanan"]').click();
    await page.fill('#txn-desc', 'Belanja Bahan Makanan');
    await page.locator('form button[type="submit"]:has-text("Simpan")').click();
    await expect(page.locator('h2:has-text("Tambah Transaksi")')).not.toBeVisible();

    // Now open modal again and select Makanan
    await page.click('button:has-text("Tambah Transaksi")');
    await page.locator('button[aria-label="Makanan"]').click();

    const cue = page.locator('#budget-cue-container');
    await expect(cue).toBeVisible({ timeout: 10000 });
    await expect(cue).toContainText('Alokasi bulan ini sudah terpakai penuh');
    await cue.scrollIntoViewIfNeeded();

    await page.waitForTimeout(500);

    const modalContent = page.locator('div[role="dialog"], .relative.z-10.w-full.max-h-\\[90vh\\]');
    if (await modalContent.isVisible()) {
      await modalContent.screenshot({
        path: path.join(screenshotDir, '02-modal-transaksi-alokasi-penuh.png'),
      });
    } else {
      await page.screenshot({
        path: path.join(screenshotDir, '02-modal-transaksi-alokasi-penuh.png'),
      });
    }

    await page.locator('button[aria-label="Tutup form"]').click();
  });

  test('Screenshot 3: Dashboard Insight Cards (Calm UI)', async () => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: path.join(screenshotDir, '03-dashboard-insight-cards.png'),
      fullPage: true,
    });
  });

  test('Screenshot 4: Halaman Analitik (Moving Average)', async () => {
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: path.join(screenshotDir, '04-halaman-analitik.png'),
      fullPage: true,
    });
  });

  test('Screenshot 5: Halaman Notifikasi (Badge Alokasi Penuh)', async () => {
    await page.goto('/notifications');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: path.join(screenshotDir, '05-halaman-notifikasi.png'),
      fullPage: true,
    });
  });

  test('Screenshot 6: Tampilan Mobile 375px', async () => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/transactions');
    await page.click('button:has-text("Tambah Transaksi")');
    await page.locator('button[aria-label="Makanan"]').click();

    // Now resize to mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    const cue = page.locator('#budget-cue-container');
    await expect(cue).toBeVisible({ timeout: 10000 });
    await cue.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    await page.screenshot({
      path: path.join(screenshotDir, '06-tampilan-mobile-375px.png'),
      fullPage: false,
    });

    await page.locator('button[aria-label="Tutup form"]').click();
  });
});
