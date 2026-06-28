# Kelompok 5: Target Finansial (Financial Targets)

Kelompok ini mencakup aturan-aturan yang mengawasi kemajuan target keuangan pengguna — baik target pemasukan yang belum bergerak, maupun risiko penyabotase target akibat pengeluaran yang terlalu tinggi. Tujuannya adalah memastikan tujuan finansial jangka menengah-panjang tidak terganggu oleh perilaku pengeluaran jangka pendek.

---

## Rule FT-01 — Target Belum Ada Progres (Target Gap Alert)

**Entitas yang dipantau:** Target Finansial × Transaksi Pemasukan (periode target)

**Kondisi pemicu (pseudocode):**
```
FUNGSI EvaluasiFT01(semuaTarget, transaksiBulanIni):
    hariIni = tanggal hari ini

    UNTUK SETIAP target DALAM semuaTarget:
        JIKA target.aktif = TIDAK MAKA LEWATI

        tanggalMulai = target.tanggalMulai
        tanggalAkhir = target.tanggalAkhir ATAU akhir bulan mulai

        totalHari    = MAKS(1, selisih hari antara tanggalMulai dan tanggalAkhir)
        hariTelahBerlalu = selisih hari antara tanggalMulai dan hariIni

        proporsiWaktuBerlalu = hariTelahBerlalu / totalHari

        -- Hanya aktif setelah minimal 30% waktu target berjalan
        JIKA proporsiWaktuBerlalu < 0.30 MAKA LEWATI

        -- Periksa apakah ada pemasukan yang dicatat untuk kategori target ini
        totalPemasukanTarget = JUMLAH transaksi.nominal DIMANA
            transaksi.tipe = 'INCOME'
            DAN transaksi.kategoriId = target.kategoriId
            DAN transaksi dari transaksiBulanIni

        JIKA totalPemasukanTarget = 0 MAKA
            HASILKAN Insight(
                judul = 'Target Belum Ada Progres',
                isi   = 'Target {nama target} sudah berjalan {proporsiWaktuBerlalu*100}% 
                         dari periodenya, namun belum ada pemasukan yang tercatat. 
                         Pastikan target sudah sesuai rencanamu.',
                tingkatUrgensi = 'warning',
                prioritas      = 2.3
            )
            HENTIKAN (kembalikan target pertama yang memenuhi syarat)
```

**Keluaran:** Judul "Target Belum Ada Progres", tingkat urgensi *warning*, tombol aksi ke `/targets`.

**Jenis keluaran:** Nudge (Digital Nudging — Peringatan Stagnasi Target). Rule ini menerapkan prinsip *commitment device* — setelah pengguna membuat target, sistem secara aktif memantau apakah ada tindakan nyata yang dilakukan menuju target tersebut. Notifikasi muncul setelah 30% waktu berlalu tanpa adanya realisasi pemasukan, memberi pengguna cukup waktu untuk memperbaiki situasi.

---

## Rule FT-02 — Pengeluaran vs Target Pemasukan (Target Progress Impact)

**Entitas yang dipantau:** Target Finansial × Seluruh Transaksi Pengeluaran (dalam periode target)

**Kondisi pemicu (pseudocode):**
```
FUNGSI EvaluasiFT02(semuaTarget, semuaTransaksi):
    UNTUK SETIAP target DALAM semuaTarget:
        JIKA target.aktif = TIDAK MAKA LEWATI

        nominalTarget = target.nominalTarget

        -- Tentukan rentang waktu target (dalam milidetik)
        waktuMulai  = awal hari dari target.tanggalMulai
        waktuAkhir  = akhir hari dari target.tanggalAkhir
                      ATAU akhir hari ini (jika tidak ada tanggal akhir)

        -- Jumlahkan semua pengeluaran dalam periode target
        totalPengeluaranDalamPeriode = JUMLAH transaksi.nominal DIMANA
            transaksi.tipe = 'EXPENSE'
            DAN transaksi.tanggal >= waktuMulai
            DAN transaksi.tanggal <= waktuAkhir

        -- Kondisi utama: total pengeluaran sudah >80% dari nominal target
        JIKA totalPengeluaranDalamPeriode > nominalTarget * 0.80 MAKA
            -- Tentukan teks periode berdasarkan tipe target
            JIKA target.periode = 'DAILY' MAKA teksWaktu = 'hari ini'
            JIKA target.periode = 'WEEKLY' MAKA teksWaktu = 'minggu ini'
            JIKA target.periode = 'MONTHLY' MAKA teksWaktu = 'bulan ini'
            SEBALIKNYA teksWaktu = 'periode ini'

            HASILKAN Insight(
                judul = 'Pengeluaran vs Target Pemasukan',
                isi   = 'Total pengeluaranmu {teksWaktu} ({totalPengeluaran}) sudah 
                         mencapai proporsi yang besar terhadap target pemasukan 
                         {nama target} ({nominalTarget}).',
                tingkatUrgensi = 'info',
                prioritas      = 2.4
            )
            HENTIKAN
```

**Keluaran:** Judul "Pengeluaran vs Target Pemasukan", tingkat urgensi *info*, tombol aksi ke `/targets`.

**Jenis keluaran:** Nudge (Digital Nudging — Penyadaran Potensi Konflik Tujuan). Rule ini bekerja dengan cara yang unik: membandingkan pengeluaran bukan dengan pendapatan yang sudah diterima, melainkan dengan target pemasukan yang *ingin* dicapai. Ini membantu pengguna menyadari bahwa gaya hidup konsumtif saat ini dapat mengorbankan impian finansial mereka di masa mendatang.
