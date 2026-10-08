# Moneta Data Flows

This document details the step-by-step operational data flows within Moneta's offline-first architecture.

**Frontend UI Note:**
Moneta's frontend UI must always reflect the local-first state:

- Data changes must be immediately visible in the UI after local storage.
- Sync status informs the user whether changes are pending, syncing, synced, or failed.
- Frontend components must never force the user to wait for a server response before displaying local changes.

For detailed UI visual and interaction standards, including action menus, bottom sheets, delete confirmations, and sync status, see `docs/FRONTEND_UI_GUIDELINES.md`.

---

## 1. App Startup and Hydration

_Triggered on initial login or when forcing a full data reset._

1. **Server API**: The UI triggers `/api/sync/pull?mode=hydrate`.
2. **Server API**: The server fetches core domain data (which may use bounded history windows or pagination for long-term scalability) and all notification settings/logs.
3. **Local DB**: The `sync-manager` receives the payload and writes it directly to the IndexedDB repositories.
4. **sync_queue**: Data is inserted with `syncStatus = "SYNCED"` and explicitly skips the `sync_queue` to avoid loops.
5. **PWA Shell Cache**: The Service Worker actively caches core offline routes (e.g., `/wallets`, `/categories`, `/transactions`) to ensure navigation works without network access.
6. **Notification Behavior**: Pulled logs bypass the Service Worker trigger and strictly do not fire `showNotification()`.
7. **UI Update**: `useLiveQuery` hooks detect IDB changes and instantly render the populated UI (Sinkronisasi Pull Progresif), allowing components to update independently as their specific entities finish hydrating.

## 2. Create Transaction

1. **UI Update**: User submits form.
2. **Local DB**: `createTransaction` inserts the record into IDB with `syncStatus = "PENDING"`.
3. **sync_queue**: A mutation record (`CREATE`, `transaction`, `clientId`) is immediately enqueued.
4. **Notification Behavior**: Local notification engine evaluates budget usage. If a threshold is crossed, a local `notification_log` is created.
5. **Server API**: Background sync eventually reads `sync_queue` and POSTs to `/api/sync/push`.
6. **Local DB**: Upon successful push, local `syncStatus` updates to `"SYNCED"` and the queue is cleared.

## 3. Update Transaction

1. **UI Update**: User edits form.
2. **Local DB**: `updateTransaction` updates IDB record, changes `updatedAt`, and sets `syncStatus = "PENDING"`.
3. **sync_queue**: An `UPDATE` mutation is enqueued.
4. **Notification Behavior**: Local engine re-evaluates budgets and updates logs if necessary.
5. **Server API**: Pushed to `/api/sync/push`. If server `updatedAt` is newer, last-write-wins resolves the conflict.

## 4. Delete Transaction (and other Entities)

1. **UI Update**: User clicks delete.
2. **Local DB**: Instead of hard-deleting, IDB record is marked `deletedAt = now()` and `syncStatus = "PENDING"`. UI hooks filter out deleted records instantly.
3. **sync_queue**: A `DELETE` mutation is enqueued.
4. **Tombstone Fallback**: If the local IndexedDB record is unexpectedly cleared or missing during push sync, `buildPushPayload` recovers the essential entity data directly from the `sync_queue` JSON payload to prevent deadlocks.
5. **Server API**: Pushed to server, which applies the soft-delete to PostgreSQL.

### Architectural Note: Soft Delete vs. Hard Delete Segregation
To prevent **Phantom Delete Queue** pollution and **Zombie/Orphaned Records** during offline-to-online reconciliation, the codebase strictly enforces the boundary between user actions and system synchronization:
- **User Actions (UI/Hooks Layer)**: Always execute **Soft Deletes** (`deleteBudget`, `deleteWallet`, `deleteCategory`, `deleteTransaction`), marking `deletedAt = now()` and recording the action in `sync_queue` to propagate user intent to the server.
- **Sync Reconciliation (Sync Engine Layer)**: When resolving conflicts (replacing local `clientId` with server UUIDs in `sync-manager.ts`), the engine executes **Hard Deletes** (`hardDeleteBudget`, `hardDeleteWallet`, etc.) directly on IndexedDB object stores without enqueueing actions into `sync_queue`. This guarantees clean ID replacement without triggering phantom deletions on the cloud database or leaving zombie records locally.

