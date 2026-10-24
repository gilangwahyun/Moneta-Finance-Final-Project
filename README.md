# MONETA FINANCE
**Intelligent Personal Financial Management System**

> Dibangun untuk resiliensi, presisi, dan privasi. Aplikasi Progressive Web App (PWA) yang ditenagai oleh arsitektur *Offline-First* dan *Rule-Based Insight Engine*.

Moneta Finance mendefinisikan ulang cara pencatatan keuangan dengan memungkinkan pengguna untuk mencatat, memantau, dan menganalisis metrik finansial secara *real-time*—bahkan tanpa koneksi internet sama sekali. Data disimpan secara aman di sisi klien menggunakan IndexedDB dan direkonsiliasi secara asinkron ke server dengan strategi resolusi konflik *Last-Write-Wins* (LWW).

---

## KAPABILITAS UTAMA

- **Offline-First Resilience**
  Seluruh operasi CRUD berjalan instan tanpa dependensi jaringan. Akses penuh terhadap data keuangan Anda, kapan pun dan di mana pun.
- **Background Synchronization**
  Sinkronisasi mutasi data otomatis saat koneksi terdeteksi, menjamin integritas data terdistribusi tanpa intervensi manual pengguna.
- **Multi-Wallet Architecture**
  Pemisahan aset secara logis melalui dompet Tunai, Bank, E-Wallet, dan Investasi. Dilengkapi fitur *Hidden Balance* untuk ekstra privasi.
- **Rule-Based Insight Engine**
  Analitik proaktif yang mendeteksi pola pengeluaran laten (seperti *Payday Leak* atau *Weekend Trap*) dan mengirimkan *behavioral nudge* untuk mencegah pemborosan.
- **Smart Budgeting & Subsidies**
  Sistem peringatan anggaran bertingkat yang diintegrasikan dengan algoritma subsidi silang cerdas—merekomendasikan realokasi dana dari kategori surplus ke kategori yang mengalami defisit.
- **Progressive Web Push Notifications**
  Notifikasi *Instant Alert* untuk peristiwa kritikal dan *Daily Digest* harian yang diregulasi oleh *Daily Cap Engine* agar mencegah *alert fatigue* (spam).
- **Data Portability**
  Ekstraksi komprehensif seluruh buku besar transaksi ke dalam format Excel (.xlsx).

---

## SPESIFIKASI TEKNIS (TECH STACK)

**Frontend Architecture**
- Next.js 16 (App Router)
- React 19, Tailwind CSS v4, Recharts, Lucide React

**Backend & Database**
- PostgreSQL (via Supabase) ditenagai oleh Prisma ORM
- Client-Side Database: IndexedDB (via `idb`)

**Authentication & Security**
- Stateless JWT (`jose`), `bcryptjs`
- Anti-CSRF Tokens, Algoritma Rate Limiting

**Progressive Web App (PWA)**
- `@ducanh2912/next-pwa`, Custom Service Worker, Web Push API

---

## ARSITEKTUR SISTEM

```text
CLIENT ARCHITECTURE (BROWSER)
├── IndexedDB (Primary Store — Offline-First)
│   ├── Transactions, Wallets, Budgets, Categories, Targets
│   └── Sync Queue (Antrian mutasi lokal tertunda)
│
├── Service Worker
│   ├── Push Notification Handler
│   ├── Daily Cap Engine (Regulator batas notifikasi)
│   └── Background Sync Trigger
│
└── Sync Engine
    ├── Last-Write-Wins (LWW) Conflict Resolution
    └── Auto-sync state reconciler

SERVER ARCHITECTURE (NEXT.JS API)
├── REST API → Prisma → PostgreSQL
├── Authentication Layer (JWT + CSRF Token + Rate Limiter)
└── Web Push Integration (VAPID)
```

---

## MODUL INTI APLIKASI

### 1. Autentikasi Kriptografis
Manajemen sesi *stateless* menggunakan token JWT yang dienkripsi dan disimpan sebagai *HttpOnly Cookie*. Dilengkapi proteksi *anti-CSRF* dan perlindungan serangan *brute-force* tingkat lanjut.

### 2. Command Center (Dashboard)
Dasbor terpusat yang menyajikan akumulasi likuiditas, analitik komparatif arus kas, riwayat transaksi historis, dan telemetri status sinkronisasi *real-time*.

### 3. Manajemen Dompet & Buku Besar
Pencatatan buku besar (Pemasukan, Pengeluaran, Transfer) yang bertindak sebagai *trigger* instan bagi evaluasi anggaran sisi klien dan pengiriman *nudge* seketika.

### 4. Manajemen Anggaran & Target Finansial
Penetapan ambang batas presisi (50%, 80%, 100%) dan pemantauan metrik *milestone* tabungan.

### 5. Analitik & Nudging Engine
Visualisasi komparatif (*Donut Chart*, *Trend Lines*) yang menerjemahkan data mentah menjadi wawasan keuangan yang *actionable* berkat orkestrasi mesin *nudging* lokal.

### 6. Mesin Sinkronisasi Terdistribusi
Lapisan sinkronisasi kompleks yang mengorkestrasi urutan *pull/push* secara asinkronus untuk mencegah dan memecahkan tabrakan data antara *local state* dan *server state*.

---

## PANDUAN PENGEMBANGAN LOKAL

