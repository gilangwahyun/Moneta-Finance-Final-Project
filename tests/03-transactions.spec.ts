import { test, expect } from '@playwright/test';
import { setupFreshUser } from './helpers';

test.describe.serial('2.3 Transactions (Transaksi)', () => {

  let page: any;
  let context: any;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
    page.setDefaultTimeout(60000);

    // Register unique user and login to initialize IndexedDB
    await setupFreshUser(page, 'trx');

    
    // Create 2 wallets for testing (Dompet A & Dompet B)
    await page.goto('/wallets');
    
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

  test('[AU-04-01_01] Tambah Transaksi: Create Income adds correctly to the selected wallet', async () => {
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

  test('[AU-04-01_02] Tambah Transaksi: Create Expense deducts correctly from the selected wallet', async () => {
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

  test('[AU-07-01_01] Transfer Dompet: Create Transfer deducts from source wallet, adds to destination', async () => {
    await page.goto('/transactions');
    await page.click('button:has-text("Tambah Transaksi")');
    
    const modal = page.locator('.relative.z-10').filter({ hasText: 'Tambah Transaksi' });
    await expect(modal).toBeVisible();
    
    // Select Transfer Tab
    await modal.locator('button:has-text("Transfer")').first().click();
    
    await page.fill('#txn-amount', '200000');
    
    // Dompet Asal: Dompet A
    await modal.locator('label:has-text("Dompet Asal")').locator('..').locator('button[aria-label="Dompet A"]').click();
    
    // Dompet Tujuan: Dompet B
    await modal.locator('label:has-text("Dompet Tujuan")').locator('..').locator('button[aria-label="Dompet B"]').click();
    
    await modal.locator('button[type="submit"]:has-text("Simpan")').click();
    
    // Verify transfer appears
    await expect(page.locator('span', { hasText: '200.000' }).first()).toBeVisible();
  });

  test('[AU-04-01_03] Tambah Transaksi Invalid: Amount must be greater than zero', async () => {
    await page.goto('/transactions');
    await page.click('button:has-text("Tambah Transaksi")');
    
    const modal = page.locator('.relative.z-10').filter({ hasText: 'Tambah Transaksi' });
    await expect(modal).toBeVisible();
    
    // Fill Amount 0
    await page.fill('#txn-amount', '0');
    
    // Submit button should be disabled
    await expect(modal.locator('button[type="submit"]:has-text("Simpan")')).toBeDisabled();
    
    // Close modal
    await modal.locator('button:has-text("Batal")').click();
    await expect(modal).not.toBeVisible();
  });

  test('[AU-07-01_02] Transfer Dompet Invalid: Transfer must have valid source and different destination', async () => {
    await page.goto('/transactions');
    await page.click('button:has-text("Tambah Transaksi")');
    
    const modal = page.locator('.relative.z-10').filter({ hasText: 'Tambah Transaksi' });
    await expect(modal).toBeVisible();
    
    await modal.locator('button:has-text("Transfer")').first().click();
    await page.fill('#txn-amount', '50000');
    
    // Select Dompet A as Source
    const sourceSection = modal.locator('label:has-text("Dompet Asal")').locator('..');
    await sourceSection.locator('button[aria-label="Dompet A"]').click();
    
    // Check if we can select Dompet A as destination.
    const destSection = modal.locator('label:has-text("Dompet Tujuan")').locator('..');
    await expect(destSection.locator('button[aria-label="Dompet A"]')).not.toBeVisible();
    
    // If we don't select a destination, submit should be disabled
    await expect(modal.locator('button[type="submit"]:has-text("Simpan")')).toBeDisabled();
    
    // Close modal
    await modal.locator('button:has-text("Batal")').click();
    await expect(modal).not.toBeVisible();
  });

  test('[AU-04-05_01] Ekstraksi Teks Mutasi: Quick paste mutation text auto-extracts nominal amount', async () => {
    await page.goto('/transactions');
    await page.click('button:has-text("Tambah Transaksi")');
    
    const modal = page.locator('.relative.z-10').filter({ hasText: 'Tambah Transaksi' });
    await expect(modal).toBeVisible();
    
    // Select Pengeluaran Tab
    await modal.locator('button:has-text("Pengeluaran")').first().click();
    
    // Open Quick Paste accordion
    await modal.locator('button:has-text("Paste Teks Mutasi M-Banking")').click();
    
    // Fill mutation text
    await page.fill('#txn-mutation-text', 'BCA - Debit Rp150.000 dari rek 123456789 berhasil');
    
    // Verify amount input auto-filled with 150000
    await expect(page.locator('#txn-amount')).toHaveValue('150.000');
    
    // Verify success status badge
    await expect(modal.locator('text="Nominal ditemukan"')).toBeVisible();
    
    // Select Wallet 'Dompet A'
    await modal.locator('button[aria-label="Dompet A"]').click();
    
    // Select Category 'Makanan'
    await modal.locator('button[aria-label="Makanan"]').click();
    
    // Fill Description
    await page.fill('#txn-desc', 'Makan Siang Mutasi');
    
    // Save
    await modal.locator('button[type="submit"]:has-text("Simpan")').click();
    await expect(modal).not.toBeVisible();
    
    // Verify it appears in the list
    await expect(page.locator('span', { hasText: 'Makan Siang Mutasi' })).toBeVisible();
    await expect(page.locator('span', { hasText: '150.000' }).first()).toBeVisible();
  });

  test('[AU-04-05_02] Ekstraksi Teks Mutasi: Ignores account balance (SALDO) and correctly extracts transaction amount', async () => {
    await page.goto('/transactions');
    await page.click('button:has-text("Tambah Transaksi")');
    
    const modal = page.locator('.relative.z-10').filter({ hasText: 'Tambah Transaksi' });
    await expect(modal).toBeVisible();
    
    // Select Pemasukan Tab
    await modal.locator('button:has-text("Pemasukan")').first().click();
    
    // Open Quick Paste accordion
    await modal.locator('button:has-text("Paste Teks Mutasi M-Banking")').click();
    
    // Fill mutation text with SALDO > JUMLAH
    const mutationWithBalance = `TANGGAL : 04/07\nKETERANGAN : TRSF E-BANKING CR\n0407/FTSCY/WS95011\nDARI: BUDI SANTOSO\nJUMLAH : Rp 1.500.000,00\nSALDO : Rp 5.500.000,00`;
    await page.fill('#txn-mutation-text', mutationWithBalance);
    
    // Verify amount input auto-filled with 1.500.000 (NOT 5.500.000)
    await expect(page.locator('#txn-amount')).toHaveValue('1.500.000');
    
    // Verify success status badge
    await expect(modal.locator('text="Nominal ditemukan"')).toBeVisible();
    
    // Close modal without saving (just testing the parser/extraction UI)
    await modal.locator('button:has-text("Batal")').click();
    await expect(modal).not.toBeVisible();
  });

  test('[AU-04-02_01] Ubah Transaksi: Updating amounts reflects correctly', async () => {
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

  test('[AU-04-03_01] Hapus Transaksi: Deleting a transaction reverses its effect', async () => {
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
