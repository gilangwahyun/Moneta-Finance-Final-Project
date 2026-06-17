# Moneta Finance

> Aplikasi manajemen keuangan pribadi berbasis Progressive Web App (PWA) dengan arsitektur *offline-first*.

Moneta Finance memungkinkan pengguna mencatat, memantau, dan menganalisis keuangan pribadi secara real-time, bahkan tanpa koneksi internet. Data disimpan lokal menggunakan IndexedDB dan disinkronisasi otomatis ke server saat kembali online.

---

## Tech Stack

| Layer | Teknologi |
|---|---|
| **Framework** | Next.js 16 (App Router) |
| **Language** | TypeScript |
| **UI** | React 19, Tailwind CSS v4, Recharts, Lucide React |
| **Database (Server)** | PostgreSQL via Supabase |
| **ORM** | Prisma |
| **Database (Client)** | IndexedDB via `idb` |
| **Auth** | JWT (`jose`), bcryptjs, CSRF token |
| **Push Notification** | Web Push API (`web-push`), Service Worker |
| **PWA** | `@ducanh2912/next-pwa` |
| **Deployment** | Vercel |

---

## Fitur Utama

- ✅ **Offline-first** — semua operasi CRUD berjalan tanpa internet
- ✅ **Background Sync** — data disinkronisasi otomatis saat kembali online
- ✅ **Multi-wallet** — kelola beberapa dompet sekaligus (tunai, bank, e-wallet, investasi)
- ✅ **Budget & Target** — atur anggaran bulanan dan lacak progres target finansial
- ✅ **Analisis Cerdas** — insight otomatis berbasis pola pengeluaran
- ✅ **Web Push Notification** — notifikasi peringatan anggaran & ringkasan harian
- ✅ **Ekspor Data** — unduh laporan keuangan ke format Excel (.xlsx)
- ✅ **Dark Mode** — dukungan tema terang dan gelap

---

## Arsitektur Sistem

```
Browser (Client)
├── IndexedDB (Primary Store — offline-first)
│   ├── Transactions, Wallets, Budgets, Categories
│   ├── Financial Targets, Notification Logs
│   └── Sync Queue (antrian perubahan yang belum tersinkronisasi)
│
├── Service Worker
│   ├── Push Notification handler
│   ├── Daily Cap Engine (pembatasan notifikasi harian)
│   └── Background Sync trigger
│
└── Sync Engine
    ├── Last-Write-Wins (LWW) conflict resolution
    └── Auto-sync saat browser kembali online

Server (Next.js API Routes)
├── REST API → Prisma → PostgreSQL
├── Auth (JWT + CSRF + Rate Limiter)
└── Web Push (VAPID)
```

---

## Struktur Modul

### 1. 🔐 Autentikasi (`/src/app/(auth)/`)

Mengelola siklus hidup sesi pengguna.

| Komponen | Deskripsi |
|---|---|
| Register | Pembuatan akun baru dengan validasi email & password |
| Login | Autentikasi dengan JWT yang disimpan sebagai HttpOnly cookie |
| Profile | Pengelolaan profil dan pengaturan akun |

**Teknis:** JWT di-sign menggunakan `jose`, password di-hash dengan `bcryptjs`. Setiap request API terproteksi CSRF token dan rate limiter untuk mencegah brute-force.

---

### 2. 🏠 Dashboard (`/src/app/(dashboard)/page.tsx`)

Halaman utama yang menampilkan ringkasan keuangan terkini.

- Saldo total semua dompet
- Ringkasan pemasukan & pengeluaran periode aktif
- Transaksi terbaru
- Status sinkronisasi data
- Filter periode waktu global (harian, mingguan, bulanan, kustom)

---

### 3. 👛 Kelola Dompet (`/src/app/(dashboard)/wallets/`)

Manajemen multi-dompet dengan tipe: **Tunai**, **Bank**, **E-Wallet**, **Investasi**, **Lainnya**.

| Fitur | Deskripsi |
|---|---|
| Tambah / Edit / Hapus Dompet | CRUD lengkap dengan validasi |
| Saldo Tersembunyi | Toggle visibilitas saldo untuk privasi |
| Transfer antar Dompet | Pencatatan transfer dengan deduksi & kredit otomatis |

