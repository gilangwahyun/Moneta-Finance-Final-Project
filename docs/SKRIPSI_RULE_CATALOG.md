# Katalog Lengkap Rule-Based Insight Engine — Moneta Finance
> **Sumber**: Dibuat langsung dari reverse engineering `src/lib/nudging.ts` (696 baris),
> `src/lib/notifications/local-engine.ts` (843 baris), dan `src/hooks/use-analytics.ts` (1044 baris).
> Semua kondisi, threshold, severity, dan teks output diambil persis dari kode aktual — bukan asumsi.

---

## Struktur Data: `NudgeInsight`

Setiap rule yang aktif menghasilkan satu objek `NudgeInsight` dengan field berikut:

```typescript
interface NudgeInsight {
  priority: number;           // Angka kecil = prioritas lebih tinggi
  severity: 'critical' | 'warning' | 'positive' | 'neutral' | 'info';
  title: string;              // Judul notifikasi / kartu
  body: string;               // Isi pesan
  ctaLabel: string;           // Label tombol aksi
  ctaRoute: string;           // Route navigasi: '/transactions', '/budgets', dst.
  relatedBudgetId?: string;
  relatedCategoryId?: string;
  threshold?: number;
  actionType?: string;        // 'REALLOCATE_BUDGET'
  sourceBudgetId?: string;    // Untuk rekomendasi subsidi silang
  targetBudgetId?: string;
  recommendedAmount?: number;
  dedupeKeyOverride?: string; // Custom dedupe key agar tidak duplikat
  // ... metadata snapshot (categoryName, usageRatio, dll.)
}
```

**Algoritma Output (Smart Limit + Insight Fatigue Mitigation)**:
1. Semua rules dievaluasi dan hasilnya dikumpulkan dalam array.
2. Array diurutkan **ascending** berdasarkan `priority` (angka terkecil paling atas).
3. UI menampilkan semua `critical` berapapun jumlahnya.
4. Sisa slot dari non-critical diisi maksimal hingga total 3 kartu (default) → sisanya disembunyikan di balik tombol expand.

---

## KATEGORI 1: Anggaran (Budgeting)

### BG-00 (Budget Threshold 50%): Anggaran Terpakai Setengah
- **Modul**: Anggaran × Transaksi (satu kategori)
- **Sumber pemicu**: `local-engine.ts` saat `evaluateAndTriggerNudges()` dipanggil setiap CREATE/UPDATE transaksi
- **Kondisi**: `spent / budgetLimit >= 0.5 AND < 0.8`
- **Threshold aktif**: Tepat 50% → `priority = BUDGET_INFO_PRIORITY (0.3)`
- **Output**:
  - Judul: `"Penggunaan Anggaran Berjalan"`
  - Body: `"Anggaran {catName} sudah terpakai 50%. Masih ada ruang, tetapi mulai pantau agar tetap sesuai rencana."`
  - Severity: `info`
  - CTA: `"Lihat Anggaran"` → `/budgets`
- **Dedupe key**: `BUDGET_USAGE:{userId}:{budgetId}:{YYYY-MM}:50:{budgetUpdatedAt}`
- **Lintas modul**: Transaksi + Anggaran + Kategori

---

### BG-00b (Budget Threshold 80%): Anggaran Mulai Menipis
- **Modul**: Anggaran × Transaksi × Kategori
- **Kondisi**: `spent / budgetLimit >= 0.8 AND < 1.0`
- **Priority**: `BUDGET_WARNING_PRIORITY (0.2)`
- **Output**:
  - Judul: `"Anggaran Mulai Menipis"` (atau `"Pengeluaran {catName} Naik"` jika ada data perbandingan harian)
  - Body: `"Anggaran {catName} sudah terpakai 80%. [Pengeluaran hari ini Rp X, lebih tinggi Rp Y dari rata-rata harian minggu lalu.] Pertimbangkan menahan pengeluaran berikutnya..."`
  - Severity: `warning`
  - CTA: `"Lihat Anggaran"` → `/budgets`
- **Catatan**: Sistem juga menghitung perbandingan pengeluaran hari ini vs rata-rata 7 hari atau hari yang sama minggu lalu untuk body yang lebih kontekstual.

---

### BG-00c (Budget Threshold 100%): Batas Anggaran Tercapai / Terlampaui
- **Modul**: Anggaran × Transaksi × Kategori
- **Kondisi A** (`ratio == 1.0`): Tepat 100%
  - Judul: `"Batas Anggaran Tercapai"`
  - Severity: `critical`
- **Kondisi B** (`ratio > 1.0`): Melebihi batas
  - Judul: `"Batas Anggaran Terlampaui"` (atau `"Rekomendasi Subsidi Silang"` jika ada sumber)
  - Body standar: `"Anggaran {catName} telah melewati batas sebesar Rp X. Kamu dapat meninjau pengeluaran..."`
  - Body rekomendasi: `"...Kamu dapat mempertimbangkan memindahkan Rp X dari {sourceCat}."`
  - Severity: `critical`
  - CTA rekomendasi: `"Subsidi Silang"` → `/budgets?action=reallocate&sourceBudgetId=...&targetBudgetId=...&amount=...`
  - `actionType`: `"REALLOCATE_BUDGET"` (mengaktifkan pre-fill form di UI)
- **Priority**: `BUDGET_CRITICAL_PRIORITY (0.1)`
- **Algoritma rekomendasi** (`findBudgetReallocationRecommendation()`):
  - Source harus punya **≥70% sisa** sebelum transfer
  - Source harus tetap punya **≥50% sisa** setelah transfer
  - Kandidat terbaik dipilih berdasarkan: rasio sisa tertinggi → kapasitas transfer terbesar → saldo terbesar

