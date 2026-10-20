# Kelompok 6: Reinforcement Positif & Fallback

Kelompok ini mencakup aturan-aturan yang bersifat membangun dan apresiatif (*positive reinforcement*). Berbeda dengan kelompok anomali alokasi, kelompok ini hadir untuk memvalidasi pencapaian, menjaga momentum kebiasaan baik (*habit-forming streaks*), dan memastikan pengguna selalu memperoleh umpan balik yang menenteramkan dari sistem (*calm & empathetic reassurance*).

Sesuai prinsip **Calm UI** dan **Choice Architecture (Richard Thaler)**:
- Nudge apresiasi tidak menggunakan animasi yang berlebihan, pujian hiperbolis, atau gamifikasi yang membebani kognisi, melainkan memberikan penegasan objektif (*positive validation*) yang memperkuat efikasi diri (*self-efficacy*).
- Luaran apresiasi masuk ke dalam **Tingkat 2: Nudge (Nudge Apresiasi)**, sedangkan aturan fallback netral berfungsi sebagai **Tingkat 1: Insight Pola (Empathetic Default)**.

---

## Rule PR-01 — Surplus Mingguan (Weekly Savings)

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
        OUTPUT Nudge("Surplus Mingguan",
                     "Kamu berhasil menyisakan saldo positif " + formatMataUang(tabungan7Hari) + " pada 7 hari terakhir. Kebiasaan pencatatan berjalan teratur.",
                     urgensi=positive,
                     ctaLabel="Lihat Rincian",
                     ctaRoute="/transactions")
    END IF
```

**Keluaran UI:**
- **Judul:** `"Surplus Mingguan"`
- **Pesan:** `"Kamu berhasil menyisakan saldo positif {nominal} pada 7 hari terakhir. Kebiasaan pencatatan berjalan teratur."`
- **Tingkat Urgensi / Severity:** `positive` (Prioritas evaluasi: 3.5)
- **Tombol Aksi (CTA):** `"Lihat Rincian"` &rarr; `/transactions`

**Klasifikasi Luaran:** **Tingkat 2: Nudge (Digital Nudging — Nudge Apresiasi / Penguatan Perilaku Mingguan)**. Mengimplementasikan prinsip *positive reinforcement*. Menampilkan surplus kas mingguan membantu membangun rasa kendali keuangan (*sense of financial agency*) secara bertahap.

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

Algoritma
    IF pemasukanBulanLalu <= 0 THEN RETURN  { tidak ada basis perbandingan }
    IF pemasukanBulanIni <= pemasukanBulanLalu THEN RETURN  { tidak ada kenaikan }

    persentaseKenaikan  ← ROUND((pemasukanBulanIni - pemasukanBulanLalu)
                                 / pemasukanBulanLalu × 100)

    IF persentaseKenaikan >= 10 THEN
        selisihNominal ← pemasukanBulanIni - pemasukanBulanLalu

        OUTPUT Nudge("Pemasukan Meningkat",
                     "Pemasukan naik " + persentaseKenaikan + "% (+" + formatMataUang(selisihNominal) + "). Tersedia ruang tambahan untuk mempercepat pencapaian target keuangan.",
                     urgensi=positive,
                     ctaLabel="Kelola Dompet",
                     ctaRoute="/wallets")
    END IF
```

**Keluaran UI:**
- **Judul:** `"Pemasukan Meningkat"`
- **Pesan:** `"Pemasukan naik {persentase}% (+{selisihNominal}). Tersedia ruang tambahan untuk mempercepat pencapaian target keuangan."`
- **Tingkat Urgensi / Severity:** `positive` (Prioritas evaluasi: 3.6)
- **Tombol Aksi (CTA):** `"Kelola Dompet"` &rarr; `/wallets`

**Klasifikasi Luaran:** **Tingkat 2: Nudge (Digital Nudging — Nudge Apresiasi & Arsitektur Keputusan Surplus)**. Menghubungkan kenaikan arus kas masuk dengan peluang mempercepat target masa depan. Menerapkan konsep *mental accounting* positif agar pengguna mengalokasikan surplus ke tabungan/investasi secara sadar.

---

## Rule BG-02 — Pemulihan Alokasi Anggaran (Budget Recovery)

**Entitas yang dipantau:** Anggaran × Transaksi Pengeluaran (riwayat 2 bulan)

**Kondisi pemicu (pseudocode):**
```
Program Evaluasi Pemulihan Alokasi Anggaran (BG-02)
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

            OUTPUT Nudge("Pemulihan Alokasi Anggaran",
                         "Bulan lalu realisasi pengeluaran '" + anggaran.kategori.nama + "' kembali berada dalam batas alokasi anggaran (selisih " + formatMataUang(selisihHemat) + " dibanding bulan sebelumnya).",
                         urgensi=positive,
                         ctaLabel="Lihat Anggaran",
                         ctaRoute="/budgets")
            RETURN  { kembalikan anggaran pertama yang memenuhi syarat }
        END IF
    END FOR
```

