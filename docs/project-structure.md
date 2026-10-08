# Moneta Project Structure

This document outlines the purpose, boundaries, and naming conventions for each core directory in the Moneta project to ensure consistent and maintainable architecture.

---

## 1. `src/app`

- **Purpose**: Next.js App Router root. Handles application routing, server-side API endpoints, and page-level entry points.
- **What belongs here**: `page.tsx`, `layout.tsx`, API route handlers (`route.ts`).
- **What does NOT belong here**: Reusable UI components, complex business logic, database queries.
- **Naming Convention**: Framework standard (`page.tsx`, `layout.tsx`, `route.ts`). Folders in `kebab-case`.
- **Examples**: `src/app/(dashboard)/transactions/page.tsx`, `src/app/api/sync/pull/route.ts`
- **Subdirectories**:
  - `(auth)`: Login and registration pages.
  - `(dashboard)`: Main application views including wallets, categories, transactions, budgets, targets, analytics, and notifications.
  - `api`: Backend endpoints handling auth, sync (`/sync/push`, `/sync/pull`), exports, and web push subscriptions.

## 2. `src/components`

- **Purpose**: Root directory for all React components. Divided strictly into generic UI primitives and domain-specific groupings.
- **Note**: All UI components must adhere to the standards defined in `docs/FRONTEND_UI_GUIDELINES.md`.
- **Naming Convention**: `PascalCase.tsx`
- **Examples**: `Skeletons.tsx`, `ToastProvider.tsx`

### `src/components/ui`

- **Purpose**: Dumb, generic, reusable UI primitives. These components should not know about Moneta's business logic, domains, or IndexedDB.
- **What belongs here**: Buttons, inputs, dialogs, dropdowns, form elements.
- **What does NOT belong here**: Domain-aware elements like a `TransactionItem` or `BudgetModal`.
- **Examples**: `button.tsx`, `dialog.tsx`, `input.tsx`

### `src/components/{domain}`

- **Purpose**: Domain-aware, feature-specific components.
- **What belongs here**: Complex UI elements tied to specific business domains.
  - `analytics`: Charts and insight cards.
  - `budgets`: Budget forms, rhythm indicators, reallocation modals.
  - `categories`: Category selectors, list items.
  - `notifications`: Inbox items, settings forms.
  - `targets`: Target progress cards, target creation forms.
  - `transactions`: Transaction list, transaction creation forms.
  - `wallets`: Wallet cards, transfer forms.
  - `layout`: Global shell components like Sidebar, BottomNavigation, Header.
- **What does NOT belong here**: Pure generic primitives.
- **Examples**: `src/components/transactions/TransactionItem.tsx`, `src/components/targets/TargetModal.tsx`

## 3. `src/hooks`

- **Purpose**: Custom React hooks for abstracting component logic and reacting to state/IDB changes.
- **What belongs here**: Hooks wrapping `useLiveQuery`, hydration managers, UI state hooks, specialized data fetching logic.
- **What does NOT belong here**: Direct database schema definitions.
- **Naming Convention**: `use-kebab-case.ts`
- **Examples**: `use-transactions.ts`, `use-analytics.ts`, `use-offline-sync.ts`

## 4. `src/providers`

- **Purpose**: React Context providers wrapping application sub-trees.
- **What belongs here**: Providers managing global client-side state (Theme, Auth, Toast).
- **Naming Convention**: `PascalCase.tsx`
- **Examples**: `ThemeProvider.tsx`

## 5. `src/lib/local-db`

- **Purpose**: The core IndexedDB infrastructure and migrations (the Offline-First heart of the app).
- **What belongs here**: DB initialization, schema definitions, migration scripts.
- **What does NOT belong here**: High-level React UI logic.
- **Naming Convention**: `kebab-case.ts`
- **Examples**: `index.ts`, `schema.ts`, `migrations/v5-wallet-migration.ts`

### `src/lib/local-db/repositories`

- **Purpose**: Direct CRUD operations interacting with IndexedDB.
- **What belongs here**: Repository functions to get, insert, and update specific entities.
- **Naming Convention**: Plural entity names in `kebab-case.ts`
- **Examples**: `transactions.ts`, `budgets.ts`, `notification-logs.ts`

## 6. `src/lib/sync`

- **Purpose**: The bidirectional synchronization engine logic.
- **What belongs here**: Push queue processing, pull delta merging, and conflict resolution logic.
- **What does NOT belong here**: UI rendering, direct API routing.
- **Naming Convention**: `kebab-case.ts`
- **Examples**: `sync-manager.ts`, `conflict-resolver.ts`

