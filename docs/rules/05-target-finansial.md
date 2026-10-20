# Kelompok 5: Target Finansial (Financial Targets)

Kelompok ini mencakup aturan-aturan yang mengawasi kemajuan target finansial pengguna — baik target pemasukan yang belum bergerak, maupun dinamika arus kas akibat laju pengeluaran yang menyaingi target pemasukan. Penerapan prinsip **Calm UI** dan **Choice Architecture (Richard Thaler)** pada kelompok target finansial berfokus pada fungsi cermin waktu (*temporal mirror*) dan penyadaran komitmen (*commitment device*), menyajikan fakta progres tanpa nada menghakimi sehingga pengguna terdorong bertindak secara mandiri.

### Pembaruan Model Relasi Target (Revisi Sidang Skripsi)
Sesuai hasil revisi sidang skripsi:
1. **Relasi 1:N Kategori ke Target**: Satu kategori pemasukan kini dapat memiliki banyak target finansial aktif secara fleksibel.
2. **Atribut Alokasi Langsung (`financialTargetId`)**: Setiap transaksi pemasukan memiliki atribut opsional `financialTargetId` untuk mengalokasikan pemasukan secara spesifik ke suatu target finansial, menghindari ambiguitas pemisahan dana antar-target dalam kategori yang sama.
3. **Periode Efektif Bergulir (*Rollover*)**: Target dengan periode harian (`DAILY`), mingguan (`WEEKLY`), dan bulanan (`MONTHLY`) otomatis memperbarui jendela waktu aktifnya ke periode berjalan.

Seluruh luaran diklasifikasikan ke dalam **Taksonomi 3 Tingkat Luaran**:
- **Tingkat 2: Nudge (Choice Architecture)** — Menghadirkan kesadaran terhadap stagnasi waktu atau potensi konflik alokasi dana secara faktual.

---

## Rule FT-01 — Target Belum Ada Progres (Target Gap Alert)

> **Catatan Pembaruan Calm UI:** Teks luaran diperbarui menjadi cermin waktu objektif: *"Target '{namaTarget}' telah memasuki {persentase}% dari periode waktunya."* Nada mendesak atau menyalahkan dihilangkan agar pengguna dapat merefleksikan rencana aksi mereka dengan tenang.

**Entitas yang dipantau:** Target Finansial Aktif × Transaksi Pemasukan (dalam jendela periode efektif target)

**Kondisi pemicu (pseudocode):**
```
Program Evaluasi Target Belum Ada Progres (FT-01)
Deklarasi
    target               : data target finansial aktif
    periodeMulai         : tanggal  { awal periode efektif target }
    periodeSelesai       : tanggal  { akhir periode efektif target }
    totalHari            : bilangan bulat
    hariTelahBerlalu     : bilangan bulat
    proporsiWaktuBerlalu : bilangan real
    totalPemasukanTarget : bilangan real

Algoritma
    FOR EACH target IN semuaTargetAktif DO
        IF target.aktif = false THEN SKIP

        rentangEfektif ← AmbilRentangTanggalEfektif(target, hariIni)
        IF rentangEfektif KOSONG THEN SKIP  { target belum mulai atau telah kedaluwarsa }

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

        IF totalPemasukanTarget = 0 THEN
            OUTPUT Nudge("Target Belum Ada Progres",
                         "Target '" + target.nama + "' telah memasuki " + ROUND(proporsiWaktuBerlalu * 100) + "% dari periode waktunya.",
                         urgensi=warning,
                         ctaLabel="Lihat Target",
                         ctaRoute="/targets")
            RETURN  { kembalikan target pertama yang memenuhi syarat }
        END IF
    END FOR
```

**Keluaran UI:**
- **Judul:** `"Target Belum Ada Progres"`
- **Pesan:** `"Target '{namaTarget}' telah memasuki {persentaseWaktu}% dari periode waktunya."`
- **Tingkat Urgensi / Severity:** `warning` (Prioritas evaluasi: 2.3)
- **Tombol Aksi (CTA):** `"Lihat Target"` &rarr; `/targets`

