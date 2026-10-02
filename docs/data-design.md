# 2.3 Perancangan Data — Moneta Finance

> **Sumber audit**: `prisma/schema.prisma` (sumber utama PostgreSQL), `src/lib/local-db/schema.ts` (IndexedDB), `src/types/models.types.ts` (tipe domain bersama).
> Semua nama tabel, field, tipe data, dan konstrain didasarkan pada file aktual di atas.

---

## Pemetaan Istilah SKPL → Nama Fisik Database

| Istilah SKPL / Domain | Nama Model Prisma | Nama Tabel Fisik (@@map) |
|---|---|---|
| Pengguna / User | `User` | `pengguna` |
| Kategori | `Category` | `kategori` |
| Dompet / Akun Keuangan | `Wallet` | `dompet` |
| Transaksi | `Transaction` | `transaksi` |
| Anggaran | `Budget` | `anggaran` |
| Target Keuangan | `FinancialTarget` | `target_keuangan` |
| Preferensi Notifikasi | `NotificationSettings` | `pengaturan_notifikasi` |
| Riwayat Notifikasi | `NotificationLog` | `log_notifikasi` |
| Langganan Web Push | `NotificationSubscription` | `notification_subscriptions` |

---

## Definisi Enum

Enum-enum berikut didefinisikan pada `prisma/schema.prisma` dan digunakan sebagai tipe kolom di PostgreSQL.

| Nama Enum | Nilai yang Diizinkan | Digunakan Pada |
|---|---|---|
| `SyncStatus` | `SYNCED`, `PENDING`, `CONFLICT` | `dompet`, `kategori`, `transaksi`, `anggaran`, `target_keuangan` |
| `TransactionType` | `INCOME`, `EXPENSE`, `TRANSFER` | `transaksi` |
| `CategoryType` | `INCOME`, `EXPENSE` | `kategori` |
| `WalletType` | `TUNAI`, `BANK`, `E_WALLET`, `INVESTASI`, `LAINNYA` | `dompet` |
| `TargetType` | `INCOME_TARGET`, `SAVING_TARGET`, `BALANCE_TARGET` | `target_keuangan` |
| `TargetPeriod` | `DAILY`, `WEEKLY`, `MONTHLY`, `CUSTOM` | `target_keuangan` |

---

## 2.3.1 Dekomposisi Data

### 2.3.1.1 Tabel PENGGUNA (`pengguna`)

**Fungsi**: Menyimpan data autentikasi pengguna. Login dapat menggunakan `email` atau `nama_pengguna` sebagai identifier. Tabel ini menjadi induk (*parent*) bagi seluruh tabel domain lainnya melalui relasi one-to-many atau one-to-one.

**Relasi**:
- One-to-Many dengan `kategori`, `transaksi`, `anggaran`, `dompet`, `target_keuangan`, `log_notifikasi`, `notification_subscriptions`
- One-to-One dengan `pengaturan_notifikasi`

| No | Nama Field | Nama Kolom DB | Tipe Data | Null | Konstrain | Range / Nilai | Default | Keterangan |
|---|---|---|---|---|---|---|---|---|
| 1 | `id` | `id` | `uuid` | Tidak | PRIMARY KEY | UUID v4 | `uuid_generate_v4()` | Identifier unik pengguna |
| 2 | `email` | `email` | `varchar(255)` | Tidak | UNIQUE, NOT NULL | Format email valid | — | Alamat email; dapat digunakan sebagai login identifier |
| 3 | `username` | `nama_pengguna` | `varchar(30)` | Tidak | UNIQUE, NOT NULL | String alfanumerik, maks. 30 karakter | — | Nama pengguna unik; dapat digunakan sebagai login identifier |
| 4 | `passwordHash` | `hash_password` | `text` | Tidak | NOT NULL | String hasil hashing bcrypt | — | Hash password; tidak pernah disimpan sebagai plaintext |
| 5 | `createdAt` | `created_at` | `timestamp` | Tidak | NOT NULL | Waktu ISO 8601 | `now()` | Waktu pembuatan akun |
| 6 | `updatedAt` | `updated_at` | `timestamp` | Tidak | NOT NULL | Waktu ISO 8601 | `now()` (auto-update) | Waktu pembaruan terakhir; diperbarui otomatis oleh Prisma |

**Indeks**:
- PRIMARY KEY pada `id`
- UNIQUE pada `email`
- UNIQUE pada `nama_pengguna`

---

### 2.3.1.2 Tabel KATEGORI (`kategori`)

**Fungsi**: Menyimpan kategori transaksi dan anggaran yang dapat dikustomisasi oleh pengguna. Kategori bawaan sistem (`bawaan = true`) disalin ke setiap pengguna baru saat registrasi.

**Relasi**:
- Many-to-One dengan `pengguna` (FK: `pengguna_id` → `pengguna.id`, onDelete: Cascade)
- One-to-Many dengan `transaksi` (opsional, TRANSFER tidak memiliki kategori)
- One-to-Many dengan `anggaran`
- One-to-Many dengan `target_keuangan` (opsional)

| No | Nama Field | Nama Kolom DB | Tipe Data | Null | Konstrain | Range / Nilai | Default | Keterangan |
|---|---|---|---|---|---|---|---|---|
| 1 | `id` | `id` | `uuid` | Tidak | PRIMARY KEY | UUID v4 | `uuid_generate_v4()` | Identifier unik server |
| 2 | `name` | `nama` | `text` | Tidak | NOT NULL | String bebas | — | Nama kategori yang ditampilkan kepada pengguna |
| 3 | `type` | `tipe` | `enum CategoryType` | Tidak | NOT NULL | `INCOME`, `EXPENSE` | — | Jenis kategori: pemasukan atau pengeluaran |
| 4 | `icon` | `ikon` | `text` | Ya | — | Nama ikon (string identifikasi ikon) | `NULL` | Nama ikon untuk representasi visual kategori |
| 5 | `color` | `warna` | `text` | Ya | — | Kode warna hex (misal `#6366f1`) | `NULL` | Warna tampilan kategori |
| 6 | `isDefault` | `bawaan` | `boolean` | Tidak | NOT NULL | `true`, `false` | `false` | Menandai kategori bawaan sistem yang disalin saat registrasi |
| 7 | `userId` | `pengguna_id` | `uuid` | Tidak | NOT NULL, FOREIGN KEY → `pengguna.id` | UUID v4 | — | Referensi ke pemilik kategori |
| 8 | `clientId` | `client_id` | `text` | Tidak | UNIQUE, NOT NULL | UUID v4 yang dibangkitkan di klien | — | Jangkar sinkronisasi IndexedDB ↔ PostgreSQL |
| 9 | `syncStatus` | `sync_status` | `enum SyncStatus` | Tidak | NOT NULL | `SYNCED`, `PENDING`, `CONFLICT` | `PENDING` | Status sinkronisasi dengan IndexedDB klien |
| 10 | `createdAt` | `created_at` | `timestamp` | Tidak | NOT NULL | Waktu ISO 8601 | `now()` | Waktu pembuatan kategori |
| 11 | `updatedAt` | `updated_at` | `timestamp` | Tidak | NOT NULL | Waktu ISO 8601 | `now()` (auto-update) | Waktu pembaruan; digunakan sebagai dasar resolusi konflik |
| 12 | `deletedAt` | `deleted_at` | `timestamp` | Ya | — | Waktu ISO 8601 | `NULL` | Soft delete; jika tidak NULL, kategori dianggap terhapus |

