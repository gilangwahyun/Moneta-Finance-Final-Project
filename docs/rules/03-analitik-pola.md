# Kelompok 3: Analitik Pola (Pattern Analytics)

Kelompok ini mencakup aturan-aturan yang menggali pola pengeluaran jangka panjang, pergeseran tren historis, dan proyeksi kebiasaan di masa depan. Tidak seperti kelompok Pola Pengeluaran yang bersifat reaktif, kelompok ini bersifat *proaktif* — menjawab pertanyaan "ke mana arah keuanganku?" berdasarkan tren 2–3 bulan ke belakang.

---

## Rule AN-01 — Pola Pengeluaran Ditemukan (Peak Spending Day)

**Entitas yang dipantau:** Transaksi Pengeluaran (bulan berjalan, dikelompokkan per hari dalam seminggu)

**Kondisi pemicu (pseudocode):**
```
Program Evaluasi Pola Pengeluaran Ditemukan (AN-01)
Deklarasi
    totalPerHari          : kamus { nama hari → total nominal pengeluaran }
    detailKategoriPerHari : kamus { nama hari → { kategoriId → total } }
    totalKeseluruhan      : bilangan real
    hariPuncak            : teks          { nama hari dengan pengeluaran tertinggi }
    kategoriDominan       : identifikasi kategori terbesar di hari puncak
    persentaseHariPuncak  : bilangan bulat

Algoritma
    totalPerHari     ← { }
    totalKeseluruhan ← 0

    FOR EACH transaksi bulan ini DO
        IF tipe != 'EXPENSE' THEN SKIP
        namaHari ← nama hari dari tanggal transaksi
        totalPerHari[namaHari]          ← totalPerHari[namaHari] + nominal
        totalKeseluruhan                ← totalKeseluruhan + nominal
        detailKategoriPerHari[namaHari][kategoriId] ← ... + nominal
    END FOR

    hariPuncak           ← nama hari dengan totalPerHari MAKSIMUM
    persentaseHariPuncak ← ROUND(totalPerHari[hariPuncak] / totalKeseluruhan × 100)
    kategoriDominan      ← kategoriId dengan total tertinggi pada hari puncak

    IF totalKeseluruhan > 0 THEN
        OUTPUT Insight("Pola Pengeluaran Ditemukan", urgensi=neutral)
    END IF
```

**Keluaran:** Judul "Pola Pengeluaran Ditemukan", tingkat urgensi *neutral*, tombol aksi ke `/analytics`.

**Jenis keluaran:** Insight Analitik (Observasi Pola Temporal). Rule ini tidak bersifat menghakimi, melainkan memberikan cermin data (*data mirror*) kepada pengguna tentang ritme belanja mingguan mereka. Informasi ini berguna untuk pengguna yang ingin membuat jadwal pengeluaran yang lebih terencana.

---

## Rule AN-02 — Pengeluaran Kategori Merayap Naik (Category Creep)

**Entitas yang dipantau:** Transaksi Pengeluaran per Kategori (riwayat 3 bulan)

**Kondisi pemicu (pseudocode):**
```
Program Evaluasi Pengeluaran Kategori Merayap Naik (AN-02)
Deklarasi
    kategori        : data kategori pengeluaran
    pengeluaranM1   : bilangan real  { total pengeluaran 1 bulan lalu }
    pengeluaranM2   : bilangan real  { total pengeluaran 2 bulan lalu }
    pengeluaranM3   : bilangan real  { total pengeluaran 3 bulan lalu }
    pertumbuhan     : bilangan bulat { persentase kenaikan M-2 ke M-1 }

Algoritma
    FOR EACH kategori DO
        IF kategori.tipe != 'EXPENSE' THEN SKIP

        pengeluaranM1 ← SUM transaksi.nominal WHERE kategoriId = kategori.id AND tipe = 'EXPENSE' AND periode = M-1
        pengeluaranM2 ← SUM ... WHERE periode = M-2
        pengeluaranM3 ← SUM ... WHERE periode = M-3

        IF pengeluaranM3 <= 50.000 THEN SKIP  { baseline terlalu kecil }

        IF pengeluaranM2 > pengeluaranM3 × 1,1
        AND pengeluaranM1 > pengeluaranM2 × 1,1 THEN
            pertumbuhan ← ROUND((pengeluaranM1 - pengeluaranM2) / pengeluaranM2 × 100)
            OUTPUT Insight("Pengeluaran Kategori Merayap Naik", urgensi=warning)
            RETURN  { ambil kategori pertama yang memenuhi syarat }
        END IF
    END FOR
```