---

### BG-01: Budget Runway Projection — Anggaran Berisiko Habis Lebih Awal
- **Modul**: Anggaran × Transaksi (bulan berjalan)
- **Sumber pemicu**: `use-analytics.ts` (`budgetRunway` useMemo)
- **Kondisi**:
  - Minimal 7 hari sudah berlalu di bulan ini
  - `ratio < 0.8` (belum ditangkap BG-00b)
  - `spendingRate = spent / daysElapsed`
  - `daysUntilExhausted = (budgetLimit - spent) / spendingRate`
  - Aktif jika `daysUntilExhausted < daysRemaining`
- **Output**:
  - Judul: `"Anggaran Berisiko Habis Lebih Awal"`
  - Body: `"Dengan laju pengeluaran saat ini, anggaran '{catName}' diperkirakan habis dalam {N} hari, padahal bulan masih {M} hari lagi."`
  - Severity: `warning`
  - Priority: `1.9`
  - CTA: `"Lihat Anggaran"` → `/budgets`

---

### BG-03: Zero Budget Category — Pengeluaran Tanpa Anggaran
- **Modul**: Transaksi × Kategori × Anggaran (ketiadaan)
- **Sumber pemicu**: `local-engine.ts` (evaluasi per transaksi) + `use-analytics.ts` (dashboard)
- **Kondisi**:
  - Kategori pengeluaran dengan total > Rp 200.000 bulan ini
  - Tidak ada record Anggaran untuk kategori tersebut
- **Output**:
  - Judul: `"Pengeluaran Tanpa Anggaran"`
  - Body: `"Kamu sudah mencatat Rp X pengeluaran di '{catName}' bulan ini, tapi belum ada anggaran untuk kategori ini."`
  - Severity: `info`
  - Priority: `1.5`
  - CTA: `"Buat Anggaran"` → `/budgets`

---

### BG-04: Smart Budget Suggestion — Saran Anggaran Baru
- **Modul**: Transaksi × Kategori (riwayat beberapa bulan)
- **Sumber pemicu**: `use-analytics.ts` (`smartBudgetSuggestion` useMemo)
- **Kondisi**: Kategori yang secara konsisten memiliki rata-rata pengeluaran bulanan, belum ada anggaran
- **Output**:
  - Judul: `"Saran Anggaran Baru"`
  - Body: `"Kamu rutin mencatat rata-rata Rp X/bulan di '{catName}'. Pertimbangkan membuat anggaran dengan nominal tersebut."`
  - Severity: `info`
  - Priority: `1.6`
  - CTA: `"Buat Anggaran"` → `/budgets`

---

### BG-05: Budget Accuracy Alert — Anggaran Tidak Realistis
- **Modul**: Anggaran × Transaksi (riwayat 3 bulan)
- **Sumber pemicu**: `use-analytics.ts` (`budgetAccuracyAlert` useMemo)
- **Kondisi**:
  - Bulan M-1: `expense > budgetAmount * 1.20`
  - Bulan M-2: `expense > budgetAmount * 1.20`
  - Bulan M-3: `expense > budgetAmount * 1.20`
  - (Tiga bulan berturut-turut melebihi >20%)
- **Output**:
  - Judul: `"Anggaran Mungkin Tidak Realistis"`
  - Body: `"Kamu secara konsisten melampaui anggaran '{catName}' >20% dalam 3 bulan terakhir (rata-rata Rp X dari budget Rp Y). Pertimbangkan untuk menyesuaikan budget ini."`
  - Severity: `warning`
  - Priority: `3.2`
  - CTA: `"Sesuaikan Anggaran"` → `/budgets`

---

## KATEGORI 2: Pola Pengeluaran (Spending Patterns)

### SP-01: Payday Leak — Pengeluaran Awal Bulan
- **Modul**: Transaksi × Pemasukan (30 hari terakhir)
- **Sumber pemicu**: `local-engine.ts` + `use-analytics.ts`
- **Kondisi**:
  - Ada transaksi INCOME dalam 30 hari terakhir
  - Transaksi pemasukan terbesar terjadi ≤ 3 hari yang lalu
  - `current.expense > max(sumBudgets, income) * 0.40`
- **Output**:
  - Judul: `"Pengeluaran Awal Bulan"`
  - Body: `"{X}% dari pemasukan bulan ini telah terpakai hanya dalam {N} hari terakhir. Periksa kembali pengeluaran agar keuangan akhir bulan tetap terkendali."`
  - Severity: `critical`
  - Priority: `1`
  - CTA: `"Lihat Transaksi"` → `/transactions`

---

### SP-02: Weekend Trap — Pola Pengeluaran Akhir Pekan
- **Modul**: Transaksi (minggu berjalan)
- **Kondisi**: `weekTotal > 0` DAN `weekendTotal / weekTotal > 0.70` (>70% pengeluaran minggu ini di akhir pekan)
- **Output**:
  - Judul: `"Pola Pengeluaran Akhir Pekan"`
  - Body: `"Sekitar {X}% pengeluaranmu minggu ini terjadi di akhir pekan. Pastikan tetap sesuai dengan rencana anggaranmu, ya."`
  - Severity: `warning`
  - Priority: `2`
  - CTA: `"Cek Transaksi"` → `/transactions`

---

