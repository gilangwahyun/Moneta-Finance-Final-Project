# Moneta Finance: Codebase Layer Map & OOP Mapping Guide

## 1. Ringkasan Arsitektur Moneta Finance

Aplikasi Moneta Finance dibangun sebagai aplikasi full-stack dengan Next.js yang mengedepankan pendekatan PWA (Progressive Web App) offline-first.

- **Database Klien:** IndexedDB bertindak sebagai _single source of truth_ saat offline.
- **Database Server:** PostgreSQL dengan Prisma ORM digunakan untuk persistensi data secara remote.
- **Sinkronisasi:** Menggunakan mekanisme push, pull, hydration, dan background sync, serta antrian (_queue_) untuk menjamin konsistensi data antara klien dan server dengan dukungan _Progressive Remote Apply_.

## 2. Layer Map dan Tanggung Jawab

Arsitektur aplikasi dapat dibagi menjadi 6 layer utama:

### A. Presentation Layer

- **Tanggung Jawab:** Merender antarmuka pengguna (UI), menerima input interaksi _user_, dan memanggil _Custom Hooks_ sebagai perantara logika.
- **Isi:** Pages, Layouts, Components, Modals, Cards, Forms, Navigation.
- **Aturan Boleh:** Menggunakan UI states (`useState`), mengkonsumsi _Context_ dan _Hooks_.
- **Aturan Tidak Boleh:** Memanggil fungsi database lokal (`getDB`), antrian sinkronisasi (`enqueueChange`), sinkronisasi manual (`performFullSync`), maupun memanggil repositori lokal secara langsung.

### B. Client Application Logic Layer

- **Tanggung Jawab:** Bertindak sebagai orkestrator yang menghubungkan UI (Presentation) ke lapisan data (Local Data Access). Mengelola status, pemuatan data (_data loading_), event listener, validasi form di sisi _client_, dan kalkulasi turunan (seperti total saldo dompet).
- **Isi:** Custom Hooks (`useTransactions`, `useBudgets`, dll), Context Providers.
- **Aturan Boleh:** Memanggil fungsi-fungsi _Local Data Access Layer_ (repositori).
- **Aturan Tidak Boleh:** Merender komponen UI secara langsung atau berisi markup HTML/JSX murni.

### C. Local Data Access Layer

- **Tanggung Jawab:** Abstraksi akses ke IndexedDB. Bertanggung jawab untuk operasi CRUD lokal, _soft-delete_, serta menyisipkan (_enqueue_) _change log_ untuk keperluan sinkronisasi ke server.
- **Isi:** Repositori lokal (`repositories/*`), `getDB` wrapper, migrasi IndexedDB.
- **Aturan Boleh:** Memanggil `getDB()` dan `enqueueChange()`.
- **Aturan Tidak Boleh:** Memiliki dependensi terhadap komponen UI. Tidak boleh ada logika UI.

### D. Sync & PWA Support Layer

- **Tanggung Jawab:** Menangani proses sinkronisasi asinkron (Push, Pull), resolusi konflik, progres _remote apply_, _Hydration_, serta mendaftarkan Service Worker dan Web Push Notifications.
- **Isi:** `sync-manager`, `sync-queue`, `conflict-resolver`, event sinkronisasi, service worker files.
- **Aturan Boleh:** Membaca _queue_ dan berinteraksi dengan API server secara _background_, dan berinteraksi dengan repositori lokal.
- **Aturan Tidak Boleh:** UI memanggil ini secara langsung tanpa melalui abstraksi provider. _Remote apply_ dari _pull_ server tidak boleh dicatat ulang ke `sync_queue`.

### E. Server Application Layer

- **Tanggung Jawab:** Menerima _request_ dari klien, validasi otentikasi/otorisasi, kontrol akses, serta _routing logic_ server (Endpoint API).
- **Isi:** API routes (di `src/app/api`), server actions, middleware (jika ada).
- **Aturan Boleh:** Menerima request HTTP, memanggil lapisan server data access (`Prisma`).
- **Aturan Tidak Boleh:** Menggunakan _browser-only API_ (seperti `window`, `localStorage`, `indexedDB`).

### F. Server Data Access & Persistence Layer

- **Tanggung Jawab:** Menghubungkan logika server ke database pusat secara permanen.
- **Isi:** Prisma schema, Prisma client, query helper.
- **Aturan Boleh:** Menjalankan query ke PostgreSQL/Neon.
- **Aturan Tidak Boleh:** Dipanggil secara langsung oleh _Client Application Logic_ atau _Presentation Layer_.

## 3. Folder/File Mapping