**Keluaran:** Judul "Pengeluaran Kategori Merayap Naik", tingkat urgensi *warning*, tombol aksi ke `/analytics`.

**Jenis keluaran:** Nudge (Digital Nudging — Deteksi Inflasi Gaya Hidup). Rule ini mendeteksi fenomena *lifestyle creep* (inflasi pengeluaran tersembunyi) yang sering tidak disadari pengguna karena kenaikan setiap bulannya kecil. Dengan membutuhkan konsistensi 3 bulan dan ambang >10% per bulan, rule ini menghindari *false positive* akibat lonjakan musiman satu kali.

---

## Rule AN-03 — Selisih Bersih Menipis (Savings Gap Shrinking)

**Entitas yang dipantau:** Transaksi Pemasukan dan Pengeluaran (riwayat 3 bulan terakhir)

**Kondisi pemicu (pseudocode):**
```
Program Evaluasi Selisih Bersih Menipis (AN-03)
Deklarasi
    bersihM1 : bilangan real  { arus kas bersih 1 bulan lalu }
    bersihM2 : bilangan real  { arus kas bersih 2 bulan lalu }
    bersihM3 : bilangan real  { arus kas bersih 3 bulan lalu }
    penurunan: bilangan bulat { persentase penyusutan dari M-3 ke M-1 }

{ Sub-algoritma: menghitung arus kas bersih satu periode }
Program Hitung Arus Kas Bersih
Algoritma
    pemasukan   ← SUM transaksi.nominal WHERE tipe = 'INCOME' AND periode = input
    pengeluaran ← SUM transaksi.nominal WHERE tipe = 'EXPENSE' AND periode = input
    RETURN pemasukan - pengeluaran

{ Algoritma utama }
Algoritma
    bersihM1 ← HitungArusKasBersih(M-1)
    bersihM2 ← HitungArusKasBersih(M-2)
    bersihM3 ← HitungArusKasBersih(M-3)

    IF bersihM3 <= 0 OR bersihM2 <= 0 OR bersihM1 <= 0 THEN RETURN
    { semua bulan harus masih positif agar rule ini bermakna }

    IF bersihM2 < bersihM3 × 0,9 AND bersihM1 < bersihM2 × 0,9 THEN
        penurunan ← ROUND((bersihM3 - bersihM1) / bersihM3 × 100)
        OUTPUT Insight("Selisih Bersih Menipis", urgensi=warning)
    END IF
```

**Keluaran:** Judul "Selisih Bersih Menipis", tingkat urgensi *warning*, tombol aksi ke `/budgets`.

**Jenis keluaran:** Nudge (Digital Nudging — Proyeksi Tren Finansial Negatif). Rule ini adalah sistem *early warning* untuk defisit di masa depan. Dengan mendeteksi tren penyempitan margin selama 3 bulan, pengguna mendapat kesempatan untuk mengambil tindakan korektif sebelum benar-benar masuk zona merah (defisit).

---

## Rule AN-04 — Kategori Pengeluaran Baru (New Category Emergence)

**Entitas yang dipantau:** Transaksi Pengeluaran (bulan ini vs 3 bulan lalu)

**Kondisi pemicu (pseudocode):**
```
Program Evaluasi Kategori Pengeluaran Baru (AN-04)
Deklarasi
    kategoriHistoris : himpunan kategoriId { semua kategori yang pernah dipakai 3 bulan lalu }
    totalPerKategori : kamus { kategoriId → total nominal bulan ini }
    totalNominal     : bilangan real

Algoritma
    kategoriHistoris ← SET kategoriId FROM transaksi WHERE tipe = 'EXPENSE'
                       AND periode IN (M-1, M-2, M-3)

    totalPerKategori ← { }
    FOR EACH transaksi bulan ini DO
        IF tipe = 'EXPENSE' AND kategoriId ADA THEN
            totalPerKategori[kategoriId] ← totalPerKategori[kategoriId] + nominal
        END IF
    END FOR

    FOR EACH (kategoriId, totalNominal) IN totalPerKategori DO
        IF kategoriId TIDAK ADA dalam kategoriHistoris
        AND totalNominal > 100.000 THEN
            OUTPUT Insight("Kategori Pengeluaran Baru", urgensi=info)
            RETURN  { ambil kategori pertama yang ditemukan }
        END IF
    END FOR
```

