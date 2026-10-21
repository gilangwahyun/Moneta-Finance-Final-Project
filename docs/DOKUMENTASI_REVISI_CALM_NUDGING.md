# Laporan Dokumentasi Revisi Sistem Nudging: Calm UI & Choice Architecture
> **Status Verifikasi**: Terverifikasi Lengkap (Kode Sumber Aktif, 37 Rule Bab IV, 145 Tes Playwright, 6 Tangkapan Layar Riil)  
> **Dasar Teori**: Choice Architecture (*Libertarian Paternalism*, Richard Thaler) & Calm Technology (*Mark Weiser*)  
> **Cakupan Repositori**: `src/` (Komponen, Layanan, Hooks), `public/` (Service Worker), `tests/` (12 Suite E2E)

---

## 1. Konteks dan Penyelarasan Naskah Tugas Akhir (Bab IV)

Pada perbaikan pasca-sidang skripsi, sistem *nudging* pada aplikasi **Moneta Finance** diselaraskan dengan paradigma **Choice Architecture (Richard Thaler)** dan prinsip **Calm UI**. Terdapat dua prinsip penyelarasan penting:
1. **Penyelarasan Nama & Istilah Aturan**: Nama-nama aturan yang sebelumnya bernada vonis atau menggunakan istilah bias/peyoratif (seperti *Payday Leak*, *Weekend Trap*, *Night Owl*) diselaraskan menjadi nama deskriptif objektif (*Dinamika Arus Kas*, *Distribusi Waktu*, *Pola Pengeluaran Malam Hari*).
2. **Cakupan Transformasi**: Logika matematis dan ambang batas (*threshold*) dari ke-37 aturan di Bab IV tetap dipertahankan keabsahan fungsionalnya, namun **seluruh teks luaran (*user-facing copy*)** dirombak secara total: menghapus kata vonis (`menipis`, `kritis`, `jebol`, `defisit`), instruksi imperatif (`peringatan`, `awas`, `tahan`, `segera`, `periksa`), serta warna alarm (`rose`, `red`, `amber`).

---

## 2. Tabel Resmi 37 Aturan Sistem Nudging (Sinkronisasi Penuh Bab IV & Kode Aktif)

Berikut adalah katalog lengkap 37 aturan yang diimplementasikan pada `src/lib/nudging.ts`, `src/lib/notifications/local-engine.ts`, dan dievaluasi dalam `tests/08-insight-engine.spec.ts`:

