import { test, expect } from '@playwright/test';

const timestamp = Date.now();
const randomStr = Math.random().toString(36).substring(7);
const testEmail = `target_qa_${timestamp}_${randomStr}@moneta.app`;
const testUsername = `target_qa_${timestamp}_${randomStr}`;
const testPassword = 'SecurePassword123!';

test.describe.serial('2.5 Financial Targets (Target Keuangan)', () => {
  test.setTimeout(120000); // 2 minutes

  let page: any;
  let context: any;

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(120000); // Extend hook timeout to 2 minutes
    context = await browser.newContext();
    page = await context.newPage();
    page.setDefaultTimeout(60000);
    
    // Register
    await page.goto('http://localhost:3000/register');
    await page.fill('#email', testEmail);
    await page.fill('#username', testUsername);
    await page.fill('#password', testPassword);
    await page.fill('#confirm-password', testPassword);
    await page.click('button[type="submit"]:has-text("Buat Akun")');
    await expect(page).toHaveURL('http://localhost:3000/', { timeout: 120000 });
    await page.waitForTimeout(2000);
    
    // Create Wallet 'Dompet Utama'
    await page.goto('http://localhost:3000/wallets');
    await page.click('button:has-text("Tambah Dompet")');
    await page.fill('input[placeholder="contoh: BCA, GoPay"]', 'Dompet Utama');
    await page.fill('input[placeholder="0"]', '1000000');
    await page.click('button[type="submit"]:has-text("Simpan Dompet")');
    await page.waitForTimeout(1000);
    
    // Create Income Transaction (Gaji 5M)
    await page.goto('http://localhost:3000/transactions');
    await page.click('button:has-text("Tambah Transaksi")');
    const modal = page.locator('.relative.z-10').filter({ hasText: 'Tambah Transaksi' });
    await expect(modal).toBeVisible();
    await modal.locator('button:has-text("Pemasukan")').first().click();
    await page.fill('#txn-amount', '5000000');
    await page.locator('button[aria-label="Dompet Utama"]').click();
    await page.locator('button[aria-label="Gaji"]').click();
    await page.fill('#txn-desc', 'Gaji QA');
    await page.click('button[type="submit"]:has-text("Simpan")');
    await expect(modal).not.toBeVisible();
    await page.waitForTimeout(1000);
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('Create: User can set an Income target', async () => {
    await page.goto('/targets');
    
    await page.click('button:has-text("Tambah Target Pemasukan")');
    
    const modal = page.locator('h2:has-text("Buat Target Baru")');
    await expect(modal).toBeVisible();
    
    // Name
    await page.fill('input[placeholder="Gaji bulanan"]', 'Target Pemasukan Bulanan');
    
    // Amount
    const amountInput = page.locator('input[placeholder="0"]');
    await amountInput.fill('10000000'); // 10 Million
    
    // Period is MONTHLY by default.
    // Select category (required)
    await page.locator('span:text-is("Gaji")').locator('..').click();
    
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

  test('Edit: User can edit an existing target', async () => {
    await page.goto('/targets');
    
    const row = page.locator('div.group.relative').filter({ hasText: 'Target Pemasukan Bulanan' });
    await row.locator('button[aria-label="Buka menu aksi"]').click();
    await page.locator('button:has-text("Ubah")').and(page.locator(':visible')).first().click();
    
    const modal = page.locator('h2:has-text("Ubah Target")');
    await expect(modal).toBeVisible();
    
    // Change limit to 5 Million so it reaches 100%
    const amountInput = page.locator('input[placeholder="0"]');
    await amountInput.fill('5000000');
    
    await page.click('button[type="submit"]:has-text("Simpan Perubahan")');
    await expect(modal).not.toBeVisible();
    
    // Verify target is now achieved
    await expect(page.locator('span:has-text("Tercapai")').first()).toBeVisible();
  });

  test('Delete: User can delete a target', async () => {
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