**Keluaran:** Judul "Kategori Pengeluaran Baru", tingkat urgensi *info*, tombol aksi ke `/transactions`.

**Jenis keluaran:** Insight Analitik (Observasi Perubahan Pola Belanja). Rule ini bertindak sebagai "sensor" untuk menangkap kemunculan kebutuhan atau keinginan baru. Temuan ini bisa menjadi sinyal awal bagi pengguna untuk mengevaluasi apakah pengeluaran baru ini direncanakan atau impulsif, dan apakah perlu dialokasikan dalam anggaran.

---

## Rule AN-05 — Pergeseran Pengeluaran Terbesar (Category Dominance Shift)

**Entitas yang dipantau:** Transaksi Pengeluaran per Kategori (bulan ini vs bulan lalu)

**Kondisi pemicu (pseudocode):**
```
Program Evaluasi Pergeseran Pengeluaran Terbesar (AN-05)
Deklarasi
    totalBulanIni           : kamus { kategoriId → total nominal }
    totalBulanLalu          : kamus { kategoriId → total nominal }
    kategoriTeratasSekarang : identifikasi kategori dominan bulan ini
    kategoriTeratasBulanLalu: identifikasi kategori dominan bulan lalu
    pertumbuhan             : bilangan bulat

Algoritma
    { Akumulasi pengeluaran per kategori untuk masing-masing periode }
    FOR EACH transaksi bulan ini DO
        IF tipe = 'EXPENSE' AND kategoriId ADA THEN
            totalBulanIni[kategoriId] ← totalBulanIni[kategoriId] + nominal
        END IF
    END FOR

    FOR EACH transaksi bulan lalu DO
        IF tipe = 'EXPENSE' AND kategoriId ADA THEN
            totalBulanLalu[kategoriId] ← totalBulanLalu[kategoriId] + nominal
        END IF
    END FOR

    kategoriTeratasSekarang  ← kategoriId dengan totalBulanIni MAKSIMUM
    kategoriTeratasBulanLalu ← kategoriId dengan totalBulanLalu MAKSIMUM

    IF kategoriTeratasSekarang != kategoriTeratasBulanLalu THEN
        nominalSebelumnya ← totalBulanLalu[kategoriTeratasSekarang] OR 0
        IF nominalSebelumnya <= 0 THEN RETURN

        pertumbuhan ← ROUND((totalBulanIni[kategoriTeratasSekarang] - nominalSebelumnya)
                            / nominalSebelumnya × 100)

        IF pertumbuhan >= 30 THEN
            OUTPUT Insight("Pergeseran Pengeluaran Terbesar", urgensi=info)
        END IF
    END IF
```

**Keluaran:** Judul "Pergeseran Pengeluaran Terbesar", tingkat urgensi *info*, tombol aksi ke `/analytics`.

**Jenis keluaran:** Insight Analitik (Observasi Pergeseran Prioritas Belanja). Rule ini mendeteksi perubahan komposisi pengeluaran, bukan hanya nilainya. Pergeseran kategori dominan sering mencerminkan perubahan kondisi hidup (misal: pindah kos, musim liburan, atau gaya hidup baru) yang penting untuk disadari pengguna.

---

## Rule AN-06 — Rasio Pengeluaran Tidak Konsisten (Expense-to-Income Consistency)

**Entitas yang dipantau:** Transaksi Pemasukan dan Pengeluaran (3 bulan terakhir)