### Catatan Awal Mengenai Struktur Berkas
Jika Anda mengunduh proyek ini dari GitHub (baik melalui `git clone` maupun unduhan berkas ZIP), beberapa folder seperti `node_modules/`, `.next/`, serta berkas `.env.local` tidak akan langsung terlihat karena terdaftar pada aturan pengabaian `.gitignore`. Folder dependensi `node_modules/` akan diunduh secara otomatis ketika Anda menjalankan perintah `npm install`, sedangkan folder kompilasi `.next/` akan dibuat secara otomatis saat server lokal dijalankan.

### Prasyarat Sistem
1. **Node.js**: Versi 20 atau lebih baru (dapat diunduh secara resmi melalui `https://nodejs.org`). Pemasangan Node.js sudah otomatis menyertakan program `npm`.
2. **Basis Data PostgreSQL**: Dapat menggunakan instans *cloud* gratis (seperti Supabase atau Neon) maupun instalasi PostgreSQL lokal pada komputer Anda.

---

### Langkah Inisialisasi Proyek

#### 1. Kloning atau Ekstrak Repositori
Buka terminal dan masuk ke dalam folder proyek:
```bash
git clone https://github.com/gilangwahyun/Moneta-Finance-Final-Project.git
cd Moneta-Finance-Final-Project
```
*(Atau ekstrak arsip ZIP jika mengunduh repositori secara manual, lalu buka terminal pada direktori hasil ekstraksi).*

#### 2. Instalasi Dependensi Pustaka
Jalankan perintah instalasi dependensi:
```bash
npm install
```
Perintah ini akan mengunduh seluruh dependensi proyek (termasuk Next.js, React, Prisma, dan Tailwind CSS) ke dalam folder `node_modules/` sekaligus mengompilasi Prisma Client secara otomatis melalui skrip *postinstall*. Anda tidak perlu memasang Next.js secara terpisah.

#### 3. Pembuatan Berkas Konfigurasi Lingkungan (`.env.local`)
Salin berkas cetak biru `.env.example` menjadi `.env.local`:
* **Linux, macOS, atau Windows PowerShell**:
  ```bash
  cp .env.example .env.local
  ```
* **Windows Command Prompt (CMD)**:
  ```cmd
  copy .env.example .env.local
  ```

#### 4. Pengaturan Basis Data pada `.env.local`
Buka berkas `.env.local` yang baru dibuat menggunakan editor teks, lalu lengkapi URL koneksi basis data:
* **Jika menggunakan Supabase**:
  Salin string koneksi dari menu *Project Settings > Database > Connection String (URI)* pada dashboard Supabase Anda. Gunakan mode *Transaction Pooler* pada `DATABASE_URL` dan mode *Direct Connection* pada `DIRECT_URL`.
* **Jika menggunakan PostgreSQL lokal**:
  ```env
  DATABASE_URL="postgresql://postgres:password_anda@localhost:5432/moneta?schema=public"
  DIRECT_URL="postgresql://postgres:password_anda@localhost:5432/moneta?schema=public"
  ```
  *(Pada instalasi lokal, nilai `DIRECT_URL` cukup disamakan dengan `DATABASE_URL`).*

#### 5. Pembuatan Kunci Kriptografi Notifikasi (VAPID Keys)
Jalankan perintah berikut di terminal untuk menghasilkan sepasang kunci keamanan Web Push tanpa perlu mendaftar ke layanan luar:
```bash
npx web-push generate-vapid-keys
```
Terminal akan mencetak sepasang kunci kriptografi. Salin hasilnya ke dalam `.env.local`:
```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY="salin_nilai_public_key_di_sini"
VAPID_PRIVATE_KEY="salin_nilai_private_key_di_sini"
VAPID_SUBJECT="mailto:email_anda@example.com"
```

#### 6. Sinkronisasi Skema Basis Data
Terapkan skema tabel dan relasi data ke basis data Anda:
```bash
npx prisma db push
```

#### 7. (Opsional) Injeksi Data Awal Pengujian
Untuk mengisi basis data dengan data awal (*dummy data*) yang siap diuji:
```bash
npx prisma db seed
```

#### 8. Menjalankan Server Pengembangan
Jalankan aplikasi pada lingkungan lokal:
```bash
npm run dev
```

Aplikasi siap diakses melalui peramban pada alamat `http://localhost:3000`. Folder `.next/` akan otomatis terbuat saat server pertama kali melakukan kompilasi halaman.

---

## PENGUJIAN (TESTING)

Proyek ini dilengkapi dengan *test suite* komprehensif menggunakan Playwright, mencakup *unit tests*, *integration tests*, hingga *End-to-End (E2E) tests*.

```bash
# 1. Menjalankan seluruh pengujian secara berurutan (sequential)
npx playwright test --workers=1

# 2. Menjalankan satu file pengujian spesifik (contoh: engine validitas aturan)
npx playwright test tests/08-insight-engine.spec.ts

# 3. Menjalankan pengujian dengan antarmuka grafis (UI Mode)
npx playwright test --ui
```

---

## INSTRUKSI DEPLOYMENT

Proyek ini telah dikalibrasi untuk proses *deployment* di infrastruktur Vercel:

```bash
npm run build
npx vercel --prod
```

---

## LISENSI & HAK CIPTA

Dikembangkan sebagai purwarupa tugas akhir akademik. Seluruh hak kekayaan intelektual atas desain arsitektur, inovasi *insight engine*, dan kode sumber sepenuhnya dimiliki oleh penulis.