## 7. `src/lib/notifications`

- **Purpose**: Push notification triggers, local engine logic, and background web push helpers.
- **What belongs here**: The logic to evaluate budgets and trigger a local warning or background cron job.
- **Naming Convention**: `kebab-case.ts`
- **Examples**: `local-engine.ts`, `daily-digest.ts`

## 8. `src/lib/utils`

- **Purpose**: Pure functions, formatting helpers, and independent utility logic.
- **What belongs here**: Currency formatters, date manipulators, CSRF utilities, icons.
- **What does NOT belong here**: Database queries, React hooks.
- **Naming Convention**: `kebab-case.ts`
- **Examples**: `date-utils.ts`, `format-currency.ts`

## 9. `src/types`

- **Purpose**: Global TypeScript interfaces and types.
- **What belongs here**: Shared models, API request/response types, sync payloads.
- **Naming Convention**: `*.types.ts`
- **Examples**: `api.types.ts`, `models.types.ts`, `sync.types.ts`

## 10. `prisma`

- **Purpose**: The PostgreSQL database schema and migrations for the cloud state.
- **What belongs here**: `schema.prisma`, `migrations/`, `seed.ts`.
- **What does NOT belong here**: Frontend logic.

## 11. `tests`

- **Purpose**: End-to-End and UI testing infrastructure.
- **What belongs here**: Playwright spec files (`*.spec.ts`).
- **Note**: Only automation tests go here; manual QA checklists reside in `docs/`.

## 12. Documentation (`docs/`)

- **Purpose**: Project documentation and guidelines.
- **Key Files**:
  - `FRONTEND_UI_GUIDELINES.md` — UI/UX and styling rules.
  - `QA_CHECKLIST.md` — Comprehensive manual Black Box testing checklist.
  - `DATA_DESIGN.md` — Database ERD and IndexedDB schema definitions.
  - `AUDIT_REPORT.md` — Project health and compliance audits.
  - `RULE_BASED_INSIGHT_ENGINE.md` — Complete reference of the 30 rules implemented for Analytics Insights and Local Push Notifications.

---

# Struktur Proyek Moneta (Versi Bahasa Indonesia)

Dokumen ini menguraikan tujuan, batasan, dan konvensi penamaan untuk setiap direktori inti dalam proyek Moneta demi menjaga arsitektur yang konsisten dan mudah dipelihara.

---

## 1. `src/app`

- **Tujuan**: Direktori *root* dari Next.js App Router. Menangani perutean (routing) aplikasi, *endpoint* API sisi server, serta titik masuk halaman.
- **Yang termasuk di sini**: `page.tsx`, `layout.tsx`, dan rute API (`route.ts`).
- **Yang TIDAK termasuk di sini**: Komponen antarmuka (UI) yang dapat digunakan ulang, logika bisnis kompleks, atau kueri *database* langsung.
- **Konvensi Penamaan**: Standar *framework* (`page.tsx`, `layout.tsx`, `route.ts`). Folder ditulis dalam `kebab-case`.
- **Contoh**: `src/app/(dashboard)/transactions/page.tsx`, `src/app/api/sync/pull/route.ts`
- **Subdirektori**:
  - `(auth)`: Halaman login dan pendaftaran.
  - `(dashboard)`: Tampilan utama aplikasi yang mencakup dompet, kategori, transaksi, anggaran, target, analitik, dan notifikasi.
  - `api`: *Endpoint backend* untuk autentikasi, sinkronisasi (`/sync/push`, `/sync/pull`), ekspor, dan *web push*.

## 2. `src/components`

- **Tujuan**: Direktori utama bagi seluruh komponen React. Dipisahkan secara ketat menjadi komponen antarmuka dasar (primitif) dan komponen berbasis domain.
- **Catatan**: Semua komponen UI harus patuh pada standar interaksi di `docs/FRONTEND_UI_GUIDELINES.md`.
- **Konvensi Penamaan**: `PascalCase.tsx`
- **Contoh**: `Skeletons.tsx`, `ToastProvider.tsx`

### `src/components/ui`

- **Tujuan**: Komponen UI primitif dasar yang umum dan "bodoh". Komponen ini tidak boleh menyadari logika bisnis Moneta, domain, ataupun IndexedDB.
- **Yang termasuk di sini**: Tombol, input, dialog, *dropdown*, elemen formulir.
- **Yang TIDAK termasuk di sini**: Elemen yang spesifik terhadap domain (misal: `TransactionItem` atau `BudgetModal`).
- **Contoh**: `button.tsx`, `dialog.tsx`, `input.tsx`

