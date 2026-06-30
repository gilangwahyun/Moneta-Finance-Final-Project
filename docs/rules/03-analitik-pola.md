# Kelompok 3: Analitik Pola (Pattern Analytics)

Kelompok ini mencakup aturan-aturan yang menggali pola pengeluaran jangka panjang, pergeseran tren historis, dan proyeksi kebiasaan di masa depan. Tidak seperti kelompok Pola Pengeluaran yang bersifat reaktif, kelompok ini bersifat *proaktif* — menjawab pertanyaan "ke mana arah keuanganku?" berdasarkan tren 2–3 bulan ke belakang.

---

## Rule AN-01 — Pola Pengeluaran Ditemukan (Peak Spending Day)

**Entitas yang dipantau:** Transaksi Pengeluaran (bulan berjalan, dikelompokkan per hari dalam seminggu)

**Kondisi pemicu (pseudocode):**
```
FUNGSI EvaluasiAN01(transaksiBulanIni, semuaKategori):
    totalPerHari  = {} -- nama hari → total nominal
    totalKeseluruhan = 0
    detailKategoriPerHari = {} -- nama hari → { kategoriId → {total, jumlah} }

    UNTUK SETIAP transaksi DALAM transaksiBulanIni:
        JIKA transaksi.tipe != 'EXPENSE' MAKA LEWATI

        namaHari = nama hari (misal: 'Senin', 'Sabtu')
        nominal  = transaksi.nominal

        totalPerHari[namaHari]   += nominal
        totalKeseluruhan         += nominal

        JIKA transaksi.kategoriId ADA MAKA
            detailKategoriPerHari[namaHari][transaksi.kategoriId].total  += nominal
            detailKategoriPerHari[namaHari][transaksi.kategoriId].jumlah += 1

    -- Temukan hari dengan total pengeluaran tertinggi
    hariPuncak      = CARI namaHari dengan totalPerHari MAKSIMUM
    nominalHariPuncak = totalPerHari[hariPuncak]

    JIKA totalKeseluruhan > 0 DAN nominalHariPuncak > 0 MAKA
        persentaseHariPuncak = BULAT(nominalHariPuncak / totalKeseluruhan * 100)

        -- Cari kategori dominan di hari puncak tersebut
        kategoriDominan = CARI kategoriId dengan total MAKSIMUM
            dari detailKategoriPerHari[hariPuncak]
        namaKategoriDominan = CARI nama dari semuaKategori berdasarkan kategoriDominan

        HASILKAN Insight(
            judul = 'Pola Pengeluaran Ditemukan',
            isi   = 'Pengeluaran tertinggimu bulan ini paling sering terjadi pada 
                     hari {hariPuncak}, terutama pada kategori {namaKategoriDominan}. 
                     Hari tersebut menyumbang {persentaseHariPuncak}% dari total 
                     pengeluaran. Pertimbangkan menetapkan batas pengeluaran khusus 
                     untuk hari {hariPuncak}.',
            tingkatUrgensi = 'neutral',
            prioritas      = 3.8
        )
```

**Keluaran:** Judul "Pola Pengeluaran Ditemukan", tingkat urgensi *neutral*, tombol aksi ke `/analytics`.

**Jenis keluaran:** Insight Analitik (Observasi Pola Temporal). Rule ini tidak bersifat menghakimi, melainkan memberikan cermin data (*data mirror*) kepada pengguna tentang ritme belanja mingguan mereka. Informasi ini berguna untuk pengguna yang ingin membuat jadwal pengeluaran yang lebih terencana.

---

## Rule AN-02 — Pengeluaran Kategori Merayap Naik (Category Creep)

**Entitas yang dipantau:** Transaksi Pengeluaran per Kategori (riwayat 3 bulan)

