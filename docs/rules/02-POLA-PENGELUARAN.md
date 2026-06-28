# Kelompok 2: Pola Pengeluaran (Spending Patterns)

Kelompok ini mencakup aturan-aturan yang mendeteksi anomali dan pola pengeluaran tidak sehat dalam jangka pendek (bulan berjalan atau minggu berjalan). Seluruh aturan di kelompok ini dirancang untuk memberi intervensi sedini mungkin sebelum perilaku berisiko mengakar menjadi kebiasaan.

---

## Rule SP-01 — Payday Leak (Pengeluaran Awal Bulan)

**Entitas yang dipantau:** Transaksi Pemasukan × Transaksi Pengeluaran (30 hari terakhir)

**Kondisi pemicu (pseudocode):**

```
FUNGSI EvaluasiSP01(semuaTransaksi, semuaAnggaran, totalPemasukan):
    tiga0HariLalu = tanggal hari ini dikurangi 30 hari

    -- Ambil semua transaksi pemasukan dalam 30 hari terakhir
    daftarPemasukan = FILTER semuaTransaksi DIMANA
        transaksi.tipe = 'INCOME'
        DAN transaksi.tanggal >= tiga0HariLalu

    JIKA daftarPemasukan KOSONG MAKA HENTIKAN

    -- Temukan transaksi pemasukan terbesar (dianggap sebagai 'gajian')
    pemasukanTerbesar = CARI transaksi dengan nominal MAKSIMUM dari daftarPemasukan

    selisihHari = jumlah hari antara hari ini dan tanggal pemasukanTerbesar

    -- Hanya aktif jika 'gajian' terjadi dalam 3 hari ke belakang
    JIKA selisihHari < 0 ATAU selisihHari > 3 MAKA HENTIKAN

    -- Tentukan batas referensi: gunakan total anggaran jika ada, jika tidak gunakan pemasukan
    totalAnggaran = JUMLAH semua anggaran.batasNominal
    batasReferensi = totalAnggaran JIKA totalAnggaran > 0 SEBALIKNYA totalPemasukan

    JIKA batasReferensi <= 0 MAKA HENTIKAN

    -- Kondisi utama: pengeluaran sudah >40% dari batas referensi
    JIKA totalPengeluaranBulanIni > batasReferensi * 0.40 MAKA
        persentase = BULAT(totalPengeluaranBulanIni / batasReferensi * 100)

        HASILKAN Insight(
            judul = 'Pengeluaran Awal Bulan',
            isi   = '{persentase}% dari pemasukan bulan ini telah terpakai hanya
                     dalam {selisihHari} hari terakhir. Periksa kembali pengeluaran
                     agar keuangan akhir bulan tetap terkendali.',
            tingkatUrgensi = 'critical',
            prioritas      = 1.0
        )
```

**Keluaran:** Judul "Pengeluaran Awal Bulan", tingkat urgensi _critical_, tombol aksi ke `/transactions`.

**Jenis keluaran:** Nudge (Digital Nudging — Intervensi Kritis Berbasis Momentum). Rule ini mengeksploitasi fenomena _payday effect_ — kecenderungan manusia berbelanja lebih boros segera setelah menerima penghasilan. Dengan membandingkan pengeluaran terhadap batas gaji di 3 hari pertama, sistem mendeteksi kebocoran finansial paling berbahaya sebelum merusak sisa bulan.

---

## Rule AN-10 — Defisit / Rasio Pengeluaran Tinggi terhadap Pemasukan

**Entitas yang dipantau:** Transaksi Pemasukan × Transaksi Pengeluaran (bulan berjalan)

**Kondisi pemicu (pseudocode):**

