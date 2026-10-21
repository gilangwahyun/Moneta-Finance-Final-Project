# Kelompok 1: Anggaran (Budgeting)

Kelompok ini mencakup aturan-aturan yang berkaitan dengan pemantauan anggaran keuangan pengguna, meliputi pengawasan batas pemakaian, proyeksi laju pengeluaran, hingga saran alokasi dana antar-kategori. Seluruh luaran disajikan dengan prinsip antarmuka tenang (*Calm UI*), berfokus pada penyajian fakta yang objektif tanpa menggunakan kalimat yang mendikte atau menghakimi pengguna.

Sesuai kerangka evaluasi tugas akhir, luaran diklasifikasikan ke dalam **Taksonomi 3 Tingkat**:
1. **Tingkat 1: Insight Pola** — Informasi faktual atau deskriptif mengenai pola dan posisi keuangan.
2. **Tingkat 2: Nudge** — Pengingat atau dorongan halus berbasis data untuk membantu pengguna mengelola keuangan secara mandiri.
3. **Tingkat 3: Saran Eksekutif** — Rekomendasi tindakan spesifik yang dapat langsung dieksekusi oleh pengguna.

---

## Rule BG-00 — Anggaran Terpakai Setengah

**Entitas yang dipantau:** Anggaran × Transaksi × Kategori (periode bulan berjalan)

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

**Keluaran:** Judul *"Penggunaan Anggaran Berjalan"* (push: *"Progres Alokasi"*), tingkat urgensi *info*, pesan: *"Alokasi {catName} tercatat sudah terpakai 50%. Tersisa Rp {sisa} untuk periode berjalan"*, serta tombol aksi *"Lihat Anggaran"* (`/budgets`).
**Jenis keluaran:** Tingkat 2: Nudge. Mengingatkan pengguna secara netral saat anggaran telah terpakai separuh (50%) agar pengguna dapat mengantisipasi sisa dana untuk hari-hari berikutnya.

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
            judul ← "Progres Alokasi Berjalan"
        ELSE
            judul ← "Progres Alokasi Berjalan"
        END IF

        OUTPUT Insight(judul, urgensi=warning)
    END IF
```

**Keluaran:** Judul *"Progres Alokasi Berjalan"* (push: *"Progres Alokasi"*), tingkat urgensi *warning*, pesan: *"Alokasi {catName} telah terpakai 80% (tersisa Rp {sisa}). Tersedia opsi peninjauan alokasi"*, serta tombol aksi *"Lihat Anggaran"* (`/budgets`).
**Penyajian Point-of-Decision Cue:** Saat pengguna mencatat transaksi, modal input menampilkan kartu ringkasan berisi sisa alokasi bulanan dan estimasi rata-rata dana harian yang aman digunakan.
**Jenis keluaran:** Tingkat 2: Nudge. Menyajikan fakta pemakaian anggaran yang mendekati batas (80%) tepat pada saat pengguna hendak bertransaksi, membantu pengguna mempertimbangkan pengeluaran berikutnya secara bijak.

---

## Rule BG-00c — Batas Anggaran Tercapai / Terlampaui

**Entitas yang dipantau:** Anggaran × Transaksi × Kategori × (opsional) Anggaran Lain

**Kondisi pemicu (pseudocode):**

```
Program Evaluasi Batas Anggaran Tercapai / Terlampaui (BG-00c)
Deklarasi
    anggaran             : data anggaran yang dievaluasi
    totalTerpakai        : bilangan real
    rasio                : bilangan real
    kelebihanPengeluaran : bilangan real  { selisih pengeluaran melebihi batas }
    kandidat             : data anggaran  { sumber subsidi terbaik yang ditemukan }

Algoritma
    totalTerpakai ← SUM transaksi.nominal
                    WHERE tipe = 'EXPENSE'
                    AND kategoriId = anggaran.kategoriId
                    AND periode = bulan berjalan

    rasio                ← totalTerpakai / anggaran.batasNominal
    kelebihanPengeluaran ← totalTerpakai - anggaran.batasNominal

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