### SP-03: Night Owl — Pengeluaran Larut Malam
- **Modul**: Transaksi × Kategori (diskresioner: hiburan, jajan, pribadi, gaya hidup, hobi)
- **Kondisi**: Total pengeluaran di jam 22.00–04.00 pada kategori diskresioner ≥ Rp 150.000 bulan ini
- **Catatan**: Jam diambil dari field `createdAt` (waktu input transaksi), bukan dari `date`.
- **Output**:
  - Judul: `"Pola Pengeluaran Malam Hari"`
  - Body: `"Pengeluaran pada larut malam terdeteksi cukup tinggi (Rp X bulan ini). Periksa kembali transaksi tersebut..."`
  - Severity: `warning`
  - Priority: `2.1`
  - CTA: `"Lihat Pola"` → `/analytics`

---

### SP-05: Latte Factor — Frekuensi Pengeluaran Rutin (Frequent Small Txns)
- **Modul**: Transaksi (frekuensi nama/deskripsi)
- **Kondisi**:
  - Nama/deskripsi transaksi yang sama muncul **> 10 kali** bulan ini
  - Rata-rata nominal per transaksi **< Rp 30.000** (nominal kecil, impulsif)
  - Nama tidak boleh kosong
- **Output**:
  - Judul: `"Frekuensi Pengeluaran Rutin"`
  - Body: `"Terdapat {N} transaksi untuk '{name}' bulan ini dengan total Rp X. Perhatikan frekuensinya jika kamu berencana berhemat."`
  - Severity: `info`
  - Priority: `3`
  - CTA: `"Lihat Transaksi"` → `/transactions`

---

### SP-06: Subscription Cannibalization — Evaluasi Langganan
- **Modul**: Transaksi (deteksi pola berulang bulanan)
- **Kondisi**:
  - Untuk setiap transaksi bulan ini, cari pasangan di bulan lalu dengan: **nominal sama + kategori sama + selisih tanggal ≤ 3 hari**
  - Jumlah pasangan yang ditemukan (tanpa duplikasi) **≥ 3**
  - `totalPemasukan > 0` (agar persentase bisa dihitung)
- **Output**:
  - Judul: `"Evaluasi Langganan"`
  - Body: `"Kamu punya {N} tagihan rutin bulanan yang memakan {X}% dari total pemasukanmu. Coba evaluasi..."`
  - Severity: `warning`
  - Priority: `3.1`
  - CTA: `"Cek Pengeluaran"` → `/transactions`

---


### SP-08: Recurring Merchant Growth — Kenaikan Transaksi Rutin
- **Modul**: Transaksi (deskripsi/nama merchant bulan ini vs bulan lalu)
- **Sumber pemicu**: `local-engine.ts` + `use-analytics.ts` (recurringMerchantGrowth)
- **Kondisi**:
  - Merchant ini muncul ≥ 3 kali bulan ini
  - Muncul ≥ 2 kali bulan lalu
  - `currentCount / prevCount >= 2.0` (frekuensi berlipat ganda)
- **Output**:
  - Judul: `"Kenaikan Transaksi Rutin"`
  - Body: `"Transaksi untuk '{merchantName}' meningkat signifikan dibanding bulan lalu ({N} → {M} kali). Total bulan ini: Rp X."`
  - Severity: `info`
  - Priority: `3.2`
  - CTA: `"Lihat Transaksi"` → `/transactions`

---

### AN-08: Income Momentum Alert — Pemasukan Tertinggal
- **Modul**: Transaksi × INCOME (bulan ini vs bulan lalu)
- **Sumber pemicu**: `local-engine.ts` + `use-analytics.ts` (`incomeMomentum`)
- **Kondisi**:
  - Sudah melewati tanggal 15 bulan ini
  - `currentIncome < avgPrevIncome * 0.5` (pemasukan bulan ini < 50% dari bulan lalu)
- **Output**:
  - Judul: `"Pemasukan Tertinggal"`
  - Body: `"Hingga pertengahan bulan ini, pemasukan tercatat (Rp X) lebih rendah dari biasanya (rata-rata Rp Y). Pastikan semua pemasukan sudah dicatat."`
  - Severity: `warning`
  - Priority: `1.7`
  - CTA: `"Catat Pemasukan"` → `/transactions`

---

### AN-10: Defisit / Rasio Pengeluaran Tinggi terhadap Pemasukan
- **Modul**: Transaksi × INCOME × EXPENSE (bulan berjalan)
- **Kondisi A** (income = 0, expense > 0):
  - Judul: `"Data Pemasukan Kosong"`; Severity: `critical`
- **Kondisi B** (expense > income):
  - Judul: `"Defisit Arus Kas"`; Severity: `critical`
  - Body: `"Pengeluaran bulan ini melebihi pemasukan sebesar Rp X. Tinjau kembali kategori pengeluaran terbesar..."`
- **Kondisi C** (expense/income >= 0.8):
  - Judul: `"Rasio Pengeluaran Tinggi"`; Severity: `warning`
  - Body: `"Pengeluaran bulan ini sudah mencapai {X}% dari pemasukan bulan ini..."`
- Priority: `1.1`
- CTA: `"Analisis Kategori"` / `"Catat Pemasukan"` → `/analytics` atau `/transactions`

---

## KATEGORI 3: Analitik Pola (Pattern Analytics)

### SP-04: Category Spike — Lonjakan Kategori vs Rata-rata 3 Bulan
- **Modul**: Transaksi × Kategori (bulan ini + riwayat 3 bulan)
- **Sumber pemicu**: `use-analytics.ts` (`categorySpike` useMemo)
- **Kondisi**:
  - `expCurrent >= Rp 100.000`
  - `avg3Month = (expM1 + expM2 + expM3) / 3`
  - `avg3Month > Rp 50.000`
  - `expCurrent > avg3Month * 1.50` (lonjakan >50% dari rata-rata historis)