```
FUNGSI EvaluasiAN10(totalPemasukan, totalPengeluaran):
    -- KONDISI A: Belum ada pemasukan sama sekali tapi sudah ada pengeluaran
    JIKA totalPemasukan <= 0 DAN totalPengeluaran > 0 MAKA
        HASILKAN Insight(
            judul          = 'Data Pemasukan Kosong',
            isi            = 'Belum ada pemasukan tercatat bulan ini, sehingga rasio
                             pengeluaran terhadap pemasukan belum dapat dihitung secara
                             akurat. Catat pemasukan agar analisis arus kas lebih lengkap.',
            tingkatUrgensi = 'critical',
            prioritas      = 1.1
        )
        HENTIKAN

    -- KONDISI B: Pengeluaran sudah melebihi pemasukan (defisit)
    JIKA totalPemasukan > 0 DAN totalPengeluaran > totalPemasukan MAKA
        kelebihan = ABS(totalPengeluaran - totalPemasukan)

        HASILKAN Insight(
            judul          = 'Defisit Arus Kas',
            isi            = 'Pengeluaran bulan ini melebihi pemasukan sebesar {kelebihan}.
                             Tinjau kembali kategori pengeluaran terbesar agar arus kas
                             bulanan tetap terkendali.',
            tingkatUrgensi = 'critical',
            prioritas      = 1.1
        )
        HENTIKAN

    -- KONDISI C: Rasio pengeluaran mendekati batas berbahaya (>= 80%)
    JIKA totalPemasukan > 0 MAKA
        rasio = totalPengeluaran / totalPemasukan

        JIKA rasio >= 0.80 MAKA
            persentase = BULAT(rasio * 100)

            HASILKAN Insight(
                judul          = 'Rasio Pengeluaran Tinggi',
                isi            = 'Pengeluaran bulan ini sudah mencapai {persentase}% dari
                                 pemasukan bulan ini. Pertimbangkan menyisihkan sebagian
                                 pemasukan terlebih dahulu sebelum menambah pengeluaran.',
                tingkatUrgensi = 'warning',
                prioritas      = 1.1
            )
```

**Keluaran:**
- **Kondisi A** → Judul "Data Pemasukan Kosong", urgensi *critical*, CTA ke `/transactions`
- **Kondisi B** → Judul "Defisit Arus Kas", urgensi *critical*, CTA ke `/analytics`
- **Kondisi C** → Judul "Rasio Pengeluaran Tinggi", urgensi *warning*, CTA ke `/analytics`

Ketiga kondisi dievaluasi secara berurutan (A → B → C) dan hanya satu yang aktif per siklus evaluasi.

**Jenis keluaran:** Nudge (Digital Nudging — Peringatan Berjenjang Berbasis Rasio Arus Kas). Rule ini bekerja sebagai *safety net* berlapis — dimulai dari deteksi data yang belum lengkap (Kondisi A), kemudian kondisi darurat sesungguhnya (Kondisi B), hingga peringatan dini sebelum defisit terjadi (Kondisi C). Ambang 80% pada Kondisi C merujuk pada prinsip keuangan umum bahwa proporsi pengeluaran ideal tidak melebihi 80% dari pendapatan.

---


## Rule SP-02 — Pola Pengeluaran Akhir Pekan

**Entitas yang dipantau:** Transaksi Pengeluaran (minggu berjalan)

**Kondisi pemicu (pseudocode):**

```
FUNGSI EvaluasiSP02(transaksiBulanIni):
    -- Ambil hanya transaksi pengeluaran dalam minggu kalender saat ini
    transaksiMingguIni = FILTER transaksiBulanIni DIMANA
        transaksi.tipe = 'EXPENSE'
        DAN transaksi.tanggal berada dalam minggu kalender yang sama dengan hari ini

    totalMinggu   = 0
    totalAkhirPekan = 0

    UNTUK SETIAP transaksi DALAM transaksiMingguIni:
        totalMinggu += transaksi.nominal
        hariAngka = hari dalam seminggu (0 = Minggu, 6 = Sabtu)
        JIKA hariAngka = 0 ATAU hariAngka = 6 MAKA
            totalAkhirPekan += transaksi.nominal

    JIKA totalMinggu > 0 DAN (totalAkhirPekan / totalMinggu) > 0.70 MAKA
        persentase = BULAT(totalAkhirPekan / totalMinggu * 100)

        HASILKAN Insight(
            judul = 'Pola Pengeluaran Akhir Pekan',
            isi   = 'Sekitar {persentase}% pengeluaranmu minggu ini terjadi di
                     akhir pekan. Pastikan tetap sesuai dengan rencana anggaranmu, ya.',
            tingkatUrgensi = 'warning',
            prioritas      = 2.0
        )
```

**Keluaran:** Judul "Pola Pengeluaran Akhir Pekan", tingkat urgensi _warning_, tombol aksi ke `/transactions`.

