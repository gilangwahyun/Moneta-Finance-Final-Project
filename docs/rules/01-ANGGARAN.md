# Kelompok 1: Anggaran (Budgeting)

Kelompok ini mencakup semua aturan yang berkaitan dengan pengawasan anggaran finansial pengguna — mulai dari peringatan dini penggunaan batas, proyeksi kehabisan dana lebih awal, hingga deteksi pengeluaran tanpa alokasi anggaran. Seluruh aturan di kelompok ini bertujuan memperkuat disiplin finansial pengguna melalui sistem peringatan berjenjang.

---

## Rule BG-00a — Anggaran Terpakai Setengah

**Entitas yang dipantau:** Anggaran × Transaksi × Kategori

**Kondisi pemicu (pseudocode):**
```
FUNGSI EvaluasiBG00a(anggaran, semuaTransaksi, semuaKategori):
    transaksiBulanIni = FILTER semuaTransaksi DIMANA
        transaksi.tipe = 'EXPENSE'
        DAN transaksi.kategoriId = anggaran.kategoriId
        DAN transaksi.periode = bulanBerjalan

    totalTerpakai = JUMLAH(transaksiBulanIni.nominal)
    rasio = totalTerpakai / anggaran.batasNominal

    JIKA rasio >= 0.5 DAN rasio < 0.8 MAKA
        HASILKAN Insight(
            judul = 'Penggunaan Anggaran Berjalan',
            isi   = 'Anggaran {nama kategori} sudah terpakai 50%. Masih ada ruang, 
                     tetapi mulai pantau agar tetap sesuai rencana.',
            tingkatUrgensi = 'info',
            prioritas      = 0.3
        )
```

**Keluaran:** Judul "Penggunaan Anggaran Berjalan", tingkat urgensi *info*, dengan tombol aksi mengarah ke `/budgets`.

**Jenis keluaran:** Nudge (Digital Nudging — Peringatan Preventif). Rule ini mendorong kewaspadaan dini terhadap pola pengeluaran sebelum mendekati batas, tanpa menyertakan solusi eksekusi spesifik; pengguna dibiarkan menentukan responsnya sendiri.

---

## Rule BG-00b — Anggaran Mulai Menipis

**Entitas yang dipantau:** Anggaran × Transaksi × Kategori

**Kondisi pemicu (pseudocode):**
```
FUNGSI EvaluasiBG00b(anggaran, semuaTransaksi, semuaKategori):
    totalTerpakai = JUMLAH transaksi.nominal
        DIMANA transaksi.tipe = 'EXPENSE'
        DAN transaksi.kategoriId = anggaran.kategoriId
        DAN transaksi.periode = bulanBerjalan

    rasio = totalTerpakai / anggaran.batasNominal

    JIKA rasio >= 0.8 DAN rasio < 1.0 MAKA
        -- Periksa apakah ada data perbandingan harian untuk konteks tambahan
        pengeluaranHariIni  = JUMLAH transaksi dengan tanggal = hari ini
        rataRata7Hari       = JUMLAH transaksi 7 hari terakhir / 7

        JIKA pengeluaranHariIni > rataRata7Hari MAKA
            judul = 'Pengeluaran {nama kategori} Naik'
            teksExtra = ' Pengeluaran hari ini {nominal}, lebih tinggi {selisih} 
                         dari rata-rata harian minggu lalu.'
        SEBALIKNYA
            judul = 'Anggaran Mulai Menipis'
            teksExtra = ''
        AKHIR JIKA

        HASILKAN Insight(
            judul = judul,
            isi   = 'Anggaran {nama kategori} sudah terpakai 80%. {teksExtra}
                     Pertimbangkan menahan pengeluaran berikutnya agar tidak melewati batas.',
            tingkatUrgensi = 'warning',
            prioritas      = 0.2
        )
```

**Keluaran:** Judul "Anggaran Mulai Menipis" atau "Pengeluaran [Kategori] Naik" (jika ada data perbandingan), tingkat urgensi *warning*, tombol aksi ke `/budgets`.

**Jenis keluaran:** Nudge (Digital Nudging — Peringatan dengan Konteks Perbandingan). Rule ini menggunakan teknik *loss framing* yang dikombinasikan dengan konteks harian, mendorong pengguna untuk menghentikan atau menunda pengeluaran berikutnya.

---