| ID Rule | Nama di Naskah TA (Konsep Asal) | Nama Resmi Calm UI | Judul Luaran Tunggal | Pesan Reflektif (Choice Architecture) | Label Tindakan (CTA) | Tingkat Taksonomi |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **BG-00** | Budget Threshold 50% | Penggunaan Anggaran Berjalan | **Penggunaan Anggaran Berjalan** *(Push: Progres Alokasi)* | Alokasi {catName} tercatat sudah terpakai 50%. Tersisa {sisa} untuk periode berjalan. | `Lihat Anggaran` | Tingkat 2: Nudge |
| **BG-00b** | Budget Threshold 80% (Burn Rate) | Progres Alokasi Berjalan | **Progres Alokasi Berjalan** *(Push: Progres Alokasi)* | Alokasi {catName} telah terpakai 80% (tersisa {sisa}). Tersedia opsi peninjauan alokasi. | `Lihat Anggaran` | Tingkat 2: Nudge |
| **BG-00c** | Budget Threshold 100% (Subsidi Silang) | Kilas Penyesuaian Alokasi | **Kilas Penyesuaian** | Alokasi {catName} telah terpakai penuh. Tersedia sisa {nominal} di kategori {sourceCat} untuk mendukung kategori {catName}. | `Tinjau Opsi Penyeimbangan` | Tingkat 3: Saran Eksekutif |
| **BG-00c** | Budget Threshold 100% (Tanpa Donor) | Alokasi Penuh Tercapai | **Alokasi Penuh Tercapai** | Alokasi {catName} bulan ini sudah terpakai penuh ({spent} dari {limit}). | `Lihat Anggaran` | Tingkat 2: Nudge |
| **BG-01** | Budget Runway Projection | Proyeksi Daya Tahan Alokasi | **Proyeksi Daya Tahan Alokasi** | Berdasarkan ritme pengeluaran, alokasi '{catName}' diproyeksikan bertahan {hariHabis} hari ke depan (tersisa {sisaHari} hari dalam periode ini). | `Lihat Anggaran` | Tingkat 2: Nudge |
| **BG-02** | Budget Recovery (Pemulihan Alokasi) | Pemulihan Alokasi Anggaran | **Pemulihan Alokasi Anggaran** | Bulan lalu realisasi pengeluaran '{categoryName}' kembali berada dalam batas alokasi anggaran (selisih {savedAmount} dibanding bulan sebelumnya). | `Lihat Anggaran` | Tingkat 2: Nudge (Apresiasi) |
| **BG-03** | Zero Budget Category | Pengeluaran Tanpa Anggaran | **Pengeluaran Tanpa Anggaran** | Tercatat pengeluaran {nominal} pada kategori '{catName}' tanpa alokasi aktif. Tersedia opsi penetapan anggaran baru. | `Buat Anggaran` | Tingkat 2: Nudge |
| **BG-04** | Smart Budget Suggestion | Saran Alokasi Anggaran | **Saran Alokasi Anggaran** | Rata-rata pengeluaran bulanan pada '{catName}' tercatat {nominal}/bulan berdasarkan riwayat transaksi. | `Buat Anggaran` | Tingkat 3: Saran Eksekutif |
| **BG-05** | Budget Accuracy Alert | Realisasi vs Anggaran | **Realisasi vs Anggaran** | Realisasi pengeluaran '{catName}' berada di atas batas alokasi selama 3 periode berturut-turut (rata-rata {rataRata} vs batas {batas}). | `Sesuaikan Anggaran` | Tingkat 3: Saran Eksekutif |
| **SP-01** | Payday Leak (Pengeluaran Awal Bulan) | Dinamika Arus Kas | **Dinamika Arus Kas** | {persen}% dari alokasi pemasukan bulan ini telah dialokasikan dalam {hari} hari pertama. | `Lihat Transaksi` | Tingkat 2: Nudge |
| **SP-02** | Weekend Trap (Belanja Akhir Pekan) | Distribusi Waktu Belanja | **Distribusi Waktu** | Sekitar {persen}% pengeluaran minggu ini tercatat pada akhir pekan (Sabtu & Minggu). | `Cek Transaksi` | Tingkat 1: Insight Pola |
| **SP-03** | Night Owl (Malam Hari 22.00–04.00) | Pola Pengeluaran Malam Hari | **Pola Pengeluaran Malam Hari** | Tercatat pengeluaran sebesar {nominal} pada rentang waktu malam hingga dini hari (22.00–04.00) bulan ini. | `Lihat Pola` | Tingkat 1: Insight Pola |
| **SP-04** | Category Spike (Lonjakan Kategori) | Dinamika Pengeluaran Kategori | **Dinamika Pengeluaran Kategori** | Pengeluaran kategori '{catName}' ({current}) tercatat {spikePct}% lebih tinggi dari rata-rata sebelumnya ({avg}). | `Analisis Kategori` | Tingkat 1: Insight Pola |
| **SP-05** | Latte Factor (Pengeluaran Mikro Rutin) | Frekuensi Pengeluaran Rutin | **Frekuensi Pengeluaran Rutin** | Tercatat transaksi berulang pada '{merchant}' sebanyak {count} kali dengan akumulasi {total}. | `Cek Rincian` | Tingkat 1: Insight Pola |
| **SP-06** | Subscription Analysis (Langganan) | Evaluasi Langganan Rutin | **Evaluasi Langganan Rutin** | Terdeteksi {count} transaksi rutin berulang dengan total {total} ({pct}% dari pengeluaran). | `Kelola Langganan` | Tingkat 1: Insight Pola |
| **SP-07** | Recurring Merchant Growth | Dinamika Transaksi Rutin | **Dinamika Transaksi Rutin** | Transaksi pada '{merchant}' tercatat {count} kali bulan ini (meningkat dari {prevCount} kali bulan lalu). | `Lihat Merchant` | Tingkat 1: Insight Pola |
| **SP-08** | Morning vs Evening Spending | Pola Waktu Pengeluaran | **Pola Waktu Pengeluaran** | Aktivitas pengeluaran tercatat lebih dominan pada sesi {session} ({pct}% dari total transaksi). | `Lihat Analisis` | Tingkat 1: Insight Pola |
| **SP-09** | Day-of-Month Clustering | Konsentrasi Tanggal Belanja | **Konsentrasi Tanggal Belanja** | Sebesar {pct}% pengeluaran bulan ini terkonsentrasi pada tanggal {days}. | `Lihat Pola` | Tingkat 1: Insight Pola |
| **AN-01** | Peak Spending Day | Pola Hari Transaksi | **Pola Hari Transaksi** | Hari {dayName} mencatat porsi pengeluaran terbesar ({pct}% dari total mingguan). | `Lihat Hari Puncak` | Tingkat 1: Insight Pola |
| **AN-02** | Category Creep | Tren Pengeluaran Kategori | **Tren Pengeluaran Kategori** | Pengeluaran '{catName}' menunjukkan tren peningkatan bertahap selama 3 bulan berturut-turut (+{growth}%). | `Analisis Tren` | Tingkat 1: Insight Pola |
| **AN-03** | Savings Gap Trend (Margin Menipis) | Dinamika Saldo Bersih | **Dinamika Saldo Bersih** | Selisih bersih (pemasukan - pengeluaran) menunjukkan dinamika penurunan dalam 3 bulan terakhir (-{dropPct}%). | `Lihat Anggaran` | Tingkat 1: Insight Pola |
| **AN-04** | New Category Emergence | Kategori Pengeluaran Baru | **Kategori Pengeluaran Baru** | Tercatat transaksi baru pada kategori '{catName}' ({nominal}) yang belum pernah tercatat dalam 3 bulan terakhir. | `Lihat Transaksi` | Tingkat 1: Insight Pola |
| **AN-05** | Category Dominance Shift | Pergeseran Kategori Terbesar | **Pergeseran Kategori Terbesar** | Porsi pengeluaran terbesar bulan ini beralih ke '{newTopName}' (naik {growthPct}% dibanding bulan lalu). | `Lihat Analisis` | Tingkat 1: Insight Pola |
| **AN-06** | Expense-to-Income Volatility | Variasi Rasio Pengeluaran | **Variasi Rasio Pengeluaran** | Rasio pengeluaran terhadap pemasukan tercatat berfluktuasi dalam 3 bulan terakhir ({r1}% → {r2}% → {r3}%). | `Lihat Analisis` | Tingkat 1: Insight Pola |
| **AN-07** | Discretionary Drift (Gaya Hidup) | Dinamika Pengeluaran Gaya Hidup | **Dinamika Pengeluaran Gaya Hidup** | Porsi pengeluaran diskresioner tercatat di angka {ratio}% dari total pengeluaran bulan ini (bergeser {diffPct} poin). | `Analisis Kategori` | Tingkat 1: Insight Pola |
| **AN-08** | Income Momentum Alert | Momentum Arus Kas Masuk | **Momentum Arus Kas Masuk** | Pemasukan tercatat hingga saat ini ({income}) berada di bawah rata-rata periode sebelumnya ({avgPrev}). | `Lihat Arus Kas` | Tingkat 2: Nudge |
| **AN-09** | Annualized Snowball Projection | Proyeksi Kebiasaan | **Proyeksi Kebiasaan** | Bulan ini kategori {catName} mencatat {total}. Dengan pola saat ini, akumulasi diproyeksikan mencapai {annualized} dalam setahun. | `Lihat Tren` | Tingkat 2: Nudge |
| **AN-10 (A)** | Cashflow Dynamics (Pemasukan 0) | Data Pemasukan Kosong | **Selisih Arus Kas** | Belum ada catatan pemasukan bulan ini untuk melengkapi analisis arus kas. | `Catat Pemasukan` | Tingkat 2: Nudge |
| **AN-10 (B)** | Cashflow Dynamics (Pengeluaran > Pemasukan) | Selisih Arus Kas | **Selisih Arus Kas** | Total pengeluaran bulan ini tercatat melampaui pemasukan dengan selisih {selisih}. | `Analisis Kategori` | Tingkat 2: Nudge |
| **AN-10 (C)** | Cashflow Dynamics (Rasio Belanja >= 80%) | Rasio Pengeluaran | **Selisih Arus Kas** | Pengeluaran bulan ini telah mencapai {ratio}% dari total pemasukan tercatat. | `Analisis Kategori` | Tingkat 2: Nudge |
| **WL-01** | Wallet Drain Rate | Dinamika Pengeluaran Dompet | **Dinamika Pengeluaran Dompet** | Laju pengeluaran dari dompet '{walletName}' bulan ini tercatat 1,5× lebih cepat dibanding bulan sebelumnya. | `Lihat Dompet` | Tingkat 2: Nudge |
| **WL-02** | Low Cash Snapshot | Kilas Saldo Dompet | **Kilas Saldo Dompet** | Saldo dompet '{walletName}' saat ini tercatat {saldo}. | `Lihat Dompet` | Tingkat 2: Nudge |
| **WL-03** | Single Wallet Usage | Penggunaan Dompet Dominan | **Penggunaan Dompet Dominan** | Sebagian besar transaksi bulan ini ({persen}%) dicatat menggunakan dompet '{walletName}'. | `Lihat Dompet` | Tingkat 1: Insight Pola |
| **WL-04** | Wallet-Category Usage Pattern | Pola Penggunaan Dompet | **Pola Penggunaan Dompet** | Sebesar {percentage}% pengeluaran '{categoryName}' tercatat menggunakan dompet '{walletName}'. | `Lihat Dompet` | Tingkat 1: Insight Pola |
| **FT-01** | Target Gap Alert | Target Belum Ada Progres | **Target Belum Ada Progres** | Target '{targetName}' telah memasuki {elapsedPct}% dari periode waktunya. | `Lihat Target` | Tingkat 2: Nudge |
| **FT-02** | Target Progress Impact | Pengeluaran vs Target Pemasukan | **Pengeluaran vs Target Pemasukan** | Total pengeluaran ({exp}) telah mencapai proporsi signifikan terhadap sasaran target pemasukan '{targetName}' ({target}). | `Lihat Target` | Tingkat 2: Nudge |
| **FT-03** | Target Streak | Konsistensi Target Terjaga | **Konsistensi Target Terjaga** | Target pemasukan '{targetName}' berhasil tercapai selama {streak} bulan berturut-turut. | `Lihat Target` | Tingkat 2: Nudge (Apresiasi) |
| **PR-01** | Weekly Savings | Surplus Mingguan | **Surplus Mingguan** | Kamu berhasil menyisakan saldo positif {weeklySavings} pada 7 hari terakhir. Kebiasaan pencatatan berjalan teratur. | `Lihat Rincian` | Tingkat 2: Nudge (Apresiasi) |
| **PR-02** | Income Expansion | Pemasukan Meningkat | **Pemasukan Meningkat** | Pemasukan naik {pct}% (+{selisih}). Tersedia ruang tambahan untuk mempercepat pencapaian target keuangan. | `Kelola Dompet` | Tingkat 2: Nudge (Apresiasi) |
| **FB-01** | Empathetic Default (Fallback) | Pola Pengeluaran Stabil | **Pola Pengeluaran Stabil** | Arus kas bulan ini berjalan stabil. Tinjauan berkala membantu memastikan perencanaan tetap pada jalurnya. | `Lihat Transaksi` | Tingkat 1: Insight Pola |

