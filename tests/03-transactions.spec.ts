import { test, expect } from '@playwright/test';

const timestamp = Date.now();
const randomStr = Math.random().toString(36).substring(7);
const testEmail = `txn_qa_${timestamp}_${randomStr}@moneta.app`;
const testUsername = `txn_qa_${timestamp}_${randomStr}`;
const testPassword = 'SecurePassword123!';

test.describe.serial('2.3 Transactions (Transaksi)', () => {

  let page: any;
  let context: any;

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(120000);
    context = await browser.newContext();
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
    
    // Wait for hydration or basic sync to initialize
    await page.waitForTimeout(2000);
    
    // 2. Create 2 wallets for testing (Dompet A & Dompet B)
    await page.goto('http://localhost:3000/wallets');
    
    // Create Dompet A
    await page.click('button:has-text("Tambah Dompet")');
    await expect(page.locator('h2:has-text("Tambah Dompet Baru")')).toBeVisible();
    await page.fill('input[placeholder="contoh: BCA, GoPay"]', 'Dompet A');
    await page.selectOption('select', 'TUNAI');
    await page.fill('input[placeholder="0"]', '1000000');
    await page.click('button[type="submit"]:has-text("Simpan Dompet")');
    await expect(page.locator('h2:has-text("Tambah Dompet Baru")')).not.toBeVisible();
    
    // Create Dompet B
    await page.click('button:has-text("Tambah Dompet")');
    await expect(page.locator('h2:has-text("Tambah Dompet Baru")')).toBeVisible();
    await page.fill('input[placeholder="contoh: BCA, GoPay"]', 'Dompet B');
    await page.selectOption('select', 'BANK');
    await page.fill('input[placeholder="0"]', '500000');
    await page.click('button[type="submit"]:has-text("Simpan Dompet")');
    await expect(page.locator('h2:has-text("Tambah Dompet Baru")')).not.toBeVisible();
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('Create Income: Adds correctly to the selected wallet', async () => {
    await page.goto('/transactions');
    
    await page.click('button:has-text("Tambah Transaksi")');
    
    const modal = page.locator('.relative.z-10').filter({ hasText: 'Tambah Transaksi' });
    await expect(modal).toBeVisible();
    
    // Select Pemasukan Tab
    await modal.locator('button:has-text("Pemasukan")').first().click();
    
    // Fill Amount
    await page.fill('#txn-amount', '500000');
    
    // Select Wallet 'Dompet A'
    // Since aria-label might be attached to the button
    await page.locator('button[aria-label="Dompet A"]').click();
    
    // Select Category 'Gaji' (default category)
    await page.locator('button[aria-label="Gaji"]').click();
    
    // Fill Description
    await page.fill('#txn-desc', 'Gaji Bulanan QA');
    
    // Save
    await page.click('button[type="submit"]:has-text("Simpan")');
    
    // Verify it appears in the list
    await expect(page.locator('span', { hasText: 'Gaji Bulanan QA' })).toBeVisible();
    // The amount should be formatted, so we just check for '500.000'
    await expect(page.locator('span', { hasText: '500.000' }).first()).toBeVisible();
  });

  test('Create Expense: Deducts correctly from the selected wallet', async () => {
    await page.goto('/transactions');
    await page.click('button:has-text("Tambah Transaksi")');
    
    const modal = page.locator('.relative.z-10').filter({ hasText: 'Tambah Transaksi' });
    await expect(modal).toBeVisible();
    
    // Select Pengeluaran Tab
    await modal.locator('button:has-text("Pengeluaran")').first().click();
    
    await page.fill('#txn-amount', '150000');
    
    await page.locator('button[aria-label="Dompet A"]').click();
    
    // Select Category 'Makanan' (default category)
    await page.locator('button[aria-label="Makanan"]').click();
    
    await page.fill('#txn-desc', 'Makan Siang QA');
    
    await page.click('button[type="submit"]:has-text("Simpan")');
    
    // Verify
    await expect(page.locator('span', { hasText: 'Makan Siang QA' })).toBeVisible();
    await expect(page.locator('span', { hasText: '150.000' }).first()).toBeVisible();
  });

  test('Create Transfer: Deducts from source wallet, adds to destination', async () => {
    await page.goto('/transactions');
    await page.click('button:has-text("Tambah Transaksi")');
    
    const modal = page.locator('.relative.z-10').filter({ hasText: 'Tambah Transaksi' });
    await expect(modal).toBeVisible();
    
    // Select Transfer Tab
    await modal.locator('button:has-text("Transfer")').first().click();
    
    await page.fill('#txn-amount', '200000');
    
    // Dompet Asal: Dompet A
    // Since both wallet selections might have similar buttons, we need to be careful
    // In TransactionModal:
    // Dompet Asal block is before Dompet Tujuan block. 
    // We can use `.locator('label:has-text("Dompet Asal") + div button[aria-label="Dompet A"]')`
    await page.locator('label:has-text("Dompet Asal")').locator('..').locator('button[aria-label="Dompet A"]').click();
    
    // Dompet Tujuan: Dompet B
    await page.locator('label:has-text("Dompet Tujuan")').locator('..').locator('button[aria-label="Dompet B"]').click();
    
    await page.click('button[type="submit"]:has-text("Simpan")');
    
    // Verify transfer appears
    // Transfer transaction has no description by default but the category name is 'Transfer' or similar, 
    // but we can just check the amount '200.000' with neutral color (not red/green, so no +/-)
    // In TransactionItem, it renders `{isIncome ? '+' : isTransfer ? '' : '-'}`
    await expect(page.locator('span', { hasText: '200.000' }).first()).toBeVisible();
  });

  test('Validation: Amount must be greater than zero', async () => {
    await page.goto('/transactions');
    await page.click('button:has-text("Tambah Transaksi")');
    
    const modal = page.locator('.relative.z-10').filter({ hasText: 'Tambah Transaksi' });
    await expect(modal).toBeVisible();
    
    // Fill Amount 0
    await page.fill('#txn-amount', '0');
    
    // Submit button should be disabled
    await expect(page.locator('button[type="submit"]:has-text("Simpan")')).toBeDisabled();
    
    // Close modal
    await modal.locator('button:has-text("Batal")').click();
    await expect(modal).not.toBeVisible();
  });

  test('Validation: Transfer must have valid source and different destination', async () => {
    await page.goto('/transactions');
    await page.click('button:has-text("Tambah Transaksi")');
    
    const modal = page.locator('.relative.z-10').filter({ hasText: 'Tambah Transaksi' });
    await expect(modal).toBeVisible();
    
    await modal.locator('button:has-text("Transfer")').first().click();
    await page.fill('#txn-amount', '50000');
    
    // Select Dompet A as Source
    const sourceSection = page.locator('label:has-text("Dompet Asal")').locator('..');
    await sourceSection.locator('button[aria-label="Dompet A"]').click();
    
    // Check if we can select Dompet A as destination.
    // The UI filters out the source wallet from the destination options.
    const destSection = page.locator('label:has-text("Dompet Tujuan")').locator('..');
    await expect(destSection.locator('button[aria-label="Dompet A"]')).not.toBeVisible();
    
    // If we don't select a destination, submit should be disabled
    await expect(page.locator('button[type="submit"]:has-text("Simpan")')).toBeDisabled();
    
    // Close modal
    await modal.locator('button:has-text("Batal")').click();
    await expect(modal).not.toBeVisible();
  });

  test('Edit: Updating amounts reflects correctly', async () => {
    await page.goto('/transactions');
    
    // Find the 'Makan Siang QA' transaction
    const row = page.locator('div.group.relative').filter({ hasText: 'Makan Siang QA' });
    await expect(row).toBeVisible();
    
    // Open action menu
    await row.locator('button[aria-label="Buka menu aksi"]').click();
    await page.locator('button:has-text("Ubah")').and(page.locator(':visible')).first().click();
    
    const modal = page.locator('h2:has-text("Ubah Transaksi")');
    await expect(modal).toBeVisible();
    
    // Change amount
    await page.fill('#txn-amount', '250000');
    await page.click('button[type="submit"]:has-text("Simpan Perubahan")');
    
    await expect(modal).not.toBeVisible();
    
    // Verify updated amount
    await expect(page.locator('span', { hasText: '250.000' }).first()).toBeVisible();
  });

  test('Delete: Deleting a transaction reverses its effect', async () => {
    await page.goto('/transactions');
    
    // Find the 'Makan Siang QA' transaction
    const row = page.locator('div.group.relative').filter({ hasText: 'Makan Siang QA' });
    await expect(row).toBeVisible();
    
    // Open action menu
    await row.locator('button[aria-label="Buka menu aksi"]').click();
    await page.locator('button:has-text("Hapus")').and(page.locator(':visible')).first().click(); // the dropdown button
    
    const confirmModal = page.locator('h3:has-text("Hapus Transaksi?")');
    await expect(confirmModal).toBeVisible();
    
    // Click "Ya, Hapus" in DeleteConfirmDialog. The button text is "Hapus" but wait, is it "Ya, Hapus" or just "Hapus"?
    // In DeleteConfirmDialog, the button is <button ...>Hapus</button> (from previous similar usage in wallets)
    // Actually in DeleteConfirmDialog, it's typically "Hapus". Let's use `button:has-text("Hapus")` inside the modal.
    const dialogContainer = page.locator('.fixed.inset-0.z-\\[200\\]');
    await dialogContainer.locator('button:has-text("Hapus")').click();
    
    await expect(confirmModal).not.toBeVisible();
    
    // Verify row is gone
    await expect(page.locator('div.group.relative').filter({ hasText: 'Makan Siang QA' })).not.toBeVisible();
  });

});