**Kondisi pemicu (pseudocode):**
```
FUNGSI EvaluasiAN02(semuaTransaksi, semuaKategori):
    bulanM1 = 1 bulan lalu
    bulanM2 = 2 bulan lalu
    bulanM3 = 3 bulan lalu

    UNTUK SETIAP kategori DALAM semuaKategori:
        JIKA kategori.tipe != 'EXPENSE' MAKA LEWATI

        pengeluaranM1 = JUMLAH transaksi.nominal DIMANA
            transaksi.kategoriId = kategori.id
            DAN transaksi.tipe = 'EXPENSE'
            DAN transaksi.periode = bulanM1

        pengeluaranM2 = JUMLAH ... periode = bulanM2
        pengeluaranM3 = JUMLAH ... periode = bulanM3

        -- Syarat minimal: nilai bulan M-3 harus sudah cukup signifikan (>50.000)
        JIKA pengeluaranM3 <= 50.000 MAKA LEWATI

        -- Kondisi utama: setiap bulan tumbuh konsisten lebih dari 10%
        JIKA pengeluaranM2 > pengeluaranM3 * 1.10
        DAN  pengeluaranM1 > pengeluaranM2 * 1.10 MAKA
            pertumbuhanBulanIni = BULAT((pengeluaranM1 - pengeluaranM2) / pengeluaranM2 * 100)

            HASILKAN Insight(
                judul = 'Pengeluaran Kategori Merayap Naik',
                isi   = 'Pengeluaranmu di kategori {nama kategori} terus naik >10% 
                         tiap bulan selama 3 bulan terakhir (sekarang {pengeluaranM1}).',
                tingkatUrgensi = 'warning',
                prioritas      = 2.9
            )
            HENTIKAN (kembalikan kategori pertama yang ditemukan)
```

**Keluaran:** Judul "Pengeluaran Kategori Merayap Naik", tingkat urgensi *warning*, tombol aksi ke `/analytics`.

**Jenis keluaran:** Nudge (Digital Nudging — Deteksi Inflasi Gaya Hidup). Rule ini mendeteksi fenomena *lifestyle creep* (inflasi pengeluaran tersembunyi) yang sering tidak disadari pengguna karena kenaikan setiap bulannya kecil. Dengan membutuhkan konsistensi 3 bulan dan ambang >10% per bulan, rule ini menghindari *false positive* akibat lonjakan musiman satu kali.

---

## Rule AN-03 — Selisih Bersih Menipis (Savings Gap Shrinking)

**Entitas yang dipantau:** Transaksi Pemasukan dan Pengeluaran (riwayat 3 bulan terakhir)

**Kondisi pemicu (pseudocode):**
```
FUNGSI EvaluasiAN03(semuaTransaksi):
    bulanM1 = 1 bulan lalu
    bulanM2 = 2 bulan lalu
    bulanM3 = 3 bulan lalu

    FUNGSI HitungArusKasBersih(periodeStr):
        pemasukan   = JUMLAH transaksi.nominal DIMANA tipe='INCOME' DAN periode=periodeStr
        pengeluaran = JUMLAH transaksi.nominal DIMANA tipe='EXPENSE' DAN periode=periodeStr
        KEMBALIKAN pemasukan - pengeluaran

    bersihM1 = HitungArusKasBersih(bulanM1)
    bersihM2 = HitungArusKasBersih(bulanM2)
    bersihM3 = HitungArusKasBersih(bulanM3)

    -- Semua bulan harus masih positif (belum defisit) agar rule ini bermakna
    JIKA bersihM3 <= 0 ATAU bersihM2 <= 0 ATAU bersihM1 <= 0 MAKA HENTIKAN

    -- Kondisi: gap menyusut konsisten lebih dari 10% per bulan
    JIKA bersihM2 < bersihM3 * 0.90 DAN bersihM1 < bersihM2 * 0.90 MAKA
        penurunan = BULAT((bersihM3 - bersihM1) / bersihM3 * 100)

        HASILKAN Insight(
            judul = 'Selisih Bersih Menipis',
            isi   = 'Selisih pemasukan dan pengeluaranmu terus menyusut selama 
                     3 bulan terakhir (sekarang sisa {bersihM1}). Hati-hati agar 
                     tidak defisit bulan depan.',
            tingkatUrgensi = 'warning',
            prioritas      = 3.1
        )
```

**Keluaran:** Judul "Selisih Bersih Menipis", tingkat urgensi *warning*, tombol aksi ke `/budgets`.

**Jenis keluaran:** Nudge (Digital Nudging — Proyeksi Tren Finansial Negatif). Rule ini adalah sistem *early warning* untuk defisit di masa depan. Dengan mendeteksi tren penyempitan margin selama 3 bulan, pengguna mendapat kesempatan untuk mengambil tindakan korektif sebelum benar-benar masuk zona merah (defisit).

---

## Rule AN-04 — Kategori Pengeluaran Baru (New Category Emergence)

**Entitas yang dipantau:** Transaksi Pengeluaran (bulan ini vs 3 bulan lalu)

