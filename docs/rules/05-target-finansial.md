# Kelompok 5: Target Keuangan (Financial Targets)

Kelompok ini mencakup aturan-aturan yang memantau pencapaian Target Keuangan pengguna, baik perbandingan antara progres tabungan terhadap durasi waktu target, maupun perbandingan antara total belanja terhadap sasaran target. Seluruh informasi disajikan dengan pendekatan antarmuka tenang (*Calm UI*), berfokus pada penyampaian fakta posisi progres secara objektif agar pengguna dapat mengevaluasi komitmen tabungannya secara mandiri.

### Pembaruan Model Relasi Target (Revisi Sidang Skripsi)
Sesuai hasil revisi sidang skripsi:
1. **Relasi 1:N Kategori ke Target**: Satu kategori pemasukan kini dapat memiliki banyak Target Keuangan aktif secara fleksibel.
2. **Atribut Alokasi Langsung (`financialTargetId`)**: Setiap transaksi pemasukan memiliki atribut opsional `financialTargetId` untuk mengalokasikan pemasukan secara spesifik ke suatu Target Keuangan, menghindari ambiguitas pemisahan dana antar-target dalam kategori yang sama.
3. **Periode Efektif Bergulir (*Rollover*)**: Target dengan periode harian (`DAILY`), mingguan (`WEEKLY`), dan bulanan (`MONTHLY`) otomatis memperbarui jendela waktu aktifnya ke periode berjalan.

Sesuai kerangka evaluasi tugas akhir, seluruh luaran pada kelompok ini tergolong ke dalam **Tingkat 2: Nudge**, yaitu pengingat berbasis data untuk membantu pengguna menjaga konsistensi rencana keuangannya.

---

## Rule FT-01 — Posisi Progres Target (Target Gap Alert)

> **Catatan Pembaruan Calm UI:** Menggunakan judul netral *"Posisi Progres Target"* dengan pesan yang membandingkan persentase waktu yang telah berjalan dengan persentase capaian dana secara objektif tanpa nada mendesak.

**Entitas yang dipantau:** Target Keuangan Aktif × Transaksi Pemasukan (dalam jendela periode efektif target)

**Kondisi pemicu (pseudocode):**
```
Program Evaluasi Posisi Progres Target (FT-01)
Deklarasi
    target               : data target keuangan aktif
    periodeMulai         : tanggal  { awal periode efektif target }
    periodeSelesai       : tanggal  { akhir periode efektif target }
    totalHari            : bilangan bulat
    hariTelahBerlalu     : bilangan bulat
    proporsiWaktuBerlalu : bilangan real
    totalPemasukanTarget : bilangan real
    progresPersen        : bilangan bulat

Algoritma
    FOR EACH target IN semuaTargetAktif DO
        IF target.aktif = false THEN SKIP

        rentangEfektif ← AmbilRentangTanggalEfektif(target, hariIni)
        IF rentangEfektif KOSONG THEN SKIP  { target di luar jendela waktu aktif }

        periodeMulai   ← rentangEfektif.awal
        periodeSelesai ← rentangEfektif.akhir

        totalHari            ← MAX(1, selisih hari antara periodeMulai dan periodeSelesai)
        hariTelahBerlalu     ← selisih hari antara periodeMulai dan hariIni
        proporsiWaktuBerlalu ← MIN(1.0, MAX(0.0, hariTelahBerlalu / totalHari))

        IF proporsiWaktuBerlalu < 0,3 THEN SKIP  { evaluasi hanya setelah 30% periode berjalan }

        { Hitung pemasukan yang teralokasi langsung ke target ini }
        totalPemasukanTarget ← SUM transaksi.nominal
                               WHERE tipe = 'INCOME'
                               AND transaksi.financialTargetId = target.id
                               AND transaksi.tanggal >= periodeMulai
                               AND transaksi.tanggal <= periodeSelesai

        progresPersen ← ROUND((totalPemasukanTarget / target.nominalTarget) × 100)

        IF progresPersen < ROUND(proporsiWaktuBerlalu * 100) THEN
            OUTPUT Nudge("Posisi Progres Target",
                         "Target '" + target.nama + "' berada di " + ROUND(proporsiWaktuBerlalu * 100) + "% periode waktunya, dengan progres " + progresPersen + "%.",
                         urgensi=warning,
                         ctaLabel="Lihat Target",
                         ctaRoute="/targets")
            RETURN  { jika ada multi-target, pilih target dengan proporsi waktu terlewat terbesar }
        END IF
    END FOR
```

