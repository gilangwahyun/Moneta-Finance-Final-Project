# Kelompok 6: Reinforcement Positif & Fallback

Kelompok ini mencakup aturan-aturan yang bersifat membangun dan apresiatif. Berbeda dengan kelompok lain yang berfokus pada deteksi masalah, kelompok ini hadir untuk merayakan pencapaian, mendorong konsistensi, dan memastikan pengguna selalu mendapat respons bermakna dari sistem — bahkan saat kondisi keuangan mereka sedang baik-baik saja.

---

## Rule PR-01 — Kamu Berhasil Berhemat! (Weekly Savings)

**Entitas yang dipantau:** Transaksi Pemasukan dan Pengeluaran (7 hari terakhir)

**Kondisi pemicu (pseudocode):**
```
Program Evaluasi Keberhasilan Berhemat Mingguan (PR-01)
Deklarasi
    data7HariTerakhir : larik data harian { per hari: pemasukan, pengeluaran }
                        { TRANSFER dikecualikan dari kalkulasi }
    totalBersih7Hari  : bilangan real
    tabungan7Hari     : bilangan real

Algoritma
    totalBersih7Hari ← 0

    FOR EACH hari IN data7HariTerakhir DO
        totalBersih7Hari ← totalBersih7Hari + (hari.pemasukan - hari.pengeluaran)
    END FOR

    tabungan7Hari ← MAX(0, totalBersih7Hari)

    IF tabungan7Hari > 0 THEN
        OUTPUT Insight("Kamu Berhasil Berhemat!", urgensi=positive)
    END IF
```

**Keluaran:** Judul "Kamu Berhasil Berhemat!", tingkat urgensi *positive*, tombol aksi ke `/transactions`.

**Jenis keluaran:** Nudge (Digital Nudging — Reinforcement Positif Mingguan). Rule ini mengimplementasikan prinsip *positive reinforcement* dari teori perilaku — merayakan keberhasilan kecil secara konsisten terbukti lebih efektif dalam membangun kebiasaan baik dibanding hanya memberi peringatan saat situasi buruk. Sisa positif sekecil apapun dalam 7 hari sudah cukup untuk memicu apresiasi ini.

---

## Rule PR-02 — Pemasukan Meningkat (Income Increase Alert)

**Entitas yang dipantau:** Transaksi Pemasukan (bulan berjalan vs bulan lalu)

**Kondisi pemicu (pseudocode):**
```
Program Evaluasi Pemasukan Meningkat (PR-02)
Deklarasi
    pemasukanBulanIni    : bilangan real
    pemasukanBulanLalu   : bilangan real
    persentaseKenaikan   : bilangan bulat
    selisihNominal       : bilangan real
    rekomendasiTabungan  : bilangan real  { 50% dari selisih kenaikan }

Algoritma
    IF pemasukanBulanLalu <= 0 THEN RETURN  { tidak ada basis perbandingan }
    IF pemasukanBulanIni <= pemasukanBulanLalu THEN RETURN  { tidak ada kenaikan }

    persentaseKenaikan  ← ROUND((pemasukanBulanIni - pemasukanBulanLalu)
                                 / pemasukanBulanLalu × 100)

    IF persentaseKenaikan >= 10 THEN
        selisihNominal      ← pemasukanBulanIni - pemasukanBulanLalu
        rekomendasiTabungan ← selisihNominal / 2

        OUTPUT Insight("Pemasukan Meningkat", urgensi=positive)
    END IF
```

**Keluaran:** Judul "Pemasukan Meningkat", tingkat urgensi *positive*, tombol aksi ke `/wallets`.

**Jenis keluaran:** Nudge (Digital Nudging — Momentum Finansial Positif dengan Rekomendasi Aksi). Rule ini tidak hanya merayakan kenaikan penghasilan, tetapi langsung menyertakan rekomendasi konkret: menyisihkan 50% dari selisih kenaikan ke dana darurat. Ini menerapkan prinsip *pay yourself first* — mengunci sebagian keuntungan sebelum tergoda untuk menghabiskannya.

---

## Rule BG-02 — Pemulihan Anggaran Berhasil (Budget Recovery)

**Entitas yang dipantau:** Anggaran × Transaksi Pengeluaran (riwayat 2 bulan)

**Kondisi pemicu (pseudocode):**
```
Program Evaluasi Pemulihan Anggaran Berhasil (BG-02)
Deklarasi
    anggaran       : data anggaran yang dievaluasi
    pengeluaranM1  : bilangan real  { realisasi pengeluaran 1 bulan lalu }
    pengeluaranM2  : bilangan real  { realisasi pengeluaran 2 bulan lalu }
    selisihHemat   : bilangan real

Algoritma
    FOR EACH anggaran DO
        IF anggaran.batasNominal = 0 THEN SKIP

        pengeluaranM1 ← SUM transaksi.nominal
                        WHERE kategoriId = anggaran.kategoriId AND tipe = 'EXPENSE' AND periode = M-1
        pengeluaranM2 ← SUM transaksi.nominal
                        WHERE kategoriId = anggaran.kategoriId AND tipe = 'EXPENSE' AND periode = M-2

        { Kondisi: M-2 over-budget, M-1 berhasil kembali di bawah batas }
        IF pengeluaranM2 > anggaran.batasNominal
        AND pengeluaranM1 <= anggaran.batasNominal
        AND pengeluaranM1 < pengeluaranM2 THEN
            selisihHemat ← pengeluaranM2 - pengeluaranM1
            OUTPUT Insight("Pemulihan Anggaran Berhasil", urgensi=positive)
            RETURN  { kembalikan anggaran pertama yang memenuhi syarat }
        END IF
    END FOR
```

