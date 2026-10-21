# Kelompok 3: Analitik Pola (Pattern Analytics)

Kelompok ini mencakup aturan-aturan yang menggali pola pengeluaran jangka panjang, pergeseran tren historis, dan proyeksi kebiasaan di masa depan. Seluruh informasi disajikan dengan pendekatan antarmuka tenang (*Calm UI*) berbasis data faktual yang objektif untuk membantu pengguna memahami kebiasaan keuangannya secara mandiri tanpa merasa dihakimi.

Sesuai kerangka evaluasi tugas akhir, luaran diklasifikasikan ke dalam **Taksonomi 3 Tingkat**:
1. **Tingkat 1: Insight Pola** — Informasi faktual atau deskriptif mengenai pola dan posisi keuangan.
2. **Tingkat 2: Nudge** — Pengingat atau dorongan halus berbasis data untuk membantu pengguna mengelola keuangan secara mandiri.
3. **Tingkat 3: Saran Eksekutif** — Rekomendasi tindakan spesifik yang dapat langsung dieksekusi oleh pengguna.

---

## Rule AN-01 — Pola Hari Transaksi (Peak Spending Day)

**Entitas yang dipantau:** Transaksi Pengeluaran (bulan berjalan, dikelompokkan per hari dalam seminggu)

**Kondisi pemicu (pseudocode):**
```
Program Evaluasi Pola Hari Transaksi (AN-01)
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
        OUTPUT Insight("Pola Hari Transaksi", urgensi=neutral)
    END IF
```

**Keluaran:** Judul *"Pola Hari Transaksi"*, tingkat urgensi *neutral*, pesan: *"Akumulasi pengeluaran tertinggi bulan ini tercatat pada hari {hariPuncak} ({persentaseHariPuncak}% dari total pengeluaran, dominan pada kategori {kategoriDominan.nama})"*, dan tombol aksi *"Lihat Tren"* (`/analytics`).
**Jenis keluaran:** Tingkat 1: Insight Pola. Menampilkan hari dengan total belanja tertinggi dalam seminggu beserta kategori yang mendominasi, membantu pengguna mengenali jadwal pengeluaran rutin.

---

## Rule AN-02 — Tren Pengeluaran Kategori (Category Creep)

**Entitas yang dipantau:** Transaksi Pengeluaran per Kategori (riwayat 3 bulan)

**Kondisi pemicu (pseudocode):**
```
Program Evaluasi Tren Pengeluaran Kategori (AN-02)
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
            OUTPUT Insight("Tren Pengeluaran Kategori", urgensi=warning)
            RETURN  { ambil kategori pertama yang memenuhi syarat }
        END IF
    END FOR
```

**Keluaran:** Judul *"Tren Pengeluaran Kategori"*, tingkat urgensi *warning*, pesan: *"Pengeluaran pada kategori '{kategori.nama}' tercatat meningkat bertahap dalam 3 bulan terakhir (saat ini Rp {pengeluaranM1})"*, dan tombol aksi *"Lihat Analisis"* (`/analytics`).
**Jenis keluaran:** Tingkat 2: Nudge. Menginformasikan kategori yang pengeluarannya bertambah secara bertahap selama 3 bulan berturut-turut, membantu pengguna menyadari tren peningkatan biaya hidup.

---

## Rule AN-03 — Dinamika Saldo Bersih (Savings Gap Trend)

**Entitas yang dipantau:** Transaksi Pemasukan dan Pengeluaran (riwayat 3 bulan terakhir)

**Kondisi pemicu (pseudocode):**
```
Program Evaluasi Dinamika Saldo Bersih (AN-03)
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
        OUTPUT Insight("Dinamika Saldo Bersih", urgensi=warning)
    END IF
```

**Keluaran:** Judul *"Dinamika Saldo Bersih"*, tingkat urgensi *warning*, pesan: *"Selisih bersih (pemasukan - pengeluaran) tercatat menurun dalam 3 bulan terakhir (-{penurunan}%)"*, dan tombol aksi *"Tinjau Alokasi"* (`/budgets`).
**Jenis keluaran:** Tingkat 2: Nudge. Menampilkan fakta penurunan selisih bersih (pemasukan dikurangi pengeluaran) selama 3 bulan berturut-turut, mengingatkan pengguna mengenai sisa dana yang dapat ditabung.

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