**Indeks**:
- PRIMARY KEY pada `id`
- UNIQUE pada `client_id`
- `idx_category_user` pada (`pengguna_id`)
- `idx_category_user_active` pada (`pengguna_id`, `deleted_at`)
- `idx_category_user_sync` pada (`pengguna_id`, `updated_at`)

---

### 2.3.1.3 Tabel DOMPET (`dompet`)

**Fungsi**: Merepresentasikan akun atau kantong keuangan pengguna (tunai, rekening bank, dompet digital, investasi). **Saldo tidak disimpan secara statis**, melainkan selalu dikalkulasi dari transaksi: `saldo_awal + SUM(INCOME) − SUM(EXPENSE) + SUM(transfer_masuk) − SUM(transfer_keluar)`.

**Relasi**:
- Many-to-One dengan `pengguna` (FK: `pengguna_id` → `pengguna.id`, onDelete: Cascade)
- One-to-Many dengan `transaksi` (dua relasi berbeda: sebagai dompet sumber dan dompet tujuan pada TRANSFER)
- One-to-Many dengan `target_keuangan` (opsional)

| No | Nama Field | Nama Kolom DB | Tipe Data | Null | Konstrain | Range / Nilai | Default | Keterangan |
|---|---|---|---|---|---|---|---|---|
| 1 | `id` | `id` | `uuid` | Tidak | PRIMARY KEY | UUID v4 | `uuid_generate_v4()` | Identifier unik server |
| 2 | `name` | `nama` | `text` | Tidak | NOT NULL | String bebas | — | Nama dompet (misal: "BCA", "GoPay", "Dompet Tunai") |
| 3 | `type` | `tipe` | `enum WalletType` | Tidak | NOT NULL | `TUNAI`, `BANK`, `E_WALLET`, `INVESTASI`, `LAINNYA` | `TUNAI` | Jenis akun keuangan |
| 4 | `initialBalance` | `saldo_awal` | `decimal(15,2)` | Tidak | NOT NULL | Nilai numerik, maks. 15 digit, 2 desimal | `0` | Saldo awal saat dompet dibuat; digunakan sebagai basis kalkulasi saldo |
| 5 | `userId` | `pengguna_id` | `uuid` | Tidak | NOT NULL, FOREIGN KEY → `pengguna.id` | UUID v4 | — | Referensi ke pemilik dompet |
| 6 | `clientId` | `client_id` | `text` | Tidak | UNIQUE, NOT NULL | UUID v4 yang dibangkitkan di klien | — | Jangkar sinkronisasi IndexedDB ↔ PostgreSQL |
| 7 | `syncStatus` | `sync_status` | `enum SyncStatus` | Tidak | NOT NULL | `SYNCED`, `PENDING`, `CONFLICT` | `PENDING` | Status sinkronisasi |
| 8 | `createdAt` | `created_at` | `timestamp` | Tidak | NOT NULL | Waktu ISO 8601 | `now()` | Waktu pembuatan dompet |
| 9 | `updatedAt` | `updated_at` | `timestamp` | Tidak | NOT NULL | Waktu ISO 8601 | `now()` (auto-update) | Waktu pembaruan; digunakan sebagai dasar resolusi konflik |
| 10 | `deletedAt` | `deleted_at` | `timestamp` | Ya | — | Waktu ISO 8601 | `NULL` | Soft delete |

**Indeks**:
- PRIMARY KEY pada `id`
- UNIQUE pada `client_id`
- `idx_wallet_user` pada (`pengguna_id`)
- `idx_wallet_user_active` pada (`pengguna_id`, `deleted_at`)
- `idx_wallet_user_sync` pada (`pengguna_id`, `updated_at`)

---

### 2.3.1.4 Tabel TRANSAKSI (`transaksi`)

**Fungsi**: Model data inti aplikasi. Setiap entri keuangan (pemasukan, pengeluaran, atau transfer antar dompet) direpresentasikan sebagai satu baris pada tabel ini. Transaksi bertipe `TRANSFER` dikecualikan dari kalkulasi laba-rugi dan anggaran.

**Relasi**:
- Many-to-One dengan `pengguna` (FK: `pengguna_id` → `pengguna.id`, onDelete: Cascade)
- Many-to-One dengan `dompet` — relasi "WalletTransactions" (FK: `dompet_id` → `dompet.id`, NOT NULL)
- Many-to-One dengan `dompet` — relasi "TargetWalletTransactions" (FK: `dompet_tujuan_id` → `dompet.id`, NULL, hanya untuk TRANSFER)
- Many-to-One dengan `kategori` (FK: `kategori_id` → `kategori.id`, opsional; NULL untuk TRANSFER)