- **Output**:
  - Judul: `"Lonjakan Pengeluaran Kategori"`
  - Body: `"Pengeluaran '{catName}' bulan ini melonjak tajam (Rp X), {N}% lebih tinggi dari rata-rata 3 bulan terakhirmu."`
  - Severity: `warning`
  - Priority: `3.3`
  - CTA: `"Lihat Transaksi"` → `/transactions`

---

### SP-09: Morning vs Evening Spending — Pola Waktu Pengeluaran
- **Modul**: Transaksi (jam pembuatan transaksi / `createdAt`)
- **Sumber pemicu**: `use-analytics.ts` (`morningVsEvening` useMemo)
- **Kondisi**: >X% pengeluaran bulan ini terkonsentrasi di satu sesi (pagi/malam)
- **Output**:
  - Judul: `"Pola Waktu Pengeluaran"`
  - Body: `"Lebih dari {X}% pengeluaranmu bulan ini terkonsentrasi di sesi {pagi/malam} hari (total Rp X)."`
  - Severity: `neutral`
  - Priority: `3.3`
  - CTA: `"Lihat Analisis"` → `/analytics`

---

### SP-10: Day-of-Month Clustering — Konsentrasi Pengeluaran
- **Modul**: Transaksi (tanggal dalam bulan)
- **Sumber pemicu**: `use-analytics.ts` (`dayOfMonthClustering` useMemo)
- **Kondisi**: >X% pengeluaran bulan ini terpusat pada beberapa hari tanggal tertentu saja
- **Output**:
  - Judul: `"Konsentrasi Pengeluaran"`
  - Body: `"Lebih dari {X}% pengeluaran bulan ini terpusat pada {N} hari tertentu saja."`
  - Severity: `neutral`
  - Priority: `3.4`
  - CTA: `"Lihat Analisis"` → `/analytics`

---

### AN-01: Peak Spending Day — Hari Pengeluaran Tertinggi
- **Modul**: Transaksi (bulan berjalan, per hari)
- **Sumber pemicu**: `use-analytics.ts` (`peakDay` useMemo)
- **Kondisi**: Nama hari (Senin–Minggu) dengan pengeluaran kumulatif terbesar bulan ini, porsinya ≥ threshold
- **Output**:
  - Judul: `"Pola Pengeluaran Ditemukan"`
  - Body (dengan kategori dominan): `"Pengeluaran tertinggimu bulan ini paling sering terjadi pada hari {dayName}, terutama pada kategori {catName}. Hari tersebut menyumbang {X}%..."`
  - Body (tanpa kategori): `"Pengeluaran tertinggimu bulan ini selalu terjadi pada hari {dayName} (menyumbang {X}% dari total)..."`
  - Severity: `neutral`
  - Priority: `3.8`
  - CTA: `"Lihat Tren"` → `/analytics`

---

### AN-02: Category Creep — Pengeluaran Merayap Naik
- **Modul**: Transaksi × Kategori (riwayat 3 bulan terakhir: M-1, M-2, M-3)
- **Sumber pemicu**: `use-analytics.ts` (`categoryCreep` useMemo)
- **Kondisi**:
  - `expM3 > Rp 50.000`
  - `expM2 > expM3 * 1.10` (naik >10% dari M-3 ke M-2)
  - `expM1 > expM2 * 1.10` (naik >10% dari M-2 ke M-1)
  - (Tren naik konsisten tiga bulan berturut-turut)
- **Output**:
  - Judul: `"Pengeluaran Kategori Merayap Naik"`
  - Body: `"Pengeluaranmu di kategori '{catName}' terus naik >10% tiap bulan selama 3 bulan terakhir (sekarang Rp X)."`
  - Severity: `warning`
  - Priority: `2.9`
  - CTA: `"Lihat Analisis"` → `/analytics`

---

### AN-03: Savings Gap Shrinking — Selisih Bersih Menipis
- **Modul**: Transaksi × INCOME × EXPENSE (riwayat 3 bulan)
- **Sumber pemicu**: `use-analytics.ts` (`savingsGapShrinking` useMemo)
- **Kondisi**:
  - `netM3 > 0`, `netM2 > 0`, `netM1 > 0` (semua masih positif)
  - `netM2 < netM3 * 0.90` (turun >10% dari M-3 ke M-2)
  - `netM1 < netM2 * 0.90` (turun >10% dari M-2 ke M-1)
- **Output**:
  - Judul: `"Selisih Bersih Menipis"`
  - Body: `"Selisih pemasukan dan pengeluaranmu terus menyusut selama 3 bulan terakhir (sekarang sisa Rp X). Hati-hati agar tidak defisit bulan depan."`
  - Severity: `warning`
  - Priority: `3.1`
  - CTA: `"Evaluasi Anggaran"` → `/budgets`

---

### AN-04: New Category Emergence — Kategori Pengeluaran Baru
- **Modul**: Transaksi × Kategori (riwayat 3 bulan sebelumnya sebagai baseline)
- **Sumber pemicu**: `use-analytics.ts` (`newCategoryEmergence` useMemo)
- **Kondisi**:
  - Kategori tidak pernah dipakai dalam M-1, M-2, M-3
  - Total pengeluaran bulan ini di kategori tersebut > Rp 100.000
