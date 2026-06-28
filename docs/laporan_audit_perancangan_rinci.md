# Laporan Audit: Bagian 2.2 Perancangan Rinci — DPPL Moneta Finance

> **Versi Audit:** 1.0  
> **Tanggal:** 13 Juni 2026  
> **Dasar Dokumen:** `perancangan_rinci_moneta_untuk_audit.md` (2.729 baris)

---

## 1. Ringkasan Temuan Audit

| # | Bagian | Masalah | Dampak | Rekomendasi Revisi | Prioritas |
|---|--------|---------|--------|-------------------|-----------|
| 1 | 2.2.1 Package Antarmuka | Tidak ada kelas `HalamanLogin` dan `HalamanRegistrasi` | Alur autentikasi tidak punya representasi boundary → class diagram autentikasi tidak lengkap | Tambahkan `HalamanLogin` dan `HalamanRegistrasi` sebagai `«boundary»` | **Tinggi** |
| 2 | 2.2.1 Package Antarmuka | Tidak ada kelas `SidebarNavigasi` / `NavigasiGlobal` | Navigasi global adalah elemen penting PWA; tanpa boundary ini, class diagram antarmuka terasa terputus | Tambahkan `NavigasiGlobal` sebagai `«boundary»` | **Sedang** |
| 3 | 2.2.1 Package Antarmuka | Tidak ada kelas `HalamanProfil` yang terpisah | Profil pengguna (kelola nama, paksa sync, logout, ekspor) dimasukkan ke `HalamanPengaturan` yang ambigu | Pisahkan menjadi `HalamanProfil` (data akun + aksi utility) dan `HalamanPengaturanNotifikasi` (preferensi notifikasi) | **Tinggi** |
| 4 | 2.2.1 Package Antarmuka | `HalamanPengaturan` menggabungkan dua domain berbeda (profil akun + preferensi notifikasi) | Melanggar prinsip single responsibility; diagram kelas menjadi terlalu umum | Ganti dengan dua kelas terpisah: `HalamanProfil` dan `HalamanPengaturanNotifikasi` | **Tinggi** |
| 5 | 2.2.1 Package Antarmuka | `HalamanTransaksi` menggunakan istilah "mutasi keuangan" secara bergantian dengan "transaksi" | Inkonsistensi terminologi antarbagian DPPL | Standardisasi: gunakan **"transaksi"** di seluruh perancangan rinci; "mutasi" hanya sebagai penjelasan tambahan | **Sedang** |
| 6 | 2.2.1 Package Antarmuka | `HalamanAnggaran` belum punya `handleStatusFilterChange()` dan `handleOpenReallocation()` | Fitur filter status dan realokasi anggaran tidak terepresentasi | Tambahkan kedua fungsi tersebut | **Sedang** |
| 7 | 2.2.1 Package Antarmuka | `HalamanAnalisis` hanya punya `handlePeriodChange()`, belum punya `handleTabChange()`, `handleInsightAction()`, `handleOpenCategoryDetail()`, `handleCloseDrawer()` | Tab analisis (pie chart, trend, insight) dan drawer detail kategori tidak terepresentasi | Tambahkan fungsi-fungsi tersebut | **Sedang** |
| 8 | 2.2.1 Package Antarmuka | `HalamanNotifikasi` belum punya `handleNotificationClick()`, `handleCtaAction()`, `handleFilterUnread()` | Interaksi klik notifikasi dan filter belum terdokumentasi | Tambahkan fungsi tersebut | **Sedang** |
| 9 | 2.2.1 Package Antarmuka | `HalamanDompet` belum punya `handleOpenTransferForm()` | Fitur transfer antar dompet tidak punya entry point di boundary | Tambahkan `handleOpenTransferForm()` | **Sedang** |
| 10 | 2.2.1 Package Antarmuka | `handleMarkAsRead()` pada `HalamanNotifikasi` menggunakan parameter `d: String` (typo, seharusnya `id: String`) | Typo pada parameter membingungkan dan tidak konsisten | Ganti `d` → `id` | **Tinggi** |
| 11 | 2.2.1 Package Antarmuka | Tipe data `transactionsList: Array<Transaction>` menggunakan nama kelas dalam bahasa Inggris | Tidak konsisten dengan konvensi nama kelas Bahasa Indonesia yang digunakan di tempat lain | Ganti menjadi `Array<Transaksi>` | **Rendah** |
| 12 | 2.2.1 Package Antarmuka | Typo: `keuanga` (tanpa 'n') pada deskripsi `HalamanKategori` | Error ejaan dalam dokumen formal | Perbaiki menjadi "keuangan" | **Rendah** |
| 13 | 2.2.2 Package Autentikasi | Deskripsi atribut `currentUser` pada `KelolaAutentikasi` menyalin teks deskripsi kelas (bukan deskripsi atribut) | Konten tidak bermakna; mengurangi kualitas dokumen | Ganti dengan: "Instansiasi objek model Pengguna yang sedang aktif dalam sesi klien saat ini." | **Tinggi** |
| 14 | 2.2.2 Package Autentikasi | Tidak ada kelas boundary `HalamanLogin` di package Autentikasi | Alur use case login tidak terhubung ke boundary di class diagram | Tambahkan `HalamanLogin` dan `HalamanRegistrasi` di Package Antarmuka, dengan dependency ke `KelolaAutentikasi` | **Tinggi** |
| 15 | 2.2.2 Package Autentikasi | `logout()` memerlukan `userId: String` sebagai input — logikanya janggal (pengguna sudah ada di state) | Desain fungsi tidak konsisten dengan arsitektur stateful | Ubah input menjadi kosong (tidak perlu userId) karena `currentUser` sudah tersimpan di state | **Sedang** |
| 16 | 2.2.3 Package Kelola Kategori | Stereotype kelas tidak dinyatakan secara eksplisit di deskripsi | Pembaca tidak dapat membedakan model vs control langsung dari teks | Tambahkan label stereotipe `«entity»` dan `«control»` di judul kelas | **Sedang** |
| 17 | 2.2.4 Package Kelola Dompet | Atribut `initial_balance` menggunakan snake_case, tidak konsisten dengan camelCase yang digunakan di kelas lain | Inkonsistensi gaya penamaan atribut | Ganti menjadi `initialBalance` (camelCase) | **Tinggi** |
| 18 | 2.2.4 Package Kelola Dompet | Tidak ada atribut `type` (tipe dompet: CASH, BANK, EWALLET, dll.) pada kelas `Dompet` | Tipe dompet disebut di `addWallet()` tapi tidak ada sebagai atribut model | Tambahkan atribut `type: Enum/String` pada kelas `Dompet` | **Tinggi** |
| 19 | 2.2.4 Package Kelola Dompet | Typo: `..` (titik ganda) pada beberapa deskripsi atribut `Dompet` dan `KelolaDompet` | Typo minor namun mengurangi profesionalisme dokumen | Hapus titik ganda yang tidak perlu | **Rendah** |
| 20 | 2.2.4 Package Kelola Dompet | `HalamanDompet` tidak punya `handleOpenTransferForm()` | Halaman dompet tidak merepresentasikan entry point untuk transfer antar-dompet | Tambahkan fungsi `handleOpenTransferForm()` | **Sedang** |
| 21 | 2.2.5 Package Kelola Transaksi | Typo: `addTrasaction()`, `editTrasaction()`, `deleteTrasaction()` — huruf 'n' hilang | Nama fungsi salah eja; tidak bisa digunakan sebagai referensi implementasi | Perbaiki menjadi `addTransaction()`, `editTransaction()`, `deleteTransaction()` | **Tinggi** |
| 22 | 2.2.5 Package Kelola Transaksi | `amount` dideskripsikan sebagai "rekam medis transaksi" — istilah tidak tepat | Deskripsi tidak relevan dengan konteks keuangan | Ganti dengan: "Nilai nominal dana yang tercatat pada transaksi keuangan." | **Sedang** |
| 23 | 2.2.6 Package Kelola Anggaran | `budgetsWithStats` menggunakan tipe `Array<Object>` yang terlalu generik | Struktur data tidak jelas; sulit digambarkan pada class diagram | Ganti dengan `Array<AnggaranWithStats>` atau definisikan DTO `RingkasanAnggaran` | **Sedang** |
| 24 | 2.2.6 Package Kelola Anggaran | Fungsi `budgetReallocation()` menggunakan istilah "transfer" yang bisa membingungkan dengan transfer transaksi | Ambiguitas terminologi | Ganti nama fungsi menjadi `reallocateBudget()` agar konsisten dengan konteks anggaran | **Sedang** |
| 25 | 2.2.6 Package Kelola Anggaran | `HalamanAnggaran` tidak punya `handleStatusFilterChange()` dan `handleOpenReallocation()` | Fitur filter status anggaran tidak terepresentasi | Tambahkan kedua fungsi pada `HalamanAnggaran` | **Sedang** |
| 26 | 2.2.7 Package Kelola Target Finansial | Terdapat karakter `s` tersendiri setelah `loadFinancialTargets()` (baris 1495) | Karakter sisa / artifact typo dalam dokumen | Hapus karakter `s` yang berdiri sendiri | **Rendah** |
| 27 | 2.2.7 Package Kelola Target Finansial | Output `addFinancialTarget()` dan `editFinancialTarget()` ditulis "Target finansial" (bukan `TargetFinansial`) | Inkonsistensi nama tipe data (huruf kecil vs PascalCase) | Ganti menjadi `TargetFinansial` | **Sedang** |
| 28 | 2.2.8 Package Analisis dan Insight | Output `calculateMonthlySummary()` ditulis "RekanKeuangan" (typo, seharusnya "RekapKeuangan") | Typo menyebabkan ambiguitas tipe data | Perbaiki menjadi `RekapKeuangan` | **Tinggi** |
| 29 | 2.2.8 Package Analisis dan Insight | `generateInsights()` mengembalikan `Array<String>` — terlalu generik untuk dokumentasi DPPL | Struktur output insight tidak dideskripsikan | Ganti dengan `Array<Insight>` atau DTO `ItemInsight` dengan atribut `type`, `message`, `ctaLabel`, `ctaTarget` | **Sedang** |
| 30 | 2.2.8 Package Analisis dan Insight | Terdapat karakter `s` pada `trendData` (baris 1570) sebagai sisa artifact | Typo kecil | Hapus `.s` pada akhir deskripsi | **Rendah** |
| 31 | 2.2.9 Package Notifikasi | `PengaturanNotifikasi` tidak punya atribut `dailyLimit`, `mode`, atau `syncStatus` | Fitur daily limit dan mode notifikasi tidak terepresentasi | Tambahkan atribut `mode: Enum/String` dan `dailyLimit: Number` | **Sedang** |
| 32 | 2.2.9 Package Notifikasi | `LogNotifikasi` tidak punya atribut `syncStatus` dan `updatedAt` untuk kebutuhan offline-first | Data log notifikasi tidak bisa disinkronisasi jika tidak ada sync fields | Tambahkan `syncStatus` dan `updatedAt` pada `LogNotifikasi` | **Sedang** |
| 33 | 2.2.9 Package Notifikasi | `LogNotifikasi` tidak punya atribut `ctaTarget` atau `ctaLabel` untuk CTA navigasi | Notifikasi dengan aksi tidak bisa mengarahkan pengguna ke halaman tujuan | Tambahkan atribut `ctaLabel: String?` dan `ctaTarget: String?` | **Sedang** |
| 34 | 2.2.10 Package Sinkronisasi | `ItemAntreanSinkronisasi` dideskripsikan sebagai DTO tapi memiliki metode — inkonsistensi stereotipe | Dalam UML, DTO murni tidak punya metode bisnis; lebih tepat dikategorikan sebagai `«entity»` | Pertimbangkan ubah ke `«entity»` atau pisahkan DTO dan value object | **Sedang** |
| 35 | 2.2.10 Package Sinkronisasi | `applyProgressiveData()` adalah nama yang tidak deskriptif | Nama fungsi tidak jelas menggambarkan hydration/pull sync | Ganti menjadi `hydrateLocalStore()` yang lebih sesuai terminologi offline-first | **Rendah** |
| 36 | 2.2.11 Package Akses Data Lokal | Stereotipe `«repository»` tidak digunakan — kelas dinamai `DAL*Lokal` tanpa stereotipe eksplisit | Tidak konsisten dengan usulan stereotipe di tujuan revisi | Tambahkan stereotipe `«repository»` pada semua kelas `DAL*Lokal` | **Sedang** |
| 37 | 2.2.11 Package Akses Data Lokal | Tidak ada kelas `DALLogNotifikasiLokal` | LogNotifikasi tidak disimpan di IndexedDB padahal fitur offline mensyaratkannya | Tambahkan `DALLogNotifikasiLokal` sebagai `«repository»` | **Tinggi** |
| 38 | 2.2.11 Package Akses Data Lokal | Tidak ada kelas `DALPengaturanNotifikasiLokal` | PengaturanNotifikasi tidak punya akses lokal | Tambahkan `DALPengaturanNotifikasiLokal` sebagai `«repository»` | **Tinggi** |
| 39 | 2.2.11 Package Akses Data Lokal | Tidak ada kelas `DALSesiPenggunaLokal` atau store lokal untuk session/auth state | Auth offline tidak punya abstraksi akses data lokal | Tambahkan `DALSesiPenggunaLokal` sebagai `«repository»` untuk cache profil dan token lokal | **Sedang** |
| 40 | 2.2.12 Package Akses Data Server | Deskripsi fungsi pada `DALServerAutentikasi` salah — tertulis "Deskripsi fungsi pada kelas DALServerSinkronisasi" | Salah judul sub-bagian | Perbaiki menjadi "Deskripsi fungsi pada kelas DALServerAutentikasi" | **Tinggi** |
| 41 | 2.2.12 Package Akses Data Server | Tidak ada kelas `DALServerEkspor` atau gateway ekspor data | Fitur ekspor XLSX tidak punya gateway akses server | Tambahkan `DALServerEkspor` sebagai `«gateway»` dengan fungsi `requestExport()` | **Sedang** |
| 42 | 2.2.12 Package Akses Data Server | Stereotipe `«gateway»` tidak dinyatakan secara eksplisit pada kelas-kelas `DALServer*` | Inkonsistensi stereotipe | Tambahkan label `«gateway»` pada semua kelas `DALServer*` | **Sedang** |
| 43 | Seluruh dokumen | Placeholder `<< Berikan gambar kelas Diagram >>` masih ada di baris 29 | Placeholder belum diganti dengan instruksi atau referensi diagram | Ganti dengan catatan: "Diagram kelas per package disajikan pada Lampiran [X.X]." | **Tinggi** |
| 44 | Seluruh dokumen | Penomoran header "halaman X" masih tersisa di dalam konten teks (artifact dari PDF) | Mengotori konten Markdown dan membingungkan pembaca | Hapus seluruh baris `halaman X` dan `Deskripsi Perancangan Perangkat Lunak` yang tersebar di tengah konten | **Tinggi** |
| 45 | Seluruh dokumen | Stereotipe UML tidak dinyatakan secara eksplisit di judul kelas (misalnya `«boundary»`, `«control»`, `«entity»`) | Pembaca harus menebak stereotipe dari nama kelas saja | Tambahkan stereotipe UML di judul setiap kelas secara konsisten | **Sedang** |