### `src/components/{domain}`

- **Tujuan**: Komponen yang menyadari domain (fitur spesifik).
- **Yang termasuk di sini**: Elemen UI kompleks yang terkait erat dengan domain bisnis tertentu.
  - `analytics`: Grafik analitik dan kartu wawasan (insight).
  - `budgets`: Formulir anggaran, indikator ritme, modal subsidi silang.
  - `categories`: Pemilih kategori, *list item* kategori.
  - `notifications`: Item kotak masuk, formulir pengaturan notifikasi.
  - `targets`: Kartu progres target, formulir target.
  - `transactions`: Daftar transaksi, formulir pembuatan transaksi.
  - `wallets`: Kartu dompet, formulir transfer.
  - `layout`: Komponen penyusun kerangka global seperti *Sidebar*, Navigasi Bawah, *Header*.
- **Yang TIDAK termasuk di sini**: Komponen primitif murni.
- **Contoh**: `src/components/transactions/TransactionItem.tsx`, `src/components/targets/TargetModal.tsx`

## 3. `src/hooks`

- **Tujuan**: Berisi pustaka *custom hook* React yang mengabstraksi logika komponen serta merespons pada kondisi *state*/IndexedDB.
- **Yang termasuk di sini**: *Hook* pembungkus `useLiveQuery`, pengelola hidrasi data, pengelolaan interaksi kondisi antarmuka UI tingkat tinggi, logika pengambilan pemanggilan kueri spesifik.
- **Yang TIDAK termasuk di sini**: Pendefinisian tabel struktur *database* secara langsung.
- **Konvensi Penamaan**: `use-kebab-case.ts`
- **Contoh**: `use-transactions.ts`, `use-analytics.ts`, `use-offline-sync.ts`

## 4. `src/providers`

- **Tujuan**: Komponen *Provider* (Pembungkus) dari React Context yang akan membungkus percabangan atau hierarki aplikasi.
- **Yang termasuk di sini**: *Provider* pengelola kondisi (state) yang global secara keseluruhan (seperti Tema warna, Sesi pengguna aplikasi, Notifikasi Toast).
- **Konvensi Penamaan**: `PascalCase.tsx`
- **Contoh**: `ThemeProvider.tsx`

## 5. `src/lib/local-db`

- **Tujuan**: Infrastruktur *database* inti IndexedDB berikut fungsi migrasi (Pusat arsitektur Offline-First dari aplikasi Moneta).
- **Yang termasuk di sini**: Inisialisasi DB, definisi skema, dan kode perintah untuk peningkatan (migrasi) versi tabel *database* baru.
- **Yang TIDAK termasuk di sini**: Penulisan fungsi komponen *React UI* kelas tinggi.
- **Konvensi Penamaan**: `kebab-case.ts`
- **Contoh**: `index.ts`, `schema.ts`, `migrations/v5-wallet-migration.ts`

### `src/lib/local-db/repositories`

- **Tujuan**: Tempat pustaka operasi kueri CRUD langsung untuk *database* IndexedDB di peramban pengguna.
- **Yang termasuk di sini**: Berbagai fungsi (Repository) untuk menampung aksi baca, tambah, sisipkan dan pengubah struktur entitas tertentu yang presisi (spesifik).
- **Konvensi Penamaan**: Penamaan format entitas versi jamak dengan gaya `kebab-case.ts`
- **Contoh**: `transactions.ts`, `budgets.ts`, `notification-logs.ts`

## 6. `src/lib/sync`

- **Tujuan**: Pusat dari seluruh mesin algoritma penentu sinkronisasi 2 arah.
- **Yang termasuk di sini**: Kumpulan modul fungsional pemrosesan dan pembaca daftar antrean (Queue) saat *push*, sinkronisasi proses gabung perbandingan (deltas) *pull* dan strategi penentu pemenang pada pemecahan konflik.
- **Yang TIDAK termasuk di sini**: Logika halaman pemicu HTML tampilan sisi perangkat (Render) atau fungsi pemandu permintaan perutean rute/API.
- **Konvensi Penamaan**: `kebab-case.ts`
- **Contoh**: `sync-manager.ts`, `conflict-resolver.ts`

## 7. `src/lib/notifications`