**Kondisi pemicu (pseudocode):**
```
Program Evaluasi Rasio Pengeluaran Tidak Konsisten (AN-06)
Deklarasi
    daftarRasio : larik bilangan real  { rasio pengeluaran/pemasukan per bulan }
    rasioMin    : bilangan real
    rasioMaks   : bilangan real

Algoritma
    daftarRasio ← [ ]

    FOR EACH periode IN (M-3, M-2, M-1) DO
        pemasukan   ← SUM transaksi.nominal WHERE tipe = 'INCOME' AND periode = periode
        pengeluaran ← SUM transaksi.nominal WHERE tipe = 'EXPENSE' AND periode = periode

        IF pemasukan = 0 THEN RETURN  { data tidak lengkap }
        daftarRasio ← daftarRasio + (pengeluaran / pemasukan)
    END FOR

    IF LENGTH(daftarRasio) < 3 THEN RETURN

    rasioMin  ← nilai MINIMUM dari daftarRasio
    rasioMaks ← nilai MAKSIMUM dari daftarRasio

    IF (rasioMaks - rasioMin) > 0,2 THEN
        OUTPUT Insight("Rasio Pengeluaran Tidak Konsisten", urgensi=neutral)
    END IF
```

**Keluaran:** Judul "Rasio Pengeluaran Tidak Konsisten", tingkat urgensi *neutral*, tombol aksi ke `/analytics`.

**Jenis keluaran:** Insight Analitik (Observasi Volatilitas Arus Kas). Rule ini tidak menilai "baik" atau "buruk", melainkan menyoroti tingkat prediktabilitas finansial pengguna. Arus kas yang volatil sulit direncanakan dan berisiko lebih tinggi terhadap defisit mendadak.

---

## Rule AN-07 — Perubahan Pola Pengeluaran (Discretionary Drift)

**Entitas yang dipantau:** Transaksi Pengeluaran diskresioner (bulan ini vs 3 bulan lalu)

**Kondisi pemicu (pseudocode):**
```
Program Evaluasi Perubahan Pola Pengeluaran Diskresioner (AN-07)
Deklarasi
    kategoriDiskresioner : kumpulan kategori { mengandung: hiburan, jajan, pribadi,
                                               gaya hidup, hobi }
    rasioSekarang        : bilangan real  { proporsi diskresioner bulan ini }
    rasio3BulanLalu      : bilangan real  { proporsi diskresioner 3 bulan lalu }
    selisih              : bilangan bulat

{ Sub-algoritma: menghitung rasio diskresioner }
Program Hitung Rasio Diskresioner
Algoritma
    total            ← SUM semua transaksi.nominal dari input
    IF total = 0 THEN RETURN null
    totalDiskresioner ← SUM transaksi.nominal WHERE kategori IN kategoriDiskresioner
    RETURN totalDiskresioner / total

{ Algoritma utama }
Algoritma
    rasioSekarang   ← HitungRasioDiskresioner(transaksi bulan ini)
    rasio3BulanLalu ← HitungRasioDiskresioner(transaksi 3 bulan lalu)

    IF rasioSekarang = null OR rasio3BulanLalu = null THEN RETURN

    IF (rasioSekarang - rasio3BulanLalu) > 0,15 THEN
        selisih ← ROUND((rasioSekarang - rasio3BulanLalu) × 100)
        OUTPUT Insight("Perubahan Pola Pengeluaran", urgensi=neutral)
    END IF
```

**Keluaran:** Judul "Perubahan Pola Pengeluaran", tingkat urgensi *neutral*, tombol aksi ke `/analytics`.

**Jenis keluaran:** Insight Analitik (Deteksi Pergeseran Komposisi Pengeluaran). Rule ini mendeteksi *lifestyle inflation* atau *discretionary drift* — fenomena di mana proporsi pengeluaran untuk kesenangan perlahan menggerogoti porsi kebutuhan dan tabungan, tanpa pengguna menyadarinya secara sadar.

---

## Rule SP-04 — Lonjakan Pengeluaran Kategori (Category Spike)

**Entitas yang dipantau:** Transaksi Pengeluaran per Kategori (bulan ini vs rata-rata 3 bulan lalu)