**Keluaran:** Judul "Pemulihan Anggaran Berhasil", tingkat urgensi *positive*, tombol aksi ke `/budgets`.

**Jenis keluaran:** Nudge (Digital Nudging — Validasi Perilaku Perbaikan Diri). Rule ini mendeteksi siklus pemulihan: jatuh (over-budget), lalu bangkit (kembali terkendali). Memberikan apresiasi pada momen ini sangat penting secara psikologis — ini bukan hanya tentang angka, tetapi tentang memvalidasi usaha nyata pengguna untuk memperbaiki kebiasaannya.

---

## Rule FT-03 — Konsistensi Target Terjaga (Target Streak)

**Entitas yang dipantau:** Target Finansial (aktif, tipe bulanan) × Transaksi Pemasukan (3 bulan terakhir)

**Kondisi pemicu (pseudocode):**
```
Program Evaluasi Konsistensi Target Terjaga (FT-03)
Deklarasi
    target        : data target finansial aktif bertipe bulanan
    nominalTarget : bilangan real
    pemasukanM1   : bilangan real  { realisasi pemasukan 1 bulan lalu }
    pemasukanM2   : bilangan real  { realisasi pemasukan 2 bulan lalu }
    pemasukanM3   : bilangan real  { realisasi pemasukan 3 bulan lalu }

Algoritma
    FOR EACH target DO
        IF target.aktif = false THEN SKIP
        IF target.periodeTarget != 'MONTHLY' THEN SKIP

        nominalTarget ← target.nominalTarget

        pemasukanM1 ← SUM transaksi.nominal WHERE kategoriId = target.kategoriId
                      AND tipe = 'INCOME' AND periode = M-1
        pemasukanM2 ← SUM ... WHERE periode = M-2
        pemasukanM3 ← SUM ... WHERE periode = M-3

        IF pemasukanM1 >= nominalTarget
        AND pemasukanM2 >= nominalTarget
        AND pemasukanM3 >= nominalTarget THEN
            OUTPUT Insight("Konsistensi Target Terjaga", urgensi=positive)
            RETURN
        END IF
    END FOR
```

**Keluaran:** Judul "Konsistensi Target Terjaga", tingkat urgensi *positive*, tombol aksi ke `/targets`.

**Jenis keluaran:** Nudge (Digital Nudging — Penghargaan Konsistensi Jangka Panjang). Rule ini memanfaatkan konsep *streak reward* yang terbukti efektif dalam desain produk berbasis kebiasaan (*habit-forming products*). Konsistensi 3 bulan berturut-turut melampaui target adalah pencapaian yang patut dirayakan, dan apresiasi ini mendorong pengguna untuk melanjutkan kebiasaan positif tersebut.

---

## Rule FALLBACK — Pola Pengeluaran Stabil (Empathetic Fallback)

**Entitas yang dipantau:** Semua indikator analitik (bulan berjalan)

**Kondisi pemicu (pseudocode):**
```
Program Evaluasi Fallback — Pola Pengeluaran Stabil
Deklarasi
    daftarInsightYangDihasilkan : larik insight  { hasil dari semua rule sebelumnya }
    totalPengeluaranBulanIni    : bilangan real

Algoritma
    { Rule ini hanya aktif jika tidak ada satu pun rule lain yang menghasilkan insight }
    IF COUNT daftarInsightYangDihasilkan = 0
    AND totalPengeluaranBulanIni > 0 THEN
        OUTPUT Insight("Pola Pengeluaran Stabil", urgensi=neutral)
    END IF
```

**Keluaran:** Judul "Pola Pengeluaran Stabil", tingkat urgensi *neutral*, tombol aksi ke `/transactions`.

**Jenis keluaran:** Nudge (Digital Nudging — Empathetic Default). Rule ini adalah jaring pengaman sistem — memastikan pengguna tidak pernah melihat halaman analitik yang kosong dan merasa diabaikan oleh sistem. Pesan "Pola Pengeluaran Stabil" yang netral dan apresiatif hadir untuk menutup sesi analitik dengan kesan positif, bahkan ketika semua kondisi keuangan berada dalam keadaan terkendali sempurna.

> **Catatan Desain:** Rule ini sengaja ditempatkan pada prioritas tertinggi (4.0) dalam sistem pengurutan berbobot, artinya ia hanya akan muncul *paling terakhir* di antara semua insight — dan hanya jika tidak ada satu pun insight lain yang berhasil dihasilkan. Ini mencerminkan filosofi bahwa "kabar baik" hanya disampaikan saat tidak ada "kabar penting" yang perlu disampaikan lebih dulu.