**Kondisi pemicu (pseudocode):**
```
FUNGSI EvaluasiAN04(transaksiBulanIni, semuaTransaksi, semuaKategori):
    bulanM1 = 1 bulan lalu
    bulanM2 = 2 bulan lalu
    bulanM3 = 3 bulan lalu

    -- Kumpulkan semua kategori yang pernah digunakan dalam 3 bulan terakhir
    kategoriHistoris = SET kategoriId DARI semuaTransaksi DIMANA
        transaksi.tipe = 'EXPENSE'
        DAN transaksi.kategoriId ADA
        DAN transaksi.periode ADALAH bulanM1 ATAU bulanM2 ATAU bulanM3

    -- Hitung total pengeluaran per kategori bulan ini
    totalPerKategori = {}
    UNTUK SETIAP transaksi DALAM transaksiBulanIni:
        JIKA transaksi.tipe = 'EXPENSE' DAN transaksi.kategoriId ADA MAKA
            totalPerKategori[transaksi.kategoriId] += transaksi.nominal

    UNTUK SETIAP (kategoriId, totalNominal) DALAM totalPerKategori:
        -- Kondisi: kategori ini TIDAK PERNAH muncul dalam 3 bulan terakhir
        -- DAN nominalnya sudah cukup signifikan
        JIKA kategoriId TIDAK ADA dalam kategoriHistoris
        DAN totalNominal > 100.000 MAKA
            namaKategori = CARI nama dari semuaKategori berdasarkan kategoriId

            HASILKAN Insight(
                judul = 'Kategori Pengeluaran Baru',
                isi   = 'Kamu mulai mencatat pengeluaran di {namaKategori} 
                         ({totalNominal} bulan ini). Kategori ini belum pernah 
                         muncul dalam 3 bulan terakhir.',
                tingkatUrgensi = 'info',
                prioritas      = 2.6
            )
            HENTIKAN (ambil pertama yang ditemukan)
```

**Keluaran:** Judul "Kategori Pengeluaran Baru", tingkat urgensi *info*, tombol aksi ke `/transactions`.

**Jenis keluaran:** Insight Analitik (Observasi Perubahan Pola Belanja). Rule ini bertindak sebagai "sensor" untuk menangkap kemunculan kebutuhan atau keinginan baru. Temuan ini bisa menjadi sinyal awal bagi pengguna untuk mengevaluasi apakah pengeluaran baru ini direncanakan atau impulsif, dan apakah perlu dialokasikan dalam anggaran.

---

## Rule AN-05 — Pergeseran Pengeluaran Terbesar (Category Dominance Shift)

**Entitas yang dipantau:** Transaksi Pengeluaran per Kategori (bulan ini vs bulan lalu)

**Kondisi pemicu (pseudocode):**
```
FUNGSI EvaluasiAN05(transaksiBulanIni, transaksiBulanLalu, semuaKategori):
    -- Hitung total pengeluaran per kategori untuk masing-masing periode
    totalBulanIni  = { kategoriId → total nominal }
    totalBulanLalu = { kategoriId → total nominal }

    UNTUK SETIAP transaksi DALAM transaksiBulanIni:
        JIKA transaksi.tipe = 'EXPENSE' DAN transaksi.kategoriId ADA MAKA
            totalBulanIni[transaksi.kategoriId] += transaksi.nominal

    UNTUK SETIAP transaksi DALAM transaksiBulanLalu: (serupa)

    -- Temukan kategori peringkat 1 masing-masing bulan
    kategoriTeratasSekarang = CARI kategoriId dengan totalBulanIni MAKSIMUM
    kategoriTeratasBulanLalu = CARI kategoriId dengan totalBulanLalu MAKSIMUM

    -- Kondisi utama: kategori teratas BERBEDA antara bulan ini dan bulan lalu
    JIKA kategoriTeratasSekarang != kategoriTeratasBulanLalu MAKA
        -- Pastikan kategori baru memang meningkat signifikan (>30%)
        nominalSebelumnya = totalBulanLalu[kategoriTeratasSekarang] ATAU 0
        JIKA nominalSebelumnya <= 0 MAKA HENTIKAN

        pertumbuhan = BULAT((totalBulanIni[kategoriTeratasSekarang] - nominalSebelumnya) 
                            / nominalSebelumnya * 100)

        JIKA pertumbuhan >= 30 MAKA
            namaKategoriBaru  = CARI nama dari semuaKategori berdasarkan kategoriTeratasSekarang
            namaKategoriLama  = CARI nama dari semuaKategori berdasarkan kategoriTeratasBulanLalu

            HASILKAN Insight(
                judul = 'Pergeseran Pengeluaran Terbesar',
                isi   = 'Pengeluaran terbesar bulan ini berpindah dari 
                         {namaKategoriLama} ke {namaKategoriBaru} (naik {pertumbuhan}% 
                         dibanding bulan lalu).',
                tingkatUrgensi = 'info',
                prioritas      = 2.7
            )
```

