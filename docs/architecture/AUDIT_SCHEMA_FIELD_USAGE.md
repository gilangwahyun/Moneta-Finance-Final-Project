# Laporan Audit Menyeluruh Penggunaan Field Schema Moneta Finance

## 1. Ringkasan Audit
Audit telah dilakukan terhadap _Prisma schema_, _TypeScript models_, dan skema _IndexedDB_ pada _codebase_ Moneta Finance. Secara keseluruhan, _database schema_ sangat selaras dengan kebutuhan aktual aplikasi. Mayoritas field di Prisma aktif digunakan, baik di _domain logic_, UI, maupun infrastruktur sinkronisasi. Tidak ditemukan field sampah (_dead/legacy_). Beberapa field pada `TargetFinansial` seperti `walletId` merupakan _future support_, sedangkan fitur transfer kas telah dengan tepat direpresentasikan menggunakan enum `type = TRANSFER` pada tabel transaksi.

## 2. Daftar Entitas yang Diaudit
1. `User` / Pengguna
2. `Transaction` / Transaksi
3. `Category` / Kategori
4. `Wallet` / Dompet
5. `Budget` / Anggaran
6. `FinancialTarget` / Target Finansial
7. `NotificationSettings` / Pengaturan Notifikasi
8. `NotificationLog` / Log Notifikasi
9. `NotificationSubscription` / Pendaftaran Web Push (Server)
10. `SyncQueue` / Antrean Sinkronisasi (Client)

## 3. Tabel Inventory Field per Entitas

### 1. Pengguna (User)
| Entitas | Field | Prisma | TS Model | IndexedDB | UI/Form | Otomatis | Logic/Calc | Sync | Server | Status | Rekomendasi DPPL |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| User | `id` | Ya | Ya | Tdk (Sesi) | Tdk | Ya | Ya | Tdk | Ya | Aktif-Teknis | Masukkan sbg field teknis |
| User | `email` | Ya | Ya | Tdk | Ya | Tdk | Tdk | Tdk | Ya | Aktif-Domain | Masukkan sbg field domain |
| User | `username` | Ya | Ya | Tdk | Ya | Tdk | Tdk | Tdk | Ya | Aktif-Domain | Masukkan sbg field domain |
| User | `passwordHash` | Ya | Tdk | Tdk | Ya (Auth) | Tdk | Tdk | Tdk | Ya | Aktif-Teknis | Jangan masukkan ke DPPL utama klien |
| User | `createdAt` / `updatedAt`| Ya | Ya | Tdk | Tdk | Ya | Tdk | Tdk | Ya | Aktif-Teknis | Masukkan sbg field teknis |

### 2. Transaksi (Transaction)
| Entitas | Field | Prisma | TS Model | IndexedDB | UI/Form | Otomatis | Logic/Calc | Sync | Server | Status | Rekomendasi DPPL |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Transaksi | `clientId` | Ya | Ya | Ya | Tdk | Ya | Ya | Ya | Ya | Aktif-Teknis | Masukkan sbg field teknis |
| Transaksi | `id` | Ya | Ya | Ya | Tdk | Ya | Tdk | Ya | Ya | Aktif-Teknis | Masukkan sbg field teknis |
| Transaksi | `amount` | Ya | Ya | Ya | Ya | Tdk | Ya | Ya | Ya | Aktif-Domain | Masukkan sbg field domain |
| Transaksi | `type` | Ya | Ya | Ya | Ya | Tdk | Ya | Ya | Ya | Aktif-Domain | Masukkan sbg field domain |
| Transaksi | `description` | Ya | Ya | Ya | Ya (Chips) | Tdk | Ya | Ya | Ya | Aktif-Domain | Masukkan sbg field domain |
| Transaksi | `note` | Ya | Ya | Ya | Ya | Tdk | Tdk | Ya | Ya | Opsional-Aktif | Masukkan sbg field domain |
| Transaksi | `date` | Ya | Ya | Ya | Ya | Tdk | Ya | Ya | Ya | Aktif-Domain | Masukkan sbg field domain |
| Transaksi | `walletId` | Ya | Ya | Ya | Ya | Tdk | Ya | Ya | Ya | Aktif-Domain | Masukkan sbg field domain |
| Transaksi | `targetWalletId`| Ya | Ya | Ya | Ya (Transfer) | Tdk | Ya | Ya | Ya | Opsional-Aktif | Masukkan sbg field domain |
| Transaksi | `categoryId` | Ya | Ya | Ya | Ya | Tdk | Ya | Ya | Ya | Opsional-Aktif | Masukkan sbg field domain |
| Transaksi | `syncStatus` | Ya | Ya | Ya | Tdk | Ya | Ya | Ya | Tdk | Aktif-Teknis | Masukkan sbg field teknis |
| Transaksi | `createdAt` / `updatedAt` | Ya | Ya | Ya | Tdk | Ya | Ya (LWW)| Ya | Ya | Aktif-Teknis | Masukkan sbg field teknis |
| Transaksi | `deletedAt` | Ya | Ya | Ya | Tdk (Delete) | Ya | Ya | Ya | Ya | Aktif-Teknis | Masukkan sbg field teknis |

