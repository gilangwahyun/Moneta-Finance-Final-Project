# Kelompok 1: Anggaran (Budgeting)

Kelompok ini mencakup semua aturan yang berkaitan dengan pengawasan anggaran finansial pengguna — mulai dari cermin data penggunaan batas, proyeksi laju pengeluaran, hingga rekomendasi alokasi dana secara adaptif. Seluruh luaran pada kelompok ini mengikuti paradigma **Choice Architecture (Richard Thaler)** dan disajikan dalam **Calm UI** tanpa intervensi teks yang mendikte.

Sesuai kerangka evaluasi tugas akhir, luaran diklasifikasikan ke dalam **Taksonomi 3 Tingkat**:
1. **Tingkat 1: Insight Pola** — Cermin data faktual/deskriptif murni.
2. **Tingkat 2: Nudge (Choice Architecture)** — Dorongan halus berupa cermin data preventif/apresiatif dan penataan pilihan (*spatial ordering* & *ambient priming*).
3. **Tingkat 3: Saran Eksekutif** — Rekomendasi resolusi spesifik dan terukur yang langsung dapat dieksekusi pengguna (*actionable recommendation*).

---

## Rule BG-00 — Anggaran Terpakai Setengah

**Entitas yang dipantau:** Anggaran × Transaksi × Kategori

**Kondisi pemicu (pseudocode):**

```
Program Evaluasi Anggaran Terpakai Setengah (BG-00)
Deklarasi
    anggaran      : data anggaran aktif bulan berjalan
    totalTerpakai : bilangan real  { total pengeluaran kategori bulan ini }
    rasio         : bilangan real  { proporsi terpakai terhadap batas nominal }

Algoritma
    totalTerpakai ← SUM transaksi.nominal
                    WHERE tipe = 'EXPENSE'
                    AND kategoriId = anggaran.kategoriId
                    AND periode = bulan berjalan

    rasio ← totalTerpakai / anggaran.batasNominal

    IF rasio >= 0,5 AND rasio < 0,8 THEN
        OUTPUT Insight("Penggunaan Anggaran Berjalan", urgensi=info)
    END IF
```

**Keluaran Aktual:**
- **Judul:** "Penggunaan Anggaran Berjalan"
- **Isi Pesan (Cermin Data Faktual):** `"Anggaran {catName} tercatat sudah terpakai 50%. Pantau ritme pengeluaran agar sisa anggaran mencukupi hingga akhir periode."`
- **Tingkat Urgensi:** _info_ (Ikon Info netral, palet tenang)
- **Tombol Aksi:** `"Lihat Anggaran"` → `/budgets`

**Jenis Keluaran:** **Tingkat 2: Nudge (Nudge Preventif — Refleksi Tengah Periode)**. Rule ini memberikan umpan balik netral yang berfungsi sebagai pengingat ritme alokasi tanpa membatasi kebebasan belanja pengguna.

---

## Rule BG-00b — Progres Alokasi Berjalan

**Entitas yang dipantau:** Anggaran × Transaksi × Kategori

**Kondisi pemicu (pseudocode):**

```
Program Evaluasi Progres Alokasi Berjalan (BG-00b)
Deklarasi
    anggaran           : data anggaran aktif bulan berjalan
    totalTerpakai      : bilangan real
    rasio              : bilangan real
    pengeluaranHariIni : bilangan real  { total pengeluaran hari ini }
    rataRata7Hari      : bilangan real  { rata-rata harian dalam 7 hari terakhir }
    judul              : teks           { judul insight yang akan dihasilkan }

Algoritma
    totalTerpakai ← SUM transaksi.nominal
                    WHERE tipe = 'EXPENSE'
                    AND kategoriId = anggaran.kategoriId
                    AND periode = bulan berjalan

    rasio ← totalTerpakai / anggaran.batasNominal

    IF rasio >= 0,8 AND rasio < 1,0 THEN
        pengeluaranHariIni ← SUM transaksi.nominal
                             WHERE tipe = 'EXPENSE' AND tanggal = hari ini

        rataRata7Hari ← SUM transaksi.nominal
                         WHERE tipe = 'EXPENSE' AND tanggal >= (hari ini - 7 hari) / 7

        IF pengeluaranHariIni > rataRata7Hari THEN
            judul ← "Pengeluaran {nama kategori} Lebih Cepat"
        ELSE
            judul ← "Progres Alokasi Berjalan"
        END IF

        OUTPUT Insight(judul, urgensi=warning)
    END IF
```

