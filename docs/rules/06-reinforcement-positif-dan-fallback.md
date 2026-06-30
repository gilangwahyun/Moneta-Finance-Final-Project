# Kelompok 6: Reinforcement Positif & Fallback

Kelompok ini mencakup aturan-aturan yang bersifat membangun dan apresiatif. Berbeda dengan kelompok lain yang berfokus pada deteksi masalah, kelompok ini hadir untuk merayakan pencapaian, mendorong konsistensi, dan memastikan pengguna selalu mendapat respons bermakna dari sistem — bahkan saat kondisi keuangan mereka sedang baik-baik saja.

---

## Rule PR-01 — Kamu Berhasil Berhemat! (Weekly Savings)

**Entitas yang dipantau:** Transaksi Pemasukan dan Pengeluaran (7 hari terakhir)

**Kondisi pemicu (pseudocode):**
```
FUNGSI EvaluasiPR01(data7HariTerakhir):
    -- data7HariTerakhir: array per hari berisi { pemasukan, pengeluaran }
    -- Data dihitung dari setiap hari dalam 7 hari terakhir menggunakan seluruh
    -- riwayat transaksi. TRANSFER dikecualikan dari kalkulasi (hanya INCOME dan EXPENSE).

    totalBersih7Hari = 0

    UNTUK SETIAP hari DALAM data7HariTerakhir:
        totalBersih7Hari += hari.pemasukan - hari.pengeluaran

    tabungan7Hari = MAKS(0, totalBersih7Hari)

    JIKA tabungan7Hari > 0 MAKA
        HASILKAN Insight(
            judul = 'Kamu Berhasil Berhemat!',
            isi   = 'Hebat! Kamu berhasil menyisakan {tabungan7Hari} pada 7 hari 
                     terakhir. Pertahankan kebiasaan baik ini.',
            tingkatUrgensi = 'positive',
            prioritas      = 3.5
        )
```

**Keluaran:** Judul "Kamu Berhasil Berhemat!", tingkat urgensi *positive*, tombol aksi ke `/transactions`.

**Jenis keluaran:** Nudge (Digital Nudging — Reinforcement Positif Mingguan). Rule ini mengimplementasikan prinsip *positive reinforcement* dari teori perilaku — merayakan keberhasilan kecil secara konsisten terbukti lebih efektif dalam membangun kebiasaan baik dibanding hanya memberi peringatan saat situasi buruk. Sisa positif sekecil apapun dalam 7 hari sudah cukup untuk memicu apresiasi ini.

---

## Rule PR-02 — Pemasukan Meningkat (Income Increase Alert)

**Entitas yang dipantau:** Transaksi Pemasukan (bulan berjalan vs bulan lalu)

**Kondisi pemicu (pseudocode):**
```
FUNGSI EvaluasiPR02(pemasukanBulanIni, pemasukanBulanLalu):
    JIKA pemasukanBulanLalu <= 0 MAKA HENTIKAN (tidak ada basis perbandingan)
    JIKA pemasukanBulanIni <= pemasukanBulanLalu MAKA HENTIKAN (tidak naik)

    persentaseKenaikan = BULAT((pemasukanBulanIni - pemasukanBulanLalu) 
                                / pemasukanBulanLalu * 100)

    -- Kondisi utama: kenaikan signifikan, minimal 10%
    JIKA persentaseKenaikan >= 10 MAKA
        selisihNominal = pemasukanBulanIni - pemasukanBulanLalu
        rekomendasiTabungan = selisihNominal / 2  -- saran sisihkan 50% dari kenaikan

        HASILKAN Insight(
            judul = 'Pemasukan Meningkat',
            isi   = 'Pemasukan naik {persentaseKenaikan}%. Coba sisihkan 
                     {rekomendasiTabungan} langsung ke dana darurat untuk 
                     memperkuat fondasi keuanganmu.',
            tingkatUrgensi = 'positive',
            prioritas      = 3.6
        )
```