---

## 2. Daftar Istilah Final yang Harus Digunakan Secara Konsisten

| Istilah yang Harus Digunakan | Istilah yang Harus Dihindari | Catatan |
|------------------------------|------------------------------|---------|
| **Transaksi** | Mutasi Keuangan, Mutasi Kas, Arus Kas | "Mutasi" boleh muncul sebagai penjelasan parentetis saja |
| **Target Finansial** | Target Keuangan, Target Pemasukan, Sasaran | Spesifikasi INCOME_TARGET dijelaskan di deskripsi kelas, bukan di nama |
| **Realokasi Anggaran** | Subsidi Silang, Transfer Anggaran, Transfer Dana | "Transfer" di konteks anggaran dapat membingungkan dengan Transfer transaksi |
| **Log Notifikasi** | Riwayat Notifikasi, Rekam Notifikasi | Nama kelas: `LogNotifikasi` |
| **Pengaturan Notifikasi** | Preferensi Notifikasi, Konfigurasi Notifikasi | Nama kelas: `PengaturanNotifikasi` |
| **Dompet** | Rekening, Sumber Dana, Akun Dana | "Rekening" dan "Sumber Dana" boleh muncul sebagai contoh nilai (mis. "Rekening Bank") |
| **Anggaran** | Budget (tanpa terjemahan), Pagu Belanja, Batas Anggaran | Nama kelas tetap menggunakan `Anggaran`; "pagu" boleh dalam deskripsi |
| **Sinkronisasi** | Sync (tanpa terjemahan konsisten) | Gunakan "sinkronisasi" di deskripsi; nama fungsi boleh tetap dalam bahasa Inggris (push, pull, hydrate) |
| **Halaman Profil** | Halaman Pengaturan (untuk profil), Halaman Akun | Kelas: `HalamanProfil`; terpisah dari `HalamanPengaturanNotifikasi` |
| **Insight / Wawasan** | Rekomendasi AI, Analisis Cerdas, Prediksi | Gunakan "insight" atau "wawasan finansial"; jelas bahwa ini rule-based, bukan AI/ML |

