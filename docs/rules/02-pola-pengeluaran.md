# Kelompok 2: Pola Pengeluaran (Spending Patterns)

Kelompok ini mencakup aturan-aturan yang mendeteksi anomali dan pola pengeluaran jangka pendek (bulan berjalan atau minggu berjalan). Dalam paradigma **Choice Architecture (Richard Thaler)**, aturan-aturan ini menyajikan cermin data (*objective data mirror*) yang membangkitkan kesadaran pengguna secara mandiri (*subconscious realization*) tanpa menggunakan bahasa bernada menghakimi atau alarmist.

Sesuai kerangka evaluasi tugas akhir, luaran diklasifikasikan ke dalam **Taksonomi 3 Tingkat**:
1. **Tingkat 1: Insight Pola** — Cermin data faktual/deskriptif murni.
2. **Tingkat 2: Nudge (Choice Architecture)** — Dorongan halus berupa cermin data preventif/apresiatif dan penataan pilihan.
3. **Tingkat 3: Saran Eksekutif** — Rekomendasi resolusi spesifik dan terukur yang langsung dapat dieksekusi pengguna (*actionable recommendation*).

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

**Keluaran Aktual:**
- **Judul:** "Dinamika Arus Kas"
- **Isi Pesan (Cermin Data Faktual):** `"{persentase}% dari alokasi pemasukan bulan ini telah dialokasikan dalam {selisihHari} hari pertama."`
- **Tingkat Urgensi:** _critical_ (Disajikan tenang dengan palet slate/indigo reflektif dan ikon Compass netral)
- **Tombol Aksi:** `"Lihat Transaksi"` → `/transactions`

**Jenis Keluaran:** **Tingkat 2: Nudge (Nudge Preventif — Payday Momentum)**. Mengidentifikasi alokasi pasca penerimaan penghasilan dan memantulkan rasio alokasi secara objektif agar pengguna mengatur ritme alokasi secara mandiri.

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
    { Kondisi A: belum ada pemasukan tapi sudah ada pengeluaran }
    IF totalPemasukan <= 0 AND totalPengeluaran > 0 THEN
        OUTPUT Insight("Selisih Arus Kas", urgensi=critical)
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

**Keluaran Aktual:**
- **Kondisi A (Pemasukan Belum Tercatat):**
  - **Judul:** "Selisih Arus Kas"
  - **Isi Pesan:** `"Belum ada catatan pemasukan bulan ini untuk melengkapi analisis arus kas."`
  - **Urgensi:** _critical_ | **Tombol Aksi:** `"Catat Pemasukan"` → `/transactions`
  - **Jenis Keluaran:** **Tingkat 3: Saran Eksekutif (Actionable Recommendation)**.
- **Kondisi B (Pengeluaran Melampaui Pemasukan):**
  - **Judul:** "Selisih Arus Kas"
  - **Isi Pesan:** `"Total pengeluaran bulan ini tercatat melampaui pemasukan dengan selisih Rp {kelebihan}."`
  - **Urgensi:** _critical_ | **Tombol Aksi:** `"Analisis Kategori"` → `/analytics`
  - **Jenis Keluaran:** **Tingkat 2: Nudge (Nudge Refleksi Arus Kas)**.
- **Kondisi C (Rasio Pengeluaran Tinggi >= 80%):**
  - **Judul:** "Selisih Arus Kas"
  - **Isi Pesan:** `"Pengeluaran bulan ini telah mencapai {persentase}% dari total pemasukan tercatat."`
  - **Urgensi:** _warning_ | **Tombol Aksi:** `"Analisis Kategori"` → `/analytics`
  - **Jenis Keluaran:** **Tingkat 2: Nudge (Nudge Preventif — Ambang Batas 80%)**.

Ketiga kondisi dievaluasi secara berurutan (A → B → C) dan hanya satu kartu yang aktif per siklus evaluasi.

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