**Keluaran:** Judul "Pemasukan Meningkat", tingkat urgensi *positive*, tombol aksi ke `/wallets`.

**Jenis keluaran:** Nudge (Digital Nudging — Momentum Finansial Positif dengan Rekomendasi Aksi). Rule ini tidak hanya merayakan kenaikan penghasilan, tetapi langsung menyertakan rekomendasi konkret: menyisihkan 50% dari selisih kenaikan ke dana darurat. Ini menerapkan prinsip *pay yourself first* — mengunci sebagian keuntungan sebelum tergoda untuk menghabiskannya.

---

## Rule BG-02 — Pemulihan Anggaran Berhasil (Budget Recovery)

**Entitas yang dipantau:** Anggaran × Transaksi Pengeluaran (riwayat 2 bulan)

**Kondisi pemicu (pseudocode):**
```
FUNGSI EvaluasiBG02(semuaAnggaran, semuaTransaksi, semuaKategori):
    bulanM1 = 1 bulan lalu
    bulanM2 = 2 bulan lalu

    UNTUK SETIAP anggaran DALAM semuaAnggaran:
        JIKA anggaran.batasNominal = 0 MAKA LEWATI

        pengeluaranM1 = JUMLAH transaksi.nominal DIMANA
            transaksi.kategoriId = anggaran.kategoriId
            DAN transaksi.tipe = 'EXPENSE'
            DAN transaksi.periode = bulanM1

        pengeluaranM2 = JUMLAH transaksi.nominal DIMANA
            transaksi.kategoriId = anggaran.kategoriId
            DAN transaksi.tipe = 'EXPENSE'
            DAN transaksi.periode = bulanM2

        -- Kondisi:
        -- 1. Bulan M-2 (dua bulan lalu): masih over-budget
        -- 2. Bulan M-1 (bulan lalu): berhasil kembali ke bawah batas DAN nominal turun
        JIKA pengeluaranM2 > anggaran.batasNominal
        DAN  pengeluaranM1 <= anggaran.batasNominal
        DAN  pengeluaranM1 < pengeluaranM2 MAKA
            selisihHemat   = pengeluaranM2 - pengeluaranM1
            namaKategori   = CARI nama dari semuaKategori berdasarkan anggaran.kategoriId

            HASILKAN Insight(
                judul = 'Pemulihan Anggaran Berhasil',
                isi   = 'Kerja bagus! Bulan lalu kamu berhasil menekan pengeluaran 
                         {namaKategori} kembali ke batas anggaran (hemat {selisihHemat} 
                         dari bulan sebelumnya). Pertahankan!',
                tingkatUrgensi = 'positive',
                prioritas      = 3.4
            )
            HENTIKAN (kembalikan anggaran pertama yang memenuhi syarat)
```

**Keluaran:** Judul "Pemulihan Anggaran Berhasil", tingkat urgensi *positive*, tombol aksi ke `/budgets`.

**Jenis keluaran:** Nudge (Digital Nudging — Validasi Perilaku Perbaikan Diri). Rule ini mendeteksi siklus pemulihan: jatuh (over-budget), lalu bangkit (kembali terkendali). Memberikan apresiasi pada momen ini sangat penting secara psikologis — ini bukan hanya tentang angka, tetapi tentang memvalidasi usaha nyata pengguna untuk memperbaiki kebiasaannya.

---

## Rule FT-03 — Konsistensi Target Terjaga (Target Streak)

**Entitas yang dipantau:** Target Finansial (aktif, tipe bulanan) × Transaksi Pemasukan (3 bulan terakhir)

