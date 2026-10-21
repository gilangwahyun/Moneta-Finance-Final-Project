/********** Engine yang menerima parameter keuangan yang sudah dihitung
 *  dan menghasilkan array NudgeInsight berurutan berdasarkan prioritas.
 *  Tidak ada side effect — hanya komputasi murni.
 *
 *  Aturan dibagi per fase:
 *  - Priority 1-2   : Anomali kritis (cashflow, budget, payday)
 *  - Priority 3-3.9 : Insight perilaku (frekuensi, pola waktu, langganan)
 *  - Priority 4+    : Tip netral ketika tidak ada anomali
 */

/********** Imports **********/

import { formatCurrency } from '@/lib/utils/helpers';

/********** Types **********/

export type NudgeSeverity = 'warning' | 'positive' | 'neutral' | 'critical' | 'info';

export interface NudgeInsight {
  priority: number;
  severity: NudgeSeverity;
  title: string;
  body: string;
  ctaLabel: string;
  ctaRoute: string;
  relatedBudgetId?: string;
  relatedCategoryId?: string;
  threshold?: number;
  budgetUpdatedAt?: string;
  actionType?: string;
  sourceBudgetId?: string;
  targetBudgetId?: string;
  recommendedAmount?: number;
  dedupeKeyOverride?: string;
  
  // Metadata fields for digest and analytics
  categoryName?: string;
  usageRatio?: number;
  budgetLimit?: number;
  budgetSpent?: number;
  deficitAmount?: number;
  todayAmount?: number;
  comparisonAmount?: number;
  comparisonLabel?: string;
  sourceCategoryName?: string;
  targetCategoryName?: string;
}

export interface NudgeEngineParams {
  current: { income: number; expense: number; net: number };
  prev: { income: number; expense: number; net: number };
  topExpenseCategory: { name: string; value: number; prevValue: number } | null;
  weeklySavings: number;
  frequentTxn: { name: string; count: number; totalAmount: number } | null;
  peakDay: {
    dayName: string;
    percentage: number;
    dominantCategoryName?: string;
    totalAmountOnThatDay: number;
    transactionCountOnThatDay: number;
  } | null;
  wantsProjection: {
    currentPace: number;
    annualized: number;
    categoryName: string;
    categoryId?: string;
    monthlyTotal: number;
    transactionCount: number;
    averageTransaction: number;
    basis: string;
  } | null;
  paydayLeak: { percentage: number; days: number } | null;
  weekendTrap: { percentage: number } | null;
  nightOwl: { totalAmount: number } | null;
  subscriptions: { count: number; percentage: number } | null;

  /********** Phase 1 Rules */
  recurringMerchantGrowth?: { merchantName: string; currentCount: number; prevCount: number; amount: number } | null;
  morningVsEvening?: { dominantSession: 'pagi' | 'malam'; ratio: number; total: number } | null;
  dayOfMonthClustering?: { ratio: number; topDays: number[]; totalAmount: number } | null;
  zeroBudgetCategory?: { categoryName: string; categoryId: string; amount: number } | null;
  smartBudgetSuggestion?: { categoryName: string; categoryId: string; averageAmount: number } | null;
  singleWalletUsage?: { walletName: string; ratio: number } | null;
  incomeMomentum?: { currentIncome: number; avgPrevIncome: number } | null;


  /********** Phase 2 Rules */
  newCategoryEmergence?: { categoryName: string; categoryId: string; amount: number } | null;
  categoryDominanceShift?: { newTopName: string; newTopAmount: number; prevTopName: string; growthPct: number } | null;
  expenseConsistency?: { ratios: number[]; minRatio: number; maxRatio: number } | null;
  discretionaryDrift?: { ratioNow: number; ratioThen: number; diffPct: number } | null;
  budgetRunway?: { categoryName: string; budgetId: string; daysUntilExhausted: number; daysRemaining: number } | null;
  targetGapAlert?: { targetName: string; targetId: string; elapsedPct: number; progressPct?: number } | null;
  targetProgressImpact?: { targetName: string; targetId: string; expenseAmount: number; targetAmount: number; periodType: string } | null;

  
  /********** Phase 3 — 3-Month History Rules */
  categoryCreep?: { categoryName: string; categoryId: string; currentAmount: number; growthPct: number } | null;
  savingsGapShrinking?: { netNow: number; netThen: number; dropPct: number } | null;
  budgetAccuracyAlert?: { categoryName: string; budgetId: string; budgetAmount: number; avgExpense: number } | null;
  categorySpike?: { categoryName: string; categoryId: string; currentAmount: number; avgAmount: number; spikePct: number } | null;