**Keluaran:** Judul *"Kategori Pengeluaran Baru"*, tingkat urgensi *info*, pesan: *"Tercatat transaksi baru pada kategori '{kategori.nama}' (Rp {totalNominal} bulan ini) yang tidak tercatat dalam 3 bulan terakhir"*, dan tombol aksi *"Lihat Transaksi"* (`/transactions`).
**Jenis keluaran:** Tingkat 1: Insight Pola. Mendeteksi kemunculan kategori baru dengan nilai transaksi cukup besar (>Rp100.000) yang sebelumnya tidak pernah digunakan dalam 3 bulan terakhir.

---

## Rule AN-05 — Pergeseran Kategori Terbesar (Category Dominance Shift)

**Entitas yang dipantau:** Transaksi Pengeluaran per Kategori (bulan ini vs bulan lalu)

**Kondisi pemicu (pseudocode):**
```
Program Evaluasi Pergeseran Kategori Terbesar (AN-05)
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
            OUTPUT Insight("Pergeseran Kategori Terbesar", urgensi=info)
        END IF
    END IF
```

**Keluaran:** Judul *"Pergeseran Kategori Terbesar"*, tingkat urgensi *info*, pesan: *"Porsi pengeluaran terbesar bulan ini beralih ke '{kategoriTeratasSekarang.nama}' (naik {pertumbuhan}% dibanding bulan lalu)"*, dan tombol aksi *"Lihat Analisis"* (`/analytics`).
**Jenis keluaran:** Tingkat 1: Insight Pola. Menginformasikan perubahan posisi kategori pengeluaran terbesar dari bulan lalu ke bulan ini.

---

## Rule AN-06 — Variasi Rasio Pengeluaran (Expense-to-Income Consistency)

**Entitas yang dipantau:** Transaksi Pemasukan dan Pengeluaran (3 bulan terakhir)

**Kondisi pemicu (pseudocode):**
```
Program Evaluasi Variasi Rasio Pengeluaran (AN-06)
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
        OUTPUT Insight("Variasi Rasio Pengeluaran", urgensi=neutral)
    END IF
```

**Keluaran:** Judul *"Variasi Rasio Pengeluaran"*, tingkat urgensi *neutral*, pesan: *"Rasio pengeluaran terhadap pemasukan tercatat berfluktuasi dalam 3 bulan terakhir ({r1}% → {r2}% → {r3}%)"*, dan tombol aksi *"Lihat Analisis"* (`/analytics`).
**Jenis keluaran:** Tingkat 1: Insight Pola. Menampilkan variasi rasio perbandingan pengeluaran terhadap pemasukan selama 3 bulan terakhir.

---

## Rule AN-07 — Dinamika Pengeluaran Gaya Hidup (Discretionary Drift)

**Entitas yang dipantau:** Transaksi Pengeluaran diskresioner (bulan ini vs 3 bulan lalu)

**Kondisi pemicu (pseudocode):**
```
Program Evaluasi Dinamika Pengeluaran Gaya Hidup (AN-07)
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
        OUTPUT Insight("Dinamika Pengeluaran Gaya Hidup", urgensi=neutral)
    END IF
```

**Keluaran:** Judul *"Dinamika Pengeluaran Gaya Hidup"*, tingkat urgensi *neutral*, pesan: *"Porsi pengeluaran diskresioner tercatat di angka {rasioSekarang*100}% dari total pengeluaran bulan ini (bergeser {selisih} poin dari 3 bulan lalu)"*, dan tombol aksi *"Analisis Kategori"* (`/analytics`).
**Jenis keluaran:** Tingkat 1: Insight Pola. Menunjukkan pergeseran persentase belanja kategori gaya hidup atau hiburan dibanding kondisi 3 bulan lalu.

---

## Rule SP-04 — Dinamika Pengeluaran Kategori (Category Spike)

**Entitas yang dipantau:** Transaksi Pengeluaran per Kategori (bulan ini vs rata-rata 3 bulan lalu)