---

## 3. Struktur Package Final yang Disarankan

```
2.2 Perancangan Rinci
├── 2.2.1  Package Antarmuka Pengguna
├── 2.2.2  Package Autentikasi
├── 2.2.3  Package Kelola Kategori
├── 2.2.4  Package Kelola Dompet
├── 2.2.5  Package Kelola Transaksi
├── 2.2.6  Package Kelola Anggaran
├── 2.2.7  Package Kelola Target Finansial
├── 2.2.8  Package Analisis dan Insight
├── 2.2.9  Package Notifikasi
├── 2.2.10 Package Sinkronisasi Offline-first
├── 2.2.11 Package Akses Data Lokal
└── 2.2.12 Package Akses Data Server
```

> Struktur package ini **dipertahankan** dari dokumen asli. Urutan sudah logis (boundary → control → entity → DAL lokal → DAL server). Tidak ada package yang perlu ditambah atau dihapus.

---

## 4. Daftar Kelas Final Per Package dengan Stereotipe UML

### Package Antarmuka Pengguna
| Nama Kelas | Stereotipe | Keterangan |
|---|---|---|
| `HalamanLogin` | `«boundary»` | **[BARU]** |
| `HalamanRegistrasi` | `«boundary»` | **[BARU]** |
| `NavigasiGlobal` | `«boundary»` | **[BARU]** |
| `HalamanBeranda` | `«boundary»` | Dipertahankan |
| `HalamanTransaksi` | `«boundary»` | Dipertahankan |
| `HalamanAnggaran` | `«boundary»` | Dipertahankan + tambah fungsi |
| `HalamanTargetFinansial` | `«boundary»` | Dipertahankan |
| `HalamanAnalisis` | `«boundary»` | Dipertahankan + tambah fungsi |
| `HalamanNotifikasi` | `«boundary»` | Dipertahankan + tambah fungsi |
| `HalamanDompet` | `«boundary»` | Dipertahankan + tambah fungsi |
| `HalamanKategori` | `«boundary»` | Dipertahankan |
| `HalamanProfil` | `«boundary»` | **[BARU]** — hasil pecahan `HalamanPengaturan` |
| `HalamanPengaturanNotifikasi` | `«boundary»` | **[DIUBAH]** — hasil pecahan `HalamanPengaturan` |