**Keluaran Aktual:**
- **Judul:** "Progres Alokasi Berjalan" (Notifikasi Push: "Progres Alokasi")
- **Isi Pesan (Cermin Data Faktual):** `"Alokasi {catName} telah terpakai 80% (tersisa Rp {sisa}). Tersedia opsi peninjauan alokasi."`
- **Tingkat Urgensi:** _warning_ (Visual tenang dengan palet slate/indigo netral, tanpa badge alarm merah)
- **Tombol Aksi:** `"Lihat Anggaran"` → `/budgets`

**Penyajian Choice Architecture (Point-of-Decision Cue di Antarmuka Modal Transaksi):**
Selain kartu insight di analitik/notifikasi, informasi alokasi disajikan langsung tepat di saat keputusan belanja dibuat (*point-of-decision cue*):
1. **Urutan Tombol Stabil (*Spatial Stability*):** Urutan tombol kategori dipertahankan tetap sesuai preferensi pengguna (`availableCategories`) tanpa pengacakan posisi, menjaga memori spasial pengguna.
2. **Ketiadaan Pewarnaan Menghakimi (*Non-judgmental Design*):** Input nominal tidak menggunakan aksen warna peringatan (*no amber tint*).
3. **Point-of-Decision Budget Cue:** Menampilkan sisa alokasi bulanan dan estimasi sisa harian adaptif yang sinkron dengan rumus ritme anggaran (`calculateBudgetRhythm`), disertai bilah mikro tipis netral indigo/slate tanpa warna peringatan.

**Jenis Keluaran:** **Tingkat 2: Nudge (Nudge Preventif & Choice Architecture)**.

---

## Rule BG-00c — Batas Anggaran Tercapai / Terlampaui

**Entitas yang dipantau:** Anggaran × Transaksi × Kategori × (opsional) Anggaran Lain

**Kondisi pemicu (pseudocode):**

```
Program Evaluasi Batas Anggaran Tercapai / Terlampaui (BG-00c)
Deklarasi
    anggaran      : data anggaran yang dievaluasi
    totalTerpakai : bilangan real
    rasio         : bilangan real
    defisit       : bilangan real  { selisih pengeluaran melebihi batas }
    kandidat      : data anggaran  { sumber subsidi terbaik yang ditemukan }

Algoritma
    totalTerpakai ← SUM transaksi.nominal
                    WHERE tipe = 'EXPENSE'
                    AND kategoriId = anggaran.kategoriId
                    AND periode = bulan berjalan

    rasio   ← totalTerpakai / anggaran.batasNominal
    defisit ← totalTerpakai - anggaran.batasNominal

    IF rasio = 1,0 THEN
        OUTPUT Insight("Alokasi Penuh Tercapai", urgensi=info)

    ELSE IF rasio > 1,0 THEN
        kandidat ← CariSumberSubsidi(anggaran, semuaAnggaran)

        IF kandidat DITEMUKAN THEN
            OUTPUT Insight("Kilas Penyesuaian", urgensi=info,
                           aksi=REALLOCATE_BUDGET)
        ELSE
            OUTPUT Insight("Alokasi Penuh Tercapai", urgensi=info)
        END IF
    END IF


{ Sub-algoritma: Mencari anggaran lain sebagai sumber subsidi silang }
Program Cari Sumber Subsidi
Deklarasi
    kandidatTerbaik : data anggaran  { hasil akhir yang dikembalikan }
    sisaKandidat    : bilangan real  { sisa dana anggaran kandidat }
    maxTransfer     : bilangan real  { batas maksimum yang aman dipindahkan }

Algoritma
    kandidatTerbaik ← null

    FOR EACH anggaran kandidat DO
        sisaKandidat ← kandidat.batasNominal - kandidat.totalTerpakai

        IF sisaKandidat <= 0 THEN SKIP
        IF (sisaKandidat / kandidat.batasNominal) < 0,7 THEN SKIP

        maxTransfer ← sisaKandidat - (kandidat.batasNominal × 0,5)
        IF maxTransfer <= 0 THEN SKIP

        IF kandidat ini lebih baik dari kandidatTerbaik
        { berdasarkan rasio sisa, max transfer, dan nominal sisa } THEN
            kandidatTerbaik ← kandidat
        END IF
    END FOR

    RETURN kandidatTerbaik
```