| No | Nama Field | Nama Kolom DB | Tipe Data | Null | Konstrain | Range / Nilai | Default | Keterangan |
|---|---|---|---|---|---|---|---|---|
| 1 | `id` | `id` | `uuid` | Tidak | PRIMARY KEY | UUID v4 | `uuid_generate_v4()` | Identifier unik server |
| 2 | `amount` | `nominal` | `decimal(15,2)` | Tidak | NOT NULL | Nilai positif, maks. 15 digit, 2 desimal | — | Jumlah uang transaksi; selalu positif |
| 3 | `type` | `tipe` | `enum TransactionType` | Tidak | NOT NULL | `INCOME`, `EXPENSE`, `TRANSFER` | — | Jenis transaksi |
| 4 | `description` | `deskripsi` | `text` | Ya | — | String bebas | `NULL` | Deskripsi singkat transaksi |
| 5 | `note` | `catatan` | `text` | Ya | — | String panjang | `NULL` | Catatan tambahan pengguna (disimpan sebagai TEXT) |
| 6 | `date` | `tanggal` | `date` | Tidak | NOT NULL | Format `YYYY-MM-DD` | — | Tanggal kejadian transaksi (bukan datetime) |
| 7 | `walletId` | `dompet_id` | `uuid` | Tidak | NOT NULL, FOREIGN KEY → `dompet.id` | UUID v4 | — | Dompet sumber; wajib untuk semua jenis transaksi |
| 8 | `targetWalletId` | `dompet_tujuan_id` | `uuid` | Ya | FOREIGN KEY → `dompet.id` | UUID v4 | `NULL` | Dompet tujuan; hanya terisi untuk transaksi bertipe `TRANSFER` |
| 9 | `categoryId` | `kategori_id` | `uuid` | Ya | FOREIGN KEY → `kategori.id` | UUID v4 | `NULL` | Kategori transaksi; opsional; NULL untuk transaksi `TRANSFER` |
| 10 | `userId` | `pengguna_id` | `uuid` | Tidak | NOT NULL, FOREIGN KEY → `pengguna.id` | UUID v4 | — | Pemilik transaksi |
| 11 | `clientId` | `client_id` | `text` | Tidak | UNIQUE, NOT NULL | UUID v4 yang dibangkitkan di klien | — | Jangkar sinkronisasi IndexedDB ↔ PostgreSQL |
| 12 | `syncStatus` | `sync_status` | `enum SyncStatus` | Tidak | NOT NULL | `SYNCED`, `PENDING`, `CONFLICT` | `PENDING` | Status sinkronisasi |
| 13 | `createdAt` | `created_at` | `timestamp` | Tidak | NOT NULL | Waktu ISO 8601 | `now()` | Waktu pencatatan transaksi |
| 14 | `updatedAt` | `updated_at` | `timestamp` | Tidak | NOT NULL | Waktu ISO 8601 | `now()` (auto-update) | Waktu pembaruan; digunakan sebagai dasar resolusi konflik |
| 15 | `deletedAt` | `deleted_at` | `timestamp` | Ya | — | Waktu ISO 8601 | `NULL` | Soft delete; propagasi penghapusan melalui sinkronisasi |

**Indeks**:
- PRIMARY KEY pada `id`
- UNIQUE pada `client_id`
- `idx_txn_user_type_date` pada (`pengguna_id`, `tipe`, `tanggal`) — optimasi query pemasukan/pengeluaran per bulan
- `idx_txn_user_category_date` pada (`pengguna_id`, `kategori_id`, `tanggal`) — optimasi query per kategori
- `idx_txn_user_wallet_date` pada (`pengguna_id`, `dompet_id`, `tanggal`) — optimasi query saldo per dompet
- `idx_txn_user_date` pada (`pengguna_id`, `tanggal`) — optimasi query rentang waktu umum
- `idx_txn_user_active` pada (`pengguna_id`, `deleted_at`) — filter transaksi aktif
- `idx_txn_user_sync` pada (`pengguna_id`, `updated_at`) — optimasi delta sync pull

---

### 2.3.1.5 Tabel ANGGARAN (`anggaran`)

**Fungsi**: Menyimpan batas pengeluaran bulanan per kategori untuk setiap pengguna. Satu anggaran berlaku untuk satu kategori pada satu periode bulan. Progres penyerapan anggaran dikalkulasi secara dinamis dari data transaksi.

**Relasi**:
- Many-to-One dengan `pengguna` (FK: `pengguna_id` → `pengguna.id`, onDelete: Cascade)
- Many-to-One dengan `kategori` (FK: `kategori_id` → `kategori.id`, NOT NULL)

| No | Nama Field | Nama Kolom DB | Tipe Data | Null | Konstrain | Range / Nilai | Default | Keterangan |
|---|---|---|---|---|---|---|---|---|
| 1 | `id` | `id` | `uuid` | Tidak | PRIMARY KEY | UUID v4 | `uuid_generate_v4()` | Identifier unik server |
| 2 | `amount` | `nominal` | `decimal(15,2)` | Tidak | NOT NULL | Nilai positif, maks. 15 digit, 2 desimal | — | Batas pengeluaran maksimum untuk periode ini |
| 3 | `period` | `periode` | `text` | Tidak | NOT NULL | Format `YYYY-MM` (contoh: `2025-06`) | — | Periode berlaku anggaran dalam format tahun-bulan |
| 4 | `categoryId` | `kategori_id` | `uuid` | Tidak | NOT NULL, FOREIGN KEY → `kategori.id` | UUID v4 | — | Kategori yang dibatasi anggarannya |
| 5 | `userId` | `pengguna_id` | `uuid` | Tidak | NOT NULL, FOREIGN KEY → `pengguna.id` | UUID v4 | — | Pemilik anggaran |
| 6 | `clientId` | `client_id` | `text` | Tidak | UNIQUE, NOT NULL | UUID v4 yang dibangkitkan di klien | — | Jangkar sinkronisasi IndexedDB ↔ PostgreSQL |
| 7 | `syncStatus` | `sync_status` | `enum SyncStatus` | Tidak | NOT NULL | `SYNCED`, `PENDING`, `CONFLICT` | `PENDING` | Status sinkronisasi |
| 8 | `createdAt` | `created_at` | `timestamp` | Tidak | NOT NULL | Waktu ISO 8601 | `now()` | Waktu pembuatan anggaran |
| 9 | `updatedAt` | `updated_at` | `timestamp` | Tidak | NOT NULL | Waktu ISO 8601 | `now()` (auto-update) | Waktu pembaruan; digunakan untuk resolusi konflik |
| 10 | `deletedAt` | `deleted_at` | `timestamp` | Ya | — | Waktu ISO 8601 | `NULL` | Soft delete |

**Indeks & Constraint Unik**:
- PRIMARY KEY pada `id`
- UNIQUE pada `client_id`
- UNIQUE COMPOSITE (`uq_budget_user_cat_period`) pada (`pengguna_id`, `kategori_id`, `periode`) — mencegah duplikasi anggaran untuk kategori dan periode yang sama
- `idx_budget_user_period` pada (`pengguna_id`, `periode`) — optimasi query anggaran per bulan
- `idx_budget_user_sync` pada (`pengguna_id`, `updated_at`) — optimasi delta sync pull

---

### 2.3.1.6 Tabel TARGET KEUANGAN (`target_keuangan`)

**Fungsi**: Menyimpan target keuangan fleksibel yang ditetapkan pengguna, seperti target pemasukan, target tabungan, atau target saldo. Progres target dikalkulasi secara dinamis di sisi klien dari data transaksi lokal di IndexedDB.

**Relasi**:
- Many-to-One dengan `pengguna` (FK: `pengguna_id` → `pengguna.id`, onDelete: Cascade)
- Many-to-One dengan `kategori` (FK: `kategori_id` → `kategori.id`, opsional)
- Many-to-One dengan `dompet` (FK: `dompet_id` → `dompet.id`, opsional)