  /********** Phase 4 — Low Priority / High Complexity Rules */
  budgetRecovery?: { categoryName: string; budgetId: string; savedAmount: number } | null;
  targetStreak?: { targetName: string; targetId: string; streakCount: number } | null;
  walletCategoryPattern?: { walletName: string; categoryName: string; percentage: number } | null;
}

/********** Main Logic **********/

/**
 * Menghasilkan array NudgeInsight berdasarkan parameter keuangan yang sudah dihitung.
 * Insight diurutkan secara ascending berdasarkan prioritas — semakin kecil = semakin kritis.
 *
 * @param params - Semua indikator keuangan yang sudah dihitung dari luar.
 * @returns Array NudgeInsight yang siap ditampilkan.
 */
export function generateNudges(params: NudgeEngineParams): NudgeInsight[] {
  const {
    current,
    prev,
    topExpenseCategory,
    weeklySavings,
    frequentTxn,
    peakDay,
    wantsProjection,
    paydayLeak,
    weekendTrap,
    nightOwl,
    subscriptions,
    recurringMerchantGrowth,
    morningVsEvening,
    dayOfMonthClustering,
    zeroBudgetCategory,
    smartBudgetSuggestion,
    singleWalletUsage,
    incomeMomentum,

    newCategoryEmergence,
    categoryDominanceShift,
    expenseConsistency,
    discretionaryDrift,
    budgetRunway,
    targetGapAlert,
    targetProgressImpact,

  } = params;

  const insights: NudgeInsight[] = [];

  /********** [START: Insight Priority 1 — Anomali Kritis] **********/

  /********** Priority 1: Payday Leak — alokasi awal bulan setelah gajian. */
  if (paydayLeak) {
    insights.push({
      priority: 1,
      severity: 'critical',
      title: 'Dinamika Arus Kas',
      body: `${paydayLeak.percentage}% dari alokasi pemasukan telah terpakai dalam ${paydayLeak.days} hari sejak pemasukan terbesar dalam 30 hari terakhir.`,
      ctaLabel: 'Lihat Transaksi',
      ctaRoute: '/transactions',
    });
  }

  /********** Priority 1.1: Expense vs income ratio — deteksi cashflow. */
  const netCashflow = current.income - current.expense;
  const expenseRatio = current.income > 0 ? current.expense / current.income : 0;

  if (current.income <= 0 && current.expense > 0) {
    /********** Case A — Tidak ada pemasukan yang tercatat. */
    insights.push({
      priority: 1.1,
      severity: 'critical',
      title: 'Catatan Pemasukan Bulan Ini',
      body: `Catatan pemasukan bulan ini masih kosong; menambahkannya akan melengkapi analisis arus kas.`,
      ctaLabel: 'Catat Pemasukan',
      ctaRoute: '/transactions',
    });
  } else if (current.income > 0 && current.expense > current.income) {
    /********** Case B — Cashflow defisit (pengeluaran melampaui pemasukan). */
    insights.push({
      priority: 1.1,
      severity: 'critical',
      title: 'Selisih Arus Kas',
      body: `Total pengeluaran bulan ini tercatat melampaui pemasukan dengan selisih ${formatCurrency(Math.abs(netCashflow))}.`,
      ctaLabel: 'Analisis Kategori',
      ctaRoute: '/analytics',
    });
  } else if (current.income > 0 && current.expense <= current.income && expenseRatio >= 0.8) {
    /********** Case C — Rasio pengeluaran tinggi (>= 80% pemasukan). */
    insights.push({
      priority: 1.1,
      severity: 'warning',
      title: 'Selisih Arus Kas',
      body: `Pengeluaran bulan ini telah mencapai ${Math.round(expenseRatio * 100)}% dari total pemasukan tercatat.`,
      ctaLabel: 'Analisis Kategori',
      ctaRoute: '/analytics',
    });
  }

  /********** Priority 2: Weekend vs Weekday Ratio — dominasi pengeluaran di akhir pekan. */
  if (weekendTrap) {
    insights.push({
      priority: 2,
      severity: 'warning',
      title: 'Distribusi Waktu',
      body: `Sekitar ${weekendTrap.percentage}% pengeluaran minggu ini tercatat pada akhir pekan (Sabtu & Minggu).`,
      ctaLabel: 'Lihat Transaksi',
      ctaRoute: '/transactions',
    });
  }

  /********** Priority 2.1: Night-Owl Spending — belanja di larut malam. */
  if (nightOwl) {
    insights.push({
      priority: 2.1,
      severity: 'warning',
      title: 'Pola Pengeluaran Malam Hari',
      body: `Tercatat pengeluaran sebesar ${formatCurrency(nightOwl.totalAmount)} pada rentang waktu malam hingga dini hari (22.00–04.00) bulan ini.`,
      ctaLabel: 'Lihat Pola',
      ctaRoute: '/analytics',
    });
  }

  /********** Priority 2.2: Loss-aversion / Nominal Framing (Top category spike) — pergerakan kategori. */
  if (topExpenseCategory && topExpenseCategory.prevValue > 0) {
    const spike = Math.round(((topExpenseCategory.value - topExpenseCategory.prevValue) / topExpenseCategory.prevValue) * 100);
    if (spike >= 20) {
      const selisihNominal = topExpenseCategory.value - topExpenseCategory.prevValue;
      insights.push({
        priority: 2.2,
        severity: 'warning',
        title: 'Dinamika Pengeluaran Kategori',
        body: `Pengeluaran kategori ${topExpenseCategory.name} tercatat naik ${spike}% (+${formatCurrency(selisihNominal)}) dibanding bulan lalu.`,
        ctaLabel: 'Lihat Tren',
        ctaRoute: '/analytics',
      });
    }
  }

  /********** Priority 2.5: Snowball Projection (Counterfactuals) — proyeksi pengeluaran tahunan. */
  if (wantsProjection) {
    let bodyText = `Bulan ini kategori ${wantsProjection.categoryName} mencatat total pengeluaran ${formatCurrency(wantsProjection.monthlyTotal)}. `;

    if (wantsProjection.transactionCount >= 5) {
      bodyText += `Transaksi ini tercatat sebanyak ${wantsProjection.transactionCount} kali. `;
    } else if (wantsProjection.averageTransaction >= 250000) {
      bodyText += `Rata-rata tiap transaksi berada di angka ${formatCurrency(wantsProjection.averageTransaction)}. `;
    }

    bodyText += `Dengan pola saat ini, akumulasi kategori ini diproyeksikan mencapai ${formatCurrency(wantsProjection.annualized)} dalam setahun.`;

    insights.push({
      priority: 2.5,
      severity: 'warning',
      title: 'Proyeksi Kebiasaan',
      body: bodyText,
      ctaLabel: 'Lihat Tren',
      ctaRoute: '/analytics',
    });
  }

  /********** Priority 3: Latte Factor (Frequency Detection) — transaksi rutin berulang. */
  if (frequentTxn) {
    insights.push({
      priority: 3,
      severity: 'info',
      title: 'Frekuensi Pengeluaran Rutin',
      body: `Terdapat ${frequentTxn.count} transaksi tercatat untuk '${frequentTxn.name}' bulan ini dengan akumulasi ${formatCurrency(frequentTxn.totalAmount)}.`,
      ctaLabel: 'Lihat Rincian',
      ctaRoute: frequentTxn.name ? `/transactions?search=${encodeURIComponent(frequentTxn.name)}` : '/transactions',
    });
  }

  /********** Priority 3.1: Subscription Cannibalization — alokasi tagihan rutin. */
  if (subscriptions) {
    insights.push({
      priority: 3.1,
      severity: 'warning',
      title: 'Evaluasi Langganan Rutin',
      body: `Terdapat ${subscriptions.count} tagihan rutin berulang yang mengambil porsi ${subscriptions.percentage}% dari total pemasukan tercatat.`,
      ctaLabel: 'Lihat Transaksi',
      ctaRoute: '/transactions',
    });
  }

  /********** Priority 3.5: Positive reinforcement (Net savings this period) — apresiasi jika hemat. */
  if (weeklySavings > 0) {
    insights.push({
      priority: 3.5,
      severity: 'positive',
      title: 'Surplus Mingguan',
      body: `Selisih pemasukan dan pengeluaran 7 hari terakhir tercatat positif sebesar ${formatCurrency(weeklySavings)}.`,
      ctaLabel: 'Lihat Rincian',
      ctaRoute: '/transactions',
    });
  }

  /********** Priority 3.6: Mental Accounting / Target Mapping (Income increase) — pemasukan naik signifikan. */
  if (prev.income > 0 && current.income > prev.income) {
    const pct = Math.round(((current.income - prev.income) / prev.income) * 100);
    if (pct >= 10) {
      const selisihNominal = current.income - prev.income;
      insights.push({
        priority: 3.6,
        severity: 'positive',
        title: 'Pemasukan Meningkat',
        body: `Pemasukan naik ${pct}% (+${formatCurrency(selisihNominal)}). Tersedia ruang tambahan untuk mempercepat pencapaian target keuangan.`,
        ctaLabel: 'Lihat Target',
        ctaRoute: '/targets',
      });
    }
  }

  /********** Priority 3.8: Peak Spending Day (Time-Series Pattern) — konsentrasi hari pengeluaran. */
  if (peakDay) {
    let bodyText = '';
    if (peakDay.dominantCategoryName) {
      bodyText = `Akumulasi pengeluaran tertinggi bulan ini tercatat pada hari ${peakDay.dayName} (${peakDay.percentage}% dari total pengeluaran), dengan kontribusi terbesar pada kategori ${peakDay.dominantCategoryName}.`;
    } else {
      bodyText = `Akumulasi pengeluaran tertinggi bulan ini tercatat pada hari ${peakDay.dayName} (${peakDay.percentage}% dari total pengeluaran).`;
    }

    insights.push({
      priority: 3.8,
      severity: 'neutral',
      title: 'Pola Hari Transaksi',
      body: bodyText,
      ctaLabel: 'Lihat Tren',
      ctaRoute: '/analytics',
    });
  }

  /********** [END: Insight Priority 1 — Anomali Kritis] **********/

  /********** [START: Phase 1 Rules — Insight Perilaku Bulan Ini] **********/

  /********** [SP-07] Recurring Merchant Growth — frekuensi merchant meningkat. */
  if (recurringMerchantGrowth) {
    insights.push({
      priority: 3.2,
      severity: 'info',
      title: 'Dinamika Transaksi Rutin',
      body: `Frekuensi transaksi pada '${recurringMerchantGrowth.merchantName}' tercatat ${recurringMerchantGrowth.currentCount} kali bulan ini (dibanding ${recurringMerchantGrowth.prevCount} kali bulan lalu) dengan total ${formatCurrency(recurringMerchantGrowth.amount)}.`,
      ctaLabel: 'Lihat Transaksi',
      ctaRoute: '/transactions',
    });
  }

  /********** [SP-08] Morning vs Evening Spending — dominasi waktu sesi pengeluaran. */
  if (morningVsEvening) {
    insights.push({
      priority: 3.3,
      severity: 'neutral',
      title: 'Pola Waktu Pengeluaran',
      body: `Dari pengeluaran pada jam pagi dan malam, ${Math.round(morningVsEvening.ratio * 100)}% tercatat pada sesi ${morningVsEvening.dominantSession} hari (total ${formatCurrency(morningVsEvening.total)}).`,
      ctaLabel: 'Lihat Analisis',
      ctaRoute: '/analytics',
    });
  }

  /********** [SP-09] Day-of-Month Clustering — pengeluaran terkonsentrasi pada hari tertentu. */
  if (dayOfMonthClustering) {
    insights.push({
      priority: 3.4,
      severity: 'neutral',
      title: 'Konsentrasi Tanggal Belanja',
      body: `Sebesar ${Math.round(dayOfMonthClustering.ratio * 100)}% pengeluaran bulan ini terpusat pada tanggal ${dayOfMonthClustering.topDays.join(', ')}.`,
      ctaLabel: 'Lihat Analisis',
      ctaRoute: '/analytics',
    });
  }

  /********** [BG-03] Zero Budget Category — pengeluaran di kategori tanpa anggaran. */
  if (zeroBudgetCategory) {
    insights.push({
      priority: 1.5,
      severity: 'info',
      title: 'Pengeluaran Tanpa Anggaran',
      body: `Tercatat pengeluaran sebesar ${formatCurrency(zeroBudgetCategory.amount)} pada '${zeroBudgetCategory.categoryName}' bulan ini tanpa batas alokasi anggaran yang aktif.`,
      ctaLabel: 'Buat Anggaran',
      ctaRoute: zeroBudgetCategory.categoryId ? `/budgets?action=create&categoryId=${zeroBudgetCategory.categoryId}` : '/budgets',
      relatedCategoryId: zeroBudgetCategory.categoryId,
    });
  }

  /********** [BG-04] Smart Budget Suggestion — saran buat anggaran berdasarkan histori. */
  if (smartBudgetSuggestion) {
    insights.push({
      priority: 1.6,
      severity: 'info',
      title: 'Saran Alokasi Anggaran',
      body: `Rata-rata pengeluaran bulanan pada '${smartBudgetSuggestion.categoryName}' tercatat ${formatCurrency(smartBudgetSuggestion.averageAmount)}/bulan berdasarkan riwayat transaksi.`,
      ctaLabel: 'Buat Anggaran',
      ctaRoute: smartBudgetSuggestion.categoryId ? `/budgets?action=create&categoryId=${smartBudgetSuggestion.categoryId}&amount=${Math.round(smartBudgetSuggestion.averageAmount)}` : '/budgets',
      relatedCategoryId: smartBudgetSuggestion.categoryId,
    });
  }

  /********** [WL-03] Single Wallet Usage Pattern — satu dompet mendominasi transaksi. */
  if (singleWalletUsage) {
    insights.push({
      priority: 3.9,
      severity: 'neutral',
      title: 'Penggunaan Dompet Dominan',
      body: `Sebagian besar transaksi bulan ini (${Math.round(singleWalletUsage.ratio * 100)}%) dicatat menggunakan dompet '${singleWalletUsage.walletName}'.`,
      ctaLabel: 'Lihat Dompet',
      ctaRoute: '/wallets',
    });
  }

  /********** [AN-08] Income Momentum Alert — pemasukan di bawah rata-rata. */
  if (incomeMomentum) {
    insights.push({
      priority: 1.7,
      severity: 'warning',
      title: 'Momentum Arus Kas Masuk',
      body: `Hingga pertengahan bulan, catatan pemasukan (${formatCurrency(incomeMomentum.currentIncome)}) berada di bawah total pemasukan bulan lalu (${formatCurrency(incomeMomentum.avgPrevIncome)}).`,
      ctaLabel: 'Catat Pemasukan',
      ctaRoute: '/transactions',
    });
  }

  /********** [END: Phase 1 Rules — Insight Perilaku Bulan Ini] **********/

  /********** [START: Phase 2 Rules — Proyeksi & Target] **********/

  /********** [BG-01] Budget Runway Projection — proyeksi ketahanan anggaran. */
  if (budgetRunway) {
    insights.push({
      priority: 1.9,
      severity: 'warning',
      title: 'Proyeksi Daya Tahan Alokasi',
      body: `Dengan laju harian saat ini, alokasi '${budgetRunway.categoryName}' dapat mencukupi hingga ${budgetRunway.daysUntilExhausted} hari ke depan (sisa periode: ${budgetRunway.daysRemaining} hari).`,
      ctaLabel: 'Lihat Anggaran',
      ctaRoute: '/budgets',
    });
  }

  /********** [FT-01] Target Gap Alert — progres periode target. */
  if (targetGapAlert) {
    const progressPct = targetGapAlert.progressPct ?? 0;
    insights.push({
      priority: 2.3,
      severity: 'warning',
      title: 'Posisi Progres Target',
      body: `Target '${targetGapAlert.targetName}' berada di ${Math.round(targetGapAlert.elapsedPct * 100)}% periode waktunya, dengan progres ${progressPct}%.`,
      ctaLabel: 'Lihat Target',
      ctaRoute: '/targets',
    });
  }

  /********** [FT-02] Target Progress Impact (Burn Rate vs Target) — pengeluaran vs target pemasukan. */
  if (targetProgressImpact) {
    const pct = targetProgressImpact.targetAmount > 0
      ? Math.round((targetProgressImpact.expenseAmount / targetProgressImpact.targetAmount) * 100)
      : 0;

    insights.push({
      priority: 2.4,
      severity: 'info',
      title: 'Pengeluaran vs Target Keuangan',
      body: `Total pengeluaran (${formatCurrency(targetProgressImpact.expenseAmount)}) setara ${pct}% dari sasaran Target Keuangan '${targetProgressImpact.targetName}' (${formatCurrency(targetProgressImpact.targetAmount)}).`,
      ctaLabel: 'Lihat Target',
      ctaRoute: '/targets',
    });
  }

  /********** [AN-04] New Category Emergence — kategori pengeluaran baru muncul. */
  if (newCategoryEmergence) {
    insights.push({
      priority: 2.6,
      severity: 'info',
      title: 'Kategori Pengeluaran Baru',
      body: `Tercatat transaksi baru pada kategori '${newCategoryEmergence.categoryName}' (${formatCurrency(newCategoryEmergence.amount)} bulan ini) yang tidak tercatat dalam 3 bulan terakhir.`,
      ctaLabel: 'Lihat Transaksi',
      ctaRoute: newCategoryEmergence.categoryName ? `/transactions?search=${encodeURIComponent(newCategoryEmergence.categoryName)}` : '/transactions',
    });
  }

  /********** [AN-05] Category Dominance Shift — pergeseran kategori pengeluaran terbesar. */
  if (categoryDominanceShift) {
    insights.push({
      priority: 2.7,
      severity: 'info',
      title: 'Pergeseran Kategori Terbesar',
      body: `Porsi pengeluaran terbesar bulan ini beralih ke '${categoryDominanceShift.newTopName}' (naik ${categoryDominanceShift.growthPct}% dibanding bulan lalu).`,
      ctaLabel: 'Lihat Analisis',
      ctaRoute: '/analytics',
    });
  }

  /********** [AN-07] Discretionary Drift — porsi pengeluaran gaya hidup meningkat. */
  if (discretionaryDrift) {
    insights.push({
      priority: 2.8,
      severity: 'neutral',
      title: 'Dinamika Pengeluaran Gaya Hidup',
      body: `Porsi pengeluaran diskresioner tercatat di angka ${Math.round(discretionaryDrift.ratioNow * 100)}% dari total pengeluaran bulan ini (bergeser ${discretionaryDrift.diffPct} poin dari 3 bulan lalu).`,
      ctaLabel: 'Analisis Kategori',
      ctaRoute: '/analytics',
    });
  }

  /********** [END: Phase 2 Rules — Proyeksi & Target] **********/

  /********** [START: Phase 3 Rules — Histori Multi-Bulan] **********/

  /********** [AN-02] Category Creep — kenaikan bertahap kategori pengeluaran. */
  if (params.categoryCreep) {
    insights.push({
      priority: 2.9,
      severity: 'warning',
      title: 'Tren Pengeluaran Kategori',
      body: `Pengeluaran pada kategori '${params.categoryCreep.categoryName}' tercatat meningkat bertahap dalam 3 bulan terakhir (saat ini ${formatCurrency(params.categoryCreep.currentAmount)}).`,
      ctaLabel: 'Lihat Analisis',
      ctaRoute: '/analytics',
    });
  }

  /********** [AN-03] Savings Gap Shrinking — selisih bersih menyusut. */
  if (params.savingsGapShrinking) {
    insights.push({
      priority: 3.1,
      severity: 'warning',
      title: 'Dinamika Saldo Bersih',
      body: `Selisih bersih (pemasukan - pengeluaran) tercatat menurun dalam 3 bulan terakhir (-${params.savingsGapShrinking.dropPct}%).`,
      ctaLabel: 'Tinjau Alokasi',
      ctaRoute: '/budgets',
    });
  }

  /********** [BG-05] Budget Accuracy — evaluasi akurasi batas anggaran. */
  if (params.budgetAccuracyAlert) {
    insights.push({
      priority: 3.2,
      severity: 'warning',
      title: 'Realisasi vs Anggaran',
      body: `Realisasi pengeluaran '${params.budgetAccuracyAlert.categoryName}' tercatat melebihi alokasi >20% dalam 3 bulan berturut-turut (rata-rata ${formatCurrency(params.budgetAccuracyAlert.avgExpense)} dari batas ${formatCurrency(params.budgetAccuracyAlert.budgetAmount)}).`,
      ctaLabel: 'Tinjau Anggaran',
      ctaRoute: params.budgetAccuracyAlert.budgetId ? `/budgets?action=edit&budgetId=${params.budgetAccuracyAlert.budgetId}&amount=${Math.round(params.budgetAccuracyAlert.avgExpense)}` : '/budgets',
    });
  }

  /********** [SP-04] Category Spike (Refinement) — perbandingan dengan rata-rata 3 bulan. */
  if (params.categorySpike) {
    insights.push({
      priority: 3.3,
      severity: 'warning',
      title: 'Dinamika Pengeluaran Kategori',
      body: `Pengeluaran '${params.categorySpike.categoryName}' bulan ini tercatat ${formatCurrency(params.categorySpike.currentAmount)}, lebih tinggi ${params.categorySpike.spikePct}% dari rata-rata 3 bulan terakhir (${formatCurrency(params.categorySpike.avgAmount)}).`,
      ctaLabel: 'Lihat Transaksi',
      ctaRoute: '/transactions',
    });
  }

  /********** [END: Phase 3 Rules — Histori Multi-Bulan] **********/

  /********** [START: Phase 4 Rules — Pola & Streak Positif] **********/

  /********** [BG-02] Budget Recovery — berhasil menekan pengeluaran kembali ke batas. */
  if (params.budgetRecovery) {
    insights.push({
      priority: 3.4,
      severity: 'positive',
      title: 'Pemulihan Alokasi Anggaran',
      body: `Bulan lalu realisasi pengeluaran '${params.budgetRecovery.categoryName}' kembali berada dalam batas alokasi anggaran (selisih ${formatCurrency(params.budgetRecovery.savedAmount)} dibanding bulan sebelumnya).`,
      ctaLabel: 'Lihat Anggaran',
      ctaRoute: '/budgets',
    });
  }

  /********** [FT-03] Target Streak — berhasil capai target berturut-turut. */
  if (params.targetStreak) {
    insights.push({
      priority: 3.5,
      severity: 'positive',
      title: 'Konsistensi Target Terjaga',
      body: `Target Keuangan '${params.targetStreak.targetName}' tercapai selama ${params.targetStreak.streakCount} bulan berturut-turut.`,
      ctaLabel: 'Lihat Target',
      ctaRoute: '/targets',
    });
  }

  /********** [WL-04] Wallet-Category Usage Pattern — info penggunaan dompet dominan. */
  if (params.walletCategoryPattern) {
    insights.push({
      priority: 3.8, /********** Prioritas rendah — insight informatif. */
      severity: 'neutral',
      title: 'Pola Penggunaan Dompet',
      body: `Sebesar ${params.walletCategoryPattern.percentage}% pengeluaran '${params.walletCategoryPattern.categoryName}' tercatat menggunakan dompet '${params.walletCategoryPattern.walletName}'.`,
      ctaLabel: 'Lihat Dompet',
      ctaRoute: '/wallets',
    });
  }

  /********** [AN-06] Expense-to-Income Consistency — rasio pengeluaran tidak konsisten. */
  if (expenseConsistency) {
    const [r1, r2, r3] = expenseConsistency.ratios.map(r => Math.round(r * 100));
    insights.push({
      priority: 3.75,
      severity: 'neutral',
      title: 'Variasi Rasio Pengeluaran',
      body: `Rasio pengeluaran terhadap pemasukan tercatat berfluktuasi dalam 3 bulan terakhir (${r1}% → ${r2}% → ${r3}%).`,
      ctaLabel: 'Lihat Analisis',
      ctaRoute: '/analytics',
    });
  }

  /********** [END: Phase 4 Rules — Pola & Streak Positif] **********/

  /********** Priority 4: Tip netral empatis ketika tidak ada anomali. */
  if (insights.length === 0 && current.expense > 0) {
    insights.push({
      priority: 4,
      severity: 'neutral',
      title: 'Pola Pengeluaran Stabil',
      body: `Arus kas bulan ini berjalan stabil. Tinjauan berkala membantu memastikan perencanaan tetap pada jalurnya.`,
      ctaLabel: 'Lihat Transaksi',
      ctaRoute: '/transactions',
    });
  }

  /********** Priority Triage (Weighted Sorting): Sort ascending agar nudge kritis muncul duluan.
   *  Tie-breaking sekunder & tersier memastikan urutan deterministik di setiap render,
   *  mencegah kartu insight mengacak saat React menjalankan ulang useMemo.
   */
  const severityRank: Record<NudgeSeverity, number> = { critical: 0, warning: 1, positive: 2, info: 3, neutral: 4 };
  return insights.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    const sA = severityRank[a.severity] ?? 99;
    const sB = severityRank[b.severity] ?? 99;
    if (sA !== sB) return sA - sB;
    return a.title.localeCompare(b.title, 'id');
  });
}