> `HalamanPengaturan` (asli) dihapus dan digantikan oleh `HalamanProfil` + `HalamanPengaturanNotifikasi`.

### Package Autentikasi
| Nama Kelas | Stereotipe | Keterangan |
|---|---|---|
| `Pengguna` | `«entity»` | Dipertahankan |
| `KelolaAutentikasi` | `«control»` | Dipertahankan + perbaiki deskripsi atribut |

### Package Kelola Kategori
| Nama Kelas | Stereotipe | Keterangan |
|---|---|---|
| `Kategori` | `«entity»` | Dipertahankan |
| `KelolaKategori` | `«control»` | Dipertahankan |

### Package Kelola Dompet
| Nama Kelas | Stereotipe | Keterangan |
|---|---|---|
| `Dompet` | `«entity»` | Dipertahankan + tambah atribut `type` |
| `KelolaDompet` | `«control»` | Dipertahankan |

### Package Kelola Transaksi
| Nama Kelas | Stereotipe | Keterangan |
|---|---|---|
| `Transaksi` | `«entity»` | Dipertahankan |
| `KelolaTransaksi` | `«control»` | Dipertahankan + perbaiki typo nama fungsi |

### Package Kelola Anggaran
| Nama Kelas | Stereotipe | Keterangan |
|---|---|---|
| `Anggaran` | `«entity»` | Dipertahankan |
| `RingkasanAnggaran` | `«DTO»` | **[BARU]** — untuk menggantikan `Array<Object>` pada `budgetsWithStats` |
| `KelolaAnggaran` | `«control»` | Dipertahankan + perbaiki nama fungsi realokasi |