| No | Nama Field | Nama Kolom DB | Tipe Data | Null | Konstrain | Range / Nilai | Default | Keterangan |
|---|---|---|---|---|---|---|---|---|
| 1 | `id` | `id` | `uuid` | Tidak | PRIMARY KEY | UUID v4 | `uuid_generate_v4()` | Identifier unik server |
| 2 | `clientId` | `client_id` | `text` | Tidak | UNIQUE, NOT NULL | UUID v4 yang dibangkitkan di klien | — | Jangkar sinkronisasi IndexedDB ↔ PostgreSQL |
| 3 | `name` | `nama` | `text` | Tidak | NOT NULL | String bebas | — | Nama/label target keuangan |
| 4 | `type` | `tipe` | `enum TargetType` | Tidak | NOT NULL | `INCOME_TARGET`, `SAVING_TARGET`, `BALANCE_TARGET` | — | Jenis target keuangan |
| 5 | `targetAmount` | `nominal_target` | `decimal(15,2)` | Tidak | NOT NULL | Nilai positif, maks. 15 digit, 2 desimal | — | Jumlah target yang ingin dicapai |
| 6 | `period` | `periode` | `enum TargetPeriod` | Tidak | NOT NULL | `DAILY`, `WEEKLY`, `MONTHLY`, `CUSTOM` | — | Periode evaluasi target |
| 7 | `startDate` | `tanggal_mulai` | `date` | Tidak | NOT NULL | Format `YYYY-MM-DD` | — | Tanggal mulai berlakunya target |
| 8 | `endDate` | `tanggal_selesai` | `date` | Ya | — | Format `YYYY-MM-DD` | `NULL` | Tanggal berakhir target; NULL untuk target tanpa batas waktu atau periodik |
| 9 | `categoryId` | `kategori_id` | `uuid` | Ya | FOREIGN KEY → `kategori.id` | UUID v4 | `NULL` | Kategori yang dikaitkan dengan target; opsional |
| 10 | `walletId` | `dompet_id` | `uuid` | Ya | FOREIGN KEY → `dompet.id` | UUID v4 | `NULL` | Dompet yang dikaitkan dengan target; opsional |
| 11 | `isActive` | `aktif` | `boolean` | Tidak | NOT NULL | `true`, `false` | `true` | Menandai apakah target sedang aktif atau telah dinonaktifkan |
| 12 | `note` | `catatan` | `text` | Ya | — | String bebas | `NULL` | Catatan tambahan pengguna tentang target |
| 13 | `userId` | `pengguna_id` | `uuid` | Tidak | NOT NULL, FOREIGN KEY → `pengguna.id` | UUID v4 | — | Pemilik target |
| 14 | `syncStatus` | `sync_status` | `enum SyncStatus` | Tidak | NOT NULL | `SYNCED`, `PENDING`, `CONFLICT` | `PENDING` | Status sinkronisasi |
| 15 | `createdAt` | `created_at` | `timestamp` | Tidak | NOT NULL | Waktu ISO 8601 | `now()` | Waktu pembuatan target |
| 16 | `updatedAt` | `updated_at` | `timestamp` | Tidak | NOT NULL | Waktu ISO 8601 | `now()` (auto-update) | Waktu pembaruan; digunakan untuk resolusi konflik |
| 17 | `deletedAt` | `deleted_at` | `timestamp` | Ya | — | Waktu ISO 8601 | `NULL` | Soft delete |

**Indeks**:
- PRIMARY KEY pada `id`
- UNIQUE pada `client_id`
- `idx_target_user` pada (`pengguna_id`)
- `idx_target_user_type` pada (`pengguna_id`, `tipe`) — filter berdasarkan jenis target
- `idx_target_user_sync` pada (`pengguna_id`, `updated_at`) — optimasi delta sync pull

---

### 2.3.1.7 Tabel PENGATURAN NOTIFIKASI (`pengaturan_notifikasi`)

**Fungsi**: Menyimpan preferensi notifikasi push per pengguna. Memiliki relasi one-to-one dengan tabel `pengguna`. Pengaturan ini menentukan mode pengiriman, batas harian, dan waktu ringkasan harian.

**Relasi**:
- One-to-One dengan `pengguna` (FK UNIQUE: `pengguna_id` → `pengguna.id`, onDelete: Cascade)

| No | Nama Field | Nama Kolom DB | Tipe Data | Null | Konstrain | Range / Nilai | Default | Keterangan |
|---|---|---|---|---|---|---|---|---|
| 1 | `id` | `id` | `uuid` | Tidak | PRIMARY KEY | UUID v4 | `uuid_generate_v4()` | Identifier unik |
| 2 | `userId` | `pengguna_id` | `uuid` | Tidak | UNIQUE, NOT NULL, FOREIGN KEY → `pengguna.id` | UUID v4 | — | Relasi one-to-one ke pengguna; UNIQUE memastikan satu baris per pengguna |
| 3 | `isEnabled` | `aktif` | `boolean` | Tidak | NOT NULL | `true`, `false` | `false` | Status aktif/nonaktif notifikasi push secara keseluruhan |
| 4 | `deliveryMode` | `delivery_mode` | `text` | Tidak | NOT NULL | `INSTANT`, `BATCH`, `DIGEST`, `NONE` | `'DIGEST'` | Mode pengiriman notifikasi (push instan, batch, atau ringkasan harian) |
| 5 | `instantAlerts` | `notif_instan` | `boolean` | Tidak | NOT NULL | `true`, `false` | `false` | Mengaktifkan notifikasi instan saat ambang anggaran terlampaui |
| 6 | `dailyDigest` | `ringkasan_harian` | `boolean` | Tidak | NOT NULL | `true`, `false` | `false` | Mengaktifkan pengiriman ringkasan keuangan harian |
| 7 | `digestTime` | `digest_time` | `text` | Tidak | NOT NULL | Format `HH:MM` (misal: `20:00`) | `'20:00'` | Waktu pengiriman ringkasan harian |
| 8 | `dailyCap` | `daily_cap` | `integer` | Tidak | NOT NULL | Bilangan bulat positif | `5` | Batas maksimum notifikasi push yang dikirimkan per hari ke perangkat pengguna |
| 9 | `updatedAt` | `updated_at` | `timestamp` | Tidak | NOT NULL | Waktu ISO 8601 | `now()` (auto-update) | Waktu pembaruan pengaturan; digunakan untuk resolusi konflik sinkronisasi |

**Catatan**: Tabel ini tidak memiliki `createdAt` atau `deletedAt` pada skema Prisma. `updatedAt` berfungsi sebagai basis resolusi konflik pada sinkronisasi.

**Indeks**:
- PRIMARY KEY pada `id`
- UNIQUE pada `pengguna_id` (mengimplementasikan relasi one-to-one)

---

### 2.3.1.8 Tabel LOG NOTIFIKASI (`log_notifikasi`)

**Fungsi**: Audit trail permanen untuk setiap notifikasi yang dibuat atau dikirimkan kepada pengguna, baik melalui push dari server maupun melalui evaluasi lokal (nudge). Tabel ini juga berfungsi sebagai instrumen riset untuk memantau perilaku notifikasi. Mekanisme deduplication menggunakan `dedupe_key` yang unik untuk mencegah notifikasi ganda.