## Rule BG-00c — Batas Anggaran Tercapai / Terlampaui

**Entitas yang dipantau:** Anggaran × Transaksi × Kategori × (opsional) Anggaran Lain

**Kondisi pemicu (pseudocode):**
```
FUNGSI EvaluasiBG00c(anggaran, semuaAnggaran, semuaTransaksi, semuaKategori):
    totalTerpakai = JUMLAH transaksi.nominal
        DIMANA transaksi.tipe = 'EXPENSE'
        DAN transaksi.kategoriId = anggaran.kategoriId
        DAN transaksi.periode = bulanBerjalan

    defisit = totalTerpakai - anggaran.batasNominal
    rasio   = totalTerpakai / anggaran.batasNominal

    JIKA rasio = 1.0 MAKA
        HASILKAN Insight(
            judul          = 'Batas Anggaran Tercapai',
            isi            = 'Anggaran {nama kategori} sudah mencapai batas bulan ini. 
                              Pengeluaran berikutnya akan membuat anggaran melewati limit.',
            tingkatUrgensi = 'critical',
            prioritas      = 0.1
        )

    JIKA rasio > 1.0 MAKA
        -- Cari kandidat anggaran lain yang memiliki sisa dana cukup
        rekomendasiSumber = CariBudgetUntukSubsidi(anggaran, semuaAnggaran)

        JIKA rekomendasiSumber DITEMUKAN MAKA
            HASILKAN Insight(
                judul          = 'Rekomendasi Subsidi Silang',
                isi            = 'Anggaran {nama kategori} telah melewati batas sebesar 
                                  {defisit}. Kamu dapat mempertimbangkan memindahkan 
                                  {jumlah rekomendasi} dari {nama kategori sumber}. 
                                  Keputusan tetap ada di tanganmu.',
                tingkatUrgensi = 'critical',
                prioritas      = 0.1,
                aksiBisnis     = 'REALLOCATE_BUDGET'
            )
        SEBALIKNYA
            HASILKAN Insight(
                judul          = 'Batas Anggaran Terlampaui',
                isi            = 'Anggaran {nama kategori} telah melewati batas sebesar 
                                  {defisit}. Kamu dapat meninjau pengeluaran atau 
                                  mempertimbangkan penyesuaian anggaran.',
                tingkatUrgensi = 'critical',
                prioritas      = 0.1
            )
        AKHIR JIKA

--- ALGORITMA SUBSIDI SILANG ---
FUNGSI CariBudgetUntukSubsidi(targetAnggaran, semuaAnggaran):
    UNTUK SETIAP kandidat DALAM semuaAnggaran:
        sisaKandidat = kandidat.batasNominal - kandidat.totalTerpakai

        -- Kandidat harus punya sisa minimal 70% dari batasnya
        JIKA (sisaKandidat / kandidat.batasNominal) < 0.7 MAKA LEWATI

        -- Setelah transfer, kandidat masih harus punya sisa minimal 50%
        jumlahTransfer = MIN(sisaKandidat * 0.3, defisit)
        JIKA (sisaKandidat - jumlahTransfer) / kandidat.batasNominal < 0.5 MAKA LEWATI

        KEMBALIKAN { sumber: kandidat, jumlahRekomendasi: jumlahTransfer }

    KEMBALIKAN null (tidak ada kandidat cocok)
```

**Keluaran:** Judul "Batas Anggaran Tercapai", "Batas Anggaran Terlampaui", atau "Rekomendasi Subsidi Silang" (jika ada sumber dana alternatif), tingkat urgensi *critical*, tombol aksi ke `/budgets` atau ke halaman realokasi.

**Jenis keluaran:** Nudge (Digital Nudging — Intervensi Kritis dengan Rekomendasi Aksi). Ketika ada solusi yang memungkinkan, rule ini mengintegrasikan rekomendasi subsidi silang (*smart recommendation*) agar pengguna tidak hanya diberi peringatan, namun langsung ditawari jalur resolusi yang terukur.

---

## Rule BG-01 — Anggaran Berisiko Habis Lebih Awal

**Entitas yang dipantau:** Anggaran × Transaksi (bulan berjalan)