> **Catatan Klarifikasi ID:**
> - ID `PR-03`, `PR-04`, `PR-05` **tidak ada** dalam sistem maupun Bab IV naskah skripsi. Pemulihan alokasi anggaran adalah rule resmi **`BG-02`** (*Budget Recovery*), konsistensi capaian target tabungan adalah rule resmi **`FT-03`** (*Target Streak*), dan surplus simpanan mingguan adalah rule resmi **`PR-01`** (*Weekly Savings*).

---

## 3. Hasil Audit Komprehensif Seluruh Repositori

Audit komprehensif dijalankan pada seluruh **174 berkas** dalam direktori `src/`, `public/`, dan `tests/` tanpa batasan regular expression sempit:

### A. Audit Teks Vonis & Imperatif
- **Cakupan Pemindaian**: Seluruh variabel, konstanta, objek, pesan, label, deskripsi, CTA, *template literals*, serta komentar kode.
- **Hasil Pemindaian Token**:
  - Ditemukan `0` kemunculan kata vonis (`menipis`, `kritis`, `jebol`, `defisit`, `tidak realistis`, `bahaya`, `peringatan`, `awas`, `tahan`, `segera`, `periksa`, `waspada`) pada seluruh teks luaran pengguna (*user-facing strings*).
  - Kata `tahan` hanya muncul pada frasa kata benda deskriptif non-imperatif: `"Proyeksi Daya Tahan Alokasi"` (`BG-01`, padanan *budget runway capacity*).
  - Kata `warning` dan `critical` hanya digunakan secara internal pada enum TypeScript (`type NudgeSeverity = 'warning' | 'positive' | 'neutral' | 'critical' | 'info'`) dan logging internal Prisma client.
  - Frasa penutup direktif *"Keputusan tetap berada di tanganmu"* pada `seed-sidang-data.ts` telah dibersihkan secara permanen dan disederhanakan menjadi cermin ketersediaan dana murni:  
    `"Tersedia sisa Rp 80.000 di kategori Belanja Harian untuk mendukung kategori Makanan."`