### 3. Anggaran (Budget)
| Entitas | Field | Prisma | TS Model | IndexedDB | UI/Form | Otomatis | Logic/Calc | Sync | Server | Status | Rekomendasi DPPL |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Budget | `clientId`/`id` | Ya | Ya | Ya | Tdk | Ya | Ya | Ya | Ya | Aktif-Teknis | Masukkan sbg field teknis |
| Budget | `amount` | Ya | Ya | Ya | Ya | Tdk | Ya | Ya | Ya | Aktif-Domain | Masukkan sbg field domain |
| Budget | `period` | Ya | Ya | Ya | Ya | Tdk | Ya | Ya | Ya | Aktif-Domain | Masukkan sbg field domain |
| Budget | `categoryId` | Ya | Ya | Ya | Ya | Tdk | Ya | Ya | Ya | Aktif-Domain | Masukkan sbg field domain |
| Budget | `syncStatus`/`...At` | Ya | Ya | Ya | Tdk | Ya | Ya | Ya | Ya | Aktif-Teknis | Masukkan sbg field teknis |

### 4. Target Finansial (FinancialTarget)
| Entitas | Field | Prisma | TS Model | IndexedDB | UI/Form | Otomatis | Logic/Calc | Sync | Server | Status | Rekomendasi DPPL |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Target | `clientId`/`id` | Ya | Ya | Ya | Tdk | Ya | Ya | Ya | Ya | Aktif-Teknis | Masukkan sbg field teknis |
| Target | `name` | Ya | Ya | Ya | Ya | Tdk | Tdk | Ya | Ya | Aktif-Domain | Masukkan sbg field domain |
| Target | `type` | Ya | Ya | Ya | Ya | Tdk | Ya | Ya | Ya | Aktif-Domain | Masukkan sbg field domain |
| Target | `targetAmount` | Ya | Ya | Ya | Ya | Tdk | Ya | Ya | Ya | Aktif-Domain | Masukkan sbg field domain |
| Target | `period` | Ya | Ya | Ya | Ya | Tdk | Ya | Ya | Ya | Aktif-Domain | Masukkan sbg field domain |
| Target | `startDate` | Ya | Ya | Ya | Ya | Tdk | Ya | Ya | Ya | Aktif-Domain | Masukkan sbg field domain |
| Target | `endDate` | Ya | Ya | Ya | Ya (Custom) | Tdk | Ya | Ya | Ya | Opsional-Aktif | Masukkan sbg field domain |
| Target | `categoryId` | Ya | Ya | Ya | Ya | Tdk | Ya | Ya | Ya | Aktif-Domain | Masukkan sbg field domain |
| Target | `walletId` | Ya | Ya | Ya | Tdk | Tdk | Tdk | Ya | Ya | Future-Support | Catatan opsional masa depan |
| Target | `isActive` | Ya | Ya | Ya | Ya | Tdk | Ya | Ya | Ya | Aktif-Domain | Masukkan sbg field domain |
| Target | `note` | Ya | Ya | Ya | Ya | Tdk | Tdk | Ya | Ya | Opsional-Aktif | Masukkan sbg field domain |
| Target | `syncStatus`/`...At`| Ya | Ya | Ya | Tdk | Ya | Ya | Ya | Ya | Aktif-Teknis | Masukkan sbg field teknis |

### 5. Pengaturan Notifikasi & Log
_Catatan:_ Sebagian besar field `NotificationLog` adalah _Aktif-Teknis_ yang digunakan murni untuk algoritma deduplikasi (_dedupeKey_) dan parameter pembentuk payload _push API_. Mereka tidak muncul di form UI. Untuk DPPL, entitas log ini cukup diringkas dan tidak semua metadata (seperti _deficitAmount_) wajib diekspos sebagai field utama entitas karena terlalu teknikal/spesifik pada engine.
_Pengaturan Notifikasi_ memiliki `dailyCap`, `deliveryMode`, `digestTime`, dll yang 100% _Aktif-Domain_ (lewat UI setting) atau _Aktif-Teknis_ (di _Service Worker_).

### 6. SyncQueue
_Catatan:_ Murni _Aktif-Teknis_ dan eksklusif IndexedDB. Field `entity`, `action`, `payload` (data), `retryCount`, `status` aktif dan memegang peran kritikal di eksekutor _PengaturAntreanSinkronisasi_.