---

### 4. 💸 Kelola Transaksi (`/src/app/(dashboard)/transactions/`)

Inti dari aplikasi — pencatatan setiap aktivitas keuangan.

| Tipe | Deskripsi |
|---|---|
| **Pemasukan** | Pencatatan sumber pendapatan |
| **Pengeluaran** | Pencatatan pengeluaran per kategori |
| **Transfer** | Perpindahan dana antar dompet |

Setiap transaksi memicu evaluasi budget dan nudge notifikasi secara otomatis di sisi klien (via `local-engine.ts`).

---

### 5. 📊 Kelola Anggaran (`/src/app/(dashboard)/budgets/`)

Pengaturan batas pengeluaran bulanan per kategori dengan sistem peringatan bertingkat.

| Ambang Batas | Peringatan |
|---|---|
| 50% | Info — penggunaan anggaran berjalan |
| 80% | Warning — anggaran mulai menipis |
| 100% | Critical — batas anggaran tercapai |
| >100% | Critical + Rekomendasi Subsidi Silang |

**Fitur Unggulan:** Sistem rekomendasi realokasi anggaran otomatis — saat satu kategori melampaui batas, sistem mendeteksi kategori lain yang memiliki sisa anggaran dan merekomendasikan subsidi silang.

---

### 6. 🎯 Kelola Target Finansial (`/src/app/(dashboard)/targets/`)

Penetapan dan pemantauan target keuangan dengan tipe dan periode fleksibel.

| Tipe Target | Deskripsi |
|---|---|
| **Target Pemasukan** | Kejar jumlah pendapatan tertentu |
| **Target Tabungan** | Akumulasi tabungan dalam periode |
| **Target Saldo** | Pertahankan saldo minimum dompet |

**Periode:** Harian, Mingguan, Bulanan, Kustom. Notifikasi progres otomatis saat mencapai 80% dan 100%.

---

### 7. 📈 Analisis & Insight (`/src/app/(dashboard)/analytics/`)

Visualisasi dan analisis pola keuangan berbasis data transaksi.

| Fitur Analisis | Deskripsi |
|---|---|
| Distribusi Pengeluaran | Donut chart per kategori |
| Tren Bulanan | Perbandingan pemasukan vs pengeluaran |
| Category Drilldown | Detail transaksi per kategori |
| Analisis Komparatif | Perbandingan antar periode |
| Spending Insights | Deteksi pola: Payday Leak, Weekend Trap, Night Owl, Latte Factor, dll. |

**Engine nudging (`/src/lib/nudging.ts`)** menganalisis 10+ pola pengeluaran dan menghasilkan insight yang dapat dinotifikasikan.

---

### 8. 🔔 Notifikasi (`/src/app/(dashboard)/notifications/`)

Sistem notifikasi berbasis Web Push API dengan dua mode pengiriman.

| Mode | Deskripsi |
|---|---|
| **Instant Alert** | Notifikasi langsung saat peristiwa keuangan terdeteksi (anggaran 80%/100%, target tercapai) |
| **Daily Digest** | Ringkasan harian pada jam yang dikonfigurasi pengguna |

**Komponen teknis:**

| File | Fungsi |
|---|---|
| `worker/index.ts` | Service Worker — handler push event & Daily Cap Engine |
| `src/lib/notifications.ts` | Server-side push via VAPID |
| `src/lib/notifications/local-engine.ts` | Evaluasi nudge sisi klien per transaksi |
| `src/lib/notifications/daily-digest.ts` | Builder konten digest & timing checker |
| `src/lib/sw/register.ts` | Registrasi SW, subscription, digest timer |

**Daily Cap Engine:** Membatasi jumlah push notification harian (default: 5) untuk mencegah spam. Notifikasi yang melebihi kuota tetap dicatat di log internal.

---

### 9. 🏷️ Kelola Kategori (`/src/app/(dashboard)/categories/`)

Pengelolaan kategori transaksi dengan dukungan ikon dan warna kustom.

