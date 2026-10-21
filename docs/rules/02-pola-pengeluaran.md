# Kelompok 2: Pola Pengeluaran (Spending Patterns)

Kelompok ini mencakup aturan-aturan yang mendeteksi variasi dan kecenderungan pengeluaran jangka pendek (dalam skala mingguan atau bulanan). Seluruh informasi disajikan secara faktual dan netral dengan pendekatan antarmuka tenang (*Calm UI*), sehingga pengguna dapat memahami kebiasaan belanjanya secara mandiri tanpa merasa dihakimi.

Sesuai kerangka evaluasi tugas akhir, luaran diklasifikasikan ke dalam **Taksonomi 3 Tingkat**:
1. **Tingkat 1: Insight Pola** — Informasi faktual atau deskriptif mengenai pola dan posisi keuangan.
2. **Tingkat 2: Nudge** — Pengingat atau dorongan halus berbasis data untuk membantu pengguna mengelola keuangan secara mandiri.
3. **Tingkat 3: Saran Eksekutif** — Rekomendasi tindakan spesifik yang dapat langsung dieksekusi oleh pengguna.

---

## Rule SP-01 — Dinamika Arus Kas (Payday Momentum)

**Entitas yang dipantau:** Transaksi Pemasukan × Transaksi Pengeluaran (30 hari terakhir)

**Kondisi pemicu (pseudocode):**

```
Program Evaluasi Dinamika Arus Kas / Payday Momentum (SP-01)
Deklarasi
    pemasukanTerbesar        : data transaksi  { transaksi income terbesar = proxy gajian }
    selisihHari              : bilangan bulat  { hari sejak gajian terjadi }
    totalAnggaran            : bilangan real
    batasReferensi           : bilangan real   { total anggaran jika ada, jika tidak gunakan total pemasukan }
    totalPengeluaranBulanIni : bilangan real
    persentase               : bilangan bulat

Algoritma
    daftarPemasukan ← FILTER transaksi WHERE tipe = 'INCOME'
                      AND tanggal >= (hari ini - 30 hari)

    IF daftarPemasukan KOSONG THEN RETURN

    pemasukanTerbesar ← transaksi dengan nominal MAKSIMUM dari daftarPemasukan
    selisihHari       ← jumlah hari antara hari ini dan tanggal pemasukanTerbesar

    IF selisihHari < 0 OR selisihHari > 3 THEN RETURN

    totalAnggaran  ← SUM anggaran.batasNominal
    batasReferensi ← totalAnggaran IF totalAnggaran > 0 ELSE totalPemasukan
    IF batasReferensi <= 0 THEN RETURN

    totalPengeluaranBulanIni ← SUM transaksi.nominal
                                WHERE tipe = 'EXPENSE' AND periode = bulan berjalan

    IF totalPengeluaranBulanIni > batasReferensi × 0,4 THEN
        persentase ← ROUND(totalPengeluaranBulanIni / batasReferensi × 100)
        OUTPUT Insight("Dinamika Arus Kas", urgensi=critical)
    END IF
```

**Keluaran:** Judul *"Dinamika Arus Kas"*, tingkat urgensi *critical*, pesan: *"{persentase}% dari alokasi pemasukan telah terpakai dalam {selisihHari} hari sejak pemasukan terbesar dalam 30 hari terakhir"*, dan tombol aksi *"Lihat Transaksi"* (`/transactions`).
**Jenis keluaran:** Tingkat 2: Nudge. Menginformasikan bahwa porsi belanja telah mencapai lebih dari 40% dalam waktu singkat setelah pemasukan besar diterima, membantu pengguna menjaga ritme pengeluaran di awal periode.

---

## Rule AN-10 — Selisih Arus Kas / Rasio Pengeluaran terhadap Pemasukan

**Entitas yang dipantau:** Transaksi Pemasukan × Transaksi Pengeluaran (bulan berjalan)

**Kondisi pemicu (pseudocode):**

