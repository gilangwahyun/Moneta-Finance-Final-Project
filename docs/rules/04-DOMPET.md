# Kelompok 4: Dompet (Wallets)

Kelompok ini mencakup aturan-aturan yang memantau kesehatan likuiditas dompet pengguna dan kebiasaan penggunaan metode pembayaran. Tujuannya adalah memastikan pengguna tidak kehabisan uang tunai di saat kritis, serta menyadari ketergantungan berlebih pada satu metode pembayaran yang dapat menimbulkan risiko saat metode tersebut tidak dapat diakses.

---

## Rule WL-02 — Saldo Dompet Menipis (Low Cash Warning)

**Entitas yang dipantau:** Dompet × Seluruh Riwayat Transaksi

**Kondisi pemicu (pseudocode):**
```
FUNGSI EvaluasiWL02(semuaDompet, semuaTransaksi):
    JIKA semuaDompet KOSONG MAKA HENTIKAN

    -- Hitung rata-rata pengeluaran bulanan dari seluruh riwayat
    bulanUnik = HITUNG jumlah bulan berbeda yang ada dalam semuaTransaksi
    totalPengeluaranHistoris = JUMLAH transaksi.nominal DIMANA transaksi.tipe = 'EXPENSE'
    rataRataPengeluaranBulanan = totalPengeluaranHistoris / MAKS(1, bulanUnik)

    -- Batas aman: 10% dari pengeluaran bulanan rata-rata, minimal Rp 100.000
    batasAman = MAKS(100.000, rataRataPengeluaranBulanan * 0.10)

    UNTUK SETIAP dompet DALAM semuaDompet:
        -- Lewati dompet investasi (tidak untuk kebutuhan sehari-hari)
        JIKA dompet.tipe = 'INVESTASI' MAKA LEWATI

        -- Hitung saldo aktual dompet berdasarkan semua riwayat transaksi
        saldo = dompet.saldoAwal

        UNTUK SETIAP transaksi DALAM semuaTransaksi:
            JIKA transaksi.dompetId = dompet.id MAKA
                JIKA transaksi.tipe = 'INCOME' MAKA saldo += transaksi.nominal
                JIKA transaksi.tipe = 'EXPENSE' MAKA saldo -= transaksi.nominal
                JIKA transaksi.tipe = 'TRANSFER' MAKA saldo -= transaksi.nominal

            -- Tambahkan saldo dari transfer masuk ke dompet ini
            JIKA transaksi.tipe = 'TRANSFER'
            DAN transaksi.dompetTujuanId = dompet.id MAKA
                saldo += transaksi.nominal

        JIKA saldo < batasAman MAKA
            HASILKAN Insight(
                judul = 'Saldo Dompet Menipis',
                isi   = 'Saldo dompet {nama dompet} saat ini {saldo}. Pertimbangkan 
                         untuk melakukan top up agar kebutuhan harian terpenuhi.',
                tingkatUrgensi = 'critical',
                prioritas      = 0.5
            )
            HENTIKAN (kembalikan dompet pertama yang ditemukan)
```

**Keluaran:** Judul "Saldo Dompet Menipis", tingkat urgensi *critical*, tombol aksi ke `/wallets`.

**Jenis keluaran:** Nudge (Digital Nudging — Peringatan Likuiditas Kritis). Rule ini menghitung saldo riil dompet dengan menelusuri seluruh riwayat transaksi (termasuk transfer masuk dan keluar), bukan hanya melihat angka di profil dompet. Pendekatan ini memastikan akurasi saldo yang mencerminkan kondisi nyata, bukan kondisi saat rekening dibuat.

---

## Rule WL-01 — Saldo Dompet Turun Cepat (Wallet Drain Rate)

**Entitas yang dipantau:** Dompet × Transaksi Pengeluaran (bulan ini vs bulan lalu)

**Kondisi pemicu (pseudocode):**
```
FUNGSI EvaluasiWL01(semuaDompet, semuaTransaksi):
    JIKA semuaDompet KOSONG MAKA HENTIKAN

    hariIni      = tanggal hari ini dalam bulan
    bulanIni     = periode bulan berjalan
    bulanLalu    = periode 1 bulan lalu
    hariDalamBulanLalu = jumlah hari dalam bulan lalu

    -- Syarat: sudah setidaknya 7 hari berjalan di bulan ini
    JIKA hariIni < 7 MAKA HENTIKAN

    UNTUK SETIAP dompet DALAM semuaDompet:
        JIKA dompet.tipe = 'INVESTASI' MAKA LEWATI

        pengeluaranBulanIni = JUMLAH transaksi.nominal DIMANA
            transaksi.dompetId = dompet.id
            DAN transaksi.tipe = 'EXPENSE'
            DAN transaksi.periode = bulanIni

        pengeluaranBulanLalu = JUMLAH transaksi.nominal DIMANA
            transaksi.dompetId = dompet.id
            DAN transaksi.tipe = 'EXPENSE'
            DAN transaksi.periode = bulanLalu

        -- Hitung laju pengeluaran harian (burn rate)
        lajuHarianBulanIni  = pengeluaranBulanIni  / hariIni
        lajuHarianBulanLalu = pengeluaranBulanLalu / hariDalamBulanLalu

        -- Kondisi utama: laju bulan ini >= 1,5× laju bulan lalu
        JIKA lajuHarianBulanLalu > 0 DAN lajuHarianBulanIni > lajuHarianBulanLalu * 1.5 MAKA
            HASILKAN Insight(
                judul = 'Saldo Dompet Turun Cepat',
                isi   = 'Laju pengeluaran dari dompet {nama dompet} bulan ini 
                         1,5× lebih cepat dari bulan lalu. Pantau transaksimu 
                         dari dompet ini.',
                tingkatUrgensi = 'warning',
                prioritas      = 1.8
            )
            HENTIKAN
```