## 5. Create / Update Budget & Financial Target

1. **UI Update**: User sets a budget limit (Anggaran) for an expense category, or creates a Financial Target (Target Pemasukan).
2. **Local DB**: Budget/Target IDB record created/updated (`syncStatus = "PENDING"`, `updatedAt` bumped).
3. **sync_queue**: `CREATE`/`UPDATE` budget or target mutation enqueued.
4. **Notification Behavior**: Re-evaluating the budget or target against current status may trigger immediate local warnings or positive target updates.
5. **Server API**: Pushed to server. Budget and Target mutations are pushed _before_ transactions to satisfy foreign key constraints.

**Note on Budget Reallocation (Subsidi Silang)**: Budget reallocation is implemented as two local budget updates:

- source budget amount decreases
- destination budget amount increases
  Both updates are stored locally and synchronized through the normal budget update sync path. No separate reallocation entity is used in the current version.

## 6. Local Notification Trigger

The notification system follows a strict four-layer pipeline. Each layer is independent:

```
Event Evaluation  →  Log Creation (always)  →  Delivery Decision (mode-gated)  →  Delivery Execution
```

### Layer 1: Event Evaluation
- A transaction creation/update causes spending to cross a budget threshold (50%, 80%, 100%, or >100%).
- `local-engine.ts` is called via `evaluateAndTriggerNudges()` from `transactions.ts`.
- Nudge insights are generated based on budget limits and wallet balances. The most critical, non-duplicate insight is selected.

### Layer 2: Log Creation (always, independent of delivery mode)
- A `notification_log` record is written to IDB with `status: 'delivered'`.
- A `dedupeKey` prevents duplicate logs for the same unchanged budget state.
- The log is enqueued for sync to the server.
- **Log creation is never blocked by delivery mode or the daily push cap.**
  The in-app Notifications page shows all logs regardless of whether a device push was sent.

### Layer 3: Delivery Decision
- `resolveDeliveryMode(settings)` reads the authoritative mode from IDB notification_settings:
  - **NONE (OFF)**: skip push, reason `mode_off`. Logs still written.
  - **DIGEST**: skip individual push, reason `digest_mode_active`. Logs still written.
  - **INSTANT**: continue to Layer 4.
- In INSTANT mode, push prerequisites are checked in order:
  1. Service worker available → else skip (`service_worker_unavailable`).
  2. OS permission `granted` → else skip (`permission_not_granted`).
  3. Daily push cap not exceeded (localStorage push counter) → else skip (`daily_push_cap_reached`).
  - **The daily push cap limits device push delivery only. It does not block log creation.**

### Layer 4: Delivery Execution
- `reg.showNotification()` is called with `notification.data = { clientId, logId, ctaRoute, type }`.
  - `renotify: true` prevents tag collisions from silently swallowing banners.
  - `requireInteraction: true` only for critical (100%) alerts.
- After successful `showNotification()`, the localStorage push counter is incremented.

### Digest Delivery (DIGEST mode)
- A server-side cron job (via GitHub Actions) runs every 15 minutes to call `GET /api/cron/digest`.
- The server queries `notification_settings` to find users whose `digestTime` falls within the current 15-minute window and `dailyDigest == true`.
- For each eligible user, `buildServerDigestContent()` reads today's un-digested `notification_logs` from PostgreSQL.
- If eligible logs exist, a Web Push Notification payload is sent to the user's Service Worker (via `sendAndLogPushNotification`):
  *"Ada 5 pembaruan penting hari ini: 1 anggaran terlampaui, 2 anggaran mendekati batas, 2 insight baru."*
- The processed logs are marked with `digestSentAt = now()` in the database to prevent duplicate summaries.
- Digest click always opens `/notifications` (the Notifications inbox page).

### UI Update
- Notification badge and inbox are updated via `useLiveQuery` on the `notification_logs` IDB store.



## 7. Notification Log Sync (read_at)

1. **Event**: User reads a notification — either by clicking the OS push notification banner, or by clicking the item in the Notifications page.
2. **Push Notification Click Path**:
   - Service worker `notificationclick` reads `notification.data.clientId`.
   - If an app window is open: SW posts `NOTIFICATION_CLICKED` message to the app client with `notificationClientId`.
   - The dashboard layout's SW message handler calls `markLogRead(clientId)`, which sets `readAt`, `updatedAt`, `syncStatus = "PENDING"` in IDB and enqueues a `notification_log:update` into `sync_queue`.
   - If the app was closed: SW opens a new window with `?notifRead=<clientId>` query param. On mount, the layout reads the param, calls `markLogRead()`, and removes the param from the URL.