```
Program Evaluasi Selisih Arus Kas dan Rasio Pengeluaran (AN-10)
Deklarasi
    totalPemasukan   : bilangan real  { total income bulan berjalan }
    totalPengeluaran : bilangan real  { total expense bulan berjalan }
    rasio            : bilangan real
    kelebihan        : bilangan real  { selisih pengeluaran di atas pemasukan }
    persentase       : bilangan bulat

Algoritma
    { Kondisi A: catatan pemasukan kosong tapi sudah ada pengeluaran }
    IF totalPemasukan <= 0 AND totalPengeluaran > 0 THEN
        OUTPUT Insight("Catatan Pemasukan Bulan Ini", urgensi=critical)
        RETURN

    { Kondisi B: pengeluaran sudah melebihi pemasukan }
    IF totalPemasukan > 0 AND totalPengeluaran > totalPemasukan THEN
        kelebihan ← ABS(totalPengeluaran - totalPemasukan)
        OUTPUT Insight("Selisih Arus Kas", urgensi=critical)
        RETURN

    { Kondisi C: rasio pengeluaran mencapai 80% pemasukan }
    IF totalPemasukan > 0 THEN
        rasio ← totalPengeluaran / totalPemasukan

        IF rasio >= 0,8 THEN
            persentase ← ROUND(rasio × 100)
            OUTPUT Insight("Selisih Arus Kas", urgensi=warning)
        END IF
    END IF
```

**Keluaran:**
- *Kondisi A (Catatan Pemasukan Masih Kosong):* Judul *"Catatan Pemasukan Bulan Ini"*, tingkat urgensi *critical*, pesan: *"Catatan pemasukan bulan ini masih kosong; menambahkannya akan melengkapi analisis arus kas"*, dan tombol aksi *"Catat Pemasukan"* (`/transactions`). Jenis: Tingkat 3: Saran Eksekutif (mendorong pencatatan pemasukan agar data keuangan lengkap).
- *Kondisi B (Pengeluaran Melampaui Pemasukan):* Judul *"Selisih Arus Kas"*, tingkat urgensi *critical*, pesan: *"Total pengeluaran bulan ini tercatat melampaui pemasukan dengan selisih Rp {kelebihan}"*, dan tombol aksi *"Analisis Kategori"* (`/analytics`). Jenis: Tingkat 2: Nudge (menampilkan fakta selisih pengeluaran terhadap pemasukan).
- *Kondisi C (Rasio Pengeluaran Tinggi >= 80%):* Judul *"Selisih Arus Kas"*, tingkat urgensi *warning*, pesan: *"Pengeluaran bulan ini telah mencapai {persentase}% dari total pemasukan tercatat"*, dan tombol aksi *"Analisis Kategori"* (`/analytics`). Jenis: Tingkat 2: Nudge (mengingatkan bahwa pengeluaran sudah mendekati total pemasukan).
*(Ketiga kondisi dievaluasi berurutan A → B → C; hanya satu kartu yang aktif per siklus evaluasi).*

---

## Rule SP-02 — Distribusi Waktu (Weekend vs Weekday)

**Entitas yang dipantau:** Transaksi Pengeluaran (minggu berjalan)

**Kondisi pemicu (pseudocode):**

```
Program Evaluasi Distribusi Waktu (SP-02)
Deklarasi
    totalMinggu    : bilangan real  { total pengeluaran minggu kalender ini }
    totalAkhirPekan: bilangan real  { pengeluaran khusus Sabtu dan Minggu }
    persentase     : bilangan bulat

Algoritma
    totalMinggu     ← 0
    totalAkhirPekan ← 0

    FOR EACH transaksi dalam minggu kalender saat ini DO
        IF tipe != 'EXPENSE' THEN SKIP
        totalMinggu ← totalMinggu + nominal

        IF hari = Sabtu OR hari = Minggu THEN
            totalAkhirPekan ← totalAkhirPekan + nominal
        END IF
    END FOR

    IF totalMinggu > 0 AND (totalAkhirPekan / totalMinggu) > 0,7 THEN
        persentase ← ROUND(totalAkhirPekan / totalMinggu × 100)
        OUTPUT Insight("Distribusi Waktu", urgensi=warning)
    END IF
```