**Keluaran:** Judul "Saldo Dompet Turun Cepat", tingkat urgensi *warning*, tombol aksi ke `/wallets`.

**Jenis keluaran:** Nudge (Digital Nudging — Peringatan Akselerasi Pengeluaran). Rule ini tidak melihat saldo absolut, melainkan *laju* pengurasan dana (*burn rate*). Seseorang dengan saldo besar pun bisa terkejut ketika tiba-tiba uangnya habis lebih cepat dari biasanya — rule ini hadir untuk mencegah situasi tersebut.

---

## Rule WL-03 — Penggunaan Dompet Dominan (Single Wallet Pattern)

**Entitas yang dipantau:** Transaksi (bulan berjalan) × Dompet

**Kondisi pemicu (pseudocode):**
```
FUNGSI EvaluasiWL03(transaksiBulanIni, semuaDompet):
    -- Syarat: pengguna harus punya lebih dari 1 dompet (agar relevan untuk dibandingkan)
    JIKA JUMLAH semuaDompet <= 1 MAKA HENTIKAN

    totalTransaksi = JUMLAH semuaTransaksi dalam transaksiBulanIni
    -- Syarat: minimal ada 5 transaksi agar pola bermakna
    JIKA totalTransaksi < 5 MAKA HENTIKAN

    hitunganPerDompet = {} -- dompetId → jumlah transaksi

    UNTUK SETIAP transaksi DALAM transaksiBulanIni:
        JIKA transaksi.dompetId ADA MAKA
            hitunganPerDompet[transaksi.dompetId] += 1

    UNTUK SETIAP (dompetId, jumlah) DALAM hitunganPerDompet:
        rasio = jumlah / totalTransaksi

        -- Kondisi utama: satu dompet digunakan untuk >90% transaksi
        JIKA rasio > 0.90 MAKA
            namaDompet = CARI nama dari semuaDompet berdasarkan dompetId

            HASILKAN Insight(
                judul = 'Penggunaan Dompet Dominan',
                isi   = 'Sebagian besar transaksimu bulan ini ({rasio*100}%) 
                         dicatat menggunakan dompet {namaDompet}.',
                tingkatUrgensi = 'neutral',
                prioritas      = 3.9
            )
            HENTIKAN
```

**Keluaran:** Judul "Penggunaan Dompet Dominan", tingkat urgensi *neutral*, tombol aksi ke `/wallets`.

**Jenis keluaran:** Insight Analitik (Observasi Kebiasaan Penggunaan Metode Pembayaran). Rule ini hanya muncul saat pengguna memiliki lebih dari satu dompet namun hampir seluruh transaksinya hanya menggunakan satu saja. Informasi ini berguna agar pengguna sadar bahwa mereka mungkin tidak memanfaatkan fitur pencatatan multi-dompet secara optimal.

---

## Rule WL-04 — Pola Penggunaan Dompet (Wallet-Category Pattern)

**Entitas yang dipantau:** Transaksi Pengeluaran (3 bulan terakhir) × Kategori × Dompet

**Kondisi pemicu (pseudocode):**
```
FUNGSI EvaluasiWL04(semuaTransaksi, semuaDompet, semuaKategori):
    batas3BulanLalu = awal bulan 3 bulan yang lalu (dalam milidetik)

    totalPerKategori        = {} -- kategoriId → total nominal
    totalDompetPerKategori  = {} -- kategoriId → { dompetId → total nominal }

    UNTUK SETIAP transaksi DALAM semuaTransaksi:
        JIKA transaksi.tipe != 'EXPENSE' MAKA LEWATI
        JIKA transaksi.tanggal < batas3BulanLalu MAKA LEWATI
        JIKA transaksi.dompetId KOSONG ATAU transaksi.kategoriId KOSONG MAKA LEWATI

        totalPerKategori[transaksi.kategoriId] += transaksi.nominal
        totalDompetPerKategori[transaksi.kategoriId][transaksi.dompetId] += transaksi.nominal

    -- Ambil 5 kategori dengan total pengeluaran terbesar
    top5Kategori = URUTKAN totalPerKategori dari terbesar, ambil 5 pertama

    UNTUK SETIAP kategoriId DALAM top5Kategori:
        totalKategori = totalPerKategori[kategoriId]
        JIKA totalKategori < 100.000 MAKA LEWATI

        UNTUK SETIAP (dompetId, nominalDompet) DALAM totalDompetPerKategori[kategoriId]:
            -- Kondisi utama: satu dompet dominasi >= 80% transaksi kategori ini
            JIKA (nominalDompet / totalKategori) >= 0.80 MAKA
                namaKategori = CARI nama dari semuaKategori berdasarkan kategoriId
                namaDompet   = CARI nama dari semuaDompet berdasarkan dompetId

                HASILKAN Insight(
                    judul = 'Pola Penggunaan Dompet',
                    isi   = 'Sekadar info: {nominalDompet/totalKategori*100}% 
                             pengeluaran {namaKategori}-mu selalu menggunakan 
                             dompet {namaDompet}.',
                    tingkatUrgensi = 'neutral',
                    prioritas      = 3.8
                )
                HENTIKAN
```

**Keluaran:** Judul "Pola Penggunaan Dompet", tingkat urgensi *neutral*, tombol aksi ke `/wallets`.

**Jenis keluaran:** Insight Analitik (Observasi Kebiasaan Keuangan Implisit). Rule ini memperlihatkan kebiasaan tak tertulis pengguna — misalnya "setiap belanja di kategori Jajan selalu pakai GoPay". Temuan ini berguna bagi pengguna yang ingin memverifikasi apakah kebiasaan tersebut masih sesuai dengan strategi alokasi dana mereka.