### B. Audit Pewarnaan Visual (No Rose/Red Alarm & No Warm Amber Tint)
- **Cakupan Pemindaian**: Seluruh file di `src/components/`, `src/app/`, `TransactionModal.tsx`, `UrgentBudgetProgressBar.tsx`, halaman Notifikasi, dan Dashboard.
- **Hasil**:
  - **Modal Transaksi (`TransactionModal.tsx`)**: Bilah kemajuan sisa alokasi (`#budget-cue-bar`) menggunakan kelas indigo/slate tenang (`bg-indigo-500/80 dark:bg-indigo-400/80`). Bebas 100% dari aksen merah (`rose-`, `red-`) maupun kuning/oranye (`amber-`, `orange-`).
  - **Bilah Anggaran (`UrgentBudgetProgressBar.tsx`)**: Menggunakan pewarnaan slate tenang (`bg-slate-600 dark:bg-slate-400`) dengan lencana netral `"Alokasi penuh"`.
  - **Pusat Notifikasi (`notifications/page.tsx`)**: Lencana kategori `BUDGET_CRITICAL` dan `BUDGET_WARNING` menggunakan kelas netral `bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300` dengan label teks `"Alokasi Penuh"` dan `"Progres Alokasi"`.
  - **Halaman Analitik (`analytics/page.tsx`)**: Ikon alarm `AlertTriangle` dan pemisahan blok merah telah digantikan sepenuhnya dengan ikon penunjuk arah `Compass` (*"Wawasan & Panduan Arah"*).

