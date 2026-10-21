# Kelompok 4: Dompet (Wallets)

Kelompok ini mencakup aturan-aturan yang memantau saldo dompet pengguna dan kebiasaan pemilihan sumber dana saat bertransaksi. Seluruh informasi disajikan dengan pendekatan antarmuka tenang (*Calm UI*), berfokus pada penyampaian fakta posisi dana secara objektif tanpa menimbulkan kekhawatiran.

Sesuai kerangka evaluasi tugas akhir, luaran diklasifikasikan ke dalam **Taksonomi 3 Tingkat**:
1. **Tingkat 1: Insight Pola** — Informasi faktual atau deskriptif mengenai pola dan posisi keuangan.
2. **Tingkat 2: Nudge** — Pengingat atau dorongan halus berbasis data untuk membantu pengguna mengelola keuangan secara mandiri.
3. **Tingkat 3: Saran Eksekutif** — Rekomendasi tindakan spesifik yang dapat langsung dieksekusi oleh pengguna.

---

## Rule WL-02 — Kilas Saldo Dompet (Low Cash Snapshot)

> **Catatan Pembaruan Calm UI:** Menggunakan judul netral *"Kilas Saldo Dompet"* dengan tingkat urgensi informatif (*info*) untuk menyajikan posisi saldo secara objektif tanpa alarmisme.

**Entitas yang dipantau:** Dompet × Seluruh Riwayat Transaksi

**Kondisi pemicu (pseudocode):**
```
Program Evaluasi Kilas Saldo Dompet (WL-02)
Deklarasi
    bulanUnik                : bilangan bulat  { jumlah bulan berbeda dalam riwayat }
    rataRataPengeluaranBulanan: bilangan real
    batasAman                : bilangan real   { ambang saldo minimum yang dianggap aman }
    saldo                    : bilangan real   { saldo aktual dompet dari riwayat transaksi }

Algoritma
    IF semuaDompet KOSONG THEN RETURN

    bulanUnik                 ← COUNT bulan unik dari seluruh riwayat transaksi
    rataRataPengeluaranBulanan← SUM transaksi.nominal WHERE tipe = 'EXPENSE'
                                / MAX(1, bulanUnik)
    batasAman ← MAX(100.000, rataRataPengeluaranBulanan × 0,1)

    FOR EACH dompet DO
        IF dompet.tipe = 'INVESTASI' THEN SKIP

        { Hitung saldo riil dari seluruh riwayat transaksi }
        saldo ← dompet.saldoAwal

        FOR EACH transaksi DO
            IF transaksi.dompetId = dompet.id THEN
                IF tipe = 'INCOME'   THEN saldo ← saldo + nominal
                IF tipe = 'EXPENSE'  THEN saldo ← saldo - nominal
                IF tipe = 'TRANSFER' THEN saldo ← saldo - nominal
            END IF
            IF tipe = 'TRANSFER' AND transaksi.dompetTujuanId = dompet.id THEN
                saldo ← saldo + nominal
            END IF
        END FOR

        IF saldo < batasAman THEN
            OUTPUT Nudge("Kilas Saldo Dompet", 
                         "Saldo dompet '" + dompet.nama + "' saat ini tercatat " + formatMataUang(saldo) + " (di bawah ambang " + formatMataUang(batasAman) + ").",
                         urgensi=info,
                         ctaLabel="Lihat Dompet",
                         ctaRoute="/wallets")
            RETURN  { kembalikan dompet pertama yang ditemukan }
        END IF
    END FOR
```

**Keluaran:** Judul *"Kilas Saldo Dompet"*, tingkat urgensi *info*, pesan: *"Saldo dompet '{namaDompet}' saat ini tercatat Rp {saldo} (di bawah ambang Rp {batasAman})"*, dan tombol aksi *"Lihat Dompet"* (`/wallets`).
**Jenis keluaran:** Tingkat 2: Nudge. Menginformasikan bahwa saldo dompet berada di bawah ambang batas aman (10% dari rata-rata pengeluaran bulanan atau minimal Rp100.000), membantu pengguna memperhatikan ketersediaan dana operasional.