### Package Kelola Target Finansial
| Nama Kelas | Stereotipe | Keterangan |
|---|---|---|
| `TargetFinansial` | `«entity»` | Dipertahankan |
| `KelolaTargetFinansial` | `«control»` | Dipertahankan + perbaiki typo output |

### Package Analisis dan Insight
| Nama Kelas | Stereotipe | Keterangan |
|---|---|---|
| `RekapKeuangan` | `«DTO»` | Dipertahankan |
| `ItemInsight` | `«DTO»` | **[BARU]** — menggantikan `Array<String>` generik dari `generateInsights()` |
| `KelolaAnalisis` | `«control»` | Dipertahankan + perbaiki typo |

### Package Notifikasi
| Nama Kelas | Stereotipe | Keterangan |
|---|---|---|
| `PengaturanNotifikasi` | `«entity»` | Dipertahankan + tambah atribut `mode`, `dailyLimit` |
| `LogNotifikasi` | `«entity»` | Dipertahankan + tambah atribut `ctaLabel`, `ctaTarget`, `syncStatus`, `updatedAt` |
| `KelolaNotifikasi` | `«control»` | Dipertahankan |

### Package Sinkronisasi Offline-first
| Nama Kelas | Stereotipe | Keterangan |
|---|---|---|
| `ItemAntreanSinkronisasi` | `«entity»` | Dipertahankan (ubah dari DTO karena punya metode) |
| `ManajerSinkronisasi` | `«control»` | Dipertahankan + ganti nama `applyProgressiveData()` |
| `PengaturAntreanSinkronisasi` | `«control»` | Dipertahankan |