**Kondisi pemicu (pseudocode):**
```
Program Evaluasi Lonjakan Pengeluaran Kategori (SP-04)
Deklarasi
    kategori           : data kategori pengeluaran
    pengeluaranBulanIni: bilangan real
    rataRataHistoris   : bilangan real  { rata-rata pengeluaran 3 bulan terakhir }
    persentaseLonjakan : bilangan bulat

Algoritma
    FOR EACH kategori DO
        IF kategori.tipe != 'EXPENSE' THEN SKIP

        pengeluaranBulanIni ← SUM transaksi.nominal WHERE kategoriId = kategori.id
                              AND tipe = 'EXPENSE' AND periode = bulan ini
        IF pengeluaranBulanIni < 100.000 THEN SKIP  { terlalu kecil, abaikan }

        rataRataHistoris ← (SUM M-1 + SUM M-2 + SUM M-3) / 3
        IF rataRataHistoris < 50.000 THEN SKIP

        IF pengeluaranBulanIni > rataRataHistoris × 1,5 THEN
            persentaseLonjakan ← ROUND((pengeluaranBulanIni - rataRataHistoris)
                                       / rataRataHistoris × 100)
            OUTPUT Insight("Lonjakan Pengeluaran Kategori", urgensi=warning)
            RETURN  { ambil kategori pertama yang memenuhi syarat }
        END IF
    END FOR
```

**Keluaran:** Judul "Lonjakan Pengeluaran Kategori", tingkat urgensi *warning*, tombol aksi ke `/transactions`.

**Jenis keluaran:** Nudge (Digital Nudging — Peringatan Anomali Berbasis Historis). Berbeda dengan rule pengeluaran melonjak (AN-02) yang membandingkan bulan ke bulan, rule ini menggunakan rata-rata 3 bulan sebagai basis — lebih kebal terhadap fluktuasi musiman dan lebih representatif sebagai "normal" pengeluaran pengguna.

---

## Rule SP-09 — Pola Waktu Pengeluaran (Morning vs Evening)

**Entitas yang dipantau:** Transaksi Pengeluaran (bulan berjalan, dikelompokkan per sesi hari)

**Kondisi pemicu (pseudocode):**
```
Program Evaluasi Pola Waktu Pengeluaran (SP-09)
Deklarasi
    totalPagi    : bilangan real  { pengeluaran sesi pagi: jam 05:00 – 11:59 }
    totalMalam   : bilangan real  { pengeluaran sesi malam: jam 17:00 – 21:59 }
    totalGabungan: bilangan real
    ratioPagi    : bilangan real
    ratioMalam   : bilangan real

Algoritma
    IF jumlah transaksi EXPENSE bulan ini < 10 THEN RETURN

    totalPagi  ← 0
    totalMalam ← 0

    FOR EACH transaksi bulan ini DO
        IF tipe != 'EXPENSE' THEN SKIP
        jam ← jam dari tanggal transaksi (0–23)

        IF jam >= 5 AND jam <= 11 THEN totalPagi  ← totalPagi + nominal
        IF jam >= 17 AND jam <= 21 THEN totalMalam ← totalMalam + nominal
    END FOR

    totalGabungan ← totalPagi + totalMalam
    IF totalGabungan < 200.000 THEN RETURN

    ratioPagi  ← totalPagi  / totalGabungan
    ratioMalam ← totalMalam / totalGabungan

    IF ratioPagi > 0,6 THEN
        OUTPUT Insight("Pola Waktu Pengeluaran", sesi=pagi, urgensi=neutral)
    ELSE IF ratioMalam > 0,6 THEN
        OUTPUT Insight("Pola Waktu Pengeluaran", sesi=malam, urgensi=neutral)
    END IF
```

**Keluaran:** Judul "Pola Waktu Pengeluaran", tingkat urgensi *neutral*, tombol aksi ke `/analytics`.

**Jenis keluaran:** Insight Analitik (Observasi Kronologi Belanja). Rule ini memetakan ritme harian belanja pengguna. Informasi ini berguna bagi pengguna yang ingin memahami kapan mereka paling banyak berbelanja, sehingga dapat merencanakan *spending window* yang lebih sadar.

---

## Rule SP-10 — Konsentrasi Pengeluaran (Day-of-Month Clustering)

**Entitas yang dipantau:** Transaksi Pengeluaran (bulan berjalan, dikelompokkan per tanggal)