---

## Rule WL-01 — Dinamika Pengeluaran Dompet (Wallet Drain Rate)

> **Catatan Pembaruan Calm UI:** Sebelumnya berjudul *"Saldo Dompet Turun Cepat"*. Diperbarui menjadi *"Dinamika Pengeluaran Dompet"* dengan tingkat urgensi informatif (*info*) yang menyajikan perbandingan laju pengeluaran secara terukur.

**Entitas yang dipantau:** Dompet × Transaksi Pengeluaran (bulan ini vs bulan lalu)

**Kondisi pemicu (pseudocode):**
```
Program Evaluasi Laju Pengurasan Dompet (WL-01)
Deklarasi
    hariIni              : bilangan bulat
    hariDalamBulanLalu   : bilangan bulat
    pengeluaranBulanIni  : bilangan real
    pengeluaranBulanLalu : bilangan real
    lajuHarianBulanIni   : bilangan real  { burn rate harian bulan ini }
    lajuHarianBulanLalu  : bilangan real  { burn rate harian bulan lalu }

Algoritma
    IF semuaDompet KOSONG THEN RETURN

    hariIni           ← tanggal hari ini dalam bulan
    hariDalamBulanLalu← jumlah hari dalam bulan lalu

    IF hariIni < 7 THEN RETURN  { data transaksi masih minim }

    FOR EACH dompet DO
        IF dompet.tipe = 'INVESTASI' THEN SKIP

        pengeluaranBulanIni  ← SUM transaksi.nominal
                                WHERE dompetId = dompet.id AND tipe = 'EXPENSE'
                                AND periode = bulan ini
        pengeluaranBulanLalu ← SUM transaksi.nominal
                                WHERE dompetId = dompet.id AND tipe = 'EXPENSE'
                                AND periode = M-1

        lajuHarianBulanIni  ← pengeluaranBulanIni  / hariIni
        lajuHarianBulanLalu ← pengeluaranBulanLalu / hariDalamBulanLalu

        IF lajuHarianBulanLalu > 0
        AND lajuHarianBulanIni > lajuHarianBulanLalu × 1,5 THEN
            OUTPUT Nudge("Dinamika Pengeluaran Dompet",
                         "Laju pengeluaran dari dompet '" + dompet.nama + "' bulan ini tercatat 1,5× lebih cepat dibanding bulan sebelumnya.",
                         urgensi=info,
                         ctaLabel="Lihat Dompet",
                         ctaRoute="/wallets")
            RETURN
        END IF
    END FOR
```

**Keluaran:** Judul *"Dinamika Pengeluaran Dompet"*, tingkat urgensi *info*, pesan: *"Laju pengeluaran dari dompet '{namaDompet}' bulan ini tercatat 1,5× lebih cepat dibanding bulan sebelumnya"*, dan tombol aksi *"Lihat Dompet"* (`/wallets`).
**Jenis keluaran:** Tingkat 2: Nudge. Menginformasikan jika laju pengeluaran harian suatu dompet tercatat 1,5 kali lebih cepat dibanding bulan sebelumnya, membantu pengguna mengantisipasi ketersediaan saldo hingga akhir bulan.

---

## Rule WL-03 — Penggunaan Dompet Dominan (Single Wallet Pattern)

**Entitas yang dipantau:** Transaksi (bulan berjalan) × Dompet