**Relasi**:
- Many-to-One dengan `pengguna` (FK: `pengguna_id` → `pengguna.id`, onDelete: Cascade)

| No | Nama Field | Nama Kolom DB | Tipe Data | Null | Konstrain | Range / Nilai | Default | Keterangan |
|---|---|---|---|---|---|---|---|---|
| 1 | `id` | `id` | `uuid` | Tidak | PRIMARY KEY | UUID v4 | `uuid_generate_v4()` | Identifier server |
| 2 | `clientId` | `client_id` | `uuid` | Tidak | UNIQUE, NOT NULL | UUID v4 | `uuid_generate_v4()` | Jangkar sinkronisasi; dibangkitkan otomatis jika tidak diberikan |
| 3 | `dedupeKey` | `dedupe_key` | `text` | Tidak | UNIQUE, NOT NULL | String komposit (contoh: `BUDGET_USAGE:userId:catId:2025-06:80:ts`) | — | Kunci deduplikasi untuk mencegah notifikasi ganda untuk kejadian yang sama |
| 4 | `userId` | `pengguna_id` | `uuid` | Tidak | NOT NULL, FOREIGN KEY → `pengguna.id` | UUID v4 | — | Pemilik log notifikasi |
| 5 | `title` | `judul` | `text` | Tidak | NOT NULL | String bebas | — | Judul notifikasi yang ditampilkan |
| 6 | `body` | `isi` | `text` | Tidak | NOT NULL | String panjang | — | Isi teks notifikasi (disimpan sebagai TEXT) |
| 7 | `type` | `tipe` | `text` | Tidak | NOT NULL | Contoh: `BUDGET_CRITICAL`, `BUDGET_WARNING`, `SPENDING_INSIGHT`, `DIGEST`, `REMINDER`, `TARGET_ACHIEVED` | — | Tipe notifikasi |
| 8 | `status` | `status` | `text` | Tidak | NOT NULL | `sent`, `read`, `failed`, `delivered`, `suppressed` | `'sent'` | Status notifikasi dalam siklus hidupnya |
| 9 | `severity` | `tingkat` | `text` | Ya | — | `critical`, `warning`, `info`, `success`, `neutral` | `NULL` | Tingkat urgensi notifikasi |
| 10 | `source` | `sumber` | `text` | Ya | — | `local-engine`, `server`, dll. | `NULL` | Sumber pembuatan notifikasi |
| 11 | `relatedTransactionId` | `related_transaction_id` | `text` | Ya | — | UUID v4 atau text | `NULL` | ID transaksi terkait (referensi lunak, bukan FK) |
| 12 | `relatedCategoryId` | `related_category_id` | `text` | Ya | — | UUID v4 atau text | `NULL` | ID kategori terkait (referensi lunak) |
| 13 | `relatedBudgetId` | `related_budget_id` | `text` | Ya | — | UUID v4 atau text | `NULL` | ID anggaran terkait (referensi lunak) |
| 14 | `deliveryModeAtCreation` | `delivery_mode_at_creation` | `text` | Ya | — | `INSTANT`, `BATCH`, `DIGEST`, `NONE` | `NULL` | Mode pengiriman yang aktif saat notifikasi dibuat |
| 15 | `pushedAt` | `pushed_at` | `timestamp` | Ya | — | Waktu ISO 8601 | `NULL` | Waktu notifikasi dikirimkan ke perangkat (OS notification) |
| 16 | `digestSentAt` | `digest_sent_at` | `timestamp` | Ya | — | Waktu ISO 8601 | `NULL` | Waktu notifikasi dimasukkan ke dalam ringkasan harian |
| 17 | `eventType` | `event_type` | `text` | Ya | — | `BUDGET_CRITICAL`, `BUDGET_WARNING`, `BUDGET_INFO`, `SPENDING_INSIGHT`, dll. | `NULL` | Tipe kejadian yang memicu notifikasi |
| 18 | `ctaRoute` | `cta_route` | `text` | Ya | — | Path URL (misal `/budgets`, `/analytics`) | `NULL` | Rute navigasi saat pengguna mengetuk notifikasi |
| 19 | `actionType` | `action_type` | `text` | Ya | — | `REALLOCATE_BUDGET`, `VIEW_TARGET`, dll. | `NULL` | Tipe aksi yang direkomendasikan |
| 20 | `ctaLabel` | `cta_label` | `text` | Ya | — | String bebas | `NULL` | Label tombol aksi pada notifikasi |
| 21 | `sourceBudgetId` | `source_budget_id` | `text` | Ya | — | UUID v4 (referensi lunak ke anggaran sumber) | `NULL` | Digunakan untuk notifikasi rekomendasi subsidi silang anggaran |
| 22 | `targetBudgetId` | `target_budget_id` | `text` | Ya | — | UUID v4 (referensi lunak ke anggaran tujuan) | `NULL` | Digunakan untuk notifikasi rekomendasi subsidi silang anggaran |
| 23 | `recommendedAmount` | `nominal_rekomendasi` | `float` | Ya | — | Nilai desimal positif | `NULL` | Jumlah yang direkomendasikan pada notifikasi rekomendasi |
| 24 | `readAt` | `read_at` | `timestamp` | Ya | — | Waktu ISO 8601 | `NULL` | Waktu pengguna membaca notifikasi; NULL jika belum dibaca |
| 25 | `dismissedAt` | `dismissed_at` | `timestamp` | Ya | — | Waktu ISO 8601 | `NULL` | Waktu pengguna menutup notifikasi |
| 26 | `createdAt` | `created_at` | `timestamp` | Tidak | NOT NULL | Waktu ISO 8601 | `now()` | Waktu notifikasi dibuat |
| 27 | `updatedAt` | `updated_at` | `timestamp` | Tidak | NOT NULL | Waktu ISO 8601 | `now()` (auto-update) | Waktu pembaruan; digunakan untuk resolusi konflik sinkronisasi |
| 28 | `deletedAt` | `deleted_at` | `timestamp` | Ya | — | Waktu ISO 8601 | `NULL` | Soft delete |
| 29 | `categoryName` | `nama_kategori` | `text` | Ya | — | String bebas | `NULL` | Nama kategori yang di-snapshot saat notifikasi dibuat (denormalized) |
| 30 | `usageRatio` | `rasio_penggunaan` | `float` | Ya | — | `0.0` – tak terbatas (misal `0.85` = 85%) | `NULL` | Rasio penggunaan anggaran saat notifikasi dibuat |
| 31 | `budgetLimit` | `batas_anggaran` | `float` | Ya | — | Nilai desimal positif | `NULL` | Batas anggaran yang berlaku saat notifikasi dibuat |
| 32 | `budgetSpent` | `terpakai_anggaran` | `float` | Ya | — | Nilai desimal positif | `NULL` | Total pengeluaran pada kategori saat notifikasi dibuat |
| 33 | `deficitAmount` | `nominal_defisit` | `float` | Ya | — | Nilai desimal positif | `NULL` | Selisih pengeluaran melebihi batas anggaran |
| 34 | `todayAmount` | `nominal_hari_ini` | `float` | Ya | — | Nilai desimal positif | `NULL` | Total pengeluaran hari ini pada kategori terkait |
| 35 | `comparisonAmount` | `nominal_perbandingan` | `float` | Ya | — | Nilai desimal | `NULL` | Selisih dibanding periode referensi (kemarin atau rata-rata 7 hari) |
| 36 | `comparisonLabel` | `label_perbandingan` | `text` | Ya | — | `avg7Days`, `lastWeekSameDay` | `NULL` | Label yang menjelaskan periode referensi perbandingan |
| 37 | `sourceCategoryName` | `nama_kategori_sumber` | `text` | Ya | — | String bebas | `NULL` | Nama kategori sumber pada rekomendasi subsidi silang |
| 38 | `targetCategoryName` | `nama_kategori_tujuan` | `text` | Ya | — | String bebas | `NULL` | Nama kategori tujuan pada rekomendasi subsidi silang |