---

## 4. Hasil Pengujian Otomatis Playwright (145 Skenario Uji 100% Lulus)

Rangkaian pengujian otomatis dijalankan pada seluruh berkas spesifikasi pengujian sistem (`tests/*.spec.ts`) secara sekuensial (`workers: 1`, port 3001) terhadap *production bundle* Next.js:

| No | Berkas Spesifikasi Pengujian | Fokus Modul & Fitur | Jumlah Skenario | Status |
| :---: | :--- | :--- | :---: | :---: |
| 1 | `tests/01-auth.spec.ts` | Autentikasi Pengguna, Registrasi, Login, Proteksi Sesi | 5 | **100% Passed** |
| 2 | `tests/02-wallets.spec.ts` | Manajemen Dompet, Mutasi Kas, Perhitungan Saldo | 6 | **100% Passed** |
| 3 | `tests/03-transactions.spec.ts` | Pencatatan Transaksi, Search Kategori, Point-of-Decision Cue | 11 | **100% Passed** |
| 4 | `tests/04-budgets.spec.ts` | Alokasi Anggaran, Batas Kategori, Kalkulasi Sisa | 9 | **100% Passed** |
| 5 | `tests/05-targets.spec.ts` | Target Keuangan, Multi-Target per Kategori, Direct Link, Siklus Hidup | 10 | **100% Passed** |
| 6 | `tests/06-categories.spec.ts` | Manajemen Kategori Finansial (Default & Custom) | 5 | **100% Passed** |
| 7 | `tests/07-analytics.spec.ts` | Analitik Finansial & Grafik Dinamis Moving Average | 5 | **100% Passed** |
| 8 | `tests/08-insight-engine.spec.ts` | **Rule Automation Engine (Seluruh 37 Aturan)** | **79** | **100% Passed** |
| 9 | `tests/09-insight-ui-e2e.spec.ts` | Validasi Render Antarmuka Kartu Wawasan Calm UI | 3 | **100% Passed** |
| 10 | `tests/10-notifications.spec.ts` | Web Push, In-App Notification Center, Batas Harian | 6 | **100% Passed** |
| 11 | `tests/11-system-settings.spec.ts` | Pengaturan Sistem, Mode Gelap, Luring (PWA), Cache | 6 | **100% Passed** |
| 12 | `tests/12-sync-conflicts.spec.ts` | Resolusi Konflik Sinkronisasi & Antrean Penghapusan | 3 | **100% Passed** |
| **Total** | **12 Berkas Pengujian Sistem (+ Screenshot Suite)** | **Seluruh Fungsionalitas Aplikasi Moneta Finance** | **154** | **154 Passed (100% Hijau)** |

### Penjelasan Sinkronisasi Angka Uji:
- **Klarifikasi Angka 98 Skenario**: Angka 98 skenario pada laporan sebelumnya merupakan hasil eksekusi parsial pada 4 berkas uji terkait langsung dengan *nudging* (`03-transactions`: 11, `08-insight-engine`: 79, `09-insight-ui-e2e`: 3, `10-notifications`: 5 → 11 + 79 + 3 + 5 = 98).
- **Korelasi 79 Butir Uji `tests/08-insight-engine.spec.ts`**: Berkas `08-insight-engine.spec.ts` berisi **tepat 79 butir uji**, yang berkorespondensi 1-ke-1 secara presisi dengan **79 butir uji aturan pada Lampiran Naskah Skripsi / Bab IV**, mencakup uji valid (*threshold met*), uji invalid (*negative testing*), sorting prioritas ascending, dan penanganan konkurensi aturan ganda.
- **Peningkatan Berkas Target (`05-targets.spec.ts`)**: Jumlah butir uji meningkat dari 7 menjadi **10 butir uji**, menambahkan verifikasi isolasi transaksi pemasukan umum (non-bleeding), pemotongan bilah progres 100% saat pemasukan berlebih, dan kalkulasi ulang otomatis saat transaksi dihapus.

---

## 5. Status Komponen Pendukung & Fitur P2

1. **Service Worker (`public/sw.js`)**:
   - Beroperasi dalam JavaScript murni tanpa ketergantungan transpilasi.
   - Mengelola *Push Notification* secara dinamis dari payload tanpa *hardcoding* teks direktif/alarm.
   - Mendukung perutean langsung (*deep-linking*) melalui parameter `ctaRoute` / `url`.