**Keluaran Aktual:**
- **Judul:** "Alokasi Penuh Tercapai" (atau "Kilas Penyesuaian" jika rekomendasi subsidi silang ditemukan)
- **Isi Pesan (Cermin Data Faktual):**
  - *Tanpa Donor:* `"Alokasi {catName} bulan ini sudah terpakai penuh ({spent} dari {limit})."`
  - *Dengan Rekomendasi Penyeimbangan:* `"Tersedia sisa {nominal} di kategori {sourceCat} untuk mendukung kategori {catName}."`
- **Tingkat Urgensi:** _critical_ / _info_ (Disajikan tenang dengan aksen slate/indigo reflektif, tanpa warna merah alarm)
- **Tombol Aksi:** `"Tinjau Opsi Penyeimbangan"` atau `"Lihat Anggaran"` → `/budgets?action=reallocate&sourceBudgetId=...&targetBudgetId=...&amount=...` (membuka modal realokasi dengan data pre-filled)

**Jenis Keluaran:** **Tingkat 3: Saran Eksekutif (Actionable Recommendation)**. Memberikan jalur resolusi terukur dan spesifik secara langsung (pre-fill form transfer anggaran) dengan tetap menjunjung prinsip *freedom of choice* (*libertarian paternalism*).

---

## Rule BG-01 — Proyeksi Daya Tahan Alokasi

**Entitas yang dipantau:** Anggaran × Transaksi (bulan berjalan)

**Kondisi pemicu (pseudocode):**

```
Program Evaluasi Proyeksi Daya Tahan Alokasi (BG-01)
Deklarasi
    anggaran        : data anggaran aktif bulan berjalan
    hariIni         : bilangan bulat  { tanggal hari ini dalam bulan }
    totalHariBulan  : bilangan bulat  { jumlah hari dalam bulan berjalan }
    sisaHari        : bilangan bulat
    totalTerpakai   : bilangan real
    rasio           : bilangan real
    lajuHarian      : bilangan real   { rata-rata pengeluaran per hari }
    hariSampaiHabis : bilangan real   { estimasi hari hingga alokasi habis }

Algoritma
    hariIni        ← tanggal hari ini dalam bulan
    totalHariBulan ← jumlah hari dalam bulan berjalan
    sisaHari       ← totalHariBulan - hariIni

    IF hariIni < 7 THEN RETURN    { data belum representatif }
    IF sisaHari <= 0 THEN RETURN  { bulan hampir selesai }

    totalTerpakai ← SUM transaksi.nominal
                    WHERE tipe = 'EXPENSE'
                    AND kategoriId = anggaran.kategoriId
                    AND periode = bulan berjalan

    rasio ← totalTerpakai / anggaran.batasNominal
    IF rasio >= 0,8 THEN RETURN  { sudah ditangani BG-00b }

    lajuHarian ← totalTerpakai / hariIni
    IF lajuHarian <= 0 THEN RETURN

    hariSampaiHabis ← (anggaran.batasNominal - totalTerpakai) / lajuHarian

    IF hariSampaiHabis < sisaHari THEN
        OUTPUT Insight("Proyeksi Daya Tahan Alokasi", urgensi=warning)
    END IF
```