**Kondisi pemicu (pseudocode):**
```
Program Evaluasi Penggunaan Dompet Dominan (WL-03)
Deklarasi
    hitunganPerDompet : kamus { dompetId → jumlah transaksi }
    totalTransaksi    : bilangan bulat
    rasio             : bilangan real

Algoritma
    IF COUNT semuaDompet <= 1 THEN RETURN  { harus ada lebih dari 1 dompet }

    totalTransaksi ← COUNT transaksi bulan ini
    IF totalTransaksi < 5 THEN RETURN

    hitunganPerDompet ← { }

    FOR EACH transaksi bulan ini DO
        IF dompetId ADA THEN
            hitunganPerDompet[dompetId] ← hitunganPerDompet[dompetId] + 1
        END IF
    END FOR

    FOR EACH (dompetId, jumlah) IN hitunganPerDompet DO
        rasio ← jumlah / totalTransaksi

        IF rasio > 0,9 THEN
            OUTPUT Insight("Penggunaan Dompet Dominan",
                           "Sebagian besar transaksi bulan ini (" + ROUND(rasio * 100) + "%) dicatat menggunakan dompet '" + dompet.nama + "'.",
                           urgensi=neutral,
                           ctaLabel="Lihat Dompet",
                           ctaRoute="/wallets")
            RETURN
        END IF
    END FOR
```

**Keluaran:** Judul *"Penggunaan Dompet Dominan"*, tingkat urgensi *neutral*, pesan: *"Sebagian besar transaksi bulan ini ({persentase}%) dicatat menggunakan dompet '{namaDompet}'"*, dan tombol aksi *"Lihat Dompet"* (`/wallets`).
**Jenis keluaran:** Tingkat 1: Insight Pola. Mengidentifikasi jika lebih dari 90% transaksi terpusat pada satu dompet saja, memberikan gambaran mengenai kebiasaan pemilihan metode pembayaran.

---

## Rule WL-04 — Pola Penggunaan Dompet (Wallet-Category Pattern)

**Entitas yang dipantau:** Transaksi Pengeluaran (3 bulan terakhir) × Kategori × Dompet

**Kondisi pemicu (pseudocode):**
```
Program Evaluasi Pola Penggunaan Dompet per Kategori (WL-04)
Deklarasi
    batas3BulanLalu        : tanggal awal bulan, 3 bulan yang lalu
    totalPerKategori       : kamus { kategoriId → total nominal }
    totalDompetPerKategori : kamus { kategoriId → { dompetId → total nominal } }
    top5Kategori           : larik { 5 kategori dengan pengeluaran terbesar }

Algoritma
    totalPerKategori       ← { }
    totalDompetPerKategori ← { }

    FOR EACH transaksi DO
        IF tipe != 'EXPENSE' THEN SKIP
        IF tanggal < batas3BulanLalu THEN SKIP
        IF dompetId KOSONG OR kategoriId KOSONG THEN SKIP

        totalPerKategori[kategoriId]                 ← ... + nominal
        totalDompetPerKategori[kategoriId][dompetId] ← ... + nominal
    END FOR

    top5Kategori ← SORT totalPerKategori DESC, ambil 5 teratas

    FOR EACH kategoriId IN top5Kategori DO
        IF totalPerKategori[kategoriId] < 100.000 THEN SKIP

        FOR EACH (dompetId, nominalDompet) IN totalDompetPerKategori[kategoriId] DO
            rasioDompet ← nominalDompet / totalPerKategori[kategoriId]
            IF rasioDompet >= 0,8 THEN
                OUTPUT Insight("Pola Penggunaan Dompet",
                               "Sebesar " + ROUND(rasioDompet * 100) + "% pengeluaran '" + kategori.nama + "' tercatat menggunakan dompet '" + dompet.nama + "'.",
                               urgensi=neutral,
                               ctaLabel="Lihat Dompet",
                               ctaRoute="/wallets")
                RETURN
            END IF
        END FOR
    END FOR
```

**Keluaran:** Judul *"Pola Penggunaan Dompet"*, tingkat urgensi *neutral*, pesan: *"Sebesar {persentase}% pengeluaran '{kategori}' tercatat menggunakan dompet '{namaDompet}'"*, dan tombol aksi *"Lihat Dompet"* (`/wallets`).
**Jenis keluaran:** Tingkat 1: Insight Pola. Menampilkan hubungan kebiasaan antara kategori belanja tertentu dengan dompet yang paling sering digunakan untuk membayarnya.