- **Output**:
  - Judul: `"Kategori Pengeluaran Baru"`
  - Body: `"Kamu mulai mencatat pengeluaran di '{catName}' (Rp X bulan ini). Kategori ini belum pernah muncul dalam 3 bulan terakhir."`
  - Severity: `info`
  - Priority: `2.6`
  - CTA: `"Lihat Transaksi"` → `/transactions`

---

### AN-05: Category Dominance Shift — Pergeseran Kategori Terbesar
- **Modul**: Transaksi × Kategori (bulan ini vs bulan lalu)
- **Sumber pemicu**: `use-analytics.ts` (`categoryDominanceShift` useMemo)
- **Kondisi**:
  - Kategori pengeluaran terbesar bulan ini ≠ kategori terbesar bulan lalu
  - Pertumbuhan kategori baru tersebut ≥ 30% dibanding bulan lalu
- **Output**:
  - Judul: `"Pergeseran Pengeluaran Terbesar"`
  - Body: `"Pengeluaran terbesar bulan ini berpindah dari '{prevTopName}' ke '{newTopName}' (naik {X}% dibanding bulan lalu)."`
  - Severity: `info`
  - Priority: `2.7`
  - CTA: `"Lihat Analisis"` → `/analytics`

---

### AN-06: Expense-to-Income Consistency — Rasio Pengeluaran Tidak Konsisten
- **Modul**: Transaksi × INCOME × EXPENSE (riwayat 3 bulan)
- **Sumber pemicu**: `use-analytics.ts` (`expenseConsistency` useMemo)
- **Kondisi**:
  - Hitung rasio `expense / income` untuk M-3, M-2, M-1
  - `max(ratios) - min(ratios) > 0.20` (selisih rasio >20 poin persentase)
- **Output**:
  - Judul: `"Rasio Pengeluaran Tidak Konsisten"`
  - Body: `"Rasio pengeluaran terhadap pemasukanmu berubah-ubah dalam 3 bulan terakhir: {R1}% → {R2}% → {R3}%. Konsistensi yang lebih stabil memudahkan perencanaan keuangan."`
  - Severity: `neutral`
  - Priority: `3.75`
  - CTA: `"Lihat Analisis"` → `/analytics`

---

### AN-07: Discretionary Drift — Perubahan Pola Pengeluaran Diskresioner
- **Modul**: Transaksi × Kategori (filter regex: hiburan, jajan, pribadi, gaya hidup, hobi)
- **Sumber pemicu**: `use-analytics.ts` (`discretionaryDrift` useMemo)
- **Kondisi**:
  - `ratioNow = (total diskresioner bulan ini) / (total EXPENSE bulan ini)`
  - `ratioThen = (total diskresioner 3 bulan lalu) / (total EXPENSE 3 bulan lalu)`
  - `ratioNow - ratioThen > 0.15` (naik >15 poin persentase)
- **Output**:
  - Judul: `"Perubahan Pola Pengeluaran"`
  - Body: `"Porsi pengeluaran gaya hidupmu naik menjadi {X}% dari total pengeluaran (naik {N} poin dari 3 bulan lalu)."`
  - Severity: `neutral`
  - Priority: `2.8`
  - CTA: `"Analisis Kategori"` → `/analytics`

---

### AN-09: Proyeksi Kebiasaan (Annualized Snowball Projection)
- **Modul**: Transaksi × Kategori (bulan ini)
- **Kondisi**: Kategori diskresioner menjadi pengeluaran terbesar bulan ini dengan ≥5 transaksi atau rata-rata >Rp 250.000 per transaksi
- **Output**:
  - Judul: `"Proyeksi Kebiasaan"`
  - Body: `"Bulan ini kategori {catName} menjadi salah satu pengeluaran terbesar (total Rp X). [Kamu sudah melakukan transaksi ini sebanyak N kali / nilai tiap transaksinya rata-rata Rp X.] Jika pola ini berlanjut, estimasi tahunannya dapat mencapai Rp Y."`
  - Severity: `warning`
  - Priority: `2.5`
  - CTA: `"Lihat Tren"` → `/analytics`

---

## KATEGORI 4: Dompet (Wallets)

### WL-01: Wallet Drain Rate — Laju Pengurasan Dompet
- **Modul**: Dompet × Transaksi (bulan ini vs bulan lalu)
- **Sumber pemicu**: `use-analytics.ts` (`walletDrainRate` useMemo)
- **Kondisi**:
  - `daysElapsed >= 7`
  - `drainRateNow = currentExpense / daysElapsed`
  - `drainRatePrev = prevExpense / daysInPrevMonth`
  - `drainRateNow > drainRatePrev * 1.5` (laju 1,5× lebih cepat dari bulan lalu)
  - Dompet tipe `INVESTASI` dikecualikan
- **Output**:
  - Judul: `"Saldo Dompet Turun Cepat"`
  - Body: `"Laju pengeluaran dari dompet '{walletName}' bulan ini 1,5× lebih cepat dari bulan lalu. Pantau transaksimu dari dompet ini."`
  - Severity: `warning`
  - Priority: `1.8`
  - CTA: `"Lihat Dompet"` → `/wallets`

---

### WL-02: Low Cash Warning — Saldo Dompet Menipis
- **Modul**: Dompet × Transaksi (saldo terhitung real-time)
- **Sumber pemicu**: `local-engine.ts` + `use-analytics.ts` (`lowCashWarning`)
- **Kondisi**:
  - `avgMonthlyExpense = totalExpense / uniqueMonths`
  - `threshold = max(Rp 100.000, avgMonthlyExpense * 0.10)`
  - Hitung saldo dinamis: `saldo_awal + INCOME - EXPENSE - TRANSFER_keluar + TRANSFER_masuk`
  - `balance < threshold`
  - Dompet tipe `INVESTASI` dikecualikan