**Keluaran Aktual:**
- **Judul:** "Proyeksi Daya Tahan Alokasi"
- **Isi Pesan (Cermin Data Faktual):** `"Berdasarkan ritme pengeluaran, alokasi '{catName}' diproyeksikan bertahan {hariSampaiHabis} hari ke depan (tersisa {sisaHari} hari dalam periode ini)."`
- **Tingkat Urgensi:** _warning_
- **Tombol Aksi:** `"Lihat Anggaran"` → `/budgets`

**Jenis Keluaran:** **Tingkat 2: Nudge (Nudge Preventif — Proyeksi Temporal)**. Menghubungkan kecepatan belanja hari ini dengan hari ke depan agar pengguna terdorong menyesuaikan ritme secara mandiri.

---

## Rule BG-03 — Pengeluaran Tanpa Anggaran

**Entitas yang dipantau:** Transaksi × Kategori × Anggaran (ketiadaan record anggaran)

**Kondisi pemicu (pseudocode):**

```
Program Evaluasi Pengeluaran Tanpa Anggaran (BG-03)
Deklarasi
    totalPerKategori : kamus { kategoriId → total nominal pengeluaran bulan ini }
    kategoriId       : identifikasi kategori
    totalNominal     : bilangan real

Algoritma
    totalPerKategori ← { }

    FOR EACH transaksi bulan ini DO
        IF tipe = 'EXPENSE' AND kategoriId ADA THEN
            totalPerKategori[kategoriId] ← totalPerKategori[kategoriId] + nominal
        END IF
    END FOR

    FOR EACH (kategoriId, totalNominal) IN totalPerKategori DO
        IF totalNominal > 200.000
        AND TIDAK ADA anggaran dengan kategoriId ini THEN
            OUTPUT Insight("Pengeluaran Tanpa Anggaran", urgensi=info)
            RETURN  { ambil kategori pertama yang ditemukan }
        END IF
    END FOR
```

**Keluaran Aktual:**
- **Judul:** "Pengeluaran Tanpa Anggaran"
- **Isi Pesan:** `"Tercatat pengeluaran Rp {totalNominal} pada kategori '{catName}' tanpa alokasi anggaran aktif. Membuat anggaran dapat membantu membatasi pengeluaran ini secara terencana."`
- **Tingkat Urgensi:** _info_
- **Tombol Aksi:** `"Buat Anggaran"` → `/budgets` (otomatis membuka form pembuatan anggaran dengan kategori terpilih)

**Jenis Keluaran:** **Tingkat 3: Saran Eksekutif (Actionable Recommendation)**. Mengidentifikasi celah perencanaan dan menyediakan jalan pintas langsung untuk menutup celah tersebut.

---

## Rule BG-04 — Saran Alokasi Anggaran

**Entitas yang dipantau:** Transaksi × Kategori (riwayat rata-rata 3 bulan)

**Kondisi pemicu (pseudocode):**

```
Program Evaluasi Saran Alokasi Anggaran (BG-04)
Deklarasi
    kategori  : data kategori pengeluaran
    nominalM1 : bilangan real  { total pengeluaran 1 bulan lalu }
    nominalM2 : bilangan real  { total pengeluaran 2 bulan lalu }
    nominalM3 : bilangan real  { total pengeluaran 3 bulan lalu }
    rataRata  : bilangan real

Algoritma
    FOR EACH kategori DO
        IF ADA anggaran untuk kategori ini bulan ini THEN SKIP

        nominalM1 ← SUM transaksi.nominal
                    WHERE kategoriId = kategori.id AND tipe = 'EXPENSE' AND periode = M-1
        nominalM2 ← SUM ... WHERE periode = M-2
        nominalM3 ← SUM ... WHERE periode = M-3

        IF nominalM1 > 0 AND nominalM2 > 0 AND nominalM3 > 0 THEN
            rataRata ← (nominalM1 + nominalM2 + nominalM3) / 3

            IF rataRata > 50.000 THEN
                OUTPUT Insight("Saran Alokasi Anggaran", urgensi=info)
                RETURN  { ambil kategori pertama yang memenuhi syarat }
            END IF
        END IF
    END FOR
```