### Package Akses Data Lokal
| Nama Kelas | Stereotipe | Keterangan |
|---|---|---|
| `DALKategoriLokal` | `«repository»` | Dipertahankan |
| `DALDompetLokal` | `«repository»` | Dipertahankan |
| `DALTransaksiLokal` | `«repository»` | Dipertahankan |
| `DALAnggaranLokal` | `«repository»` | Dipertahankan |
| `DALTargetFinansialLokal` | `«repository»` | Dipertahankan |
| `DALAntreanSinkronisasi` | `«repository»` | Dipertahankan |
| `DALLogNotifikasiLokal` | `«repository»` | **[BARU]** |
| `DALPengaturanNotifikasiLokal` | `«repository»` | **[BARU]** |
| `DALSesiPenggunaLokal` | `«repository»` | **[BARU]** — untuk cache profil & token session offline |

### Package Akses Data Server
| Nama Kelas | Stereotipe | Keterangan |
|---|---|---|
| `DALServerAutentikasi` | `«gateway»` | Dipertahankan + perbaiki judul sub-bagian |
| `DALServerSinkronisasi` | `«gateway»` | Dipertahankan |
| `DALServerNotifikasi` | `«gateway»` | Dipertahankan |
| `DALServerEkspor` | `«gateway»` | **[BARU]** — untuk fitur ekspor XLSX |

---

## 5. Daftar Relasi Class Diagram Per Package

### Package Antarmuka Pengguna
| Dari | Relasi | Ke | Keterangan |
|------|--------|----|------------|
| `HalamanLogin` | `«uses»` dependency | `KelolaAutentikasi` | Boundary memanggil control untuk login |
| `HalamanRegistrasi` | `«uses»` dependency | `KelolaAutentikasi` | Boundary memanggil control untuk registrasi |
| `HalamanBeranda` | `«uses»` dependency | `KelolaTransaksi` | Ringkasan transaksi bulanan |
| `HalamanBeranda` | `«uses»` dependency | `KelolaDompet` | Total saldo dompet |
| `HalamanTransaksi` | `«uses»` dependency | `KelolaTransaksi` | Daftar dan form transaksi |
| `HalamanAnggaran` | `«uses»` dependency | `KelolaAnggaran` | Daftar dan realokasi anggaran |
| `HalamanTargetFinansial` | `«uses»` dependency | `KelolaTargetFinansial` | Daftar dan form target |
| `HalamanAnalisis` | `«uses»` dependency | `KelolaAnalisis` | Data analisis dan insight |
| `HalamanNotifikasi` | `«uses»` dependency | `KelolaNotifikasi` | Daftar log notifikasi |
| `HalamanDompet` | `«uses»` dependency | `KelolaDompet` | Daftar dompet dan transfer |
| `HalamanKategori` | `«uses»` dependency | `KelolaKategori` | Daftar dan form kategori |
| `HalamanProfil` | `«uses»` dependency | `KelolaAutentikasi` | Logout, force sync, clear cache |
| `HalamanPengaturanNotifikasi` | `«uses»` dependency | `KelolaNotifikasi` | Simpan preferensi notifikasi |
| `NavigasiGlobal` | aggregation | Semua `Halaman*` | Navigasi mengandung referensi ke rute halaman |

### Package Autentikasi
| Dari | Relasi | Ke | Keterangan |
|------|--------|----|------------|
| `KelolaAutentikasi` | association | `Pengguna` | Control mengelola satu instance Pengguna aktif |
| `KelolaAutentikasi` | `«uses»` dependency | `DALServerAutentikasi` | Panggil API login/logout/verify |
| `KelolaAutentikasi` | `«uses»` dependency | `DALSesiPenggunaLokal` | Simpan/ambil session lokal |

### Package Kelola Kategori
| Dari | Relasi | Ke | Keterangan |
|------|--------|----|------------|
| `KelolaKategori` | `1..*` aggregation | `Kategori` | Control memiliki koleksi kategori |
| `KelolaKategori` | `«uses»` dependency | `DALKategoriLokal` | Akses data lokal |
| `KelolaKategori` | `«uses»` dependency | `DALAntreanSinkronisasi` | Enqueue perubahan |

### Package Kelola Dompet
| Dari | Relasi | Ke | Keterangan |
|------|--------|----|------------|
| `KelolaDompet` | `1..*` aggregation | `Dompet` | Control memiliki koleksi dompet |
| `KelolaDompet` | `«uses»` dependency | `DALDompetLokal` | Akses data lokal |
| `KelolaDompet` | `«uses»` dependency | `DALTransaksiLokal` | Hitung saldo berjalan dari transaksi |
| `KelolaDompet` | `«uses»` dependency | `DALAntreanSinkronisasi` | Enqueue perubahan |