**Indeks**:
- PRIMARY KEY pada `id`
- UNIQUE pada `client_id`
- UNIQUE pada `dedupe_key`
- `idx_notif_log_user` pada (`pengguna_id`)
- `idx_notif_log_user_status` pada (`pengguna_id`, `status`)
- `idx_notif_log_user_time` pada (`pengguna_id`, `created_at`)
- `idx_notif_log_user_type` pada (`pengguna_id`, `tipe`)
- `idx_notif_log_user_sync` pada (`pengguna_id`, `updated_at`)

---

### 2.3.1.9 Tabel NOTIFICATION_SUBSCRIPTIONS (`notification_subscriptions`)

**Fungsi**: Menyimpan data langganan Web Push API per perangkat/browser pengguna. Digunakan oleh server untuk mengirimkan push notification ke perangkat yang telah terdaftar. Satu pengguna dapat memiliki beberapa langganan (multi-device). Tabel ini bersifat teknis dan tidak memiliki mekanisme sinkronisasi offline-first.

**Relasi**:
- Many-to-One dengan `pengguna` (FK: `user_id` → `pengguna.id`, onDelete: Cascade)

| No | Nama Field | Nama Kolom DB | Tipe Data | Null | Konstrain | Range / Nilai | Default | Keterangan |
|---|---|---|---|---|---|---|---|---|
| 1 | `id` | `id` | `uuid` | Tidak | PRIMARY KEY | UUID v4 | `uuid_generate_v4()` | Identifier unik langganan |
| 2 | `endpoint` | `endpoint` | `text` | Tidak | UNIQUE, NOT NULL | URL endpoint push service (misal URL dari Google/Mozilla Push Service) | — | URL endpoint Web Push unik per perangkat/browser |
| 3 | `p256dh` | `p256dh` | `text` | Tidak | NOT NULL | String base64url terenkripsi | — | Kunci publik enkripsi P-256 Diffie-Hellman dari subscription |
| 4 | `auth` | `auth` | `text` | Tidak | NOT NULL | String base64url | — | Kunci autentikasi dari subscription |
| 5 | `userId` | `user_id` | `uuid` | Tidak | NOT NULL, FOREIGN KEY → `pengguna.id` | UUID v4 | — | Pengguna pemilik langganan ini |
| 6 | `createdAt` | `created_at` | `timestamp` | Tidak | NOT NULL | Waktu ISO 8601 | `now()` | Waktu pendaftaran langganan |

**Indeks & Constraint**:
- PRIMARY KEY pada `id`
- UNIQUE (`uq_notification_endpoint`) pada `endpoint` — mencegah duplikasi endpoint yang sama
- `idx_notification_user` pada (`user_id`) — optimasi lookup langganan per pengguna

---

## 2.3.1.10 Ringkasan Relasi Antar Tabel

| Tabel Anak | Kolom FK | Tabel Induk | Kolom Referensi | Kardinalitas | onDelete |
|---|---|---|---|---|---|
| `kategori` | `pengguna_id` | `pengguna` | `id` | Many-to-One | Cascade |
| `dompet` | `pengguna_id` | `pengguna` | `id` | Many-to-One | Cascade |
| `transaksi` | `pengguna_id` | `pengguna` | `id` | Many-to-One | Cascade |
| `transaksi` | `dompet_id` | `dompet` | `id` | Many-to-One | — |
| `transaksi` | `dompet_tujuan_id` | `dompet` | `id` | Many-to-One (NULL) | — |
| `transaksi` | `kategori_id` | `kategori` | `id` | Many-to-One (NULL) | — |
| `anggaran` | `pengguna_id` | `pengguna` | `id` | Many-to-One | Cascade |
| `anggaran` | `kategori_id` | `kategori` | `id` | Many-to-One | — |
| `target_keuangan` | `pengguna_id` | `pengguna` | `id` | Many-to-One | Cascade |
| `target_keuangan` | `kategori_id` | `kategori` | `id` | Many-to-One (NULL) | — |
| `target_keuangan` | `dompet_id` | `dompet` | `id` | Many-to-One (NULL) | — |
| `pengaturan_notifikasi` | `pengguna_id` | `pengguna` | `id` | One-to-One | Cascade |
| `log_notifikasi` | `pengguna_id` | `pengguna` | `id` | Many-to-One | Cascade |
| `notification_subscriptions` | `user_id` | `pengguna` | `id` | Many-to-One | Cascade |

---

## 2.3.1.11 Struktur Penyimpanan Lokal IndexedDB

Object store berikut didefinisikan pada `src/lib/local-db/schema.ts` versi 11 dan hanya ada di sisi klien (browser). Beberapa store merupakan cerminan tabel PostgreSQL dengan tambahan field sinkronisasi, sedangkan beberapa store bersifat khusus infrastruktur klien.

### Object Store Domain (Cerminan PostgreSQL)

Setiap object store domain menggunakan `clientId` sebagai `keyPath` dan menyimpan objek yang memiliki field `syncStatus` dan `deletedAt` sebagai bagian dari mekanisme offline-first.