**Keluaran:** Judul "Pergeseran Pengeluaran Terbesar", tingkat urgensi *info*, tombol aksi ke `/analytics`.

**Jenis keluaran:** Insight Analitik (Observasi Pergeseran Prioritas Belanja). Rule ini mendeteksi perubahan komposisi pengeluaran, bukan hanya nilainya. Pergeseran kategori dominan sering mencerminkan perubahan kondisi hidup (misal: pindah kos, musim liburan, atau gaya hidup baru) yang penting untuk disadari pengguna.

---

## Rule AN-06 — Rasio Pengeluaran Tidak Konsisten (Expense-to-Income Consistency)

**Entitas yang dipantau:** Transaksi Pemasukan dan Pengeluaran (3 bulan terakhir)

**Kondisi pemicu (pseudocode):**
```
FUNGSI EvaluasiAN06(semuaTransaksi):
    tiga bulan terakhir = [bulan M-3, bulan M-2, bulan M-1]
    daftarRasio = []

    UNTUK SETIAP periodeBulan DALAM tiga bulan terakhir:
        pemasukan   = JUMLAH transaksi.nominal DIMANA tipe='INCOME' DAN periode=periodeBulan
        pengeluaran = JUMLAH transaksi.nominal DIMANA tipe='EXPENSE' DAN periode=periodeBulan

        JIKA pemasukan = 0 MAKA
            HENTIKAN (data tidak lengkap, tidak bisa menghitung rasio)

        rasio = pengeluaran / pemasukan
        daftarRasio.tambahkan(rasio)

    -- Harus ada data valid di semua 3 bulan
    JIKA daftarRasio.panjang < 3 MAKA HENTIKAN

    rasioMin = nilai MINIMUM dari daftarRasio
    rasioMaks = nilai MAKSIMUM dari daftarRasio

    -- Kondisi: selisih antara rasio tertinggi dan terendah > 20 poin persen
    JIKA (rasioMaks - rasioMin) > 0.20 MAKA
        r1, r2, r3 = daftarRasio dibulatkan ke persen

        HASILKAN Insight(
            judul = 'Rasio Pengeluaran Tidak Konsisten',
            isi   = 'Rasio pengeluaran terhadap pemasukanmu berubah-ubah dalam 
                     3 bulan terakhir: {r1}% → {r2}% → {r3}%. Konsistensi yang 
                     lebih stabil memudahkan perencanaan keuangan.',
            tingkatUrgensi = 'neutral',
            prioritas      = 3.75
        )
```

**Keluaran:** Judul "Rasio Pengeluaran Tidak Konsisten", tingkat urgensi *neutral*, tombol aksi ke `/analytics`.

**Jenis keluaran:** Insight Analitik (Observasi Volatilitas Arus Kas). Rule ini tidak menilai "baik" atau "buruk", melainkan menyoroti tingkat prediktabilitas finansial pengguna. Arus kas yang volatil sulit direncanakan dan berisiko lebih tinggi terhadap defisit mendadak.

---

## Rule AN-07 — Perubahan Pola Pengeluaran (Discretionary Drift)

**Entitas yang dipantau:** Transaksi Pengeluaran diskresioner (bulan ini vs 3 bulan lalu)