**Klasifikasi Luaran:** **Tingkat 2: Nudge (Digital Nudging — Nudge Preventif / Kesadaran Stagnasi Target)**. Mengimplementasikan konsep *commitment device* dan *salience*. Sistem menyajikan cermin waktu yang telah berlalu tanpa tekanan emosional, memberikan dorongan lembut bagi pengguna untuk mulai mencatat pemasukan atau mengalokasikan tabungan sebelum periode target berakhir.

---

## Rule FT-02 — Pengeluaran vs Target Pemasukan (Target Progress Impact)

**Entitas yang dipantau:** Target Finansial Aktif × Seluruh Transaksi Pengeluaran (dalam periode efektif target)

**Kondisi pemicu (pseudocode):**
```
Program Evaluasi Pengeluaran vs Target Pemasukan (FT-02)
Deklarasi
    target                      : data target finansial aktif
    nominalTarget               : bilangan real
    periodeMulai                : timestamp awal periode target
    periodeSelesai              : timestamp akhir periode target
    totalPengeluaranDalamPeriode: bilangan real
    teksWaktu                   : teks  { label periode sesuai tipe target }

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

        { Picu jika akumulasi pengeluaran melampaui 80% dari target nominal pemasukan }
        IF totalPengeluaranDalamPeriode > nominalTarget × 0,8 THEN
            IF target.periode = 'DAILY'   THEN teksWaktu ← "hari ini"
            IF target.periode = 'WEEKLY'  THEN teksWaktu ← "minggu ini"
            IF target.periode = 'MONTHLY' THEN teksWaktu ← "bulan ini"
            ELSE                               teksWaktu ← "periode ini"

            OUTPUT Nudge("Pengeluaran vs Target Pemasukan",
                         "Total pengeluaran " + teksWaktu + " (" + formatMataUang(totalPengeluaranDalamPeriode) + ") telah mencapai proporsi signifikan terhadap target pemasukan '" + target.nama + "' (" + formatMataUang(nominalTarget) + ").",
                         urgensi=info,
                         ctaLabel="Lihat Target",
                         ctaRoute="/targets")
            RETURN
        END IF
    END FOR
```

**Keluaran UI:**
- **Judul:** `"Pengeluaran vs Target Pemasukan"`
- **Pesan:** `"Total pengeluaran {periode} ({pengeluaran}) telah mencapai proporsi signifikan terhadap target pemasukan '{namaTarget}' ({targetAmount})."`
- **Tingkat Urgensi / Severity:** `info` (Prioritas evaluasi: 2.4)
- **Tombol Aksi (CTA):** `"Lihat Target"` &rarr; `/targets`

**Klasifikasi Luaran:** **Tingkat 2: Nudge (Digital Nudging — Nudge Preventif / Penyadaran Potensi Konflik Tujuan)**. Rule ini membandingkan laju pengeluaran aktual dengan sasaran pemasukan yang ingin dicapai, menyadarkan pengguna mengenai dinamika alokasi dan trade-off antara konsumsi jangka pendek dengan target finansial yang telah dicanangkan secara objektif.

---

## Hubungan dengan Rule Apresiasi Target (FT-03)
Pelacakan target finansial juga dilengkapi dengan aturan penguatan positif jangka panjang:
- **Rule FT-03 — Konsistensi Target Terjaga (Target Streak)**: Memberikan apresiasi ketika pengguna berhasil memenuhi target bulanan selama beberapa bulan berturut-turut. Dokumentasi lengkap rule ini berada di [Kelompok 6: Reinforcement Positif & Fallback](file:///c:/moneta-finance-final-project/docs/rules/06-reinforcement-positif-dan-fallback.md#rule-ft-03--konsistensi-target-terjaga-target-streak).