**Jenis keluaran:** Nudge (Digital Nudging — Refleksi Pola Temporal). Rule ini menyampaikan fakta statistik pengeluaran mingguan secara netral, membiarkan pengguna untuk merefleksikan apakah pola ini sesuai dengan rencananya atau tidak. Tidak ada nilai minimum nominal — selama proporsinya melebihi 70% di akhir pekan, pola ini dianggap signifikan secara statistik.

---

## Rule SP-03 — Pola Pengeluaran Malam Hari (Night Owl)

**Entitas yang dipantau:** Transaksi Pengeluaran × Kategori Diskresioner (bulan berjalan)

**Kondisi pemicu (pseudocode):**

```
FUNGSI EvaluasiSP03(transaksiBulanIni, semuaKategori):
    kategorDiskresioner = kategori yang namanya mengandung kata:
        'hiburan', 'jajan', 'pribadi', 'gaya hidup', atau 'hobi'

    totalBelanjaMalam = 0

    UNTUK SETIAP transaksi DALAM transaksiBulanIni:
        JIKA transaksi.tipe != 'EXPENSE' MAKA LEWATI

        kategori = CARI kategori berdasarkan transaksi.kategoriId
        JIKA kategori TIDAK ADA atau kategori BUKAN diskresioner MAKA LEWATI

        jamTransaksi = jam saat transaksi dicatat (0–23)

        -- Rentang jam larut malam: 22:00 – 23:59 atau 00:00 – 04:00
        JIKA jamTransaksi >= 22 ATAU jamTransaksi <= 4 MAKA
            totalBelanjaMalam += transaksi.nominal

    JIKA totalBelanjaMalam >= 150.000 MAKA
        HASILKAN Insight(
            judul = 'Pola Pengeluaran Malam Hari',
            isi   = 'Pengeluaran pada larut malam terdeteksi cukup tinggi
                     ({totalBelanjaMalam} bulan ini). Periksa kembali transaksi
                     tersebut agar pengeluaran tetap sesuai rencana.',
            tingkatUrgensi = 'warning',
            prioritas      = 2.1
        )
```

**Keluaran:** Judul "Pola Pengeluaran Malam Hari", tingkat urgensi _warning_, tombol aksi ke `/analytics`.

**Jenis keluaran:** Nudge (Digital Nudging — Intervensi Berbasis Konteks Waktu). Rule ini memanfaatkan konsep _temporal self-control_ dalam psikologi perilaku; belanja larut malam pada kategori gaya hidup cenderung bersifat impulsif. Ambang Rp 150.000 digunakan untuk memfilter agar hanya pengeluaran yang signifikan secara finansial yang memicu notifikasi.

---

## Rule SP-05 — Frekuensi Pengeluaran Rutin (Latte Factor)

**Entitas yang dipantau:** Transaksi Pengeluaran (frekuensi berdasarkan deskripsi/nama)

**Kondisi pemicu (pseudocode):**

```
FUNGSI EvaluasiSP05(transaksiBulanIni):
    hitunganPerNama = {} -- kamus: nama transaksi → {jumlahKali, totalNominal}

    UNTUK SETIAP transaksi DALAM transaksiBulanIni:
        JIKA transaksi.tipe != 'EXPENSE' MAKA LEWATI
        JIKA transaksi.deskripsi KOSONG MAKA LEWATI

        nama = transaksi.deskripsi dalam huruf kecil (case insensitive)
        hitunganPerNama[nama].jumlahKali   += 1
        hitunganPerNama[nama].totalNominal += transaksi.nominal

    -- Cari nama dengan frekuensi tertinggi
    namaTeringgi = CARI entri dengan jumlahKali MAKSIMUM dari hitunganPerNama

    rataRataPerTransaksi = namaTeringgi.totalNominal / namaTeringgi.jumlahKali

    -- Aktif jika: frekuensi sangat tinggi (>10x) DAN nominal per transaksi kecil (<30.000)
    JIKA namaTeringgi.jumlahKali > 10
    DAN rataRataPerTransaksi < 30.000
    DAN namaTeringgi.nama TIDAK KOSONG MAKA
        HASILKAN Insight(
            judul = 'Frekuensi Pengeluaran Rutin',
            isi   = 'Terdapat {jumlahKali} transaksi untuk {nama} bulan ini dengan
                     total {totalNominal}. Perhatikan frekuensinya jika kamu
                     berencana berhemat.',
            tingkatUrgensi = 'info',
            prioritas      = 3.0
        )
```