**Kondisi pemicu (pseudocode):**
```
FUNGSI EvaluasiAN07(transaksiBulanIni, semuaTransaksi, semuaKategori):
    bulanM3 = 3 bulan lalu
    transaksiM3 = FILTER semuaTransaksi DIMANA periode = bulanM3 DAN tipe = 'EXPENSE'

    kategorDiskresioner = kategori yang namanya mengandung:
        'hiburan', 'jajan', 'pribadi', 'gaya hidup', atau 'hobi'

    FUNGSI HitungRasioDiskresioner(daftarTransaksi):
        total = JUMLAH semua transaksi.nominal
        JIKA total = 0 MAKA KEMBALIKAN null

        totalDiskresioner = JUMLAH transaksi.nominal DIMANA
            kategorinya termasuk dalam kategoriDiskresioner

        KEMBALIKAN totalDiskresioner / total

    rasioSekarang = HitungRasioDiskresioner(transaksiBulanIni)
    rasio3BulanLalu = HitungRasioDiskresioner(transaksiM3)

    JIKA rasioSekarang = null ATAU rasio3BulanLalu = null MAKA HENTIKAN

    -- Kondisi utama: porsi gaya hidup naik lebih dari 15 poin persen
    JIKA (rasioSekarang - rasio3BulanLalu) > 0.15 MAKA
        selisih = BULAT((rasioSekarang - rasio3BulanLalu) * 100)

        HASILKAN Insight(
            judul = 'Perubahan Pola Pengeluaran',
            isi   = 'Porsi pengeluaran gaya hidupmu naik menjadi 
                     {rasioSekarang * 100}% dari total pengeluaran (naik {selisih} 
                     poin dari 3 bulan lalu).',
            tingkatUrgensi = 'neutral',
            prioritas      = 2.8
        )
```

**Keluaran:** Judul "Perubahan Pola Pengeluaran", tingkat urgensi *neutral*, tombol aksi ke `/analytics`.

**Jenis keluaran:** Insight Analitik (Deteksi Pergeseran Komposisi Pengeluaran). Rule ini mendeteksi *lifestyle inflation* atau *discretionary drift* — fenomena di mana proporsi pengeluaran untuk kesenangan perlahan menggerogoti porsi kebutuhan dan tabungan, tanpa pengguna menyadarinya secara sadar.

---

## Rule SP-04 — Lonjakan Pengeluaran Kategori (Category Spike)

**Entitas yang dipantau:** Transaksi Pengeluaran per Kategori (bulan ini vs rata-rata 3 bulan lalu)

**Kondisi pemicu (pseudocode):**
```
FUNGSI EvaluasiSP04(transaksiBulanIni, semuaTransaksi, semuaKategori):
    bulanM1 = 1 bulan lalu
    bulanM2 = 2 bulan lalu
    bulanM3 = 3 bulan lalu

    UNTUK SETIAP kategori DALAM semuaKategori:
        JIKA kategori.tipe != 'EXPENSE' MAKA LEWATI

        pengeluaranBulanIni = JUMLAH transaksi.nominal DIMANA
            transaksi.kategoriId = kategori.id
            DAN transaksi.tipe = 'EXPENSE'
            DAN transaksi dari transaksiBulanIni

        -- Abaikan jika nominal bulan ini terlalu kecil (menghindari noise)
        JIKA pengeluaranBulanIni < 100.000 MAKA LEWATI

        pengeluaranM1 = JUMLAH ... periode = bulanM1
        pengeluaranM2 = JUMLAH ... periode = bulanM2
        pengeluaranM3 = JUMLAH ... periode = bulanM3

        rataRataHistoris = (pengeluaranM1 + pengeluaranM2 + pengeluaranM3) / 3

        -- Abaikan jika riwayat historis tidak signifikan
        JIKA rataRataHistoris < 50.000 MAKA LEWATI

        -- Kondisi utama: lonjakan > 50% dari rata-rata historis
        JIKA pengeluaranBulanIni > rataRataHistoris * 1.50 MAKA
            persentaseLonjakan = BULAT((pengeluaranBulanIni - rataRataHistoris) 
                                       / rataRataHistoris * 100)

            HASILKAN Insight(
                judul = 'Lonjakan Pengeluaran Kategori',
                isi   = 'Pengeluaran {nama kategori} bulan ini melonjak tajam 
                         ({pengeluaranBulanIni}), {persentaseLonjakan}% lebih tinggi 
                         dari rata-rata 3 bulan terakhirmu.',
                tingkatUrgensi = 'warning',
                prioritas      = 3.3
            )
            HENTIKAN (ambil kategori pertama yang memenuhi syarat)
```

**Keluaran:** Judul "Lonjakan Pengeluaran Kategori", tingkat urgensi *warning*, tombol aksi ke `/transactions`.

**Jenis keluaran:** Nudge (Digital Nudging — Peringatan Anomali Berbasis Historis). Berbeda dengan rule pengeluaran melonjak (AN-02) yang membandingkan bulan ke bulan, rule ini menggunakan rata-rata 3 bulan sebagai basis — lebih kebal terhadap fluktuasi musiman dan lebih representatif sebagai "normal" pengeluaran pengguna.