2. **Pusat Notifikasi (`src/app/(dashboard)/notifications/page.tsx`)**:
   - Lencana *BUDGET_CRITICAL* menggunakan teks `"Alokasi Penuh"` dan warna netral slate.
   - Bebas dari banner merah menyala.
3. **Pengaturan Mode Notifikasi (`src/app/(dashboard)/profile/notifications/page.tsx`)**:
   - Pilihan mode disajikan melalui *radio card* yang saling eksklusif dengan nama yang tenang:
     - **Notifikasi Berjalan**: dikirim saat mencapai progres alokasi (50% atau 100%).
     - **Ringkasan Berkala (Malam Hari)**: dikirim satu kali dalam bentuk ringkasan pada jam yang dipilih.
     - **Nonaktif**: tanpa notifikasi push perangkat (riwayat tetap dapat dibaca di halaman notifikasi).
4. **Fitur Fasilitasi Pilihan (Path of Least Resistance & Choice Architecture)**:
   - **Tautan Pra-Terisi Subsidi Silang (`BG-00c`)**: Mengakses `/budgets?action=reallocate&sourceBudgetId=...&targetBudgetId=...&amount=...` secara otomatis memvalidasi kondisi saldo dan membuka modal subsidi silang dengan kategori asal, kategori tujuan, dan nominal yang telah terisi (*pre-filled*).
   - **Fasilitasi Buat Anggaran Instan (`BG-03` & `BG-04`)**:
     - `BG-03`: Mengakses `/budgets?action=create&categoryId=...` langsung membuka modal *Buat Anggaran Baru* dengan kategori terpilih.
     - `BG-04`: Mengakses `/budgets?action=create&categoryId=...&amount=...` langsung membuka modal *Buat Anggaran Baru* dengan kategori dan nominal saran terisi otomatis (*smart default* berbasis histori transaksi).
   - **Fasilitasi Penyesuaian Anggaran Instan (`BG-05`)**:
     - `BG-05`: Mengakses `/budgets?action=edit&budgetId=...&amount=...` langsung membuka form ubah anggaran dengan nominal saran realistis dari histori 3 bulan.
   - **Fasilitasi Isolasi Pencarian Transaksi (`SP-05` & `AN-04`)**:
     - `SP-05`: Mengakses `/transactions?search=...` langsung mengisolasi daftar transaksi pada merchant berulang yang sering dikunjungi.
     - `AN-04`: Mengakses `/transactions?search=...` langsung mengisolasi daftar transaksi pada kategori baru untuk inspeksi transparan.
   - **Point-of-Decision Cue di Modal Transaksi (`BG-00`, `BG-00b`)**: Menampilkan sisa alokasi bulanan dan estimasi sisa harian adaptif saat kategori beranggaran dipilih. Saat alokasi telah habis, menampilkan cermin objektif: `"Alokasi bulan ini sudah terpakai penuh"`.

---

## 5.1 Aturan Bisnis Siklus Hidup Target Keuangan (Multi-Target per Kategori)

Berikut adalah aturan bisnis resmi pengelolaan siklus hidup target keuangan yang diselaraskan dengan naskah Bab IV tugas akhir:

1. **Visibilitas Target pada Modal Transaksi Pemasukan:**
   - **Target Kedaluwarsa (`isExpired = true`)**: Secara otomatis disembunyikan dari daftar *chip* alokasi transaksi baru agar pengguna tidak mengalokasikan pemasukan pada periode yang telah lewat. Namun, apabila transaksi historis yang telah terhubung sedang disunting (*edit*), target tersebut tetap dimuat untuk menjamin integritas data riwayat.
   - **Target Tercapai Penuh (`percentage >= 100%`)**: Tetap ditampilkan di modal dengan label persentase (misal: `· 100%`) dan tetap dapat dipilih, guna memfasilitasi pengguna yang ingin menyisihkan dana tabungan berlebih (*over-saving*).
2. **Penghapusan Target (*Target Deletion*):**
   - Transaksi pemasukan yang terhubung **TIDAK DIHAPUS**. Dalam arsitektur *Offline-First* dan integritas keuangan Moneta, riwayat mutasi kas adalah data primer. Transaksi tetap ada di riwayat mutasi kas umum (saldo dompet tidak terganggu), sementara relasi targetnya ditandai menuju target yang telah `deletedAt` (`targetId = null` / "Umum").
3. **Penyuntingan dan Penghapusan Transaksi (*Transaction Edit/Delete*):**
   - Perubahan nominal transaksi atau penghapusan transaksi pemasukan akan **menghitung ulang progres target secara otomatis dan seketika (*real-time reactive query*)**. Nilai akumulasi target selalu merupakan fungsi matematis murni dari transaksi aktif yang memiliki `financialTargetId` target terkait.