| Folder/File                                                    | Layer              | Tanggung Jawab                               | Catatan                                                                                 |
| :------------------------------------------------------------- | :----------------- | :------------------------------------------- | :-------------------------------------------------------------------------------------- |
| `src/app/(dashboard)/*`, `src/components/*`                    | Presentation       | Menampilkan UI dan menerima input.           | Sudah mematuhi aturan layer: tidak ada impor repositori langsung. |
| `src/hooks/*`, `src/providers/*`                               | Client App Logic   | Orkestrasi state dan interaksi data klien.   | Termasuk hook `useAuthUser` untuk state pengguna.                                             |
| `src/lib/local-db/repositories/*`, `src/lib/local-db/index.ts` | Local Data Access  | CRUD IndexedDB.                              | Sudah tersentralisasi dengan baik. `getDB()` terisolasi.                                |
| `src/lib/sync/*`, `worker/*`                                   | Sync & PWA Support | Mengatur Service Worker & sinkronisasi data. | `enqueueChange()` dan `performFullSync()` telah terisolasi dengan baik.                 |
| `src/app/api/*`                                                | Server Application | Menyediakan endpoint REST.                   | Aman dari _browser-only API_.                                                           |
| `src/lib/db/prisma.ts`, `prisma/schema.prisma`                 | Server Data Access | Kueri ke PostgreSQL/Neon.                    | Terisolasi dari klien code.                                                             |

## 4. Arah Dependency yang Benar (Dependency Direction)

- **UI** -> **Hooks / Context** (Aman)
- **Hooks / Context** -> **Repositories** (Aman)
- **Repositories** -> **IndexedDB** (`getDB()`) / **Sync Queue** (`enqueueChange()`) (Aman)
- **Sync Manager** -> **Repositories** + **API Routes** (Aman)
- **API Routes** -> **Server Data Access** (Prisma) (Aman)
- **Prisma** -> **PostgreSQL** (Aman)

## 5. Status Aturan Boundary (Boundary Rules)

1.  ✅ **L1 (UI) tidak memanggil `getDB()` secara langsung.**
2.  ✅ **L1 (UI) tidak memanggil `enqueueChange()` secara langsung.**
3.  ✅ **L1 (UI) tidak memanggil `performFullSync()` secara langsung.**
4.  ✅ **L1 (UI) dan client logic tidak mengimpor Prisma.**
5.  ✅ **API Route tidak mengimpor browser-only API.**
6.  ✅ **Repository lokal tidak bergantung pada page/component.**
7.  ✅ **L1 (UI) tidak memanggil Repository lokal secara langsung (100% Compliant).** Semua pemanggilan database lokal (termasuk Auth/User) diabstraksikan melalui custom hooks (seperti `useAuthUser`, `useBudgets`, `useWallets`, `useNotifications`). Semua komponen, _page_, dan _layout_ harus mengakses data melalui hook/provider. Repository hanya boleh dipanggil dari hook/provider, layer sinkronisasi, atau helper/repository lain.

## 6. Feature-to-Layer Mapping

Setiap fitur memiliki jejak vertikal melewati layer:

- **Autentikasi/Session:** UI Auth/Profile -> `useAuthUser` -> Repositori `users.ts` -> IndexedDB / Local Session.
- **Transaksi:** UI Transaksi -> `useTransactions` -> Repositori `transactions.ts` -> `sync-manager` -> API `/api/sync/transactions` -> Prisma.
- **Kategori:** UI Kategori -> `useCategories` -> Repositori `categories.ts` -> API `/api/sync/categories` -> Prisma.
- **Dompet:** UI Wallets -> `useWallets` -> Repositori `wallets.ts`.
- **Anggaran:** UI Budget -> `useBudgets` / `useBudgetActions` -> Repositori `budgets.ts`.
- **Notifikasi:** UI Notifications -> `useNotifications` -> Repositori `notification-logs.ts` & `notification-inbox.ts`.
- **Target Finansial:** UI Targets -> Repositori `targets.ts`.
- **Sinkronisasi:** Worker / `SyncProvider` -> `sync-manager`.

## 7. Panduan Pemetaan ke Rancangan OOP (DPPL)

Dalam menyusun DPPL berbasis OOP, jangan menggunakan pola pemetaan 1 File = 1 Class. Gunakan konversi peran sebagai berikut:

- **Tabel/Schema Prisma & IndexedDB** -> **Class Entity** (e.g., `Transaction`, `Budget`, `Wallet`, `User`).
- **Hooks / Providers** -> **Class Control / Service** (e.g., `TransactionManager`, `BudgetController`, `AuthUserService`).
- **React Components / Pages** -> **Class Boundary** (e.g., `TransactionFormUI`, `BudgetDashboardUI`, `LoginUI`).
- **Repositories** -> **Class Data Access** (e.g., `TransactionDataAccess`, `LocalDatabaseAdapter`, `UserRepository`).
- **API Routes** -> **Server Control Boundary** (jika arsitektur server dimasukkan).

**Status Kesiapan OOP DPPL:** Codebase saat ini sudah **100% siap** untuk dipetakan ke BCE/OOP. Tidak ada lagi ketergantungan _bypass_ dari komponen _Boundary_ (UI) ke _Data Access_ (Repository) secara langsung. Semua alur data secara ketat melewati layer _Control_ (Hooks/Providers).