3. **Notifications Page Click Path**: Clicking a notification item calls `markLogRead(clientId)` directly — same function, same enqueue behavior.
4. **sync_queue**: `UPDATE` log mutation is enqueued with full record including `readAt`.
5. **Server API**: Pushed to server. `readAt` is persisted to `notification_logs.read_at` column.
4. **Conflict Resolution**: Resolves heavily via `updatedAt` to ensure read states don't regress.

## 8. Notification Settings Sync

1. **UI Update**: User changes toggle in Profile.
2. **Local DB**: `notification_settings` IDB updated (`syncStatus = "PENDING"`).
3. **sync_queue**: Enqueued for push.
4. **Server API**: Pulled settings from other devices bypass `sync_queue` locally but still run through `resolveConflict` to protect local unpushed edits.

## 9. Push Sync

1. **Trigger**: Online status restored or manual trigger.
2. **Local DB**: `sync-manager` reads all `sync_queue` items.
3. **Server API**: POSTs batched payload to `/api/sync/push`.
   _Strict Order_: Categories → Wallets → Budgets → Targets → Transactions → Settings → Logs.
4. **Local DB**: Dequeues successful mutations and marks records `SYNCED`.

## 10. Pull Sync

1. **Trigger**: Completes immediately after Push Sync (bidirectional loop).
2. **Server API**: GET `/api/sync/pull?lastSyncedAt=...` fetches deltas.
3. **Local DB**: `sync-manager` iterates over pulled data.
4. **Conflict Resolution**: If a local record is `PENDING`, `updatedAt` decides the winner.
5. **sync_queue**: Winning server records are written to IDB with `skipSyncQueue = true`.
6. **Progressive Apply**: As entities are written to IDB, the UI updates progressively per entity via `useLiveQuery` without waiting for the entire pull to finish (Sinkronisasi Pull Progresif).

## 11. Export XLSX

1. **UI Update**: User navigates to Profile and clicks Export.
2. **Server API**: _Online Only._ The client directly fetches `/api/export`.
3. **Response**: Server queries PostgreSQL directly and returns the generated spreadsheet buffer.

## 12. Analytics Insight Trigger (Dashboard)

1. **Trigger**: User navigates to the Analytics dashboard or Home page.
2. **Local DB**: `use-analytics.ts` hook reads transaction history up to 3 months back from IndexedDB.
3. **Logic Engine**: `generateNudges()` from `nudging.ts` evaluates the data against predefined behavioral rules (assigning an ascending decimal priority, e.g., 1.0 to 4.0, where smaller is more critical).
4. **Weighted Priority Sort**: In the UI layer (`InsightsPanel`), insights are grouped and sorted by severity: Critical (3) > Warning (2) > Positive (1) > Neutral (0) > Info (-1).
5. **Smart Limit & Mitigation**: To prevent "Insight Fatigue", the UI enforces a display limit. All Critical insights are shown. Remaining slots up to a default of 3 are filled with the highest priority insights. Additional insights are hidden behind an expandable "Lihat insight lainnya" button.

---

# Alur Data Moneta (Versi Bahasa Indonesia)

Dokumen ini menjelaskan langkah demi langkah alur data operasional di dalam arsitektur *offline-first* Moneta.

**Catatan Antarmuka Pengguna (UI):**
Antarmuka Moneta harus selalu mencerminkan state *local-first* (data lokal terlebih dahulu):

- Perubahan data harus langsung terlihat di UI setelah disimpan di penyimpanan lokal.
- Status sinkronisasi memberikan informasi kepada pengguna apakah perubahan sedang menunggu, sedang diproses, berhasil disinkronkan, atau gagal.
- Komponen frontend tidak boleh memaksa pengguna menunggu respons dari server sebelum menampilkan perubahan data lokal.

Untuk standar interaksi dan visual UI yang lebih detail, termasuk menu aksi, *bottom sheets*, konfirmasi penghapusan, dan status sinkronisasi, lihat `docs/FRONTEND_UI_GUIDELINES.md`.