| Object Store | keyPath | Index Utama | Padanan Tabel PostgreSQL |
|---|---|---|---|
| `categories` | `clientId` | `by_userId`, `by_syncStatus`, `by_type`, `by_updatedAt` | `kategori` |
| `transactions` | `clientId` | `by_userId`, `by_walletId`, `by_categoryId`, `by_syncStatus`, `by_date`, `by_type`, `by_updatedAt` | `transaksi` |
| `budgets` | `clientId` | `by_userId`, `by_categoryId`, `by_period`, `by_syncStatus`, `by_updatedAt`, `by_userId_period` (komposit) | `anggaran` |
| `wallets` | `clientId` | `by_userId`, `by_syncStatus`, `by_updatedAt` | `dompet` |
| `financial_targets` | `clientId` | `by_userId`, `by_type`, `by_syncStatus`, `by_updatedAt`, `by_categoryId`, `by_walletId` | `target_keuangan` |
| `notification_logs` | `clientId` | `by_userId`, `by_status`, `by_createdAt`, `by_syncStatus`, `by_dedupeKey` (unique) | `log_notifikasi` |
| `notification_settings` | `clientId` | `by_userId`, `by_updatedAt`, `by_syncStatus` | `pengaturan_notifikasi` |

### Object Store Infrastruktur Klien (Tidak Ada di PostgreSQL)

| Object Store | keyPath | AutoIncrement | Index | Fungsi |
|---|---|---|---|---|
| `sync_queue` | `id` | Ya | `by_entity`, `by_action`, `by_createdAt`, `by_entity_clientId` (komposit) | Antrian mutasi lokal yang menunggu dikirimkan ke server. Setiap operasi Create/Update/Delete pada entitas domain menghasilkan entri di store ini. |
| `sync_meta` | `key` | Tidak | — | Metadata sinkronisasi, termasuk `lastSyncedAt` yang menjadi parameter untuk delta pull dari server. |
| `notification_inbox` | `id` | Ya | `by_type`, `by_isRead`, `by_createdAt` | Kotak masuk notifikasi in-app. Ditulis langsung oleh Service Worker saat notifikasi diterima. Tidak disinkronisasi ke server. |

#### Struktur Entri `sync_queue`

| Nama Field | Tipe Data (JS/IDB) | Keterangan |
|---|---|---|
| `id` | `number` (auto) | Key auto-increment, kunci primer store |
| `entity` | `string` | Nama entitas: `category`, `transaction`, `budget`, `wallet`, `financial_target`, `notification_log`, `notification_settings` |
| `action` | `string` | Aksi: `create`, `update`, `delete` |
| `clientId` | `string` | `clientId` dari entitas yang diubah |
| `data` | `object` | Snapshot data entitas pada saat entri dibuat |
| `createdAt` | `string` | ISO 8601 timestamp |
| `retryCount` | `number` | Jumlah percobaan sinkronisasi yang sudah dilakukan |
| `lastError` | `string?` | Pesan error terakhir jika gagal |
| `lastAttemptAt` | `string?` | ISO 8601 timestamp percobaan terakhir |
| `failedAt` | `string?` | ISO 8601 timestamp saat entri dianggap gagal permanen (max retry tercapai) |

#### Struktur Entri `sync_meta`

| Nama Field | Tipe Data (JS/IDB) | Keterangan |
|---|---|---|
| `key` | `string` | Kunci record (misal: `lastSyncedAt`) |
| `value` | `string` | Nilai record (misal: ISO 8601 timestamp) |

#### Struktur Entri `notification_inbox`

| Nama Field | Tipe Data (JS/IDB) | Keterangan |
|---|---|---|
| `id` | `number` (auto) | Key auto-increment |
| `title` | `string` | Judul notifikasi |
| `body` | `string` | Isi notifikasi |
| `type` | `string` | Tipe: `INSTANT`, `DIGEST` |
| `createdAt` | `string` | ISO 8601 timestamp |
| `isRead` | `boolean` | Status terbaca |
| `logId` | `string?` | Referensi ke `notification_logs.clientId` jika tersedia |

---

## 2.3.2 Physical Data Model (ERD)

### Diagram Entity Relationship

```mermaid
erDiagram
    PENGGUNA {
        uuid id PK
        varchar_255 email UK
        varchar_30 nama_pengguna UK
        text hash_password
        timestamp created_at
        timestamp updated_at
    }

    KATEGORI {
        uuid id PK
        text nama
        enum_CategoryType tipe
        text ikon
        text warna
        boolean bawaan
        uuid pengguna_id FK
        text client_id UK
        enum_SyncStatus sync_status
        timestamp created_at
        timestamp updated_at
        timestamp deleted_at
    }

    DOMPET {
        uuid id PK
        text nama
        enum_WalletType tipe
        decimal_15_2 saldo_awal
        uuid pengguna_id FK
        text client_id UK
        enum_SyncStatus sync_status
        timestamp created_at
        timestamp updated_at
        timestamp deleted_at
    }

    TRANSAKSI {
        uuid id PK
        decimal_15_2 nominal
        enum_TransactionType tipe
        text deskripsi
        text catatan
        date tanggal
        uuid dompet_id FK
        uuid dompet_tujuan_id FK
        uuid kategori_id FK
        uuid pengguna_id FK
        text client_id UK
        enum_SyncStatus sync_status
        timestamp created_at
        timestamp updated_at
        timestamp deleted_at
    }

    ANGGARAN {
        uuid id PK
        decimal_15_2 nominal
        text periode
        uuid kategori_id FK
        uuid pengguna_id FK
        text client_id UK
        enum_SyncStatus sync_status
        timestamp created_at
        timestamp updated_at
        timestamp deleted_at
    }

    TARGET_KEUANGAN {
        uuid id PK
        text client_id UK
        text nama
        enum_TargetType tipe
        decimal_15_2 nominal_target
        enum_TargetPeriod periode
        date tanggal_mulai
        date tanggal_selesai
        uuid kategori_id FK
        uuid dompet_id FK
        boolean aktif
        text catatan
        uuid pengguna_id FK
        enum_SyncStatus sync_status
        timestamp created_at
        timestamp updated_at
        timestamp deleted_at
    }

    PENGATURAN_NOTIFIKASI {
        uuid id PK
        uuid pengguna_id FK_UK
        boolean aktif
        text delivery_mode
        boolean notif_instan
        boolean ringkasan_harian
        text digest_time
        integer daily_cap
        timestamp updated_at
    }

    LOG_NOTIFIKASI {
        uuid id PK
        uuid client_id UK
        text dedupe_key UK
        uuid pengguna_id FK
        text judul
        text isi
        text tipe
        text status
        text tingkat
        text sumber
        timestamp pushed_at
        timestamp read_at
        timestamp dismissed_at
        timestamp created_at
        timestamp updated_at
        timestamp deleted_at
    }

    NOTIFICATION_SUBSCRIPTIONS {
        uuid id PK
        text endpoint UK
        text p256dh
        text auth
        uuid user_id FK
        timestamp created_at
    }

    PENGGUNA ||--o{ KATEGORI : "memiliki"
    PENGGUNA ||--o{ DOMPET : "memiliki"
    PENGGUNA ||--o{ TRANSAKSI : "mencatat"
    PENGGUNA ||--o{ ANGGARAN : "menetapkan"
    PENGGUNA ||--o{ TARGET_KEUANGAN : "menetapkan"
    PENGGUNA ||--o| PENGATURAN_NOTIFIKASI : "mengkonfigurasi"
    PENGGUNA ||--o{ LOG_NOTIFIKASI : "menerima"
    PENGGUNA ||--o{ NOTIFICATION_SUBSCRIPTIONS : "mendaftarkan"

    DOMPET ||--o{ TRANSAKSI : "sumber transaksi"
    DOMPET ||--o{ TRANSAKSI : "tujuan transfer"
    KATEGORI ||--o{ TRANSAKSI : "mengklasifikasi"
    KATEGORI ||--o{ ANGGARAN : "dibatasi oleh"
    KATEGORI ||--o{ TARGET_KEUANGAN : "dikaitkan dengan"
    DOMPET ||--o{ TARGET_KEUANGAN : "dikaitkan dengan"
```

