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

### Prasyarat
- Node.js >= 20
- Instance PostgreSQL (Misal: Supabase / Neon)
- Kunci VAPID untuk Web Push Notifications

### Inisialisasi Proyek

```bash
# 1. Kloning repositori
git clone https://github.com/gilangwahyun/Moneta-Finance-Final-Project.git
cd Moneta-Finance-Final-Project

# 2. Instalasi dependensi (akan memicu prisma generate)
npm install

# 3. Konfigurasi Environment Variables
cp .env.example .env.local
# (Lengkapi DATABASE_URL dan VAPID Keys)

# 4. Pembuatan Kunci VAPID
npx web-push generate-vapid-keys
# (Masukkan public & private keys ke .env.local)

# 5. Migrasi Skema Database
npx prisma db push

# 6. (Opsional) Injeksi Data Awal
npx prisma db seed

# 7. Mulai Server Pengembangan
npm run dev
```

Aplikasi dapat diakses melalui `http://localhost:3000`.

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