---

## 1. Memulai Aplikasi dan Hidrasi Data (Hydration)

*Dicuatkan saat login awal atau ketika memaksa reset data penuh.*

1. **Server API**: UI memanggil `/api/sync/pull?mode=hydrate`.
2. **Server API**: Server mengambil data domain utama (yang mungkin menggunakan batasan riwayat atau paginasi untuk skalabilitas jangka panjang) beserta semua pengaturan/log notifikasi.
3. **Local DB**: `sync-manager` menerima muatan data (payload) dan langsung menuliskannya ke repositori IndexedDB.
4. **sync_queue**: Data dimasukkan dengan status `syncStatus = "SYNCED"` dan secara eksplisit melewati antrean `sync_queue` untuk menghindari iterasi sinkronisasi berulang (loop).
5. **PWA Shell Cache**: Service Worker secara aktif menyimpan *cache* untuk rute-rute *offline* utama (misal: `/wallets`, `/categories`, `/transactions`) untuk memastikan navigasi tetap berjalan tanpa akses internet.
6. **Perilaku Notifikasi**: Log yang ditarik dari server akan mengabaikan pemicu Service Worker dan dipastikan tidak akan mengeksekusi `showNotification()`.
7. **Pembaruan UI**: *Hook* `useLiveQuery` mendeteksi perubahan IDB dan secara instan merender UI yang telah terisi (Sinkronisasi Pull Progresif), sehingga komponen dapat memperbarui tampilannya secara mandiri saat data spesifik mereka selesai dihidrasi.

## 2. Membuat Transaksi

1. **Pembaruan UI**: Pengguna mengirimkan form.
2. **Local DB**: Fungsi `createTransaction` memasukkan data ke IDB dengan `syncStatus = "PENDING"`.
3. **sync_queue**: Sebuah rekaman mutasi (`CREATE`, `transaction`, `clientId`) langsung dimasukkan ke antrean.
4. **Perilaku Notifikasi**: Mesin notifikasi lokal mengevaluasi penggunaan anggaran. Jika batas tertentu terlewati, sebuah `notification_log` lokal akan dibuat.
5. **Server API**: Sinkronisasi latar belakang nantinya akan membaca `sync_queue` dan melakukan POST ke `/api/sync/push`.
6. **Local DB**: Setelah *push* berhasil, `syncStatus` lokal diperbarui menjadi `"SYNCED"` dan antrean dibersihkan.

## 3. Memperbarui Transaksi

1. **Pembaruan UI**: Pengguna mengedit form.
2. **Local DB**: `updateTransaction` memperbarui data di IDB, mengubah `updatedAt`, dan mengatur `syncStatus = "PENDING"`.
3. **sync_queue**: Mutasi `UPDATE` dimasukkan ke antrean.
4. **Perilaku Notifikasi**: Mesin notifikasi lokal mengevaluasi ulang anggaran dan memperbarui log jika diperlukan.
5. **Server API**: Data dikirim ke `/api/sync/push`. Jika `updatedAt` di server lebih baru, mekanisme *last-write-wins* (tulisan terakhir yang menang) akan menyelesaikan konflik tersebut.

## 4. Menghapus Transaksi (dan Entitas Lainnya)

1. **Pembaruan UI**: Pengguna menekan tombol hapus.
2. **Local DB**: Daripada menghapus permanen (*hard-delete*), data IDB ditandai dengan `deletedAt = now()` (*soft-delete*) dan `syncStatus = "PENDING"`. *Hook* UI akan langsung menyembunyikan data yang terhapus tersebut.
3. **sync_queue**: Mutasi `DELETE` dimasukkan ke antrean.
4. **Tombstone Fallback**: Jika data lokal di IndexedDB secara tak terduga terhapus atau hilang saat proses *push*, `buildPushPayload` akan memulihkan data esensial langsung dari muatan JSON di `sync_queue` untuk mencegah kebuntuan (*deadlock*).
5. **Server API**: Dikirim ke server, dan server akan menerapkan *soft-delete* tersebut ke PostgreSQL.