- **Output**:
  - Judul: `"Saldo Dompet Menipis"`
  - Body: `"Saldo dompet '{walletName}' saat ini Rp X. Pertimbangkan untuk melakukan top up agar kebutuhan harian terpenuhi."`
  - Severity: `critical`
  - Priority: `0.5`
  - CTA: `"Lihat Dompet"` → `/wallets`

---

### WL-03: Single Wallet Usage Pattern — Dominasi Satu Dompet
- **Modul**: Transaksi × Dompet (bulan berjalan)
- **Sumber pemicu**: `use-analytics.ts` (`singleWalletUsage` useMemo)
- **Kondisi**:
  - Pengguna memiliki **> 1 dompet** terdaftar
  - Minimal **5 transaksi** bulan ini (agar data statistik bermakna)
  - Satu dompet digunakan untuk **> 90%** dari seluruh transaksi bulan ini
- **Output**:
  - Judul: `"Penggunaan Dompet Dominan"`
  - Body: `"Sebagian besar transaksimu bulan ini ({X}%) dicatat menggunakan dompet '{walletName}'."`
  - Severity: `neutral`
  - Priority: `3.9`
  - CTA: `"Lihat Dompet"` → `/wallets`

---

### WL-04: Wallet-Category Usage Pattern — Pola Kebiasaan Dompet × Kategori
- **Modul**: Transaksi × Dompet × Kategori (riwayat 3 bulan)
- **Sumber pemicu**: `use-analytics.ts` (`walletCategoryPattern` useMemo)
- **Kondisi**:
  - Hitung 5 kategori EXPENSE teratas (by total 3 bulan)
  - Untuk setiap kategori, cek apakah satu dompet mendominasi ≥80% totalnya
  - Minimum kategori total > Rp 100.000
- **Output**:
  - Judul: `"Pola Penggunaan Dompet"`
  - Body: `"Sekadar info: {X}% pengeluaran '{catName}'-mu selalu menggunakan dompet '{walletName}'."`
  - Severity: `neutral`
  - Priority: `3.8`
  - CTA: `"Lihat Dompet"` → `/wallets`

---

## KATEGORI 5: Target Finansial (Financial Targets)

### FT-01: Target Gap Alert — Target Belum Ada Progres
- **Modul**: Target Keuangan × Transaksi INCOME (bulan berjalan)
- **Sumber pemicu**: `use-analytics.ts` (`targetGapAlert` useMemo)
- **Kondisi**:
  - Target aktif (`isActive = true`)
  - `elapsedPct = (today - startDate) / (endDate - startDate) >= 0.30` (sudah >30% dari periode)
  - Total INCOME dalam kategori target = 0 (belum ada pemasukan tercatat)
- **Output**:
  - Judul: `"Target Belum Ada Progres"`
  - Body: `"Target '{targetName}' sudah berjalan {X}% dari periodenya, namun belum ada pemasukan yang tercatat. Pastikan target sudah sesuai rencanamu."`
  - Severity: `warning`
  - Priority: `2.3`
  - CTA: `"Lihat Target"` → `/targets`

---

### FT-02: Target Progress Impact — Pengeluaran vs Target Pemasukan (Burn Rate)
- **Modul**: Target Keuangan × Transaksi EXPENSE (seluruh periode target)
- **Sumber pemicu**: `use-analytics.ts` (`targetProgressImpact` useMemo)
- **Kondisi**:
  - Target aktif
  - Hitung total EXPENSE dalam rentang `[startDate, endDate]` target
  - `totalExpense > targetAmount * 0.80` (pengeluaran sudah melebihi 80% target pemasukan)
- **Output**:
  - Judul: `"Pengeluaran vs Target Pemasukan"`
  - Body: `"Total pengeluaranmu {timeframe} (Rp X) sudah mencapai proporsi yang besar terhadap target pemasukan '{targetName}' (Rp Y)."`
  - Severity: `info`
  - Priority: `2.4`
  - CTA: `"Lihat Target"` → `/targets`
- **Catatan**: `timeframe` disesuaikan otomatis: `"hari ini"`, `"minggu ini"`, `"bulan ini"`, atau `"periode ini"` sesuai `target.period`.

---

## KATEGORI 6: Reinforcement Positif & Fallback

### BG-02: Budget Recovery — Pemulihan Anggaran
- **Modul**: Anggaran × Transaksi (riwayat 2 bulan)
- **Sumber pemicu**: `use-analytics.ts` (`budgetRecovery` useMemo)
- **Kondisi**:
  - Bulan M-2: `expenseM2 > budgetAmount` (over-budget)
  - Bulan M-1: `expenseM1 <= budgetAmount` (berhasil kembali di bawah batas)
  - `expenseM1 < expenseM2` (benar-benar turun)
- **Output**:
  - Judul: `"Pemulihan Anggaran Berhasil"`
  - Body: `"Kerja bagus! Bulan lalu kamu berhasil menekan pengeluaran '{catName}' kembali ke batas anggaran (hemat Rp X dari bulan sebelumnya). Pertahankan!"`
  - Severity: `positive`
  - Priority: `3.4`
  - CTA: `"Lihat Anggaran"` → `/budgets`

---