### Package Kelola Transaksi
| Dari | Relasi | Ke | Keterangan |
|------|--------|----|------------|
| `KelolaTransaksi` | `1..*` aggregation | `Transaksi` | Control memiliki koleksi transaksi |
| `Transaksi` | association `0..1` | `Dompet` (via walletId) | Referensi dompet sumber |
| `Transaksi` | association `0..1` | `Dompet` (via targetWalletId) | Referensi dompet tujuan (transfer) |
| `Transaksi` | association `0..1` | `Kategori` (via categoryId) | Referensi kategori (null jika TRANSFER) |
| `KelolaTransaksi` | `«uses»` dependency | `DALTransaksiLokal` | Akses data lokal |
| `KelolaTransaksi` | `«uses»` dependency | `DALAntreanSinkronisasi` | Enqueue perubahan |

### Package Kelola Anggaran
| Dari | Relasi | Ke | Keterangan |
|------|--------|----|------------|
| `KelolaAnggaran` | `1..*` aggregation | `Anggaran` | Control memiliki koleksi anggaran |
| `Anggaran` | association | `Kategori` (via categoryId) | Anggaran terikat kategori |
| `KelolaAnggaran` | dependency | `RingkasanAnggaran` | Produksi DTO untuk antarmuka |
| `KelolaAnggaran` | `«uses»` dependency | `DALAnggaranLokal` | Akses data lokal |
| `KelolaAnggaran` | `«uses»` dependency | `DALTransaksiLokal` | Kalkulasi serapan anggaran |
| `KelolaAnggaran` | `«uses»` dependency | `DALAntreanSinkronisasi` | Enqueue perubahan |

### Package Kelola Target Finansial
| Dari | Relasi | Ke | Keterangan |
|------|--------|----|------------|
| `KelolaTargetFinansial` | `1..*` aggregation | `TargetFinansial` | Control memiliki koleksi target |
| `TargetFinansial` | association `0..1` | `Kategori` (via categoryId) | Filter kategori opsional |
| `KelolaTargetFinansial` | `«uses»` dependency | `DALTargetFinansialLokal` | Akses data lokal |
| `KelolaTargetFinansial` | `«uses»` dependency | `DALTransaksiLokal` | Hitung akumulasi pemasukan aktual |
| `KelolaTargetFinansial` | `«uses»` dependency | `DALAntreanSinkronisasi` | Enqueue perubahan |

### Package Analisis dan Insight
| Dari | Relasi | Ke | Keterangan |
|------|--------|----|------------|
| `KelolaAnalisis` | dependency | `RekapKeuangan` | Produksi DTO rekap bulanan |
| `KelolaAnalisis` | dependency | `ItemInsight` | Produksi daftar insight |
| `KelolaAnalisis` | `«uses»` dependency | `DALTransaksiLokal` | Ambil data transaksi |
| `KelolaAnalisis` | `«uses»` dependency | `DALAnggaranLokal` | Data anggaran untuk konteks |
| `KelolaAnalisis` | `«uses»` dependency | `DALTargetFinansialLokal` | Data target untuk konteks insight |

### Package Notifikasi
| Dari | Relasi | Ke | Keterangan |
|------|--------|----|------------|
| `KelolaNotifikasi` | `1..*` aggregation | `LogNotifikasi` | Control memiliki koleksi log |
| `KelolaNotifikasi` | association `1` | `PengaturanNotifikasi` | Cek preferensi sebelum kirim notifikasi |
| `KelolaNotifikasi` | `«uses»` dependency | `DALLogNotifikasiLokal` | Akses log lokal |
| `KelolaNotifikasi` | `«uses»` dependency | `DALPengaturanNotifikasiLokal` | Akses preferensi lokal |
| `KelolaNotifikasi` | `«uses»` dependency | `DALServerNotifikasi` | Registrasi push subscription |
| `KelolaNotifikasi` | `«uses»` dependency | `KelolaAnalisis` | Ambil RekapKeuangan untuk evaluasi |