### Catatan Arsitektur: Pemisahan Soft Delete vs Hard Delete
Untuk mencegah penumpukan **Phantom Delete Queue** (antrean penghapusan fiktif) dan **Zombie/Orphaned Records** (data yatim/tertinggal) saat rekonsiliasi *offline-to-online*, kode ini secara ketat memisahkan batasan antara aksi pengguna dan sinkronisasi sistem:
- **Aksi Pengguna (Layer UI/Hooks)**: Selalu mengeksekusi **Soft Delete** (`deleteBudget`, `deleteWallet`, `deleteCategory`, `deleteTransaction`), menandai `deletedAt = now()` dan mencatat aksi tersebut di `sync_queue` untuk meneruskan niat pengguna ke server.
- **Rekonsiliasi Sinkronisasi (Layer Sync Engine)**: Saat menyelesaikan konflik (mengganti `clientId` lokal dengan UUID server di `sync-manager.ts`), mesin sinkronisasi mengeksekusi **Hard Delete** (`hardDeleteBudget`, `hardDeleteWallet`, dll.) langsung ke *object store* IndexedDB tanpa memasukkan aksi ke `sync_queue`. Hal ini menjamin penggantian ID yang bersih tanpa memicu penghapusan fiktif di *database* *cloud* atau meninggalkan data *zombie* di penyimpanan lokal.

## 5. Membuat / Memperbarui Anggaran & Target Finansial

1. **Pembaruan UI**: Pengguna menetapkan batas anggaran (Anggaran) untuk kategori pengeluaran, atau membuat Target Finansial (Target Pemasukan).
2. **Local DB**: Data Anggaran/Target dibuat atau diperbarui di IDB (`syncStatus = "PENDING"`, `updatedAt` diperbarui).
3. **sync_queue**: Mutasi `CREATE`/`UPDATE` untuk anggaran atau target dimasukkan ke antrean.
4. **Perilaku Notifikasi**: Evaluasi ulang anggaran atau target terhadap status saat ini dapat langsung memicu peringatan lokal atau pembaruan target yang positif.
5. **Server API**: Dikirim ke server. Mutasi Anggaran dan Target diproses *sebelum* Transaksi untuk memenuhi konstrain kunci asing (*foreign key*).

**Catatan tentang Subsidi Silang (Budget Reallocation)**: Subsidi silang diimplementasikan sebagai dua pembaruan anggaran lokal:
- Jumlah anggaran asal berkurang
- Jumlah anggaran tujuan bertambah

Kedua pembaruan ini disimpan secara lokal dan disinkronkan melalui jalur sinkronisasi pembaruan anggaran seperti biasa. Tidak ada entitas spesifik khusus subsidi silang pada versi ini.

## 6. Pemicu Notifikasi Lokal

Sistem notifikasi mengikuti *pipeline* (alur kerja) empat lapis yang ketat. Setiap lapisan berjalan secara independen:

```
Evaluasi Kejadian  →  Pembuatan Log (selalu)  →  Keputusan Pengiriman (berdasarkan mode)  →  Eksekusi Pengiriman
```

### Lapisan 1: Evaluasi Kejadian
- Pembuatan atau pembaruan transaksi menyebabkan total pengeluaran menembus ambang batas anggaran (50%, 80%, 100%, atau >100%).
- `local-engine.ts` dipanggil melalui `evaluateAndTriggerNudges()` dari `transactions.ts`.
- Insight yang dihasilkan berdasarkan batas anggaran dan saldo dompet dievaluasi. Insight paling kritis dan tidak duplikat akan dipilih.

### Lapisan 2: Pembuatan Log (selalu berjalan, tidak terpengaruh mode pengiriman)
- Sebuah data `notification_log` ditulis ke IDB dengan status: `'delivered'`.
- `dedupeKey` mencegah log ganda untuk status anggaran yang belum berubah.
- Log tersebut dimasukkan ke antrean untuk disinkronkan ke server.
- **Pembuatan log tidak pernah diblokir oleh mode pengiriman atau batas maksimal *push* harian.**
  Halaman "Notifikasi" di aplikasi akan selalu menampilkan seluruh log, terlepas apakah notifikasi *push* ke perangkat dikirim atau tidak.

### Lapisan 3: Keputusan Pengiriman
- `resolveDeliveryMode(settings)` membaca mode pengiriman yang valid dari IDB (`notification_settings`):
  - **NONE (NONAKTIF)**: Melewati proses *push*, dengan alasan `mode_off`. Log tetap dicatat.
  - **DIGEST (RANGKUMAN)**: Melewati *push* individual, dengan alasan `digest_mode_active`. Log tetap dicatat.
  - **INSTANT (LANGSUNG)**: Melanjutkan ke Lapisan 4.