**Keluaran:** Judul *"Distribusi Waktu"*, tingkat urgensi *warning*, pesan: *"Sekitar {persentase}% pengeluaran minggu ini tercatat pada akhir pekan (Sabtu & Minggu)"*, dan tombol aksi *"Lihat Transaksi"* (`/transactions`).
**Jenis keluaran:** Tingkat 2: Nudge. Menampilkan persentase belanja di akhir pekan yang dominan (>70% dari total mingguan), membantu pengguna mengenali kebiasaan belanja di hari libur.

---

## Rule SP-03 — Pola Pengeluaran Malam Hari (Night Owl)

**Entitas yang dipantau:** Transaksi Pengeluaran × Kategori Diskresioner (bulan berjalan)

**Kondisi pemicu (pseudocode):**

```
Program Evaluasi Pola Pengeluaran Malam Hari (SP-03)
Deklarasi
    kategoriDiskresioner : kumpulan kategori { mengandung: hiburan, jajan, pribadi,
                                               gaya hidup, hobi }
    totalBelanjaMalam    : bilangan real  { akumulasi pengeluaran diskresioner larut malam }
    jamInput             : bilangan bulat { jam dari waktu input transaksi (createdAt) }

Algoritma
    totalBelanjaMalam ← 0

    FOR EACH transaksi bulan ini DO
        IF tipe != 'EXPENSE' THEN SKIP
        IF kategori transaksi BUKAN diskresioner THEN SKIP

        { PENTING: jam diambil dari waktu INPUT (createdAt), bukan tanggal transaksi }
        jamInput ← jam dari transaksi.createdAt

        IF jamInput >= 22 OR jamInput <= 4 THEN
            totalBelanjaMalam ← totalBelanjaMalam + nominal
        END IF
    END FOR

    IF totalBelanjaMalam >= 150.000 THEN
        OUTPUT Insight("Pola Pengeluaran Malam Hari", urgensi=warning)
    END IF
```

**Keluaran:** Judul *"Pola Pengeluaran Malam Hari"*, tingkat urgensi *warning*, pesan: *"Tercatat pengeluaran sebesar Rp {totalBelanjaMalam} pada rentang waktu malam hingga dini hari (22.00–04.00) bulan ini"*, dan tombol aksi *"Lihat Pola"* (`/analytics`).
**Jenis keluaran:** Tingkat 2: Nudge. Menginformasikan akumulasi belanja pada malam hingga dini hari (22.00–04.00) untuk kategori hiburan atau gaya hidup, membantu pengguna menyadari kecenderungan belanja spontan.

---

## Rule SP-05 — Frekuensi Pengeluaran Rutin (Latte Factor)

**Entitas yang dipantau:** Transaksi Pengeluaran (frekuensi berdasarkan deskripsi/nama)

**Kondisi pemicu (pseudocode):**

```
Program Evaluasi Frekuensi Pengeluaran Rutin (SP-05)
Deklarasi
    hitunganPerNama   : kamus { nama transaksi → { jumlahKali, totalNominal } }
    namaTertinggi     : teks         { nama dengan frekuensi kemunculan terbanyak }
    rataRataPerItem   : bilangan real

Algoritma
    hitunganPerNama ← { }

    FOR EACH transaksi bulan ini DO
        IF tipe != 'EXPENSE' OR deskripsi KOSONG THEN SKIP
        nama ← deskripsi transaksi (huruf kecil)
        hitunganPerNama[nama].jumlahKali   ← hitunganPerNama[nama].jumlahKali + 1
        hitunganPerNama[nama].totalNominal ← hitunganPerNama[nama].totalNominal + nominal
    END FOR

    namaTertinggi   ← entri dengan jumlahKali MAKSIMUM dari hitunganPerNama
    rataRataPerItem ← namaTertinggi.totalNominal / namaTertinggi.jumlahKali

    IF namaTertinggi.jumlahKali > 10 AND rataRataPerItem < 30.000 THEN
        OUTPUT Insight("Frekuensi Pengeluaran Rutin", urgensi=info)
    END IF
```