---

## Rule SP-09 — Pola Waktu Pengeluaran (Morning vs Evening)

**Entitas yang dipantau:** Transaksi Pengeluaran (bulan berjalan, dikelompokkan per sesi hari)

**Kondisi pemicu (pseudocode):**
```
FUNGSI EvaluasiSP09(transaksiBulanIni):
    -- Syarat: minimal ada 10 transaksi agar pola bermakna secara statistik
    JIKA JUMLAH transaksiBulanIni.tipe='EXPENSE' < 10 MAKA HENTIKAN

    totalPagi  = 0  -- jam 05:00 – 11:59
    totalMalam = 0  -- jam 17:00 – 21:59

    UNTUK SETIAP transaksi DALAM transaksiBulanIni:
        JIKA transaksi.tipe != 'EXPENSE' MAKA LEWATI

        jamTransaksi = jam dari tanggal transaksi (0–23)

        JIKA jamTransaksi >= 5 DAN jamTransaksi <= 11 MAKA
            totalPagi += transaksi.nominal
        JIKA jamTransaksi >= 17 DAN jamTransaksi <= 21 MAKA
            totalMalam += transaksi.nominal

    totalGabungan = totalPagi + totalMalam

    -- Syarat: total gabungan pagi+malam harus signifikan
    JIKA totalGabungan < 200.000 MAKA HENTIKAN

    ratioPagi  = totalPagi  / totalGabungan
    ratioMalam = totalMalam / totalGabungan

    JIKA ratioPagi > 0.60 MAKA
        HASILKAN Insight(sesi='pagi', ratio=ratioPagi, total=totalPagi)
    JIKA ratioMalam > 0.60 MAKA
        HASILKAN Insight(sesi='malam', ratio=ratioMalam, total=totalMalam)

    -- Format pesan keluaran:
    isi = 'Lebih dari {ratio*100}% pengeluaranmu bulan ini terkonsentrasi di 
           sesi {sesi} hari (total {total}).'
    tingkatUrgensi = 'neutral', prioritas = 3.3
```

**Keluaran:** Judul "Pola Waktu Pengeluaran", tingkat urgensi *neutral*, tombol aksi ke `/analytics`.

**Jenis keluaran:** Insight Analitik (Observasi Kronologi Belanja). Rule ini memetakan ritme harian belanja pengguna. Informasi ini berguna bagi pengguna yang ingin memahami kapan mereka paling banyak berbelanja, sehingga dapat merencanakan *spending window* yang lebih sadar.

---

## Rule SP-10 — Konsentrasi Pengeluaran (Day-of-Month Clustering)

**Entitas yang dipantau:** Transaksi Pengeluaran (bulan berjalan, dikelompokkan per tanggal)

**Kondisi pemicu (pseudocode):**
```
FUNGSI EvaluasiSP10(transaksiBulanIni):
    -- Syarat: minimal ada 10 transaksi agar pola bermakna
    JIKA JUMLAH transaksiBulanIni.tipe='EXPENSE' < 10 MAKA HENTIKAN

    totalPerTanggal = {} -- nomor tanggal → total nominal
    totalKeseluruhan = 0

    UNTUK SETIAP transaksi DALAM transaksiBulanIni:
        JIKA transaksi.tipe != 'EXPENSE' MAKA LEWATI

        tanggalAngka    = tanggal dalam bulan (1–31)
        totalPerTanggal[tanggalAngka] += transaksi.nominal
        totalKeseluruhan              += transaksi.nominal

    -- Syarat: total keseluruhan harus signifikan
    JIKA totalKeseluruhan < 500.000 MAKA HENTIKAN

    -- Ambil 3 tanggal dengan pengeluaran tertinggi
    top3Tanggal   = URUTKAN totalPerTanggal dari terbesar, ambil 3 teratas
    totalTop3     = JUMLAH nilai dari top3Tanggal
    rasioKonsentrasi = totalTop3 / totalKeseluruhan

    -- Kondisi utama: 3 hari itu menyumbang lebih dari 50% total pengeluaran
    JIKA rasioKonsentrasi > 0.50 MAKA
        HASILKAN Insight(
            judul = 'Konsentrasi Pengeluaran',
            isi   = 'Lebih dari {rasioKonsentrasi*100}% pengeluaran bulan ini 
                     terpusat pada {3} hari tertentu saja.',
            tingkatUrgensi = 'neutral',
            prioritas      = 3.4
        )
```

