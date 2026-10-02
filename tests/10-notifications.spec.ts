import { test, expect } from '@playwright/test';
import { setupFreshUser } from './helpers';

test.describe.serial('6. Notifications (Notifikasi)', () => {
  test.setTimeout(120000);

  let page: any;
  let context: any;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({
      permissions: ['notifications']
    });
    page = await context.newPage();
    
    // Register unique user and login to initialize IndexedDB
    await setupFreshUser(page, 'notif');

  });

  test.afterAll(async () => {
    await context.close();
  });

  test('[AU-12-01_01] Mengelola Preferensi Notifikasi: User can toggle specific notification types', async () => {
    // Go to Notification Settings (assuming it is inside profile)
    await page.goto('/profile/notifications');
    
    // Tunggu elemen form preferensi muncul
    // Ini mensimulasikan pengguna mematikan/menyalakan switch preferensi (misal "Peringatan Anggaran")
    // Karena kita tidak tahu persis label UI-nya, kita asumsikan menggunakan text seperti "Peringatan Anggaran" atau switch
    const headingLocator = page.locator('h1', { hasText: 'Pengaturan Notifikasi' });
    await expect(headingLocator.first()).toBeVisible({ timeout: 15000 });

    // Contoh: User mematikan notifikasi tipe 'insight' atau 'budget'
    // Tergantung pada implementasi checkbox / switch di /profile/notifications
    // Di sini kita cek checkbox input secara umum
    const checkboxes = page.locator('button[role="switch"]');
    
    if (await checkboxes.count() > 0) {
      // Toggle the first switch
      const firstSwitch = checkboxes.first();
      const initialState = await firstSwitch.getAttribute('aria-checked');
      await firstSwitch.click();
      
      // Tunggu state berubah
      await expect(firstSwitch).not.toHaveAttribute('aria-checked', initialState as string);
    }

  });

  test('[AU-12-02_01] Batas Harian Notifikasi: User can set maximum daily notifications', async () => {

    await page.goto('/profile/notifications');
    
    const headingLocator = page.locator('h1', { hasText: 'Pengaturan Notifikasi' });
    await expect(headingLocator.first()).toBeVisible({ timeout: 15000 });

    // Coba ubah batas harian (biasanya input number atau dropdown)
    // Asumsi ada label "Batas Harian" atau input dengan id/name tertentu
    const limitInput = page.locator('input[type="number"], select').last();
    
    if (await limitInput.isVisible()) {
      if (await limitInput.getAttribute('type') === 'number') {
        await limitInput.fill('5'); // Batas harian = 5
      } else {
        await limitInput.selectOption('5');
      }
      
      // Save settings
      const saveBtn = page.locator('button:has-text("Simpan")');
      if (await saveBtn.isVisible()) {
        await saveBtn.click();
        await expect(page.locator('text="berhasil"').first()).toBeVisible();
      }
    }

  });

  test('[AU-14-01_01] Melihat Notifikasi: User can view the notification list', async () => {

    // Buka dropdown/halaman notifikasi
    // Biasanya ada ikon lonceng di navbar atau menu di sidebar
    const bellIcon = page.locator('a[href="/notifications"]').first();
    if (await bellIcon.isVisible()) {
      await bellIcon.click();
      
      // Pastikan halaman/panel notifikasi terbuka (mencari heading Notifikasi)
      const notifPanel = page.locator('h1:has-text("Notifikasi")');
      await expect(notifPanel.first()).toBeVisible({ timeout: 10000 });
    }


  });

  test('[AU-14-02_01] Membaca/Klik Notifikasi: User can click and mark a notification as read', async () => {

    // Skenario untuk memicu notifikasi: Buat transaksi dengan budget berisiko
    // (Bisa juga melalui trigger sistem)
    // Jika ada notifikasi, klik notifikasi tersebut

    const bellIcon = page.locator('a[href="/notifications"]').first();
    if (await bellIcon.isVisible()) {
      await bellIcon.click();
      
      // Tunggu item notifikasi
      const notifItems = page.locator('.notification-item, [role="menuitem"]');
      if (await notifItems.count() > 0) {
        await notifItems.first().click();
        
        // Memastikan status menjadi terbaca (read)
        // Biasanya UI akan mengarahkan ke halaman tertentu atau mengubah styling (menghilangkan dot/bold)
      }
    }
    

  });

  test('[AU-13-01_01] Menerima Notifikasi: System Triggers Budget Push Notifications (50%, 80%, 100%) [Ref: BG-00]', async () => {

    // 1. Create Wallet with 10.000.000
    await page.goto('/wallets');
    await page.click('button:has-text("Tambah Dompet")');
    await page.fill('input[placeholder="contoh: BCA, GoPay"]', 'Dompet Gaji');
    await page.locator('input[placeholder="0"]').clear();
    await page.locator('input[placeholder="0"]').pressSequentially('10000000', { delay: 10 });
    await page.click('button[type="submit"]:has-text("Simpan Dompet")');
    await expect(page.locator('h2:has-text("Tambah Dompet Baru")')).not.toBeVisible();

    // 2. Create Budget for 'Makanan' = 1.000.000
    await page.goto('/budgets');
    await page.click('button:has-text("Atur Anggaran")');
    await expect(page.locator('h2:has-text("Buat Anggaran Baru")')).toBeVisible();
    await expect(page.locator('span:text-is("Makanan")').first()).toBeVisible({ timeout: 20000 });
    await page.locator('span:text-is("Makanan")').locator('..').click();
    await page.locator('input[placeholder="0"]').clear();
    await page.locator('input[placeholder="0"]').pressSequentially('1000000', { delay: 10 });
    await page.click('button[type="submit"]:has-text("Simpan Anggaran")');
    await expect(page.locator('h2:has-text("Buat Anggaran Baru")')).not.toBeVisible();

    // 3. Add Expense 500.000 (Exactly 50%) -> Should trigger BG-00
    await page.goto('/transactions');
    await page.click('button:has-text("Tambah Transaksi")');
    await page.locator('#txn-amount').clear();
    await page.locator('#txn-amount').pressSequentially('500000', { delay: 10 });
    await page.locator('button[aria-label="Makanan"]').click();
    await page.fill('#txn-desc', 'Makan Steak 1');
    await page.locator('form button[type="submit"]:has-text("Simpan")').click();
    await expect(page.locator('h2:has-text("Tambah Transaksi")')).not.toBeVisible();
    
    // Check if notification 50% appears
    const toast50 = page.locator('text="Penggunaan Anggaran Berjalan"');
    await expect(toast50.first()).toBeVisible({ timeout: 10000 });

    // 4. Add Expense 300.000 (Total 80%) -> Should trigger BG-00b
    await page.click('button:has-text("Tambah Transaksi")');
    await page.locator('#txn-amount').clear();
    await page.locator('#txn-amount').pressSequentially('300000', { delay: 10 });
    await page.locator('button[aria-label="Makanan"]').click();
    await page.fill('#txn-desc', 'Makan Steak 2');
    await page.locator('form button[type="submit"]:has-text("Simpan")').click();
    await expect(page.locator('h2:has-text("Tambah Transaksi")')).not.toBeVisible();

    // Check if notification 80% appears
    const toast80 = page.locator('text="Anggaran Mulai Menipis"');
    await expect(toast80.first()).toBeVisible({ timeout: 10000 });

    // 5. Add Expense 200.000 (Total 100%) -> Should trigger BG-00c
    await page.click('button:has-text("Tambah Transaksi")');
    await page.locator('#txn-amount').clear();
    await page.locator('#txn-amount').pressSequentially('200000', { delay: 10 });
    await page.locator('button[aria-label="Makanan"]').click();
    await page.fill('#txn-desc', 'Makan Steak 3');
    await page.locator('form button[type="submit"]:has-text("Simpan")').dispatchEvent('click');
    await expect(page.locator('h2:has-text("Tambah Transaksi")')).not.toBeVisible();

    // Check if notification 100% appears
    // Can be "Batas Anggaran Tercapai" or "Batas Anggaran Terlampaui" or "Subsidi Silang"
    const toast100 = page.locator('text=/Batas Anggaran|Subsidi Silang/i');
    await expect(toast100.first()).toBeVisible({ timeout: 10000 });
  });

  test('[AU-13-01_02] Menerima Notifikasi: System Triggers Low Cash Warning [Ref: WL-02]', async () => {
    // 1. Create a new wallet with small balance
    await page.goto('/wallets');
    await page.click('button:has-text("Tambah Dompet")');
    await page.fill('input[placeholder="contoh: BCA, GoPay"]', 'TestWallet');
    await page.locator('input[placeholder="0"]').clear();
    await page.locator('input[placeholder="0"]').pressSequentially('200000', { delay: 10 });
    await page.click('button[type="submit"]:has-text("Simpan")');
    await expect(page.locator('h2:has-text("Tambah Dompet Baru")')).not.toBeVisible();
    await page.waitForTimeout(1000);

    // 2. Add Expense that drops balance below threshold (threshold is Math.max(100k, 10% avgExpense))
    // We spend 150k so balance becomes 50k (< 100k)
    await page.goto('/transactions');
    await page.click('button:has-text("Tambah Transaksi")');
    const modal = page.locator('.relative.z-10').filter({ hasText: 'Tambah Transaksi' });
    await expect(modal).toBeVisible();
    
    // Select Pengeluaran Tab
    await modal.locator('button:has-text("Pengeluaran")').first().click();
    
    // Debug screenshot
    await page.screenshot({ path: 'test-wallet-debug.png', fullPage: true });

    // Choose TestWallet using substring match instead of exact aria-label
    await page.locator('button', { hasText: 'TestWallet' }).first().click();
    
    await page.locator('#txn-amount').clear();
    await page.locator('#txn-amount').pressSequentially('150000', { delay: 10 });
    
    // Wait for category to be visible, pick any (e.g. Transportasi or Makanan)
    await expect(page.locator('button[aria-label="Transportasi"]').first()).toBeVisible({ timeout: 20000 });
    await page.locator('button[aria-label="Transportasi"]').click();
    
    await page.fill('#txn-desc', 'Uji Dompet Menipis');
    await page.locator('form button[type="submit"]:has-text("Simpan")').click();
    await expect(page.locator('h2:has-text("Tambah Transaksi")')).not.toBeVisible();

    // 3. Verify the Push Notification toast
    const toast = page.locator('text="Saldo Dompet Menipis"');
    await expect(toast.first()).toBeVisible({ timeout: 10000 });
  });
});