### FT-03: Target Streak — Konsistensi Target Tercapai
- **Modul**: Target Keuangan × Transaksi INCOME (riwayat 3 bulan: M-1, M-2, M-3)
- **Sumber pemicu**: `use-analytics.ts` (`targetStreak` useMemo)
- **Kondisi**:
  - Target aktif dan periodik MONTHLY
  - `incM1 >= targetAmount` (M-1 tercapai)
  - `incM2 >= targetAmount` (M-2 tercapai)
  - `incM3 >= targetAmount` (M-3 tercapai)
  - Filter INCOME berdasarkan `target.categoryId` jika ada
- **Output**:
  - Judul: `"Konsistensi Target Terjaga"`
  - Body: `"Luar biasa! Kamu berhasil mencapai target pemasukan '{targetName}' selama 3 bulan berturut-turut."`
  - Severity: `positive`
  - Priority: `3.5`
  - CTA: `"Lihat Target"` → `/targets`

---

### PR-01: Berhasil Berhemat! — Positive Reinforcement 7 Hari
- **Modul**: Transaksi (sliding window 7 hari terakhir)
- **Sumber data**: `barData` di `use-analytics.ts` (loop `for i = 6..0`) → data per-hari 7 hari ke belakang dari hari ini
- **Kondisi**: `weeklySavings = max(0, Σ(income - expense) per hari selama 7 hari) > 0`
  - Artinya: net cashflow kumulatif 7 hari terakhir positif (total pemasukan > total pengeluaran)
- **Output**:
  - Judul: `"Kamu Berhasil Berhemat!"`
  - Body: `"Hebat! Kamu berhasil menyisakan Rp X pada 7 hari terakhir. Pertahankan kebiasaan baik ini."`
  - Severity: `positive`
  - Priority: `3.5`
  - CTA: `"Lihat Rincian"` → `/transactions`
- **Catatan audit**: Di dalam kode hanya ada **satu** rule ini — satu kondisi `if (weeklySavings > 0)` di `nudging.ts:262`. Label "SP-07" dan "PR-01" di dokumen skripsi sebelumnya adalah **duplikasi dokumentasi**, bukan dua rule berbeda di kode.

### PR-02: Income Increase — Pemasukan Meningkat
- **Modul**: Transaksi × INCOME (bulan ini vs bulan lalu)
- **Kondisi**: `prev.income > 0 AND current.income > prev.income AND pct >= 10%`
- **Output**:
  - Judul: `"Pemasukan Meningkat"`
  - Body: `"Pemasukan naik {X}%. Coba sisihkan Rp X langsung ke dana darurat untuk memperkuat fondasi keuanganmu."`
  - Severity: `positive`
  - Priority: `3.6`
  - CTA: `"Kelola Dompet"` → `/wallets`

---

### FALLBACK: Pola Pengeluaran Stabil
- **Kondisi**: Tidak ada rule lain yang aktif, tapi ada pengeluaran bulan ini (`insights.length === 0 AND current.expense > 0`)
- **Output**:
  - Judul: `"Pola Pengeluaran Stabil"`
  - Body: `"Arus kas kamu bulan ini berjalan stabil. Yuk, tinjau kembali pengeluaranmu untuk memastikan semuanya tetap berada di jalurnya."`
  - Severity: `neutral`
  - Priority: `4`
  - CTA: `"Lihat Transaksi"` → `/transactions`

---

## Tabel Ringkasan Rule (untuk Lampiran Skripsi)