**Keluaran:**
- *Dengan Rekomendasi Penyeimbangan:* Judul *"Kilas Penyesuaian"*, tingkat urgensi *info*, pesan: *"Alokasi {catName} telah terpakai penuh. Tersedia opsi mengalihkan Rp {nominal} dari kategori {sourceCat}"*, dan tombol aksi *"Tinjau Opsi Penyeimbangan"* (`/budgets?action=reallocate...`).
- *Tanpa Donor:* Judul *"Alokasi Penuh Tercapai"*, tingkat urgensi *info*, pesan: *"Alokasi {catName} bulan ini sudah terpakai penuh ({spent} dari {limit})"*, dan tombol aksi *"Lihat Anggaran"* (`/budgets`).
**Jenis keluaran:** Tingkat 3: Saran Eksekutif. Memberikan opsi pemindahan sisa anggaran dari kategori lain yang masih longgar melalui tombol aksi yang membuka formulir siap pakai, tanpa memaksa atau mengubah alokasi secara sepihak.

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

    IF hariIni < 7 THEN RETURN    { data awal bulan masih minim }
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

**Keluaran:** Judul *"Proyeksi Daya Tahan Alokasi"*, tingkat urgensi *warning*, pesan: *"Dengan laju harian saat ini, alokasi '{catName}' dapat mencukupi hingga {daysUntilExhausted} hari ke depan (sisa periode: {daysRemaining} hari)"*, dan tombol aksi *"Lihat Anggaran"* (`/budgets`).
**Jenis keluaran:** Tingkat 2: Nudge. Memproyeksikan daya tahan anggaran berdasarkan kecepatan belanja harian saat ini, membantu pengguna mengetahui apakah anggaran berpotensi habis sebelum akhir bulan.

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

**Keluaran:** Judul *"Pengeluaran Tanpa Anggaran"*, tingkat urgensi *info*, pesan: *"Tercatat pengeluaran sebesar Rp {totalNominal} pada '{catName}' bulan ini tanpa batas alokasi anggaran yang aktif"*, dan tombol aksi *"Buat Anggaran"* (`/budgets?action=create&categoryId=...`).
**Jenis keluaran:** Tingkat 3: Saran Eksekutif. Mengidentifikasi kategori dengan akumulasi belanja besar yang belum memiliki anggaran, serta menyediakan tombol cepat untuk langsung membuat anggaran baru.

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

**Keluaran:** Judul *"Saran Alokasi Anggaran"*, tingkat urgensi *info*, pesan: *"Rata-rata pengeluaran bulanan pada '{catName}' tercatat Rp {rataRata}/bulan berdasarkan riwayat transaksi"*, dan tombol aksi *"Buat Anggaran"* (`/budgets?action=create&categoryId=...&amount=...`).
**Jenis keluaran:** Tingkat 3: Saran Eksekutif. Merekomendasikan nominal anggaran baru berdasarkan rata-rata riwayat pengeluaran 3 bulan terakhir, memudahkan pengguna menetapkan batas alokasi yang realistis.

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

**Keluaran:** Judul *"Realisasi vs Anggaran"*, tingkat urgensi *warning*, pesan: *"Realisasi pengeluaran '{catName}' tercatat melebihi alokasi >20% dalam 3 bulan berturut-turut (rata-rata Rp {rataRataRealisasi} dari batas Rp {batasNominal})"*, dan tombol aksi *"Tinjau Anggaran"* (`/budgets?action=edit&budgetId=...&amount=...`).
**Jenis keluaran:** Tingkat 3: Saran Eksekutif. Menyarankan peninjauan dan penyesuaian batas anggaran bagi kategori yang realisasi belanjanya konsisten melampaui rencana selama 3 bulan berturut-turut.

---

## Hubungan dengan Rule Pemulihan Alokasi Anggaran (BG-02)

Pemantauan anggaran juga mencakup aturan apresiasi atas perbaikan pola belanja:
- **Rule BG-02 — Pemulihan Alokasi Anggaran (Budget Recovery)**: Memberikan notifikasi positif saat kategori yang pada bulan sebelumnya melampaui batas, di bulan ini berhasil dijaga dalam batas aman. Dokumentasi lengkap aturan ini dibahas pada [Kelompok 6: Reinforcement Positif & Fallback](file:///c:/moneta-finance-final-project/docs/rules/06-reinforcement-positif-dan-fallback.md#rule-bg-02--pemulihan-alokasi-anggaran-budget-recovery) sebagai **Tingkat 2: Nudge**.