**Kondisi pemicu (pseudocode):**
```
Program Evaluasi Dinamika Pengeluaran Kategori (SP-04)
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
            OUTPUT Insight("Dinamika Pengeluaran Kategori", urgensi=warning)
            RETURN  { ambil kategori pertama yang memenuhi syarat }
        END IF
    END FOR
```

**Keluaran:** Judul *"Dinamika Pengeluaran Kategori"*, tingkat urgensi *warning*, pesan: *"Pengeluaran '{kategori.nama}' bulan ini tercatat Rp {pengeluaranBulanIni}, lebih tinggi {persentaseLonjakan}% dari rata-rata 3 bulan terakhir (Rp {rataRataHistoris})"*, dan tombol aksi *"Lihat Transaksi"* (`/transactions`).
**Jenis keluaran:** Tingkat 2: Nudge. Memberitahukan adanya kenaikan pengeluaran yang signifikan (>50%) pada suatu kategori dibanding rata-rata 3 bulan sebelumnya.

---

## Rule SP-08 — Pola Waktu Pengeluaran (Morning vs Evening)

**Entitas yang dipantau:** Transaksi Pengeluaran (bulan berjalan, dikelompokkan per sesi hari)

**Kondisi pemicu (pseudocode):**
```
Program Evaluasi Pola Waktu Pengeluaran (SP-08)
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

**Keluaran:** Judul *"Pola Waktu Pengeluaran"*, tingkat urgensi *neutral*, pesan: *"Dari pengeluaran pada jam pagi dan malam, {ratio*100}% tercatat pada sesi {pagi/malam} hari (total Rp {total})"*, dan tombol aksi *"Lihat Analisis"* (`/analytics`).
**Jenis keluaran:** Tingkat 1: Insight Pola. Mengelompokkan waktu transaksi untuk melihat apakah pengguna lebih dominan berbelanja di sesi pagi atau malam hari.

---

## Rule SP-09 — Konsentrasi Tanggal Belanja (Day-of-Month Clustering)

**Entitas yang dipantau:** Transaksi Pengeluaran (bulan berjalan, dikelompokkan per tanggal)

**Kondisi pemicu (pseudocode):**
```
Program Evaluasi Konsentrasi Tanggal Belanja (SP-09)
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
        OUTPUT Insight("Konsentrasi Tanggal Belanja", urgensi=neutral)
    END IF
```

**Keluaran:** Judul *"Konsentrasi Tanggal Belanja"*, tingkat urgensi *neutral*, pesan: *"Sebesar {rasioKonsentrasi*100}% pengeluaran bulan ini terpusat pada tanggal {daftarTanggal}"*, dan tombol aksi *"Lihat Analisis"* (`/analytics`).
**Jenis keluaran:** Tingkat 1: Insight Pola. Mengidentifikasi tanggal-tanggal tertentu yang menyumbang lebih dari separuh total pengeluaran dalam satu bulan.

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
                teksKonteks ← "Transaksi ini tercatat sebanyak {jumlah} kali. "
            ELSE IF rataRataPerTransaksi >= 250.000 THEN
                teksKonteks ← "Rata-rata tiap transaksi berada di angka Rp {rataRataPerTransaksi}. "
            END IF

            OUTPUT Insight("Proyeksi Kebiasaan", urgensi=warning)
        END IF
    END IF
```

**Keluaran:** Judul *"Proyeksi Kebiasaan"*, tingkat urgensi *warning*, pesan: *"Bulan ini kategori {kategoriTerpilih.nama} mencatat total pengeluaran Rp {total}. {teksKonteks}Dengan pola saat ini, akumulasi kategori ini diproyeksikan mencapai Rp {proyeksiTahunan} dalam setahun"*, dan tombol aksi *"Lihat Tren"* (`/analytics`).
**Jenis keluaran:** Tingkat 2: Nudge. Menghitung estimasi total akumulasi belanja suatu kategori dalam satu tahun berdasarkan pengeluaran bulan ini, membantu pengguna melihat gambaran jangka panjang dari kebiasaan belanja rutin.