**Keluaran:** Judul "Frekuensi Pengeluaran Rutin", tingkat urgensi _info_, tombol aksi ke `/transactions`.

**Jenis keluaran:** Nudge (Digital Nudging — Kesadaran Agregat). Rule ini mengimplementasikan prinsip _Latte Factor_ yang dipopulerkan David Bach — transaksi kecil yang terlalu sering bisa menjadi kebocoran besar secara kumulatif. Dengan menampilkan total kumulatif, rule ini mengekspos pengeluaran tersembunyi yang sering tidak disadari pengguna.

---

## Rule SP-06 — Evaluasi Langganan (Subscription Cannibalization)

**Entitas yang dipantau:** Transaksi Pengeluaran bulan ini × Transaksi bulan lalu (deteksi pola berulang)

**Kondisi pemicu (pseudocode):**

```
FUNGSI EvaluasiSP06(transaksiBulanIni, transaksiBulanLalu, totalPemasukan):
    jumlahLangganan  = 0
    totalNominalCocok = 0
    sudahDicocokkan  = {} -- set ID transaksi bulan lalu yang sudah dipasangkan

    -- Deteksi transaksi yang muncul berulang di bulan berbeda dengan pola sama
    UNTUK SETIAP transaksiSekarang DALAM transaksiBulanIni:
        JIKA transaksiSekarang.tipe != 'EXPENSE' MAKA LEWATI

        pasangan = CARI transaksi DARI transaksiBulanLalu DIMANA:
            transaksiLalu.nominal = transaksiSekarang.nominal
            DAN transaksiLalu.kategoriId = transaksiSekarang.kategoriId
            DAN |tanggal(transaksiSekarang) - tanggal(transaksiLalu)| <= 3 hari
            DAN transaksiLalu.id BELUM ADA dalam sudahDicocokkan

        JIKA pasangan DITEMUKAN MAKA
            sudahDicocokkan.tambahkan(pasangan.id)
            jumlahLangganan   += 1
            totalNominalCocok += transaksiSekarang.nominal

    JIKA jumlahLangganan >= 3 DAN totalPemasukan > 0 MAKA
        persentaseDariPemasukan = BULAT(totalNominalCocok / totalPemasukan * 100)

        HASILKAN Insight(
            judul = 'Evaluasi Langganan',
            isi   = 'Kamu punya {jumlahLangganan} tagihan rutin bulanan yang
                     memakan {persentaseDariPemasukan}% dari total pemasukanmu.
                     Coba evaluasi, apakah semua layanan ini masih rutin kamu pakai?',
            tingkatUrgensi = 'warning',
            prioritas      = 3.1
        )
```

**Keluaran:** Judul "Evaluasi Langganan", tingkat urgensi _warning_, tombol aksi ke `/transactions`.

**Jenis keluaran:** Nudge (Digital Nudging — Deteksi Kewajiban Tersembunyi). Rule ini menggunakan _pattern matching_ sederhana: transaksi dengan nominal dan kategori sama yang muncul di dua bulan berurutan dengan jeda tanggal ≤3 hari dianggap sebagai _subscription_ (berlangganan). Ambang 3 transaksi dipilih untuk memastikan ada pola yang nyata, bukan kebetulan.

---

## Rule SP-08 — Kenaikan Transaksi Rutin (Recurring Merchant Growth)

**Entitas yang dipantau:** Transaksi Pengeluaran berdasarkan nama/deskripsi (bulan ini vs bulan lalu)

**Kondisi pemicu (pseudocode):**