**Keluaran:** Judul *"Frekuensi Pengeluaran Rutin"*, tingkat urgensi *info*, pesan: *"Terdapat {namaTertinggi.jumlahKali} transaksi tercatat untuk '{namaTertinggi.nama}' bulan ini dengan akumulasi Rp {namaTertinggi.totalNominal}"*, dan tombol aksi *"Lihat Rincian"* (`/transactions`).
**Jenis keluaran:** Tingkat 2: Nudge. Merangkum total akumulasi dari transaksi bernominal kecil yang dilakukan berulang kali (lebih dari 10 kali), memperlihatkan dampak kumulatifnya terhadap pengeluaran bulanan.

---

## Rule SP-06 — Evaluasi Langganan Rutin (Subscription Analysis)

**Entitas yang dipantau:** Transaksi Pengeluaran bulan ini × Transaksi bulan lalu (deteksi pola berulang)

**Kondisi pemicu (pseudocode):**

```
Program Evaluasi Langganan Rutin (SP-06)
Deklarasi
    jumlahLangganan       : bilangan bulat  { total transaksi terdeteksi sebagai langganan }
    totalNominalCocok     : bilangan real
    sudahDicocokkan       : himpunan ID    { ID transaksi bulan lalu yang sudah dipasangkan }
    persentaseDariPemasukan: bilangan bulat

Algoritma
    jumlahLangganan   ← 0
    totalNominalCocok ← 0
    sudahDicocokkan   ← { }

    FOR EACH transaksi bulan ini DO
        IF tipe != 'EXPENSE' THEN SKIP

        pasangan ← CARI transaksi bulan lalu WHERE
            nominal = transaksi.nominal
            AND kategoriId = transaksi.kategoriId
            AND |selisih tanggal| <= 3 hari
            AND id TIDAK ADA dalam sudahDicocokkan

        IF pasangan DITEMUKAN THEN
            sudahDicocokkan ← sudahDicocokkan + pasangan.id
            jumlahLangganan   ← jumlahLangganan + 1
            totalNominalCocok ← totalNominalCocok + transaksi.nominal
        END IF
    END FOR

    IF jumlahLangganan >= 3 AND totalPemasukan > 0 THEN
        persentaseDariPemasukan ← ROUND(totalNominalCocok / totalPemasukan × 100)
        OUTPUT Insight("Evaluasi Langganan Rutin", urgensi=warning)
    END IF
```

**Keluaran:** Judul *"Evaluasi Langganan Rutin"*, tingkat urgensi *warning*, pesan: *"Terdapat {jumlahLangganan} tagihan rutin berulang yang mengambil porsi {persentaseDariPemasukan}% dari total pemasukan tercatat"*, dan tombol aksi *"Lihat Transaksi"* (`/transactions`).
**Jenis keluaran:** Tingkat 2: Nudge. Menghitung persentase tagihan langganan rutin terhadap total pemasukan, memudahkan pengguna mengevaluasi apakah layanan berulang tersebut masih diperlukan.

---

## Rule SP-07 — Dinamika Transaksi Rutin (Recurring Merchant Growth)

**Entitas yang dipantau:** Transaksi Pengeluaran berdasarkan nama/deskripsi (bulan ini vs bulan lalu)

**Kondisi pemicu (pseudocode):**