- **Tujuan**: Trigger sistem pendorong pelatuk belakang (Notification triggers background services), pemroses logika notifikasi evaluasi peringatan internal mandiri lokal pengguna dan utilitas pengolah Web Push eksternal.
- **Yang termasuk di sini**: Mekanisme yang menghitung keparahan atau melampauinya batas peringatan anggaran yang berjalan pada proses perangkat dan penyedia kerangka notifikasi pekerjaan pengulangan latar (Background cron jobs service).
- **Konvensi Penamaan**: `kebab-case.ts`
- **Contoh**: `local-engine.ts`, `daily-digest.ts`

## 8. `src/lib/utils`

- **Tujuan**: Modul berisikan logika mandiri abstrak (Pure function), fungsi asisten format utilitas independen.
- **Yang termasuk di sini**: Pengubah nominal mata uang baku, instrumen penghitung modifikasi rentang waktu bulan hari jam (date manipulator), validitas format struktur keamanan sistem sesi web standar, penyedia struktur logo-ikon ikonografi visual aplikasi.
- **Yang TIDAK termasuk di sini**: Memasang panggilan (Kuery) ke gudang database atau meletakkan wujud kaitan struktur pustaka *React Hook*.
- **Konvensi Penamaan**: `kebab-case.ts`
- **Contoh**: `date-utils.ts`, `format-currency.ts`

## 9. `src/types`

- **Tujuan**: Titik penampungan definisi sistematis untuk deklarasi tipe-tipe spesifik struktural TypeScript.
- **Yang termasuk di sini**: Perancangan *Interface* model pemakaian, perincian muatan muatan kiriman balasan dari skema server (*API types payload*), skema jenis spesifik penengah sinkronisasi yang aman (Type safety).
- **Konvensi Penamaan**: `*.types.ts`
- **Contoh**: `api.types.ts`, `models.types.ts`, `sync.types.ts`

## 10. `prisma`

- **Tujuan**: Merancang kerangka tabel dan relasi entitas PostgreSQL *database* jarak jauh pusat.
- **Yang termasuk di sini**: Pengelola arsitektur tabel awan utama di `schema.prisma`, daftar *backup* mutasi log perubahan riwayat dalam tumpukan map `migrations/`, penyuplai daftar catatan data palsu bahan ujian `seed.ts`.
- **Yang TIDAK termasuk di sini**: Komponen fungsional dan pengarah antarmuka layar peramban.

## 11. `tests`

- **Tujuan**: Prasarana uji fungsional automasi kerangka sistem lengkap beruntun komprehensif *End-to-End* & Uji integrasi muka interaksi (UI automation testing).
- **Yang termasuk di sini**: Susunan langkah pengujian otomasi dengan basis platform kerangka dari Playwright dengan bentuk identitas spesifik file `(*.spec.ts)`.
- **Catatan**: Seluruh kerangka pengecekan secara fisik lewat rabaan manusia (QA Tester checklists) dibedakan dan dipusatkan langsung pada pustaka pengarsipan pendokumentasian umum repositori yaitu map `docs/`.

## 12. Dokumentasi (`docs/`)

- **Tujuan**: Rak penyimpan segala pedoman, kerangka pikir tertulis referensial perpaduan teknis atau sistem interaktif panduan internal pengembang di dalam struktur kode perangkat.
- **File Penting**:
  - `FRONTEND_UI_GUIDELINES.md` — Pengatur pola kerangka visual standar pengalaman visual warna antarmuka pengguna proyek (UI/UX Styling Rules).
  - `QA_CHECKLIST.md` — Kumpulan daftar perintah panduan pengujian terukur dari sudut pemakai ujung manusia metode Kotak Hitam (*Black Box Manual Checklist*).
  - `DATA_DESIGN.md` — Panduan kamus arsitektur ERD yang menjelaskan rancang bangun relasi referensi dan hierarki penyimpanan skema IndexedDB dengan basis tabel server yang diatur PostgreSQL.
  - `AUDIT_REPORT.md` — Hasil rekap laporan penyehatan kode dengan status kondisi terakhir pelurusan pembersihan teknis kelayakan operasional (*System Audit/Compliance*).
  - `RULE_BASED_INSIGHT_ENGINE.md` — Inti referensi logika mendalam aturan analitis berbobot berisikan pustaka ke 30 peraturan penemu wawasan perilaku peringatan (Analytics Insights dan Push Nudge) mesin penggerak kepekaan analitis di pusat notifikasi.