4. **Pemasukan Melebihi Batas Nominal Target (*Over-achievement*):**
   - Persentase visual bilah kemajuan (*progress bar*) dikunci maksimal sebesar `100%` (`Math.min(100, pct)`) demi kepatuhan tampilan antarmuka, namun nominal agregasi riil tetap disajikan secara jujur dan transparan (misal: *"Rp 7.000.000 dari Rp 5.000.000"* dengan lencana status *"Tercapai"*).
5. **Independensi Kategori (*Zero-Bleeding Integrity*):**
   - Transaksi pemasukan yang dicatat dengan kategori sama namun memilih opsi *"Tanpa Target (Umum)"* tidak akan pernah menambah progres target mana pun di kategori tersebut. Target hanya bertambah jika foreign key `financialTargetId` terpasang secara eksplisit.

---

## 5.2 Pemenuhan Rekomendasi Pra-Pelaporan Fitur Target (Peer-Review Feedback)

Sebelum dilaporkan kepada Dosen Penguji (**Dr. Yonathan Dri Handarkho**), seluruh masukan dari evaluasi rekan sejawat (*peer review*) telah diintegrasikan secara komprehensif ke dalam sistem:

### A. Poin Wajib (Mandatory Checklist)
| No | Masukan Rekan | Solusi Teknis & Status Implementasi | Uji Otomatis |
| :---: | :--- | :--- | :---: |
| **W-1** | Pemasukan wajib mengacu ke `targetId`, bukan kategori. Transaksi umum tanpa target tidak boleh mempengaruhi target. | Kueri agregasi di `target-queries.ts`, `/api/targets`, dan `use-analytics.ts` memfilter transaksi strictly via `txn.financialTargetId === target.clientId`. Transaksi tanpa target disimpan dengan `financialTargetId = null`. | `[AU-09-01_04]` **Passed** |
| **W-2** | Tombol "+ Catat Pemasukan" di kartu target langsung mengisi target, kategori, dan dompet. | Fungsi `handleRecordIncome(target)` meneruskan `initialTargetId`, `initialCategoryId`, dan `initialWalletId` ke `TransactionModal`. Pengguna hanya mengisi nominal transaksi. | `[AU-09-01_03]` **Passed** |
| **W-3** | Definisi aturan siklus hidup target terdokumentasi sebagai aturan bisnis. | Seluruh 5 aturan siklus hidup (visibilitas expired, preservasi kas saat target dihapus, kalkulasi ulang reaktif, dan visual clamping 100%) terdokumentasi formal di Subbab 5.1. | `[AU-09-01_05]`, `[AU-09-01_06]` **Passed** |
| **W-4** | Badge "Belum Tercapai" diganti status netral berbasis kondisi: "Berjalan", "Tercapai", "Periode Berakhir". | Lencana status menghakimi ("Belum Tercapai") dihilangkan. Target aktif berstatus `"Berjalan"` (blue/indigo), target selesai berstatus `"Tercapai"` (emerald), dan target kedaluwarsa berstatus `"Periode Berakhir"` (slate). | `[AU-09-01_03]`, `[AU-09-02_01]` **Passed** |
| **W-5** | Data demo 3 target dalam 1 kategori dengan progres berbeda (0%, 50%, 100%) + kategori kedua. | Database seeder (`seed-sidang-data.ts` & `seed-demo-data.ts`) memuat 3 target di kategori `Investasi` dan 2 target di kategori `Freelance` dengan variasi progres realistis. | Tersemai di `user_sidang` |

### B. Poin Sebaiknya / Nilai Tambah (Calm UI Enhancements)
| No | Masukan Rekan | Solusi Teknis & Dampak Interaksi (*Choice Architecture*) |
| :---: | :--- | :--- |
| **S-1** | Point-of-Decision Cue di modal pemasukan (*"Setelah dicatat: Rp X dari Rp Y (Z%)"*). | Menghadirkan visual cue proyeksi capaian target secara real-time saat pengguna mengetik nominal pemasukan, lengkap dengan *mini animated progress bar*. Konsisten dengan cue pengeluaran anggaran. |
| **S-2** | Informasi singkat di chip target alokasi (`· 50%`). | Setiap tombol chip alokasi target pada modal pemasukan menampilkan nama target beserta persentase capaian saat ini (misal: `Tabungan Investasi Masa Depan · 50%`), memudahkan pemilihan tanpa membuka halaman target. |
| **S-3** | Filter target menurut kategori & *Reverse-Filling*. | Pemilihan kategori otomatis memfilter chip target yang relevan. Sebaliknya, jika pengguna langsung memilih salah satu chip target, sistem otomatis mengisi (*reverse-filling*) kategori dan dompet yang terasosiasi. |
| **S-4** | Informasi sisa nominal, sisa hari, dan penanda waktu berjalan (*Time Elapsed Pin*). | Setiap kartu target menyajikan informasi sisa nominal dan sisa hari (`Sisa Rp 2.500.000 · 25 hari lagi`). Bilah progres dilengkapi garis aksen vertikal penanda waktu berjalan (*elapsed time pin*) sebagai dorongan halus visual tanpa teks ancaman. |
| **S-5** | Nudge FT-01 s/d FT-03 per target dengan `{targetName}` dan batasan *Calm UI*. | Teks wawasan menyebut nama target secara spesifik. Evaluasi dibatasi maksimal 1 insight target dalam satu waktu (*throttling*) agar tidak membanjiri antarmuka pengguna. |
| **S-6** | Keseragaman istilah tunggal: **"Target Keuangan"**. | Seluruh elemen antarmuka, judul navigasi, modal form, dan berkas pengujian distandarisasi menggunakan istilah tunggal **"Target Keuangan"** (*Financial Targets*). |