**Kondisi pemicu (pseudocode):**
```
FUNGSI EvaluasiBG01(anggaran, transaksiBulanIni):
    hariIni       = tanggal hari ini dalam bulan (misal: 15)
    totalHariBulan = jumlah hari dalam bulan berjalan (misal: 30)
    sisaHari      = totalHariBulan - hariIni

    -- Syarat: Setidaknya 7 hari sudah berlalu agar data cukup representatif
    JIKA hariIni < 7 MAKA HENTIKAN (data belum cukup)
    JIKA sisaHari <= 0 MAKA HENTIKAN (bulan hampir selesai)

    totalTerpakai = JUMLAH transaksi.nominal
        DIMANA transaksi.kategoriId = anggaran.kategoriId
        DAN transaksi.tipe = 'EXPENSE'

    rasio = totalTerpakai / anggaran.batasNominal

    -- Hindari duplikasi dengan BG-00b (sudah 80%+, notifikasi berbeda)
    JIKA rasio >= 0.8 MAKA HENTIKAN

    lajuHarian           = totalTerpakai / hariIni
    JIKA lajuHarian <= 0 MAKA HENTIKAN

    hariSampaiHabis      = (anggaran.batasNominal - totalTerpakai) / lajuHarian

    JIKA hariSampaiHabis < sisaHari MAKA
        HASILKAN Insight(
            judul = 'Anggaran Berisiko Habis Lebih Awal',
            isi   = 'Dengan laju pengeluaran saat ini, anggaran {nama kategori} 
                     diperkirakan habis dalam {hariSampaiHabis} hari, padahal bulan 
                     masih {sisaHari} hari lagi.',
            tingkatUrgensi = 'warning',
            prioritas      = 1.9
        )
```

**Keluaran:** Judul "Anggaran Berisiko Habis Lebih Awal", tingkat urgensi *warning*, tombol aksi ke `/budgets`.

**Jenis keluaran:** Nudge (Digital Nudging — Proyeksi Preventif). Rule ini memanfaatkan prinsip *temporal projection* — memperlihatkan konsekuensi finansial di masa depan (kehabisan anggaran) agar pengguna termotivasi untuk mengambil tindakan korektif sekarang, bukan setelah defisit terjadi.

---

## Rule BG-03 — Pengeluaran Tanpa Anggaran

**Entitas yang dipantau:** Transaksi × Kategori × Anggaran (ketiadaan)

**Kondisi pemicu (pseudocode):**
```
FUNGSI EvaluasiBG03(semuaTransaksi, semuaAnggaran, semuaKategori):
    totalPerKategori = {}

    UNTUK SETIAP transaksi DALAM semuaTransaksi:
        JIKA transaksi.tipe = 'EXPENSE' DAN transaksi.kategoriId ADA MAKA
            totalPerKategori[transaksi.kategoriId] += transaksi.nominal

    UNTUK SETIAP (kategoriId, totalNominal) DALAM totalPerKategori:
        JIKA totalNominal > 200.000
        DAN TIDAK ADA anggaran dengan anggaran.kategoriId = kategoriId MAKA
            namaKategori = CARI nama dari semuaKategori berdasarkan kategoriId

            HASILKAN Insight(
                judul = 'Pengeluaran Tanpa Anggaran',
                isi   = 'Kamu sudah mencatat {totalNominal} pengeluaran di 
                         {namaKategori} bulan ini, tapi belum ada anggaran 
                         untuk kategori ini.',
                tingkatUrgensi = 'info',
                prioritas      = 1.5
            )
            HENTIKAN (ambil pertama yang ditemukan)
```

**Keluaran:** Judul "Pengeluaran Tanpa Anggaran", tingkat urgensi *info*, tombol aksi ke `/budgets` dengan pre-fill kategori terkait.

**Jenis keluaran:** Nudge (Digital Nudging — Rekomendasi Proaktif). Rule ini mendeteksi kebutuhan perencanaan yang terlewat dan secara aktif mendorong pengguna untuk mengisi celah tersebut. Batas Rp 200.000 dipakai sebagai *minimum significance threshold* agar notifikasi tidak muncul untuk pengeluaran yang terlalu sepele.

---

## Rule BG-04 — Saran Anggaran Baru

**Entitas yang dipantau:** Transaksi × Kategori (riwayat 3 bulan)