- Pada mode INSTANT, prasyarat *push* dicek secara berurutan:
  1. Ketersediaan Service Worker → jika tidak, dilewati (`service_worker_unavailable`).
  2. Izin OS diberikan (`granted`) → jika tidak, dilewati (`permission_not_granted`).
  3. Batas *push* harian belum tercapai (mengecek *counter* di localStorage) → jika penuh, dilewati (`daily_push_cap_reached`).
  - **Batas harian hanya membatasi notifikasi yang dikirim ke layar perangkat. Ini tidak mencegah pembuatan log di dalam aplikasi.**

### Lapisan 4: Eksekusi Pengiriman
- `reg.showNotification()` dipanggil dengan muatan `notification.data = { clientId, logId, ctaRoute, type }`.
  - `renotify: true` mencegah tabrakan tag yang bisa membuat notifikasi tertumpuk tanpa memunculkan *banner*.
  - `requireInteraction: true` hanya diberikan untuk peringatan kritis (100%).
- Setelah `showNotification()` berhasil berjalan, angka *counter* notifikasi di localStorage akan bertambah.

### Pengiriman Mode Rangkuman (DIGEST mode)
- Proses latar belakang (Cron job via GitHub Actions) berjalan setiap 15 menit untuk memanggil `GET /api/cron/digest`.
- Server memeriksa `notification_settings` untuk mencari pengguna yang jadwal rangkuman (`digestTime`)-nya jatuh di dalam rentang waktu 15 menit tersebut dan memiliki `dailyDigest == true`.
- Untuk setiap pengguna yang memenuhi syarat, `buildServerDigestContent()` mengambil `notification_logs` dari PostgreSQL yang masuk pada hari itu dan belum dirangkum.
- Jika ada log yang relevan, *payload* Web Push Notification dikirim ke Service Worker pengguna (melalui `sendAndLogPushNotification`):
  *"Ada 5 pembaruan penting hari ini: 1 anggaran terlampaui, 2 anggaran mendekati batas, 2 insight baru."*
- Log yang telah diproses kemudian ditandai dengan `digestSentAt = now()` di *database* agar tidak terkirim dua kali.
- Saat notifikasi Rangkuman diklik, aplikasi akan selalu membuka `/notifications` (Kotak Masuk Notifikasi).

## 7. Sinkronisasi Status Baca Notifikasi (read_at)

1. **Kejadian**: Pengguna membaca notifikasi — baik dengan mengeklik *banner* notifikasi OS, atau mengeklik item di halaman Notifikasi aplikasi.
2. **Jalur Klik Push Notification**:
   - Event `notificationclick` pada Service Worker membaca `notification.data.clientId`.
   - Jika jendela aplikasi sedang terbuka: Service Worker mengirim pesan `NOTIFICATION_CLICKED` ke *client* aplikasi beserta `notificationClientId`.
   - *Handler* pesan SW di layout dasbor akan memanggil `markLogRead(clientId)`, yang mengubah `readAt`, `updatedAt`, serta `syncStatus = "PENDING"` di IDB, dan memasukkan `notification_log:update` ke dalam `sync_queue`.
   - Jika aplikasi sedang tertutup: Service Worker membuka jendela baru dengan parameter kueri `?notifRead=<clientId>`. Saat dimuat, *layout* akan membaca parameter tersebut, memanggil `markLogRead()`, dan menghapus parameter dari URL.
3. **Jalur Klik Halaman Notifikasi**: Mengeklik item notifikasi di kotak masuk akan memanggil `markLogRead(clientId)` secara langsung — fungsi dan perilaku antreannya persis sama.
4. **sync_queue**: Mutasi log jenis `UPDATE` dimasukkan ke antrean, membawa data lengkap termasuk nilai `readAt`.
5. **Server API**: Dikirim ke server, dan nilai `readAt` disimpan secara permanen di kolom `notification_logs.read_at`.
6. **Resolusi Konflik**: Sangat bergantung pada `updatedAt` untuk memastikan status "sudah dibaca" tidak berbalik menjadi "belum dibaca".