```
FUNGSI EvaluasiSP08(transaksiBulanIni, transaksiBulanLalu):
    hitunganBulanIni  = {} -- nama merchant → jumlah kemunculan
    hitunganBulanLalu = {}

    UNTUK SETIAP transaksi DALAM transaksiBulanIni:
        JIKA transaksi.tipe = 'EXPENSE' DAN transaksi.deskripsi ADA MAKA
            hitunganBulanIni[transaksi.deskripsi] += 1

    UNTUK SETIAP transaksi DALAM transaksiBulanLalu:
        JIKA transaksi.tipe = 'EXPENSE' DAN transaksi.deskripsi ADA MAKA
            hitunganBulanLalu[transaksi.deskripsi] += 1

    merchantTerbaik = null
    rasioTertinggi  = 0

    UNTUK SETIAP (nama, jumlahSekarang) DALAM hitunganBulanIni:
        -- Syarat minimum: merchant sudah muncul >= 3 kali bulan ini
        JIKA jumlahSekarang < 3 MAKA LEWATI

        jumlahLalu = hitunganBulanLalu[nama] ATAU 0

        -- Syarat: ada riwayat minimal 2 kali bulan lalu (bukan merchant baru)
        JIKA jumlahLalu < 2 MAKA LEWATI

        rasio = jumlahSekarang / jumlahLalu

        -- Kondisi utama: frekuensi naik minimal 2x lipat
        JIKA rasio >= 2.0 DAN rasio > rasioTertinggi MAKA
            rasioTertinggi  = rasio
            merchantTerbaik = { nama, jumlahSekarang, jumlahLalu }

    JIKA merchantTerbaik ADA MAKA
        totalNominal = JUMLAH transaksi.nominal DIMANA
            transaksi.deskripsi = merchantTerbaik.nama
            DAN transaksi.tipe = 'EXPENSE'
            DAN transaksi.periode = bulanBerjalan

        HASILKAN Insight(
            judul = 'Kenaikan Transaksi Rutin',
            isi   = 'Transaksi untuk {merchantTerbaik.nama} meningkat signifikan
                     dibanding bulan lalu ({jumlahLalu} → {jumlahSekarang} kali).
                     Total bulan ini: {totalNominal}.',
            tingkatUrgensi = 'info',
            prioritas      = 3.2
        )
```

**Keluaran:** Judul "Kenaikan Transaksi Rutin", tingkat urgensi _info_, tombol aksi ke `/transactions`.

**Jenis keluaran:** Nudge (Digital Nudging — Peringatan Eskalasi Kebiasaan). Rule ini mendeteksi normalisasi pengeluaran yang berbahaya — saat transaksi ke merchant yang sama meningkat 2x lipat dalam satu bulan, bisa menjadi sinyal awal adanya kebiasaan konsumtif baru yang tidak disadari.

---

## Rule AN-08 — Pemasukan Tertinggal (Income Momentum Alert)

**Entitas yang dipantau:** Transaksi Pemasukan (bulan berjalan vs bulan lalu)

**Kondisi pemicu (pseudocode):**

```
FUNGSI EvaluasiAN08(transaksiBulanIni, transaksiBulanLalu):
    hariIni = tanggal hari ini dalam bulan (1–31)

    -- Hanya aktif mulai pertengahan bulan (hari ke-15 ke atas)
    -- agar data bulan ini sudah cukup untuk dibandingkan
    JIKA hariIni < 15 MAKA HENTIKAN

    pemasukanBulanIni  = JUMLAH transaksi.nominal DIMANA
        transaksi.tipe = 'INCOME'
        DAN transaksi dari transaksiBulanIni

    pemasukanBulanLalu = JUMLAH transaksi.nominal DIMANA
        transaksi.tipe = 'INCOME'
        DAN transaksi dari transaksiBulanLalu

    JIKA pemasukanBulanLalu <= 0 MAKA HENTIKAN (tidak ada basis perbandingan)

    -- Kondisi utama: pemasukan bulan ini < 50% dari bulan lalu
    JIKA pemasukanBulanIni < pemasukanBulanLalu * 0.50 MAKA
        HASILKAN Insight(
            judul = 'Pemasukan Tertinggal',
            isi   = 'Hingga pertengahan bulan ini, pemasukan tercatat
                     ({pemasukanBulanIni}) lebih rendah dari biasanya (rata-rata
                     {pemasukanBulanLalu}). Pastikan semua pemasukan sudah dicatat.',
            tingkatUrgensi = 'warning',
            prioritas      = 1.7
        )
```

**Keluaran:** Judul "Pemasukan Tertinggal", tingkat urgensi _warning_, tombol aksi ke `/transactions` (catat pemasukan).

**Jenis keluaran:** Nudge (Digital Nudging — Pengingat Kelengkapan Data dan Pengawasan Arus Kas). Muncul setelah pertengahan bulan, rule ini melayani dua fungsi sekaligus: mengingatkan pengguna yang mungkin lupa mencatat pemasukan, sekaligus memberi peringatan dini jika memang ada penurunan pendapatan yang nyata.