**Keluaran:** Judul *"Posisi Progres Target"*, tingkat urgensi *warning*, pesan: *"Target '{namaTarget}' berada di {persentaseWaktu}% periode waktunya, dengan progres {progressPct}%"*, dan tombol aksi *"Lihat Target"* (`/targets`).
**Jenis keluaran:** Tingkat 2: Nudge. Mengingatkan pengguna jika proporsi waktu target telah berjalan lebih jauh dibanding persentase dana yang terkumpul (misal waktu berjalan 50% namun dana baru terkumpul 30%), membantu pengguna mengevaluasi ritme menabung secara mandiri.

---

## Rule FT-02 — Pengeluaran vs Target Keuangan (Target Progress Impact)

**Entitas yang dipantau:** Target Keuangan Aktif × Seluruh Transaksi Pengeluaran (dalam periode efektif target)

**Kondisi pemicu (pseudocode):**
```
Program Evaluasi Pengeluaran vs Target Keuangan (FT-02)
Deklarasi
    target                      : data target keuangan aktif
    nominalTarget               : bilangan real
    periodeMulai                : timestamp awal periode target
    periodeSelesai              : timestamp akhir periode target
    totalPengeluaranDalamPeriode: bilangan real
    persentaseBanding           : bilangan bulat

Algoritma
    FOR EACH target IN semuaTargetAktif DO
        IF target.aktif = false THEN SKIP

        nominalTarget  ← target.nominalTarget
        rentangEfektif ← AmbilRentangTanggalEfektif(target, hariIni)
        IF rentangEfektif KOSONG THEN SKIP

        periodeMulai   ← rentangEfektif.awal
        periodeSelesai ← rentangEfektif.akhir

        totalPengeluaranDalamPeriode ← SUM transaksi.nominal
                                       WHERE tipe = 'EXPENSE'
                                       AND tanggal >= periodeMulai
                                       AND tanggal <= periodeSelesai

        { Picu jika akumulasi pengeluaran melampaui 80% dari target nominal }
        IF totalPengeluaranDalamPeriode > nominalTarget × 0,8 THEN
            persentaseBanding ← ROUND((totalPengeluaranDalamPeriode / nominalTarget) × 100)

            OUTPUT Nudge("Pengeluaran vs Target Keuangan",
                         "Total pengeluaran (" + formatMataUang(totalPengeluaranDalamPeriode) + ") setara " + persentaseBanding + "% dari sasaran Target Keuangan '" + target.nama + "' (" + formatMataUang(nominalTarget) + ").",
                         urgensi=info,
                         ctaLabel="Lihat Target",
                         ctaRoute="/targets")
            RETURN  { prioritaskan target dengan rasio pengeluaran tertinggi }
        END IF
    END FOR
```

**Keluaran:** Judul *"Pengeluaran vs Target Keuangan"*, tingkat urgensi *info*, pesan: *"Total pengeluaran (Rp {pengeluaran}) setara {persentase}% dari sasaran Target Keuangan '{namaTarget}' (Rp {targetAmount})"*, dan tombol aksi *"Lihat Target"* (`/targets`).
**Jenis keluaran:** Tingkat 2: Nudge. Menampilkan perbandingan nominal belanja terhadap sasaran target keuangan yang sedang berjalan, membantu pengguna menyadari keseimbangan antara pengeluaran dengan komitmen tabungan.

---

## Hubungan dengan Rule Apresiasi Target (FT-03)
Pelacakan target keuangan juga dilengkapi dengan aturan penguatan positif jangka panjang:
- **Rule FT-03 — Konsistensi Target Terjaga (Target Streak)**: Memberikan apresiasi ketika Target Keuangan tercapai selama beberapa bulan berturut-turut. Dokumentasi lengkap aturan ini dibahas pada [Kelompok 6: Reinforcement Positif & Fallback](file:///c:/moneta-finance-final-project/docs/rules/06-reinforcement-positif-dan-fallback.md#rule-ft-03--konsistensi-target-terjaga-target-streak).