## 4. Daftar Field Aktif Domain
(Field yang diinteraksikan langsung oleh pengguna dan masuk form UI)
- `Transaksi`: amount, type, description (sebagai quick input), note, date, walletId, targetWalletId (via form transfer), categoryId.
- `Anggaran`: amount, period, categoryId.
- `TargetFinansial`: name, type, targetAmount, period, startDate, endDate, categoryId, isActive.
- `Dompet` & `Kategori`: name, type, icon, color, initialBalance.
- `Pengaturan Notifikasi`: dailyCap, deliveryMode, instantAlerts, dailyDigest.

## 5. Daftar Field Aktif Teknis/Internal
(Dikendalikan sistem)
- Semua `clientId`, `id` (Server ID), `userId`.
- Parameter Sinkronisasi/Audit: `syncStatus`, `createdAt`, `updatedAt` (diperlukan resolusi konflik LWW), `deletedAt` (diperlukan Soft Delete).
- `NotificationLog`: dedupeKey, status, deliveryModeAtCreation, dan deretan metadata agregasi.
- `SyncQueue`: retryCount, lastError, action.

## 6. Daftar Field Opsional / Future Support
- `TargetFinansial.walletId`: Terdapat di skema Prisma dan TS, tetapi pada UI (`TargetModal.tsx`) tidak pernah dirender atau diisikan. Field ini murni _future support_ jika kelak pengguna dapat menetapkan target saldo pada Dompet tertentu.
- `TargetFinansial.type = SAVING_TARGET` & `BALANCE_TARGET`: Enum disediakan Prisma, tetapi secara *business logic* versi 1 ini yang berjalan dan dievaluasi progresnya hanya `INCOME_TARGET`.

## 7. Daftar Field Dead / Legacy
- **Tidak ada.** Skema Prisma dan TypeScript aplikasi Moneta Finance dalam keadaan bersih. Tidak ada sisa field lama. Pemindahan kas (transfer) telah tertata rapi menggunakan `targetWalletId` dengan tipe data `TRANSFER`, tidak bercabang menjadi tabel abstrak.

## 8. Ketidaksesuaian Antara Prisma, TS, IDB, UI, dan Sync
- **Konsisten.** Sinkronisasi dan *mapping* tipe antara _schema.prisma_ dan _models.types.ts_ sudah sejajar sempurna, termasuk penggunaan `@@map` database (contoh: di PostgreSQL menggunakan tabel/kolom bahasa Indonesia, sedangkan client-side TS menggunakan bahasa Inggris). Skema IndexedDB (Stores/Indexes) seirama dengan filter antarmuka.

## 9. Rekomendasi Revisi DPPL OOP Entity Class
1. **Transaksi:** Pertahankan atribut `description`, `note`, `targetWalletId`.
2. **Anggaran:** Tidak perlu menambah atribut seperti `spent` atau `progress` pada tabel class OOP, karena logika persentase merupakan kalkulasi *runtime* yang dieksekusi di *Control Class* `KelolaAnggaran`.
3. **TargetFinansial:** Catat eksistensi `walletId` dan kapabilitas `SAVING_TARGET` murni sebagai _future support_. Fokus relasi domain tetap pada `categoryId` yang memang wajib di UI.

## 10. Rekomendasi Revisi Tabel Dekomposisi Data DPPL
1. Atribut seperti `syncStatus`, `updatedAt` (LWW), `deletedAt` (Soft delete), dan `clientId` (primary key luring) **wajib masuk** tabel perancangan data dengan label tegas bahwa mereka adalah instrumen fondasi _Offline-First_.
2. Struktur server-only (_NotificationSubscription_) **jangan dimasukkan** jika DPPL secara murni mendokumentasikan antarmuka aplikasi klien.
3. Entitas `SyncQueue` **wajib dimasukkan** sebagai perantara data klien-server.

## 11. Keputusan Menghapus Field Codebase
- **Tidak perlu.** Tidak ada rekomendasi penghapusan dari _codebase_ saat ini. Menyimpan `walletId` di TargetFinansial bersifat aman (_nullable_), tidak merusak performa.

## 12. Catatan "Perlu Konfirmasi"
- **Tidak ada keraguan.** Pola integrasi *end-to-end* yang diselidiki memverifikasi bahwa tabel class tahap 1 & 2 yang sudah Anda buat ternyata sangat akurat selaras dengan realitas *codebase*. Semua instrumen yang tampak "terlalu teknis" rupanya aktif mengendalikan fungsionalitas UI, *Service Worker*, dan Sinkronisasi.