```
Program Evaluasi Dinamika Transaksi Rutin (SP-07)
Deklarasi
    hitunganBulanIni  : kamus { nama merchant → jumlah kemunculan }
    hitunganBulanLalu : kamus { nama merchant → jumlah kemunculan }
    merchantTerbaik   : data merchant  { merchant dengan kenaikan frekuensi tertinggi }
    rasioTertinggi    : bilangan real

Algoritma
    { Hitung frekuensi tiap merchant per bulan }
    FOR EACH transaksi bulan ini DO
        IF tipe = 'EXPENSE' AND deskripsi ADA THEN
            hitunganBulanIni[deskripsi] ← hitunganBulanIni[deskripsi] + 1
        END IF
    END FOR

    FOR EACH transaksi bulan lalu DO
        IF tipe = 'EXPENSE' AND deskripsi ADA THEN
            hitunganBulanLalu[deskripsi] ← hitunganBulanLalu[deskripsi] + 1
        END IF
    END FOR

    merchantTerbaik ← null
    rasioTertinggi  ← 0

    FOR EACH (nama, jumlahSekarang) IN hitunganBulanIni DO
        IF jumlahSekarang < 3 THEN SKIP            { minimum 3 kali bulan ini }
        jumlahLalu ← hitunganBulanLalu[nama] OR 0
        IF jumlahLalu < 2 THEN SKIP                { harus ada riwayat bulan lalu }

        rasio ← jumlahSekarang / jumlahLalu
        IF rasio >= 2,0 AND rasio > rasioTertinggi THEN
            rasioTertinggi  ← rasio
            merchantTerbaik ← { nama, jumlahSekarang, jumlahLalu }
        END IF
    END FOR

    IF merchantTerbaik ADA THEN
        OUTPUT Insight("Dinamika Transaksi Rutin", urgensi=info)
    END IF
```

**Keluaran:** Judul *"Dinamika Transaksi Rutin"*, tingkat urgensi *info*, pesan: *"Frekuensi transaksi pada '{merchantTerbaik.nama}' tercatat {merchantTerbaik.jumlahSekarang} kali bulan ini (dibanding {merchantTerbaik.jumlahLalu} kali bulan lalu) dengan total Rp {totalNominal}"*, dan tombol aksi *"Lihat Transaksi"* (`/transactions`).
**Jenis keluaran:** Tingkat 2: Nudge. Menginformasikan kenaikan frekuensi transaksi pada nama tempat belanja yang sama hingga dua kali lipat dibanding bulan lalu.

---

## Rule CF-01 / AN-08 — Momentum Arus Kas Masuk (Income Momentum Alert)

**Entitas yang dipantau:** Transaksi Pemasukan (bulan berjalan vs historis)

**Kondisi pemicu (pseudocode):**

```
Program Evaluasi Momentum Arus Kas Masuk (CF-01 / AN-08)
Deklarasi
    hariIni           : bilangan bulat
    pemasukanBulanIni : bilangan real
    rataRataHistoris  : bilangan real

Algoritma
    hariIni ← tanggal hari ini dalam bulan
    IF hariIni < 15 THEN RETURN  { terlalu dini untuk dibandingkan }

    pemasukanBulanIni ← SUM transaksi.nominal WHERE tipe = 'INCOME' AND periode = bulan ini
    rataRataHistoris  ← rata-rata pemasukan bulan-bulan sebelumnya

    IF rataRataHistoris <= 0 THEN RETURN  { tidak ada basis perbandingan }

    IF pemasukanBulanIni < rataRataHistoris THEN
        OUTPUT Insight("Momentum Arus Kas Masuk", urgensi=warning)
    END IF
```

**Keluaran:** Judul *"Momentum Arus Kas Masuk"*, tingkat urgensi *warning*, pesan: *"Hingga pertengahan bulan, catatan pemasukan (Rp {pemasukanBulanIni}) berada di bawah total pemasukan bulan lalu (Rp {rataRataHistoris})"*, dan tombol aksi *"Catat Pemasukan"* (`/transactions`).
**Jenis keluaran:** Tingkat 1: Insight Pola. Menampilkan perbandingan akumulasi pemasukan hingga pertengahan bulan terhadap periode lalu, mendorong kelengkapan pencatatan pemasukan.