**Kondisi pemicu (pseudocode):**
```
FUNGSI EvaluasiFT03(semuaTarget, semuaTransaksi):
    bulanM1 = 1 bulan lalu
    bulanM2 = 2 bulan lalu
    bulanM3 = 3 bulan lalu

    UNTUK SETIAP target DALAM semuaTarget:
        JIKA target.aktif = TIDAK MAKA LEWATI
        JIKA target.periodeTarget != 'MONTHLY' MAKA LEWATI

        nominalTarget = target.nominalTarget

        pemasukanM1 = JUMLAH transaksi.nominal DIMANA
            transaksi.kategoriId = target.kategoriId
            DAN transaksi.tipe = 'INCOME'
            DAN transaksi.periode = bulanM1

        pemasukanM2 = JUMLAH ... periode = bulanM2
        pemasukanM3 = JUMLAH ... periode = bulanM3

        -- Kondisi utama: 3 bulan berturut-turut semua melampaui atau sama dengan target
        JIKA pemasukanM1 >= nominalTarget
        DAN  pemasukanM2 >= nominalTarget
        DAN  pemasukanM3 >= nominalTarget MAKA
            HASILKAN Insight(
                judul = 'Konsistensi Target Terjaga',
                isi   = 'Luar biasa! Kamu berhasil mencapai target pemasukan 
                         {nama target} selama 3 bulan berturut-turut.',
                tingkatUrgensi = 'positive',
                prioritas      = 3.5
            )
            HENTIKAN
```

**Keluaran:** Judul "Konsistensi Target Terjaga", tingkat urgensi *positive*, tombol aksi ke `/targets`.

**Jenis keluaran:** Nudge (Digital Nudging — Penghargaan Konsistensi Jangka Panjang). Rule ini memanfaatkan konsep *streak reward* yang terbukti efektif dalam desain produk berbasis kebiasaan (*habit-forming products*). Konsistensi 3 bulan berturut-turut melampaui target adalah pencapaian yang patut dirayakan, dan apresiasi ini mendorong pengguna untuk melanjutkan kebiasaan positif tersebut.

---

## Rule FALLBACK — Pola Pengeluaran Stabil (Empathetic Fallback)

**Entitas yang dipantau:** Semua indikator analitik (bulan berjalan)

**Kondisi pemicu (pseudocode):**
```
FUNGSI EvaluasiFALLBACK(daftarSemuaInsightYangDihasilkan, totalPengeluaranBulanIni):
    -- Rule ini hanya aktif jika tidak ada satu pun rule lain yang menghasilkan insight
    JIKA JUMLAH daftarSemuaInsightYangDihasilkan = 0
    DAN totalPengeluaranBulanIni > 0 MAKA
        HASILKAN Insight(
            judul = 'Pola Pengeluaran Stabil',
            isi   = 'Arus kas kamu bulan ini berjalan stabil. Yuk, tinjau kembali 
                     pengeluaranmu untuk memastikan semuanya tetap berada di jalurnya.',
            tingkatUrgensi = 'neutral',
            prioritas      = 4.0
        )
```

**Keluaran:** Judul "Pola Pengeluaran Stabil", tingkat urgensi *neutral*, tombol aksi ke `/transactions`.

**Jenis keluaran:** Nudge (Digital Nudging — Empathetic Default). Rule ini adalah jaring pengaman sistem — memastikan pengguna tidak pernah melihat halaman analitik yang kosong dan merasa diabaikan oleh sistem. Pesan "Pola Pengeluaran Stabil" yang netral dan apresiatif hadir untuk menutup sesi analitik dengan kesan positif, bahkan ketika semua kondisi keuangan berada dalam keadaan terkendali sempurna.

> **Catatan Desain:** Rule ini sengaja ditempatkan pada prioritas tertinggi (4.0) dalam sistem pengurutan berbobot, artinya ia hanya akan muncul *paling terakhir* di antara semua insight — dan hanya jika tidak ada satu pun insight lain yang berhasil dihasilkan. Ini mencerminkan filosofi bahwa "kabar baik" hanya disampaikan saat tidak ada "kabar penting" yang perlu disampaikan lebih dulu.