| Kode Rule | Judul Notifikasi | Entitas Dipantau | Threshold Pemicu | Severity | Priority | CTA |
|---|---|---|---|---|---|---|
| BG-00 | Penggunaan Anggaran Berjalan | Anggaran × Transaksi × Kategori | spent ≥ 50% budget | info | 0.3 | /budgets |
| BG-00b | Anggaran Mulai Menipis | Anggaran × Transaksi × Kategori | spent ≥ 80% budget | warning | 0.2 | /budgets |
| BG-00c | Batas Anggaran Terlampaui / Subsidi Silang | Anggaran × Transaksi × Kategori | spent ≥ 100% budget | critical | 0.1 | /budgets |
| BG-01 | Anggaran Berisiko Habis Lebih Awal | Anggaran × Transaksi | daysUntilExhausted < daysRemaining | warning | 1.9 | /budgets |
| BG-02 | Pemulihan Anggaran Berhasil | Anggaran × Transaksi (M-1, M-2) | M-2 over, M-1 recovered | positive | 3.4 | /budgets |
| BG-03 | Pengeluaran Tanpa Anggaran | Transaksi × Kategori | spent > Rp 200.000, no budget | info | 1.5 | /budgets |
| BG-04 | Saran Anggaran Baru | Transaksi × Kategori (historis) | Rutin tanpa budget | info | 1.6 | /budgets |
| BG-05 | Anggaran Mungkin Tidak Realistis | Anggaran × Transaksi (3 bulan) | >20% over 3 bulan berturut | warning | 3.2 | /budgets |
| SP-01 | Pengeluaran Awal Bulan | Transaksi × INCOME | expense > 40% income in ≤3 days | critical | 1 | /transactions |
| SP-02 | Pola Pengeluaran Akhir Pekan | Transaksi (mingguan) | weekend > 70% week total | warning | 2 | /transactions |
| SP-03 | Pola Pengeluaran Malam Hari | Transaksi × Kategori diskresioner | night total ≥ Rp 150.000 | warning | 2.1 | /analytics |
| SP-04 | Lonjakan Pengeluaran Kategori | Transaksi × Kategori (3 bulan) | current > avg3m × 1.50 | warning | 3.3 | /transactions |
| SP-05 | Frekuensi Pengeluaran Rutin | Transaksi (frekuensi nama) | Nama sama berulang | info | 3 | /transactions |
| SP-06 | Evaluasi Langganan | Transaksi (pola berulang) | N langganan signifikan | warning | 3.1 | /transactions |
| PR-01 | Kamu Berhasil Berhemat! | Transaksi (7 hari sliding window) | net 7 hari > 0 | positive | 3.5 | /transactions |
| SP-08 | Kenaikan Transaksi Rutin | Transaksi (merchant) | currentCount ≥ 2× prevCount | info | 3.2 | /transactions |
| SP-09 | Pola Waktu Pengeluaran | Transaksi (jam) | Satu sesi dominan | neutral | 3.3 | /analytics |
| SP-10 | Konsentrasi Pengeluaran | Transaksi (tanggal) | Beberapa hari dominan | neutral | 3.4 | /analytics |
| AN-01 | Pola Pengeluaran Ditemukan | Transaksi (per hari) | Hari dengan pengeluaran terbesar | neutral | 3.8 | /analytics |
| AN-02 | Pengeluaran Kategori Merayap Naik | Transaksi × Kategori (3 bulan) | Naik >10% tiap bulan (3 bulan) | warning | 2.9 | /analytics |
| AN-03 | Selisih Bersih Menipis | Transaksi × INCOME × EXPENSE (3 bln) | Net turun >10%/bulan (3 bulan) | warning | 3.1 | /budgets |
| AN-04 | Kategori Pengeluaran Baru | Transaksi × Kategori (3 bln baseline) | Kategori baru > Rp 100.000 | info | 2.6 | /transactions |
| AN-05 | Pergeseran Pengeluaran Terbesar | Transaksi × Kategori (M0 vs M-1) | Top kategori berubah, growth ≥30% | info | 2.7 | /analytics |
| AN-06 | Rasio Pengeluaran Tidak Konsisten | Transaksi × INCOME × EXPENSE (3 bln) | max-min rasio > 0.20 | neutral | 3.75 | /analytics |
| AN-07 | Perubahan Pola Pengeluaran | Transaksi × Kategori diskresioner (3 bln) | ratioNow - ratioThen > 0.15 | neutral | 2.8 | /analytics |
| AN-08 | Pemasukan Tertinggal | Transaksi × INCOME (M0 vs M-1) | currentIncome < 50% avgPrev, tgl≥15 | warning | 1.7 | /transactions |
| AN-09 | Proyeksi Kebiasaan | Transaksi × Kategori (M0) | Kategori diskresioner terbesar, proyeksi ≥ Rp 1.000.000/tahun | warning | 2.5 | /analytics |
| AN-10 | Defisit / Rasio Pengeluaran Tinggi | Transaksi × INCOME × EXPENSE (M0) | expense/income ≥ 0.8 atau defisit | critical/warning | 1.1 | /analytics |
| WL-01 | Saldo Dompet Turun Cepat | Dompet × Transaksi (M0 vs M-1) | drainRateNow > 1.5× drainRatePrev | warning | 1.8 | /wallets |
| WL-02 | Saldo Dompet Menipis | Dompet × Transaksi (saldo dinamis) | balance < 10% avgMonthlyExpense | critical | 0.5 | /wallets |
| WL-03 | Penggunaan Dompet Dominan | Transaksi × Dompet (M0) | Satu dompet dominasi >X% | neutral | 3.9 | /wallets |
| WL-04 | Pola Penggunaan Dompet | Transaksi × Dompet × Kategori (3 bln) | Wallet usage ≥ 80% suatu kategori | neutral | 3.8 | /wallets |
| FT-01 | Target Belum Ada Progres | Target × Transaksi INCOME | 30% periode lewat, income = 0 | warning | 2.3 | /targets |
| FT-02 | Pengeluaran vs Target Pemasukan | Target × Transaksi EXPENSE | expense > 80% targetAmount | info | 2.4 | /targets |
| FT-03 | Konsistensi Target Terjaga | Target × Transaksi INCOME (3 bln) | Tercapai 3 bulan berturut | positive | 3.5 | /targets |
| PR-02 | Pemasukan Meningkat | Transaksi × INCOME (M0 vs M-1) | income naik ≥10% | positive | 3.6 | /wallets |
| FALLBACK | Pola Pengeluaran Stabil | Transaksi | Tidak ada rule yang aktif | neutral | 4 | /transactions |

---

## Catatan Implementasi Anti-Bias Kognitif

Setiap rule dirancang berdasarkan teori perilaku keuangan:
- **SP-01 (Payday Leak)**: Melawan *windfall effect* — kecenderungan boros pasca terima uang
- **SP-03 (Night Owl)**: Melawan *ego depletion* — keputusan finansial buruk saat kelelahan malam hari
- **AN-02 (Category Creep)**: Melawan *hedonic adaptation* — normalisasi gaya hidup yang perlahan meningkat
- **AN-07 (Discretionary Drift)**: Melawan *lifestyle inflation* — pembengkakan pengeluaran diskresioner seiring waktu
- **SP-04 + BG-05**: Melawan *optimism bias* — keyakinan bahwa anggaran yang ditetapkan sudah cukup padahal tidak
- **BG-02, FT-03, PR-01, PR-02**: *Positive reinforcement* untuk mempertahankan perilaku baik

*Dokumen ini dihasilkan dari pembacaan langsung kode sumber pada 21 Juni 2026.*

