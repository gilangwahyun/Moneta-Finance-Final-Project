# Laporan Audit & Perbaikan Bug Arsitektural Moneta (Post-Cleanup Report)

**Tanggal:** 2 Juli 2026  
**Fokus Audit:** Stabilitas Sync Engine (Offline-First), Integritas Kalkulasi Saldo Dompet, & Validasi Defensif Database Lokal.

---

## 1. Ringkasan Eksekutif
Dalam rangka audit pembersihan bug internal yang lolos dari pengujian otomatis (*automated testing*), tim teknik menemukan **5 kelemahan kritis arsitektural** yang berpotensi merusak integritas data saat aplikasi beralih antara mode *offline* dan *online*. 

Perbaikan menyeluruh telah dilakukan di layer **Repositori (IndexedDB)**, **Sync Engine**, dan **Mesin Analitik/Nudge AI**, disertai dengan perluasan *test suite* Playwright untuk menjamin pencegahan regresi.

---

## 2. Rincian Penemuan Bug & Solusi Arsitektural

### Bug 1: *Phantom Delete Queue* pada Resolusi Konflik Anggaran (`budget`)
* **Akar Masalah:** Ketika sistem melakukan penyatuan data (*reconciliation*) saat tersambung ke internet, Sync Engine di `sync-manager.ts` memanggil fungsi `deleteBudget(conflict.clientId)` untuk menghapus ID lokal sementara dan menggantinya dengan UUID server. Namun, fungsi ini melakukan *soft delete* yang memasukkan perintah hapus ke object store `sync_queue`. Akibatnya timbul antrean hapus palsu yang berisiko membatalkan data di server pada siklus sync berikutnya.
* **Solusi:** Menstandarkan penggunaan fungsi fisik **Hard Delete** (`hardDeleteBudget`, `hardDeleteWallet`, `hardDeleteCategory`, `hardDeleteTarget`, `hardDeleteTransaction`) di seluruh layer resolusi konflik `sync-manager.ts`. Fungsi ini langsung membuang record sementara dari IndexedDB tanpa menyisakan antrean di `sync_queue`.

### Bug 2: *Zombie / Orphaned Records* pada Dompet (`wallet`) dan Kategori (`category`)
* **Akar Masalah:** Sebelumnya, Sync Engine sama sekali tidak memiliki logika pembersihan ID sementara saat server mengembalikan UUID resmi untuk entitas Dompet dan Kategori. Ini meninggalkan data duplikat/sampah lokal (*zombie records*) di dalam database browser.
* **Solusi:** Membuat fungsi `hardDeleteWallet` dan `hardDeleteCategory` di layer repositori, serta memperbarui logika di `sync-manager.ts` agar membersihkan record sementara setiap kali terjadi pergantian ID.

### Bug 3: *Client ID vs Server ID Mismatch* pada Kalkulasi Saldo Dompet
* **Akar Masalah:** Perhitungan saldo dompet sebelumnya hanya mengandalkan pencocokan `t.walletId === wallet.clientId`. Ketika transaksi yang diunduh dari server membawa referensi UUID resmi (`wallet.id`), kalkulasi menjadi tidak akurat atau bernilai nol.
* **Solusi:** Memperkuat fungsi standar di `wallet-utils.ts` untuk mendukung **Dual ID Matching**:
  ```ts
  const matchesWallet = (id: string | null | undefined) =>
    id === wallet.clientId || (!!wallet.id && id === wallet.id);
  ```

### Bug 4: *False Positive Nudge* Akibat Transaksi *Soft-Deleted* & Pelanggaran DRY Principle
* **Akar Masalah:** Berbagai *rules* di Nudge AI (`local-engine.ts` dan `use-analytics.ts`) menulis ulang rumus *looping* saldo secara mandiri (*inline logic*) tanpa menyaring transaksi yang terhapus (`!t.deletedAt`). Hal ini dapat memicu peringatan palsu seperti *Low Cash Warning* meskipun dompet memiliki saldo yang cukup.
* **Solusi:** Menghapus seluruh implementasi rumus saldo *inline* di seluruh modul analitik dan mengarahkannya ke satu sumber kebenaran resmi: `calculateWalletBalance(w, allTxns)`.

### Bug 5: Kurangnya Validasi Defensif pada Subsidi Silang Anggaran (`reallocateBudget`)
* **Akar Masalah:** Logika alokasi anggaran pada repositori lokal belum memiliki benteng pertahanan fisik terhadap input nominal negatif atau melebihi sisa batas anggaran saat terjadi *race condition*.
* **Solusi:** Menambahkan *defensive validation guard* di `reallocateBudget`:
  ```ts
  if (amount <= 0 || isNaN(amount)) throw new Error("REALLOC_INVALID_AMOUNT");
  if (amount > source.amount) throw new Error("REALLOC_EXCEEDS_LIMIT");
  ```

---

## 3. Pemisahan Batas Arsitektural (*Architectural Boundary Segregation*)

Audit juga mengonfirmasi kepatuhan batas kode yang ketat (*strict boundary compliance*):
1. **Ranah Pengguna (User Realm) $\rightarrow$ Soft Delete (`delete...`)**: Dipanggil secara eksklusif oleh layer *UI/Hooks* (misal: `use-budget-actions.ts`). Aksi ini menandai `deletedAt` dan mendaftar ke `sync_queue` sebagai representasi niat pengguna.
2. **Ranah Sistem (System Realm) $\rightarrow$ Hard Delete (`hardDelete...`)**: Dipanggil secara eksklusif oleh mesin sinkronisasi (`sync-manager.ts`) untuk pembersihan teknis bawah tanah yang sepenuhnya transparan bagi pengguna. Zero UI leakage.

---

## 4. Hasil Verifikasi Automated Testing (Playwright & TypeScript)

Seluruh perbaikan telah diverifikasi dengan otomatisasi penuh:
* **TypeScript Compilation:** `npx tsc --noEmit` $\rightarrow$ **PASSED (0 errors)**.
* **Uji Resolusi Konflik Sync ([12-sync-conflicts.spec.ts](file:///c:/moneta-finance-final-project/tests/12-sync-conflicts.spec.ts)):** Memvalidasi bahwa `hardDelete...` pada `budgets`, `targets`, `wallets`, dan `categories` tidak meninggalkan entri `delete` di `sync_queue` $\rightarrow$ **3 passed (19.1s)**.
* **Uji Dual ID Matching & Soft-Deleted Txns ([08-insight-engine.spec.ts](file:///c:/moneta-finance-final-project/tests/08-insight-engine.spec.ts)):** Memvalidasi akurasi saldo AI Nudge $\rightarrow$ **1 passed (39.2s)**.
* **Uji Defensive Guard Anggaran ([04-budgets.spec.ts](file:///c:/moneta-finance-final-project/tests/04-budgets.spec.ts)):** Memvalidasi penolakan input 0 atau negatif $\rightarrow$ **7 passed (23.2s)**.