**Keluaran UI:**
- **Judul:** `"Pemulihan Alokasi Anggaran"`
- **Pesan:** `"Bulan lalu realisasi pengeluaran '{kategori}' kembali berada dalam batas alokasi anggaran (selisih {selisihHemat} dibanding bulan sebelumnya)."`
- **Tingkat Urgensi / Severity:** `positive` (Prioritas evaluasi: 3.4)
- **Tombol Aksi (CTA):** `"Lihat Anggaran"` &rarr; `/budgets`

**Klasifikasi Luaran:** **Tingkat 2: Nudge (Digital Nudging — Nudge Apresiasi / Validasi Perbaikan Kebiasaan)**. Memvalidasi usaha pemulihan (*resilience*). Mengapresiasi momen ketika pengguna yang sebelumnya melampaui batas alokasi berhasil memulihkan disiplin anggarannya di bulan berikutnya.

---

## Rule FT-03 — Konsistensi Target Terjaga (Target Streak)

**Entitas yang dipantau:** Target Finansial Aktif (tipe bulanan) × Transaksi Pemasukan (riwayat 3 bulan)

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

        pemasukanM1 ← SUM transaksi.nominal WHERE (financialTargetId = target.id OR kategoriId = target.kategoriId)
                      AND tipe = 'INCOME' AND periode = M-1
        pemasukanM2 ← SUM ... WHERE periode = M-2
        pemasukanM3 ← SUM ... WHERE periode = M-3

        IF pemasukanM1 >= nominalTarget
        AND pemasukanM2 >= nominalTarget
        AND pemasukanM3 >= nominalTarget THEN
            OUTPUT Nudge("Konsistensi Target Terjaga",
                         "Target pemasukan '" + target.nama + "' berhasil tercapai selama " + streakCount + " bulan berturut-turut.",
                         urgensi=positive,
                         ctaLabel="Lihat Target",
                         ctaRoute="/targets")
            RETURN
        END IF
    END FOR
```

**Keluaran UI:**
- **Judul:** `"Konsistensi Target Terjaga"`
- **Pesan:** `"Target pemasukan '{namaTarget}' berhasil tercapai selama {streakCount} bulan berturut-turut."`
- **Tingkat Urgensi / Severity:** `positive` (Prioritas evaluasi: 3.5)
- **Tombol Aksi (CTA):** `"Lihat Target"` &rarr; `/targets`

**Klasifikasi Luaran:** **Tingkat 2: Nudge (Digital Nudging — Nudge Apresiasi / Habit-Forming Streak Reward)**. Memanfaatkan efek psikologis konsistensi (*streak*) untuk mempertahankan disiplin pencatatan dan realisasi target keuangan jangka menengah secara wajar.

---

## Rule FALLBACK (FB-01) — Pola Pengeluaran Stabil (Empathetic Fallback)

**Entitas yang dipantau:** Seluruh luaran evaluasi engine analitik pada bulan berjalan

**Kondisi pemicu (pseudocode):**
```
Program Evaluasi Fallback — Pola Pengeluaran Stabil (FB-01)
Deklarasi
    daftarInsightYangDihasilkan : larik insight  { hasil dari semua rule sebelumnya }
    totalPengeluaranBulanIni    : bilangan real

Algoritma
    { Rule ini hanya aktif jika tidak ada satu pun rule anomali/nudge lain yang terpicu }
    IF COUNT daftarInsightYangDihasilkan = 0
    AND totalPengeluaranBulanIni > 0 THEN
        OUTPUT Insight("Pola Pengeluaran Stabil",
                       "Arus kas bulan ini berjalan stabil. Tinjauan berkala membantu memastikan perencanaan tetap pada jalurnya.",
                       urgensi=neutral,
                       ctaLabel="Lihat Transaksi",
                       ctaRoute="/transactions")
    END IF
```

**Keluaran UI:**
- **Judul:** `"Pola Pengeluaran Stabil"`
- **Pesan:** `"Arus kas bulan ini berjalan stabil. Tinjauan berkala membantu memastikan perencanaan tetap pada jalurnya."`
- **Tingkat Urgensi / Severity:** `neutral` (Prioritas evaluasi: 4.0 — prioritas paling rendah)
- **Tombol Aksi (CTA):** `"Lihat Transaksi"` &rarr; `/transactions`

**Klasifikasi Luaran:** **Tingkat 1: Insight Pola (Faktual/Deskriptif — Empathetic Default / Jaring Pengaman Antarmuka)**. Menjamin prinsip *empty-state transparency* pada Calm UI — pengguna tidak dibiarkan menghadapi layar kosong tanpa kepastian. Ketika kondisi keuangan pengguna sehat dan tidak memiliki anomali, sistem menyajikan cermin penenteram bahwa kondisi keuangan berada dalam koridor stabil.