**Kondisi pemicu (pseudocode):**
```
FUNGSI EvaluasiBG04(semuaTransaksi, semuaAnggaran, semuaKategori):
    bulanM1 = 1 bulan lalu
    bulanM2 = 2 bulan lalu
    bulanM3 = 3 bulan lalu

    UNTUK SETIAP kategori DALAM semuaKategori:
        -- Lewati jika kategori ini sudah punya anggaran bulan ini
        JIKA ADA anggaran dengan anggaran.kategoriId = kategori.id MAKA LEWATI

        nominalM1 = JUMLAH transaksi.nominal DIMANA
            transaksi.kategoriId = kategori.id
            DAN transaksi.tipe = 'EXPENSE'
            DAN transaksi.periode = bulanM1

        nominalM2 = JUMLAH transaksi.nominal DIMANA ... periode = bulanM2
        nominalM3 = JUMLAH transaksi.nominal DIMANA ... periode = bulanM3

        -- Semua 3 bulan harus ada data (kategori rutin digunakan)
        JIKA nominalM1 > 0 DAN nominalM2 > 0 DAN nominalM3 > 0 MAKA
            rataRata = (nominalM1 + nominalM2 + nominalM3) / 3

            JIKA rataRata > 50.000 MAKA
                HASILKAN Insight(
                    judul = 'Saran Anggaran Baru',
                    isi   = 'Kamu rutin mencatat rata-rata {rataRata}/bulan di 
                             {nama kategori}. Pertimbangkan membuat anggaran 
                             dengan nominal tersebut.',
                    tingkatUrgensi = 'info',
                    prioritas      = 1.6
                )
                HENTIKAN (ambil pertama yang ditemukan)
```

**Keluaran:** Judul "Saran Anggaran Baru", tingkat urgensi *info*, tombol aksi ke `/budgets`.

**Jenis keluaran:** Nudge (Digital Nudging — Rekomendasi Berbasis Data). Rule ini menggunakan pola historis pengguna sendiri (*data-driven personalization*) untuk menyarankan batas anggaran yang realistis, mengurangi gesekan (*friction*) dalam proses membuat anggaran baru.

---

## Rule BG-05 — Anggaran Mungkin Tidak Realistis

**Entitas yang dipantau:** Anggaran × Transaksi (riwayat 3 bulan berturut-turut)

**Kondisi pemicu (pseudocode):**
```
FUNGSI EvaluasiBG05(semuaAnggaran, semuaTransaksi, semuaKategori):
    bulanM1 = 1 bulan lalu
    bulanM2 = 2 bulan lalu
    bulanM3 = 3 bulan lalu

    UNTUK SETIAP anggaran DALAM semuaAnggaran:
        JIKA anggaran.batasNominal = 0 MAKA LEWATI

        pengeluaranM1 = JUMLAH transaksi.nominal DIMANA
            transaksi.kategoriId = anggaran.kategoriId
            DAN transaksi.tipe = 'EXPENSE'
            DAN transaksi.periode = bulanM1

        pengeluaranM2 = JUMLAH ... periode = bulanM2
        pengeluaranM3 = JUMLAH ... periode = bulanM3

        -- Kondisi: Semua 3 bulan terakhir melampui batas > 20%
        JIKA pengeluaranM1 > anggaran.batasNominal * 1.20
        DAN  pengeluaranM2 > anggaran.batasNominal * 1.20
        DAN  pengeluaranM3 > anggaran.batasNominal * 1.20 MAKA
            rataRataRealisasi = (pengeluaranM1 + pengeluaranM2 + pengeluaranM3) / 3

            HASILKAN Insight(
                judul = 'Anggaran Mungkin Tidak Realistis',
                isi   = 'Kamu secara konsisten melampaui anggaran {nama kategori} >20% 
                         dalam 3 bulan terakhir (rata-rata {rataRataRealisasi} dari 
                         budget {batasNominal}). Pertimbangkan untuk menyesuaikan 
                         budget ini.',
                tingkatUrgensi = 'warning',
                prioritas      = 3.2
            )
            HENTIKAN
```

**Keluaran:** Judul "Anggaran Mungkin Tidak Realistis", tingkat urgensi *warning*, tombol aksi ke `/budgets`.

**Jenis keluaran:** Nudge (Digital Nudging — Umpan Balik Adaptif). Alih-alih hanya mengingatkan bahwa anggaran terlampaui, rule ini memberikan penilaian kritis bahwa batas anggaran itu sendiri yang mungkin perlu direvisi — mendorong perencanaan yang lebih realistis dan berbasis data historis pengguna itu sendiri.