**Keluaran Aktual:**
- **Judul:** "Distribusi Waktu"
- **Isi Pesan (Cermin Data Faktual):** `"Sekitar {persentase}% pengeluaran minggu ini tercatat pada akhir pekan (Sabtu & Minggu)."`
- **Tingkat Urgensi:** _warning_
- **Tombol Aksi:** `"Cek Transaksi"` → `/transactions`

**Jenis Keluaran:** **Tingkat 2: Nudge (Nudge Preventif Temporal)**. Memantulkan fakta sebaran belanja liburan tanpa kalimat menegur, memicu pengguna merefleksikan alokasi waktu secara mandiri.

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

**Keluaran Aktual:**
- **Judul:** "Pola Pengeluaran Malam Hari"
- **Isi Pesan (Cermin Data Faktual):** `"Tercatat pengeluaran sebesar Rp {totalBelanjaMalam} pada rentang waktu malam hingga dini hari (22.00–04.00) bulan ini."`
- **Tingkat Urgensi:** _warning_
- **Tombol Aksi:** `"Lihat Pola"` → `/analytics`

**Jenis Keluaran:** **Tingkat 2: Nudge (Nudge Preventif Konteks Waktu)**. Mengekspos pengeluaran larut malam pada pos fleksibel sebagai cermin perilaku reflektif.

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

**Keluaran Aktual:**
- **Judul:** "Frekuensi Pengeluaran Rutin"
- **Isi Pesan (Cermin Data Faktual):** `"Terdapat {namaTertinggi.jumlahKali} transaksi tercatat untuk '{namaTertinggi.nama}' bulan ini dengan akumulasi Rp {namaTertinggi.totalNominal}."`
- **Tingkat Urgensi:** _info_
- **Tombol Aksi:** `"Lihat Transaksi"` → `/transactions`

**Jenis Keluaran:** **Tingkat 2: Nudge (Nudge Preventif — Kesadaran Agregat Mikro)**. Mengagregasi nominal kecil berulang (Latte Factor) agar total kumulatifnya terlihat jelas oleh pengguna secara faktual.

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
            AND id BELUM ADA dalam sudahDicocokkan

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

**Keluaran Aktual:**
- **Judul:** "Evaluasi Langganan Rutin"
- **Isi Pesan (Cermin Data Faktual):** `"Terdapat {jumlahLangganan} tagihan rutin berulang yang mengambil porsi {persentaseDariPemasukan}% dari total pemasukan tercatat."`
- **Tingkat Urgensi:** _warning_
- **Tombol Aksi:** `"Cek Pengeluaran"` → `/transactions`

**Jenis Keluaran:** **Tingkat 2: Nudge (Nudge Preventif — Kewajiban Berkala)**. Menampilkan porsi komitmen berkala terhadap pendapatan agar pengguna dapat meninjau alokasi rutin secara mandiri.

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

**Keluaran Aktual:**
- **Judul:** "Dinamika Transaksi Rutin"
- **Isi Pesan (Cermin Data Faktual):** `"Frekuensi transaksi pada '{merchantTerbaik.nama}' tercatat {merchantTerbaik.jumlahSekarang} kali bulan ini (dibanding {merchantTerbaik.jumlahLalu} kali bulan lalu) dengan total Rp {totalNominal}."`
- **Tingkat Urgensi:** _info_
- **Tombol Aksi:** `"Lihat Transaksi"` → `/transactions`

**Jenis Keluaran:** **Tingkat 2: Nudge (Nudge Preventif — Eskalasi Frekuensi)**.

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

**Keluaran Aktual:**
- **Judul:** "Momentum Arus Kas Masuk"
- **Isi Pesan (Cermin Data Faktual):** `"Hingga pertengahan bulan, catatan pemasukan (Rp {pemasukanBulanIni}) berada di bawah rata-rata historis (Rp {rataRataHistoris})."`
- **Tingkat Urgensi:** _warning_
- **Tombol Aksi:** `"Catat Pemasukan"` → `/transactions`

**Jenis Keluaran:** **Tingkat 1: Insight Pola (Faktual / Deskriptif)**. Menyajikan perbandingan data historis arus kas masuk untuk meningkatkan kelengkapan pencatatan dan kesadaran likuiditas.