## 8. Sinkronisasi Pengaturan Notifikasi

1. **Pembaruan UI**: Pengguna mengubah *toggle* pengaturan di halaman Profil.
2. **Local DB**: Data `notification_settings` di IDB diperbarui (`syncStatus = "PENDING"`).
3. **sync_queue**: Dimasukkan ke antrean untuk dikirim.
4. **Server API**: Pengaturan yang ditarik (Pull) dari perangkat lain tidak akan masuk ke `sync_queue` lokal, tetapi tetap melewati fungsi `resolveConflict` untuk melindungi perubahan lokal yang belum sempat terkirim (*push*).

## 9. Sinkronisasi Push

1. **Pemicu**: Status internet kembali tersambung (Online) atau sinkronisasi dipicu secara manual.
2. **Local DB**: `sync-manager` membaca semua entri di dalam `sync_queue`.
3. **Server API**: Mengirim (POST) muatan data sekaligus secara massal (batch) ke `/api/sync/push`.
   *Urutan Mutlak*: Kategori → Dompet → Anggaran → Target Finansial → Transaksi → Pengaturan Notifikasi → Log Notifikasi.
4. **Local DB**: Menghapus mutasi yang sukses dari antrean (dequeue) dan menandai sisa rekaman dengan `SYNCED`.

## 10. Sinkronisasi Pull

1. **Pemicu**: Berjalan otomatis segera setelah proses Push Sync selesai (membuat perputaran/loop 2 arah).
2. **Server API**: Melakukan GET ke `/api/sync/pull?lastSyncedAt=...` untuk mengambil perubahan (deltas) dari server.
3. **Local DB**: `sync-manager` memproses satu per satu data yang ditarik.
4. **Resolusi Konflik**: Jika data lokal berstatus `PENDING`, cap waktu (`updatedAt`) akan menentukan siapa yang menang.
5. **sync_queue**: Data server yang menang akan disimpan ke IDB dengan argumen `skipSyncQueue = true` (supaya tidak balik dikirim lagi).
6. **Penerapan Progresif**: Begitu entitas selesai ditulis ke IDB, antarmuka UI akan langsung merespons secara progresif per entitas melalui `useLiveQuery` tanpa perlu menunggu seluruh proses Pull selesai secara keseluruhan (Sinkronisasi Pull Progresif).

## 11. Ekspor XLSX

1. **Pembaruan UI**: Pengguna masuk ke Profil dan mengeklik "Ekspor".
2. **Server API**: *Hanya saat Online.* Aplikasi memanggil *endpoint* `/api/export` secara langsung tanpa antrean.
3. **Respons**: Server melakukan kueri langsung ke PostgreSQL dan mengembalikan file (buffer) *spreadsheet* yang sudah di-*generate*.

## 12. Pemicu Insight Analitik (Dashboard)

1. **Pemicu**: Pengguna membuka *dashboard* Analitik atau halaman Beranda (Home).
2. **Local DB**: Hook `use-analytics.ts` menarik data riwayat transaksi hingga 3 bulan ke belakang dari IndexedDB lokal.
3. **Mesin Logika (Logic Engine)**: Fungsi `generateNudges()` dari `nudging.ts` mengevaluasi data tersebut terhadap berbagai aturan perilaku finansial yang sudah didefinisikan (memberikan nilai `priority` berupa desimal yang menaik, misalnya dari 1.0 hingga 4.0, di mana nilai yang lebih kecil berarti semakin kritis).
4. **Pengurutan Prioritas Berbobot**: Di lapisan UI (`InsightsPanel`), *insight* yang dihasilkan tersebut kemudian dikelompokkan dan diurutkan kembali berdasarkan tingkat keparahan (severity): Kritis (3) > Peringatan (2) > Positif (1) > Netral (0) > Info (-1).
5. **Batasan Pintar & Pencegahan**: Untuk menghindari "Insight Fatigue" (rasa lelah melihat notifikasi yang terlalu banyak), UI menetapkan batasan tampilan maksimal. Semua insight Kritis (Critical) akan selalu ditampilkan. Sisa slot yang kosong (maksimal hingga batas *default* 3) akan diisi oleh *insight* prioritas tertinggi lainnya. Segala sisa insight tambahan disembunyikan dan baru muncul jika tombol "Lihat insight lainnya" ditekan.