**Keluaran Aktual:**
- **Judul:** "Saran Alokasi Anggaran"
- **Isi Pesan:** `"Rata-rata pengeluaran bulanan pada '{catName}' tercatat Rp {rataRata}/bulan berdasarkan riwayat transaksi."`
- **Tingkat Urgensi:** _info_
- **Tombol Aksi:** `"Buat Anggaran"` → `/budgets`

**Jenis Keluaran:** **Tingkat 3: Saran Eksekutif (Actionable Recommendation)**. Memberikan nilai acuan realistis berbasis histori pengeluaran pengguna sendiri (*data-driven personalization*).

---

## Rule BG-05 — Realisasi vs Anggaran

**Entitas yang dipantau:** Anggaran × Transaksi (riwayat 3 bulan berturut-turut)

**Kondisi pemicu (pseudocode):**

```
Program Evaluasi Realisasi vs Anggaran (BG-05)
Deklarasi
    anggaran          : data anggaran yang dievaluasi
    pengeluaranM1     : bilangan real  { realisasi pengeluaran 1 bulan lalu }
    pengeluaranM2     : bilangan real  { realisasi pengeluaran 2 bulan lalu }
    pengeluaranM3     : bilangan real  { realisasi pengeluaran 3 bulan lalu }
    rataRataRealisasi : bilangan real

Algoritma
    FOR EACH anggaran DO
        IF anggaran.batasNominal = 0 THEN SKIP

        pengeluaranM1 ← SUM transaksi.nominal
                        WHERE kategoriId = anggaran.kategoriId AND tipe = 'EXPENSE' AND periode = M-1
        pengeluaranM2 ← SUM ... WHERE periode = M-2
        pengeluaranM3 ← SUM ... WHERE periode = M-3

        IF pengeluaranM1 > anggaran.batasNominal × 1,2
        AND pengeluaranM2 > anggaran.batasNominal × 1,2
        AND pengeluaranM3 > anggaran.batasNominal × 1,2 THEN
            rataRataRealisasi ← (pengeluaranM1 + pengeluaranM2 + pengeluaranM3) / 3
            OUTPUT Insight("Realisasi vs Anggaran", urgensi=warning)
            RETURN
        END IF
    END FOR
```

**Keluaran Aktual:**
- **Judul:** "Realisasi vs Anggaran"
- **Isi Pesan:** `"Realisasi pengeluaran '{catName}' berada di atas batas alokasi selama 3 periode berturut-turut (rata-rata Rp {rataRataRealisasi} vs batas Rp {batasNominal}). Tersedia opsi penyesuaian target alokasi."`
- **Tingkat Urgensi:** _warning_
- **Tombol Aksi:** `"Sesuaikan Anggaran"` → `/budgets`

**Jenis Keluaran:** **Tingkat 3: Saran Eksekutif (Actionable Recommendation)**. Mengkritisi batas alokasi itu sendiri dan mengusulkan evaluasi parameter anggaran agar kembali kredibel dan efektif sebagai panduan belanja.

---

## Hubungan dengan Rule Pemulihan Alokasi Anggaran (BG-02)

Pemantauan anggaran juga mencakup aturan penguatan positif atas kedisiplinan alokasi:
- **Rule BG-02 — Pemulihan Alokasi Anggaran (Budget Recovery)**: Memberikan apresiasi objektif saat kategori yang pada bulan sebelumnya melampaui batas alokasi (*over-budget*), pada bulan berjalan berhasil kembali berada dalam koridor anggaran yang aman. Dokumentasi lengkap rule ini berada di [Kelompok 6: Reinforcement Positif & Fallback](file:///c:/moneta-finance-final-project/docs/rules/06-reinforcement-positif-dan-fallback.md#rule-bg-02--pemulihan-alokasi-anggaran-budget-recovery) karena berfungsi sebagai **Tingkat 2: Nudge (Nudge Apresiasi)**.