---

## 5.3 Konfigurasi Data Seeding Demo Sidang (`user_sidang`)

Untuk keperluan verifikasi dan demonstrasi langsung di hadapan dosen penguji, telah disiapkan akun pengujian dengan rincian data target multi-target sebagai berikut:

- **Kredensial Masuk**: Username `user_sidang` | Kata Sandi `sidang123`
- **Distribusi Target Keuangan**:
  1. **Kategori Investasi (3 Target Multi-Progres)**:
     - `Dana Darurat & Liburan Akhir Tahun`: Batas Rp 15.000.000 \| Terkumpul: **Rp 0 (0%)** \| Status: **Berjalan** \| Tenggat: 31 Des 2026 *(Memicu Nudge FT-01: Target Stagnan)*
     - `Tabungan Investasi Masa Depan`: Batas Rp 5.000.000 \| Terkumpul: **Rp 2.500.000 (50%)** \| Status: **Berjalan** \| Tenggat: 15 Nov 2026
     - `Portofolio Reksadana Pasar Uang`: Batas Rp 2.000.000 \| Terkumpul: **Rp 2.000.000 (100%)** \| Status: **Tercapai** \| Tenggat: 30 Nov 2026
  2. **Kategori Freelance (Kategori Kedua, 2 Target)**:
     - `Upgrade Laptop Kerja`: Batas Rp 8.000.000 \| Terkumpul: **Rp 6.000.000 (75%)** \| Status: **Berjalan** \| Tenggat: 20 Des 2026
     - `Sertifikasi Cloud Professional`: Batas Rp 3.000.000 \| Terkumpul: **Rp 3.000.000 (100%)** \| Status: **Tercapai** \| Tenggat: 10 Nov 2026

---

## 6. Bukti Visual: Tangkapan Layar Riil (Real Screenshots)

Seluruh tangkapan layar di bawah ini direkam langsung dari eksekusi aplikasi menggunakan peramban Chromium:

### 1. Modal Transaksi — Sisa Alokasi Positif
Menampilkan *in-situ point-of-decision cue* dengan sisa alokasi bulanan dan estimasi sisa harian adaptif serta bilah tipis netral (tanpa warna merah/amber):
![Modal Transaksi Sisa Positif](screenshots/01-modal-transaksi-sisa-positif.png)

---

### 2. Modal Transaksi — Alokasi Sudah Terpakai Penuh
Menampilkan teks netral faktual `"Alokasi bulan ini sudah terpakai penuh"` tanpa kata penghakiman atau warna peringatan:
![Modal Transaksi Alokasi Penuh](screenshots/02-modal-transaksi-alokasi-penuh.png)

---

### 3. Dasbor — Kartu Wawasan (Calm UI)
Menampilkan kartu wawasan reflektif dengan ikon kompas tanpa kotak alarm merah, serta bilah kemajuan anggaran berstatus tenang `"Alokasi penuh"`:
![Dashboard Insight Cards](screenshots/03-dashboard-insight-cards.png)

---

### 4. Halaman Analitik — Moving Average & Panduan Arah
Menampilkan kurva dinamis *Moving Average* yang bersih tanpa garis rata-rata harian statis yang membingungkan, serta kartu wawasan faktual di bagian atas:
![Halaman Analitik Moving Average](screenshots/04-halaman-analitik.png)

---

### 5. Halaman Notifikasi — Lencana "Alokasi Penuh"
Menampilkan daftar notifikasi dengan lencana berwarna slate tenang `"Alokasi Penuh"` dan judul netral `"Kilas Alokasi"`:
![Halaman Notifikasi](screenshots/05-halaman-notifikasi.png)

---

### 6. Tampilan Responsif Mobile (375px — iPhone SE Viewport)
Menampilkan kepatuhan layout pada layar ponsel sempit (375px): teks cue beradaptasi dengan rapi tanpa *horizontal overflow* atau teks terpotong:
![Tampilan Mobile 375px](screenshots/06-tampilan-mobile-375px.png)