### Package Sinkronisasi Offline-first
| Dari | Relasi | Ke | Keterangan |
|------|--------|----|------------|
| `ManajerSinkronisasi` | `«uses»` dependency | `PengaturAntreanSinkronisasi` | Delegasi pengosongan antrean |
| `ManajerSinkronisasi` | `«uses»` dependency | `DALServerSinkronisasi` | Push/pull ke server |
| `ManajerSinkronisasi` | `«uses»` dependency | `DALAntreanSinkronisasi` | Baca antrean lokal |
| `PengaturAntreanSinkronisasi` | `1..*` aggregation | `ItemAntreanSinkronisasi` | Kelola koleksi item antrean |
| `PengaturAntreanSinkronisasi` | `«uses»` dependency | `ManajerSinkronisasi` | Panggil `pushLocalChanges()` |

### Package Akses Data Lokal
| Dari | Relasi | Ke | Keterangan |
|------|--------|----|------------|
| Semua `DAL*Lokal` | association | IndexedDB (external) | Abstraksi ke object store |
| `DALAntreanSinkronisasi` | dependency | `ItemAntreanSinkronisasi` | Menghasilkan dan mengelola item antrean |

### Package Akses Data Server
| Dari | Relasi | Ke | Keterangan |
|------|--------|----|------------|
| `DALServerAutentikasi` | dependency | Server API `/api/auth/*` | Komunikasi HTTP |
| `DALServerSinkronisasi` | dependency | Server API `/api/sync/*` | Push/pull sync |
| `DALServerNotifikasi` | dependency | Server API `/api/push/*` | Registrasi subscription |
| `DALServerEkspor` | dependency | Server API `/api/export/*` | Ekspor XLSX |

---

## 6. Catatan Khusus untuk Class Diagram

### Diagram yang Sebaiknya Dibuat sebagai Diagram Overview/Global
- **Diagram Arsitektur Layer**: Menampilkan lapisan `Boundary → Control → Entity → Repository → Gateway` tanpa detail atribut/fungsi. Cocok untuk memperlihatkan arsitektur offline-first secara keseluruhan. **Ini bukan class diagram UML standar** — lebih tepat masuk ke bagian Perancangan Arsitektur (2.1), bukan Perancangan Rinci (2.2).
- **Diagram Hubungan Antar-Package**: Menampilkan ketergantungan (dependency) antar package secara keseluruhan. Cukup satu diagram dengan satu node per package.

### Diagram yang Sebaiknya Dibuat sebagai Diagram Per Package
Setiap package berikut sebaiknya memiliki **satu class diagram terpisah**:

| No | Package | Kelas yang Ditampilkan | Catatan |
|----|---------|------------------------|---------|
| 1 | Antarmuka Pengguna | Semua `Halaman*` + `NavigasiGlobal` | Tampilkan hanya nama fungsi, bukan atribut detail |
| 2 | Autentikasi | `Pengguna`, `KelolaAutentikasi`, `HalamanLogin`, `HalamanRegistrasi` | Boundary di package ini sebagai entry point |
| 3 | Kelola Kategori | `Kategori`, `KelolaKategori`, `HalamanKategori` (ref) | Ref boundary tidak perlu detail |
| 4 | Kelola Dompet | `Dompet`, `KelolaDompet`, `HalamanDompet` (ref) | |
| 5 | Kelola Transaksi | `Transaksi`, `KelolaTransaksi`, relasi ke `Dompet` dan `Kategori` | Tampilkan multiplicity |
| 6 | Kelola Anggaran | `Anggaran`, `RingkasanAnggaran`, `KelolaAnggaran` | |
| 7 | Kelola Target Finansial | `TargetFinansial`, `KelolaTargetFinansial` | |
| 8 | Analisis dan Insight | `RekapKeuangan`, `ItemInsight`, `KelolaAnalisis` | |
| 9 | Notifikasi | `LogNotifikasi`, `PengaturanNotifikasi`, `KelolaNotifikasi` | |
| 10 | Sinkronisasi | `ItemAntreanSinkronisasi`, `ManajerSinkronisasi`, `PengaturAntreanSinkronisasi` | |
| 11 | Akses Data Lokal | Semua `DAL*Lokal` | Tampilkan hanya `storeName` dan nama fungsi |
| 12 | Akses Data Server | Semua `DALServer*` | Tampilkan hanya `apiEndpoint` dan nama fungsi |

### Bagian yang Lebih Cocok Masuk Diagram Arsitektur, Bukan Class Diagram
- Alur push/pull sync (lebih cocok sebagai **Sequence Diagram** atau **Activity Diagram**)
- Alur resolusi konflik Last-Write-Wins (lebih cocok sebagai **Sequence Diagram**)
- Alur Service Worker + IndexedDB hydration (lebih cocok sebagai **Deployment Diagram** atau **Component Diagram**)
- Relasi antara `Next.js API Routes → Prisma → Neon PostgreSQL` (lebih cocok sebagai **Component Diagram** atau **Deployment Diagram**)