/********** [START: Budget Reallocation Recommendation] **********/

export interface ReallocationRecommendation {
  sourceBudgetId: string;
  sourceCategoryId: string;
  sourceCategoryName: string;
  targetBudgetId: string;
  targetCategoryId: string;
  targetCategoryName: string;
  recommendedAmount: number;
}

/**
 * Mencari budget lain yang bisa menjadi sumber realokasi untuk
 * menutupi defisit budget target.
 *
 * Aturan ketat:
 * - Budget sumber harus punya sisa >= 70% sebelum transfer.
 * - Budget sumber harus punya sisa >= 50% setelah transfer.
 * - Jumlah yang direkomendasikan = min(defisit, maksimum yang bisa ditransfer).
 *
 * @param targetBudget - Budget yang sedang defisit (spent >= limit).
 * @param allBudgets - Semua budget user bulan ini.
 * @returns Rekomendasi realokasi, atau null jika tidak ada kandidat yang memenuhi syarat.
 */
export function findBudgetReallocationRecommendation(
  targetBudget: { id: string; categoryId: string; limit: number; spent: number; name: string },
  allBudgets: Array<{ id: string; categoryId: string; limit: number; spent: number; name: string }>
): ReallocationRecommendation | null {
  
  /********** Hanya rekomendasikan jika target budget sudah terpakai 100% atau lebih. */
  if (targetBudget.spent < targetBudget.limit) return null;
  
  const targetDeficit = targetBudget.spent - targetBudget.limit;
  if (targetDeficit <= 0) return null;
  
  let bestSource: ReallocationRecommendation | null = null;
  let bestScore = { afterTransferRatio: -1, maxTransferable: -1, remainingAmount: -1 };

  for (const b of allBudgets) {
    if (b.id === targetBudget.id) continue;

    const remainingAmount = b.limit - b.spent;
    if (remainingAmount <= 0) continue;

    const remainingRatioBefore = remainingAmount / b.limit;
    
    /********** Aturan ketat: sumber harus punya sisa >= 70% sebelum transfer. */
    if (remainingRatioBefore < 0.7) continue;

    /********** Aturan ketat: sumber harus punya sisa >= 50% setelah transfer. */
    const maxTransferable = remainingAmount - (b.limit * 0.5);
    if (maxTransferable <= 0) continue;
    
    const recommendedAmount = Math.min(targetDeficit, maxTransferable);
    
    if (recommendedAmount <= 0) continue;

    const afterTransferRemainingRatio = (remainingAmount - recommendedAmount) / b.limit;

    /********** Kriteria prioritas sumber terbaik. */
    const isBetterSource = 
      afterTransferRemainingRatio > bestScore.afterTransferRatio ||
      (afterTransferRemainingRatio === bestScore.afterTransferRatio && maxTransferable > bestScore.maxTransferable) ||
      (afterTransferRemainingRatio === bestScore.afterTransferRatio && maxTransferable === bestScore.maxTransferable && remainingAmount > bestScore.remainingAmount);

    if (isBetterSource) {
      bestScore = {
        afterTransferRatio: afterTransferRemainingRatio,
        maxTransferable: maxTransferable,
        remainingAmount: remainingAmount
      };
      
      bestSource = {
        sourceBudgetId: b.id,
        sourceCategoryId: b.categoryId,
        sourceCategoryName: b.name,
        targetBudgetId: targetBudget.id,
        targetCategoryId: targetBudget.categoryId,
        targetCategoryName: targetBudget.name,
        recommendedAmount: recommendedAmount
      };
    }
  }

  return bestSource;
}
/********** [END: Budget Reallocation Recommendation] **********/
