# Kelompok 6: Reinforcement Positif & Fallback

Kelompok ini mencakup aturan-aturan yang memberikan umpan balik positif (*positive reinforcement*) atas kebiasaan keuangan yang baik, serta aturan cadangan (*fallback*) saat tidak ada anomali yang terdeteksi. Berbeda dari aturan pemantauan yang berfokus pada variasi atau batas pengeluaran, kelompok ini hadir untuk mengapresiasi kemajuan pengguna secara wajar tanpa kalimat pujian yang berlebihan.

Sesuai kerangka evaluasi tugas akhir:
1. **Tingkat 2: Nudge (Apresiasi)** — Notifikasi positif yang mengonfirmasi surplus kas, pencapaian target, atau pemulihan anggaran berbasis data riil.
2. **Tingkat 1: Insight Pola (Fallback)** — Ringkasan kondisi kas stabil ketika seluruh pos keuangan berada dalam batas aman dan tidak memicu notifikasi khusus.

---

## Rule PR-01 — Surplus Mingguan (Weekly Savings)

**Entitas yang dipantau:** Transaksi Pemasukan dan Pengeluaran (7 hari terakhir)

**Kondisi pemicu (pseudocode):**
```
Program Evaluasi Surplus Mingguan (PR-01)
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
                     "Selisih pemasukan dan pengeluaran 7 hari terakhir tercatat positif sebesar " + formatMataUang(tabungan7Hari) + ".",
                     urgensi=positive,
                     ctaLabel="Lihat Rincian",
                     ctaRoute="/transactions")
    END IF
```

**Keluaran:** Judul *"Surplus Mingguan"*, tingkat urgensi *positive*, pesan: *"Selisih pemasukan dan pengeluaran 7 hari terakhir tercatat positif sebesar Rp {nominal}"*, dan tombol aksi *"Lihat Rincian"* (`/transactions`).
**Jenis keluaran:** Tingkat 2: Nudge. Menginformasikan selisih positif antara pemasukan dan pengeluaran selama 7 hari terakhir, memberikan konfirmasi faktual atas surplus kas yang berhasil disisihkan.

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
                     ctaLabel="Lihat Target",
                     ctaRoute="/targets")
    END IF
```

**Keluaran:** Judul *"Pemasukan Meningkat"*, tingkat urgensi *positive*, pesan: *"Pemasukan naik {persentase}% (+{selisihNominal}). Tersedia ruang tambahan untuk mempercepat pencapaian target keuangan"*, dan tombol aksi *"Lihat Target"* (`/targets`).
**Jenis keluaran:** Tingkat 2: Nudge. Memberikan notifikasi positif saat total pemasukan bulan berjalan meningkat minimal 10% dibanding bulan sebelumnya, sekaligus menyarankan pemanfaatan dana lebih untuk mengisi target keuangan.

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
        pengeluaranM2 ← SUM ... WHERE periode = M-2

        { Kondisi: M-2 over-budget, M-1 kembali di bawah batas alokasi }
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

**Keluaran:** Judul *"Pemulihan Alokasi Anggaran"*, tingkat urgensi *positive*, pesan: *"Bulan lalu realisasi pengeluaran '{kategori}' kembali berada dalam batas alokasi anggaran (selisih {selisihHemat} dibanding bulan sebelumnya)"*, dan tombol aksi *"Lihat Anggaran"* (`/budgets`).
**Jenis keluaran:** Tingkat 2: Nudge. Mengapresiasi keberhasilan mengendalikan pengeluaran pada kategori yang di bulan lalu sempat melampaui batas alokasi, namun di bulan ini berhasil dijaga dalam batas aman.

---

## Rule FT-03 — Konsistensi Target Terjaga (Target Streak)

**Entitas yang dipantau:** Target Keuangan Aktif (tipe bulanan) × Transaksi Pemasukan (riwayat 3 bulan)

**Kondisi pemicu (pseudocode):**
```
Program Evaluasi Konsistensi Target Terjaga (FT-03)
Deklarasi
    target        : data target keuangan aktif bertipe bulanan
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
                         "Target Keuangan '" + target.nama + "' tercapai selama " + streakCount + " bulan berturut-turut.",
                         urgensi=positive,
                         ctaLabel="Lihat Target",
                         ctaRoute="/targets")
            RETURN
        END IF
    END FOR
```

**Keluaran:** Judul *"Konsistensi Target Terjaga"*, tingkat urgensi *positive*, pesan: *"Target Keuangan '{namaTarget}' tercapai selama {streakCount} bulan berturut-turut"*, dan tombol aksi *"Lihat Target"* (`/targets`).
**Jenis keluaran:** Tingkat 2: Nudge. Mengapresiasi konsistensi pencapaian target bulanan yang berhasil dipenuhi selama 3 bulan berturut-turut.

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

**Keluaran:** Judul *"Pola Pengeluaran Stabil"*, tingkat urgensi *neutral*, pesan: *"Arus kas bulan ini berjalan stabil. Tinjauan berkala membantu memastikan perencanaan tetap pada jalurnya"*, dan tombol aksi *"Lihat Transaksi"* (`/transactions`).
**Jenis keluaran:** Tingkat 1: Insight Pola. Berfungsi sebagai pesan cadangan (*fallback*) ketika seluruh pos keuangan berada dalam batas aman dan tidak memicu kondisi aturan lain, memastikan tampilan ringkasan dasbor tetap informatif dan tidak kosong.