**Kondisi pemicu (pseudocode):**
```
Program Evaluasi Konsentrasi Pengeluaran (SP-10)
Deklarasi
    totalPerTanggal  : kamus { nomor tanggal → total nominal pengeluaran }
    totalKeseluruhan : bilangan real
    top3Tanggal      : larik { 3 tanggal dengan pengeluaran tertinggi }
    rasioKonsentrasi : bilangan real

Algoritma
    IF jumlah transaksi EXPENSE bulan ini < 10 THEN RETURN

    totalPerTanggal  ← { }
    totalKeseluruhan ← 0

    FOR EACH transaksi bulan ini DO
        IF tipe != 'EXPENSE' THEN SKIP
        tanggalAngka    ← tanggal dalam bulan (1–31)
        totalPerTanggal[tanggalAngka] ← totalPerTanggal[tanggalAngka] + nominal
        totalKeseluruhan              ← totalKeseluruhan + nominal
    END FOR

    IF totalKeseluruhan < 500.000 THEN RETURN

    top3Tanggal      ← SORT totalPerTanggal DESC, ambil 3 teratas
    rasioKonsentrasi ← SUM(top3Tanggal) / totalKeseluruhan

    IF rasioKonsentrasi > 0,5 THEN
        OUTPUT Insight("Konsentrasi Pengeluaran", urgensi=neutral)
    END IF
```

**Keluaran:** Judul "Konsentrasi Pengeluaran", tingkat urgensi *neutral*, tombol aksi ke `/analytics`.

**Jenis keluaran:** Insight Analitik (Observasi Klusterisasi Belanja). Rule ini membantu pengguna menyadari bahwa pengeluaran mereka tidak tersebar merata sepanjang bulan, melainkan terpusat pada hari-hari tertentu. Informasi ini berguna untuk mengenali "hari belanja" yang impulsif atau memahami pola tagihan yang menumpuk di tanggal tertentu.

---

## Rule AN-09 — Proyeksi Kebiasaan (Annualized Snowball Projection)

**Entitas yang dipantau:** Transaksi Pengeluaran pada kategori diskresioner (bulan berjalan)

**Kondisi pemicu (pseudocode):**
```
Program Evaluasi Proyeksi Kebiasaan Tahunan (AN-09)
Deklarasi
    kategoriDiskresioner        : kumpulan kategori { hiburan, jajan, pribadi,
                                                      gaya hidup, hobi }
    totalPerKategoriDiskresioner: kamus { kategoriId → total nominal }
    jumlahPerKategori           : kamus { kategoriId → jumlah transaksi }
    kategoriTerpilih            : data kategori diskresioner dengan total tertinggi
    proyeksiTahunan             : bilangan real
    teksKonteks                 : teks

Algoritma
    FOR EACH transaksi bulan ini DO
        IF tipe != 'EXPENSE' THEN SKIP
        IF kategori IN kategoriDiskresioner THEN
            totalPerKategoriDiskresioner[kategoriId] ← ... + nominal
            jumlahPerKategori[kategoriId]            ← ... + 1
        END IF
    END FOR

    kategoriTerpilih ← kategori dengan total MAKSIMUM dari totalPerKategoriDiskresioner

    { Fallback: jika tidak ada kategori diskresioner, gunakan kategori teratas }
    IF kategoriTerpilih = null AND kategoriPengeluaranTeratas ADA THEN
        kategoriTerpilih ← kategoriPengeluaranTeratas
    END IF

    IF kategoriTerpilih ADA THEN
        proyeksiTahunan ← totalPerKategoriDiskresioner[kategoriTerpilih.id] × 12

        IF proyeksiTahunan >= 1.000.000 THEN
            rataRataPerTransaksi ← total / jumlahTransaksi

            IF jumlahTransaksi >= 5 THEN
                teksKonteks ← "sudah {jumlah} kali transaksi berulang"
            ELSE IF rataRataPerTransaksi >= 250.000 THEN
                teksKonteks ← "nilai tiap transaksi cukup besar"
            END IF

            OUTPUT Insight("Proyeksi Kebiasaan", urgensi=warning)
        END IF
    END IF
```

**Keluaran:** Judul "Proyeksi Kebiasaan", tingkat urgensi *warning*, tombol aksi ke `/analytics`.

**Jenis keluaran:** Nudge (Digital Nudging — Efek Snowball / Counterfactual Framing). Rule ini menggunakan teknik *temporal framing* yang kuat: mengkonversi pengeluaran bulanan kecil menjadi proyeksi tahunan yang terasa lebih besar dan nyata. Ini memanfaatkan keterbatasan kognitif manusia yang cenderung meremehkan akumulasi jangka panjang (*hyperbolic discounting*).
