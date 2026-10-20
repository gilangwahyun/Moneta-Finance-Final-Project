# Kelompok 4: Dompet (Wallets)

Kelompok ini mencakup aturan-aturan yang memantau kesehatan likuiditas dompet pengguna dan kebiasaan penggunaan instrumen pembayaran. Penerapan prinsip **Calm UI** dan **Choice Architecture (Richard Thaler)** pada kelompok dompet berfokus pada penyajian cermin data likuiditas yang tenang tanpa memicu kecemasan finansial saat saldo mendekati batas bawah, melainkan memberikan kesadaran (*ambient liquidity awareness*) dan menjaga ketersediaan dana operasional.

Seluruh luaran diklasifikasikan ke dalam **Taksonomi 3 Tingkat Luaran** hasil revisi sidang:
1. **Tingkat 1: Insight Pola (Faktual/Deskriptif)** — Mengidentifikasi afinitas atau konsentrasi penggunaan dompet tanpa atribusi benar/salah.
2. **Tingkat 2: Nudge (Choice Architecture)** — Menghadirkan *salience* terhadap kondisi likuiditas atau percepatan laju pengeluaran kas (*burn rate*) secara objektif.
3. **Tingkat 3: Saran Eksekutif (Rekomendasi Tindakan)** — Memberikan opsi relokasi likuiditas atau penyesuaian dompet sumber saat terdeteksi selisih alokasi.

---

## Rule WL-02 — Kilas Saldo Dompet (Low Cash Snapshot)

> **Catatan Pembaruan Calm UI:** Menggunakan judul netral *"Kilas Saldo Dompet"* dengan severity informatif netral (`info`) untuk memberikan kesadaran likuiditas objektif tanpa alarmisme.

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
                         "Saldo dompet '" + dompet.nama + "' saat ini tercatat " + formatMataUang(saldo) + ".",
                         urgensi=info,
                         ctaLabel="Lihat Dompet",
                         ctaRoute="/wallets")
            RETURN  { kembalikan dompet pertama yang ditemukan }
        END IF
    END FOR
```

**Keluaran UI:**
- **Judul:** `"Kilas Saldo Dompet"`
- **Pesan:** `"Saldo dompet '{namaDompet}' saat ini tercatat {saldo}."`
- **Tingkat Urgensi / Severity:** `info` (Prioritas evaluasi: 0.5)
- **Tombol Aksi (CTA):** `"Lihat Dompet"` &rarr; `/wallets`

**Klasifikasi Luaran:** **Tingkat 2: Nudge (Digital Nudging — Refleksi Likuiditas Faktual)**. Rule ini menghitung saldo riil dompet dengan menelusuri seluruh riwayat transaksi (termasuk mutasi transfer antar-dompet). Pendekatan Calm UI memastikan fakta saldo disajikan secara jernih tanpa kalimat menghakimi, sehingga pengguna secara mandiri memutuskan apakah perlu melakukan isi ulang saldo (*top up*) atau mengalihkan pengeluaran harian.

---

## Rule WL-01 — Dinamika Pengeluaran Dompet (Wallet Drain Rate)

> **Catatan Pembaruan Calm UI:** Sebelumnya berjudul *"Saldo Dompet Turun Cepat"*. Diperbarui menjadi *"Dinamika Pengeluaran Dompet"* dengan severity informatif (`info`) yang memaparkan fakta rasio laju pengeluaran harian (*burn rate*) secara terukur.

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

    IF hariIni < 7 THEN RETURN  { data bulan ini belum representatif }

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

**Keluaran UI:**
- **Judul:** `"Dinamika Pengeluaran Dompet"`
- **Pesan:** `"Laju pengeluaran dari dompet '{namaDompet}' bulan ini tercatat 1,5× lebih cepat dibanding bulan sebelumnya."`
- **Tingkat Urgensi / Severity:** `info` (Prioritas evaluasi: 1.8)
- **Tombol Aksi (CTA):** `"Lihat Dompet"` &rarr; `/wallets`

**Klasifikasi Luaran:** **Tingkat 2: Nudge (Digital Nudging — Pemantauan Akselerasi Pengeluaran / Burn Rate)**. Rule ini tidak mengevaluasi saldo absolut, melainkan akselerasi tempo pengurasan dana. Dengan menyajikan kelipatan laju (1,5× lipat) secara objektif, pengguna terbantu untuk mengantisipasi dinamika ketersediaan kas sebelum siklus pemasukan berikutnya tiba.

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
                           "Sebagian besar transaksimu bulan ini (" + ROUND(rasio * 100) + "%) dicatat menggunakan dompet '" + dompet.nama + "'.",
                           urgensi=neutral,
                           ctaLabel="Lihat Dompet",
                           ctaRoute="/wallets")
            RETURN
        END IF
    END FOR
```

**Keluaran UI:**
- **Judul:** `"Penggunaan Dompet Dominan"`
- **Pesan:** `"Sebagian besar transaksimu bulan ini ({persentase}%) dicatat menggunakan dompet '{namaDompet}'."`
- **Tingkat Urgensi / Severity:** `neutral` (Prioritas evaluasi: 3.9)
- **Tombol Aksi (CTA):** `"Lihat Dompet"` &rarr; `/wallets`

**Klasifikasi Luaran:** **Tingkat 1: Insight Pola (Faktual/Deskriptif — Observasi Kebiasaan Instrumen Pembayaran)**. Rule ini mengidentifikasi konsentrasi transaksi pada satu dompet utama (misal rekening gaji atau satu e-wallet tertentu) di antara beberapa dompet yang terdaftar, berguna bagi pengguna untuk meninjau apakah pemisahan pos rekening fungsional telah berjalan efektif.

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
                               "Sekadar info: " + ROUND(rasioDompet * 100) + "% pengeluaran '" + kategori.nama + "'-mu selalu menggunakan dompet '" + dompet.nama + "'.",
                               urgensi=neutral,
                               ctaLabel="Lihat Dompet",
                               ctaRoute="/wallets")
                RETURN
            END IF
        END FOR
    END FOR
```

**Keluaran UI:**
- **Judul:** `"Pola Penggunaan Dompet"`
- **Pesan:** `"Sekadar info: {persentase}% pengeluaran '{kategori}'-mu selalu menggunakan dompet '{namaDompet}'."`
- **Tingkat Urgensi / Severity:** `neutral` (Prioritas evaluasi: 3.8)
- **Tombol Aksi (CTA):** `"Lihat Dompet"` &rarr; `/wallets`

**Klasifikasi Luaran:** **Tingkat 1: Insight Pola (Faktual/Deskriptif — Observasi Afinitas Kategori-Dompet)**. Menangkap kebiasaan implisit pengguna (misalnya: alokasi pesan-antar makanan 90% selalu dibayar lewat GoPay), membantu pengguna memahami *mental accounting* sehari-hari tanpa memaksakan perubahan perilaku untuk memastikan strategi alokasi dana tetap sesuai rencana.