**Keluaran:** Judul "Konsentrasi Pengeluaran", tingkat urgensi *neutral*, tombol aksi ke `/analytics`.

**Jenis keluaran:** Insight Analitik (Observasi Klusterisasi Belanja). Rule ini membantu pengguna menyadari bahwa pengeluaran mereka tidak tersebar merata sepanjang bulan, melainkan terpusat pada hari-hari tertentu. Informasi ini berguna untuk mengenali "hari belanja" yang impulsif atau memahami pola tagihan yang menumpuk di tanggal tertentu.

---

## Rule AN-09 — Proyeksi Kebiasaan (Annualized Snowball Projection)

**Entitas yang dipantau:** Transaksi Pengeluaran pada kategori diskresioner (bulan berjalan)

**Kondisi pemicu (pseudocode):**
```
FUNGSI EvaluasiAN09(transaksiBulanIni, semuaKategori, kategoriPengeluaranTeratas):
    kategorDiskresioner = kategori yang namanya mengandung:
        'hiburan', 'jajan', 'pribadi', 'gaya hidup', atau 'hobi'

    totalPerKategoriDiskresioner = {}
    jumlahPerKategoriDiskresioner = {}

    UNTUK SETIAP transaksi DALAM transaksiBulanIni:
        JIKA transaksi.tipe != 'EXPENSE' MAKA LEWATI

        kategori = CARI kategori berdasarkan transaksi.kategoriId
        JIKA kategori ADA DAN kategori termasuk diskresioner MAKA
            totalPerKategoriDiskresioner[kategori.id]  += transaksi.nominal
            jumlahPerKategoriDiskresioner[kategori.id] += 1

    -- Pilih kategori diskresioner dengan total tertinggi
    kategoriTerpilih = CARI kategori dengan total MAKSIMUM dari totalPerKategoriDiskresioner

    -- Fallback: jika tidak ada kategori diskresioner, gunakan kategori pengeluaran teratas
    JIKA kategoriTerpilih TIDAK ADA DAN kategoriPengeluaranTeratas ADA MAKA
        kategoriTerpilih = kategoriPengeluaranTeratas

    JIKA kategoriTerpilih ADA MAKA
        totalBulanIni   = totalPerKategoriDiskresioner[kategoriTerpilih.id]
        jumlahTransaksi = jumlahPerKategoriDiskresioner[kategoriTerpilih.id]
        rataRataPerTranasksi = totalBulanIni / jumlahTransaksi
        proyeksiTahunan = totalBulanIni * 12

        -- Hanya tampilkan jika proyeksi tahunan bermakna secara finansial
        JIKA proyeksiTahunan >= 1.000.000 MAKA
            teksKonteks = ''
            JIKA jumlahTransaksi >= 5 MAKA
                teksKonteks = 'Kamu sudah melakukan transaksi ini sebanyak 
                               {jumlahTransaksi} kali secara berulang.'
            JIKA TIDAK DAN rataRataPerTransaksi >= 250.000 MAKA
                teksKonteks = 'Meski jarang, nilai tiap transaksinya cukup besar 
                               (rata-rata {rataRataPerTransaksi}).'

            HASILKAN Insight(
                judul = 'Proyeksi Kebiasaan',
                isi   = 'Bulan ini kategori {namaKategori} menjadi salah satu 
                         pengeluaran terbesar dengan total {totalBulanIni}. 
                         {teksKonteks} Jika pola ini berlanjut, estimasi tahunannya 
                         dapat mencapai {proyeksiTahunan}. Pertimbangkan memantau 
                         pola pengeluaran ini agar tetap terkendali.',
                tingkatUrgensi = 'warning',
                prioritas      = 2.5
            )
```

**Keluaran:** Judul "Proyeksi Kebiasaan", tingkat urgensi *warning*, tombol aksi ke `/analytics`.

**Jenis keluaran:** Nudge (Digital Nudging — Efek Snowball / Counterfactual Framing). Rule ini menggunakan teknik *temporal framing* yang kuat: mengkonversi pengeluaran bulanan kecil menjadi proyeksi tahunan yang terasa lebih besar dan nyata. Ini memanfaatkan keterbatasan kognitif manusia yang cenderung meremehkan akumulasi jangka panjang (*hyperbolic discounting*).