- Kategori default disediakan saat registrasi
- Pengguna dapat menambah, mengedit, dan menghapus kategori kustom
- Tipe: **Pemasukan** dan **Pengeluaran**

---

### 10. 📤 Ekspor Data (`/src/app/api/export/`)

Ekspor data keuangan ke format Excel (.xlsx) menggunakan library `xlsx`.

- Ekspor transaksi berdasarkan filter periode
- Format laporan siap cetak

---

### 11. 🔄 Sinkronisasi (`/src/lib/sync/`)

Mesin sinkronisasi offline-first yang memastikan konsistensi data antara klien dan server.

| Komponen | File | Fungsi |
|---|---|---|
| Sync Manager | `sync-manager.ts` | Orkestrasi proses pull & push data |
| Sync Queue | `queue.ts` | Antrian perubahan lokal yang menunggu upload |
| Conflict Resolver | `conflict-resolver.ts` | Resolusi konflik dengan strategi Last-Write-Wins (LWW) |
| Sync Events | `events.ts` | Event bus untuk notifikasi status sinkronisasi ke UI |

**Alur Sinkronisasi:**
```
Pengguna online → Sync Manager aktif
  → Pull: ambil data terbaru dari server
  → Push: unggah perubahan dari Sync Queue
  → Conflict: resolusi LWW berdasarkan updatedAt timestamp
```

---

### 12. 🗄️ Akses Data Lokal (`/src/lib/local-db/`)

Layer abstraksi untuk operasi IndexedDB menggunakan library `idb`.

```
src/lib/local-db/
├── index.ts              — inisialisasi & schema IndexedDB
├── schema.ts             — definisi stores & indexes
├── notification-prefs.ts — helper preferensi notifikasi
├── cache-manager.ts      — manajemen cache
└── repositories/
    ├── transactions.ts
    ├── wallets.ts
    ├── budgets.ts
    ├── categories.ts
    ├── targets.ts
    ├── notification-logs.ts
    ├── notification-settings.ts
    └── sync-queue.ts
```

---

### 13. 🌐 Akses Data Server (`/src/app/api/`)

REST API endpoints yang berinteraksi dengan PostgreSQL via Prisma.

```
/api/
├── auth/           — register, login, logout, me
├── sync/           — pull & push data sinkronisasi
├── budgets/        — CRUD anggaran
├── export/         — ekspor laporan Excel
├── notifications/
│   ├── subscribe/  — pendaftaran Web Push subscription
│   └── test/       — pengujian push pipeline
└── settings/       — pengaturan pengguna
```

---

## Instalasi & Menjalankan Lokal

### Prasyarat

- Node.js >= 20
- PostgreSQL (atau akun Supabase)
- VAPID keys untuk Web Push

### Setup

```bash
# 1. Clone repository
git clone https://github.com/gilangwahyun/Moneta-Finance-Final-Project.git
cd Moneta-Finance-Final-Project

# 2. Install dependencies (otomatis menjalankan prisma generate)
npm install

# 3. Salin environment template dan isi nilainya
cp .env.example .env.local

# 4. Jalankan migrasi database
npx prisma db push

# 5. (Opsional) Seed data default
npx prisma db seed

# 6. Jalankan development server
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000).

### Environment Variables

| Variable | Keterangan |
|---|---|
| `DATABASE_URL` | Connection string PostgreSQL (pooler) |
| `DIRECT_URL` | Connection string PostgreSQL (direct) |
| `JWT_SECRET` | Secret key untuk signing JWT |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | VAPID public key untuk Web Push |
| `VAPID_PRIVATE_KEY` | VAPID private key untuk Web Push |
| `VAPID_SUBJECT` | Email/URL untuk VAPID identification |

**Generate VAPID keys:**
```bash
npx web-push generate-vapid-keys
```

---

## Deployment

Project ini di-deploy ke Vercel menggunakan Vercel CLI:

```bash
npm run build   # build production
npx vercel --prod
```

---

## Lisensi

Project ini dibuat sebagai tugas akhir akademik. Seluruh hak cipta dimiliki oleh penulis.