---

## Audit Kesesuaian dengan Fitur SKPL

| Fitur SKPL | Tabel/Store Pendukung | Status |
|---|---|---|
| Manajemen pengguna (registrasi, login, autentikasi) | `pengguna` | ✅ Confirmed by schema |
| Manajemen kategori (CRUD, kategori bawaan) | `kategori`, IDB `categories` | ✅ Confirmed by schema |
| Manajemen dompet (multi-akun, saldo terhitung) | `dompet`, IDB `wallets` | ✅ Confirmed by schema |
| Transaksi pemasukan (`INCOME`) | `transaksi` (`tipe = INCOME`), IDB `transactions` | ✅ Confirmed by schema |
| Transaksi pengeluaran (`EXPENSE`) | `transaksi` (`tipe = EXPENSE`), IDB `transactions` | ✅ Confirmed by schema |
| Transfer antar dompet (`TRANSFER`) | `transaksi` (`tipe = TRANSFER`, `dompet_tujuan_id`), IDB `transactions` | ✅ Confirmed by schema |
| Anggaran per kategori per bulan | `anggaran`, IDB `budgets` | ✅ Confirmed by schema |
| Target finansial (pendapatan/tabungan/saldo) | `target_keuangan`, IDB `financial_targets` | ✅ Confirmed by schema |
| Preferensi notifikasi (mode, cap, waktu digest) | `pengaturan_notifikasi`, IDB `notification_settings` | ✅ Confirmed by schema |
| Riwayat notifikasi dengan deduplication | `log_notifikasi`, IDB `notification_logs` | ✅ Confirmed by schema |
| Kotak masuk notifikasi in-app | IDB `notification_inbox` (hanya lokal, tidak di PostgreSQL) | ✅ Confirmed by schema |
| Web Push subscription (multi-device) | `notification_subscriptions` | ✅ Confirmed by schema |
| Sinkronisasi offline-first (antrian mutasi) | IDB `sync_queue`, `sync_meta` | ✅ Confirmed by schema |
| Soft delete untuk propagasi penghapusan via sync | `deleted_at` pada semua tabel domain | ✅ Confirmed by schema |
| Jangkar sinkronisasi IndexedDB ↔ PostgreSQL | `client_id` (UNIQUE) pada semua tabel domain | ✅ Confirmed by schema |
| Resolusi konflik berbasis timestamp | `updated_at` (auto-update) pada semua tabel domain | ✅ Confirmed by schema |

---

## Rekomendasi Urutan Tabel untuk DPPL

Urutan berikut mengikuti hierarki dependensi tabel (tabel induk didahulukan):

1. **PENGGUNA** — tidak bergantung pada tabel lain
2. **KATEGORI** — bergantung pada PENGGUNA
3. **DOMPET** — bergantung pada PENGGUNA
4. **TRANSAKSI** — bergantung pada PENGGUNA, DOMPET, KATEGORI
5. **ANGGARAN** — bergantung pada PENGGUNA, KATEGORI
6. **TARGET_KEUANGAN** — bergantung pada PENGGUNA, KATEGORI, DOMPET
7. **PENGATURAN_NOTIFIKASI** — bergantung pada PENGGUNA
8. **LOG_NOTIFIKASI** — bergantung pada PENGGUNA
9. **NOTIFICATION_SUBSCRIPTIONS** — bergantung pada PENGGUNA

---

## Confidence Level

| Butir Kesimpulan | Confidence Level | Bukti |
|---|---|---|
| Seluruh 9 tabel PostgreSQL beserta field-nya | ✅ Confirmed by schema | `prisma/schema.prisma` dibaca langsung |
| Tipe data setiap field (varchar, text, decimal, dll.) | ✅ Confirmed by schema | Anotasi `@db.VarChar()`, `@db.Decimal()`, `@db.Text`, `@db.Date` pada schema |
| Seluruh 6 enum beserta nilai-nilainya | ✅ Confirmed by schema | Blok `enum` eksplisit pada `prisma/schema.prisma` |
| Seluruh 10 object store IndexedDB | ✅ Confirmed by schema | `src/lib/local-db/schema.ts` versi 11 dibaca langsung |
| Constraint UNIQUE, FK, PK, onDelete Cascade | ✅ Confirmed by schema | Anotasi `@id`, `@unique`, `@@unique`, `@relation(onDelete: Cascade)` |
| Seluruh indeks komposit dan single-column | ✅ Confirmed by schema | Anotasi `@@index([...], name: "...")` |
| `saldo_awal` tidak menyimpan saldo realtime | ✅ Confirmed by schema | Komentar pada skema baris 99–101: *"Balance is ALWAYS calculated from transactions"* |
| `notification_inbox` tidak disinkronisasi ke server | ✅ Confirmed by schema | `notification_inbox` tidak ada di `prisma/schema.prisma`; hanya di `schema.ts` IndexedDB |
| `deliveryMode` pada `pengaturan_notifikasi` adalah `text`, bukan enum Prisma | ✅ Confirmed by schema | Dideklarasikan sebagai `String @default("DIGEST")`, bukan `enum` |
| Field-field metadata pada `log_notifikasi` (rasio, nominal, nama kategori) adalah denormalized snapshot | ✅ Confirmed by schema | Tersimpan langsung di tabel tanpa relasi FK, dikonfirmasi komentar *"Metadata fields for digest and analytics"* |
| Tidak ada tabel atau field selain yang terdaftar di atas | ✅ Confirmed by schema | Schema telah dibaca seluruhnya (379 baris) |

---

*Dokumen ini dihasilkan dari reverse engineering `prisma/schema.prisma` (379 baris) dan `src/lib/local-db/schema.ts` (141 baris) dan telah diaudit secara menyeluruh pada tanggal 20 Juni 2026.*
*Versi Prisma Schema: generator `prisma-client-js`, provider `postgresql` (Neon). Versi IndexedDB: v11.*
