import { formatCurrency } from '@/lib/utils/helpers';

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

  // Phase 1 Rules
  recurringMerchantGrowth?: { merchantName: string; currentCount: number; prevCount: number; amount: number } | null;
  morningVsEvening?: { dominantSession: 'pagi' | 'malam'; ratio: number; total: number } | null;
  dayOfMonthClustering?: { ratio: number; topDays: number[]; totalAmount: number } | null;
  zeroBudgetCategory?: { categoryName: string; categoryId: string; amount: number } | null;
  smartBudgetSuggestion?: { categoryName: string; categoryId: string; averageAmount: number } | null;
  singleWalletUsage?: { walletName: string; ratio: number } | null;
  incomeMomentum?: { currentIncome: number; avgPrevIncome: number } | null;
  lowCashWarning?: { walletName: string; currentBalance: number; walletId: string } | null;

  // Phase 2 Rules
  newCategoryEmergence?: { categoryName: string; categoryId: string; amount: number } | null;
  categoryDominanceShift?: { newTopName: string; newTopAmount: number; prevTopName: string; growthPct: number } | null;
  expenseConsistency?: { ratios: number[]; minRatio: number; maxRatio: number } | null;
  discretionaryDrift?: { ratioNow: number; ratioThen: number; diffPct: number } | null;
  budgetRunway?: { categoryName: string; budgetId: string; daysUntilExhausted: number; daysRemaining: number } | null;
  targetGapAlert?: { targetName: string; targetId: string; elapsedPct: number } | null;
  targetProgressImpact?: { targetName: string; targetId: string; expenseAmount: number; targetAmount: number; periodType: string } | null;
  walletDrainRate?: { walletName: string; walletId: string; drainRateNow: number; drainRatePrev: number } | null;
  
  // Phase 3 — 3-Month History Rules
  categoryCreep?: { categoryName: string; categoryId: string; currentAmount: number; growthPct: number } | null;
  savingsGapShrinking?: { netNow: number; netThen: number; dropPct: number } | null;
  budgetAccuracyAlert?: { categoryName: string; budgetId: string; budgetAmount: number; avgExpense: number } | null;
  categorySpike?: { categoryName: string; categoryId: string; currentAmount: number; avgAmount: number; spikePct: number } | null;
}

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
    lowCashWarning,
    newCategoryEmergence,
    categoryDominanceShift,
    expenseConsistency,
    discretionaryDrift,
    budgetRunway,
    targetGapAlert,
    targetProgressImpact,
    walletDrainRate,
  } = params;

  const insights: NudgeInsight[] = [];

  // Priority 1: Payday Leak
  if (paydayLeak) {
    insights.push({
      priority: 1,
      severity: 'critical',
      title: 'Pengeluaran Awal Bulan',
      body: `${paydayLeak.percentage}% dari pemasukan bulan ini telah terpakai hanya dalam ${paydayLeak.days} hari terakhir. Periksa kembali pengeluaran agar keuangan akhir bulan tetap terkendali.`,
      ctaLabel: 'Lihat Transaksi',
      ctaRoute: '/transactions',
    });
  }

  // Priority 1.1: Expense vs income ratio
  const netCashflow = current.income - current.expense;
  const expenseRatio = current.income > 0 ? current.expense / current.income : 0;

  if (current.income <= 0 && current.expense > 0) {
    // Case A — Income is missing
    insights.push({
      priority: 1.1,
      severity: 'critical',
      title: 'Data Pemasukan Kosong',
      body: `Belum ada pemasukan tercatat bulan ini, sehingga rasio pengeluaran terhadap pemasukan belum dapat dihitung secara akurat. Catat pemasukan agar analisis arus kas lebih lengkap.`,
      ctaLabel: 'Catat Pemasukan',
      ctaRoute: '/transactions',
    });
  } else if (current.income > 0 && current.expense > current.income) {
    // Case B — Net cashflow deficit
    insights.push({
      priority: 1.1,
      severity: 'critical',
      title: 'Defisit Arus Kas',
      body: `Pengeluaran bulan ini melebihi pemasukan sebesar ${formatCurrency(Math.abs(netCashflow))}. Tinjau kembali kategori pengeluaran terbesar agar arus kas bulanan tetap terkendali.`,
      ctaLabel: 'Analisis Kategori',
      ctaRoute: '/analytics',
    });
  } else if (current.income > 0 && current.expense <= current.income && expenseRatio >= 0.8) {
    // Case C — High expense ratio
    insights.push({
      priority: 1.1,
      severity: 'warning',
      title: 'Rasio Pengeluaran Tinggi',
      body: `Pengeluaran bulan ini sudah mencapai ${Math.round(expenseRatio * 100)}% dari pemasukan bulan ini. Pertimbangkan menyisihkan sebagian pemasukan terlebih dahulu sebelum menambah pengeluaran.`,
      ctaLabel: 'Analisis Kategori',
      ctaRoute: '/analytics',
    });
  }

  // Priority 2: Weekend vs Weekday Ratio
  if (weekendTrap) {
    insights.push({
      priority: 2,
      severity: 'warning',
      title: 'Pola Pengeluaran Akhir Pekan',
      body: `Sekitar ${weekendTrap.percentage}% pengeluaranmu minggu ini terjadi di akhir pekan. Pastikan pengeluaran harianmu tetap aman, ya!`,
      ctaLabel: 'Cek Transaksi',
      ctaRoute: '/transactions',
    });
  }

  // Priority 2.1: Night-Owl Spending
  if (nightOwl) {
    insights.push({
      priority: 2.1,
      severity: 'warning',
      title: 'Pola Pengeluaran Malam Hari',
      body: `Pengeluaran pada larut malam terdeteksi cukup tinggi (${formatCurrency(nightOwl.totalAmount)} bulan ini). Periksa kembali transaksi tersebut agar pengeluaran tetap sesuai rencana.`,
      ctaLabel: 'Lihat Pola',
      ctaRoute: '/analytics',
    });
  }

  // Priority 2.2: Loss-aversion / Nominal Framing (Top category spike)
  if (topExpenseCategory && topExpenseCategory.prevValue > 0) {
    const spike = Math.round(((topExpenseCategory.value - topExpenseCategory.prevValue) / topExpenseCategory.prevValue) * 100);
    if (spike >= 20) {
      const selisihNominal = topExpenseCategory.value - topExpenseCategory.prevValue;
      insights.push({
        priority: 2.2,
        severity: 'warning',
        title: 'Pengeluaran Melonjak',
        body: `Pengeluaran kategori ${topExpenseCategory.name} meningkat ${spike}% (+${formatCurrency(selisihNominal)}). Perlu diperhatikan agar alokasi ini tidak memotong rencana keuangan lainnya.`,
        ctaLabel: 'Lihat Tren',
        ctaRoute: '/analytics',
      });
    }
  }

  // Priority 2.5: Snowball Projection (Counterfactuals)
  if (wantsProjection) {
    let bodyText = `Bulan ini kategori ${wantsProjection.categoryName} menjadi salah satu pengeluaran terbesar dengan total ${formatCurrency(wantsProjection.monthlyTotal)}. `;

    if (wantsProjection.transactionCount >= 5) {
      bodyText += `Kamu sudah melakukan transaksi ini sebanyak ${wantsProjection.transactionCount} kali secara berulang. `;
    } else if (wantsProjection.averageTransaction >= 250000) {
      bodyText += `Meski jarang, nilai tiap transaksinya cukup besar (rata-rata ${formatCurrency(wantsProjection.averageTransaction)}). `;
    }

    bodyText += `Jika pola ini berlanjut, estimasi tahunannya dapat mencapai ${formatCurrency(wantsProjection.annualized)}. Pertimbangkan memantau pola pengeluaran ini agar tetap terkendali.`;

    insights.push({
      priority: 2.5,
      severity: 'warning',
      title: 'Proyeksi Kebiasaan',
      body: bodyText,
      ctaLabel: 'Lihat Tren',
      ctaRoute: '/analytics',
    });
  }

  // Priority 3: Latte Factor (Frequency Detection)
  if (frequentTxn) {
    insights.push({
      priority: 3,
      severity: 'info',
      title: 'Frekuensi Pengeluaran Rutin',
      body: `Terdapat ${frequentTxn.count} transaksi untuk '${frequentTxn.name}' bulan ini dengan total ${formatCurrency(frequentTxn.totalAmount)}. Perhatikan frekuensinya jika kamu berencana berhemat.`,
      ctaLabel: 'Lihat Transaksi',
      ctaRoute: '/transactions',
    });
  }

  // Priority 3.1: Subscription Cannibalization
  if (subscriptions) {
    insights.push({
      priority: 3.1,
      severity: 'warning',
      title: 'Evaluasi Langganan',
      body: `Kamu punya ${subscriptions.count} tagihan rutin bulanan yang memakan ${subscriptions.percentage}% dari total pemasukanmu. Coba evaluasi, apakah semua layanan ini masih rutin kamu pakai?`,
      ctaLabel: 'Cek Pengeluaran',
      ctaRoute: '/transactions',
    });
  }

  // Priority 3.5: Positive reinforcement (Net savings this period)
  if (weeklySavings > 0) {
    insights.push({
      priority: 3.5,
      severity: 'positive',
      title: 'Kamu Berhasil Berhemat!',
      body: `Hebat! Kamu berhasil menyisakan ${formatCurrency(weeklySavings)} pada 7 hari terakhir. Pertahankan kebiasaan baik ini.`,
      ctaLabel: 'Lihat Rincian',
      ctaRoute: '/transactions',
    });
  }

  // Priority 3.6: Mental Accounting / Target Mapping (Income increase)
  if (prev.income > 0 && current.income > prev.income) {
    const pct = Math.round(((current.income - prev.income) / prev.income) * 100);
    if (pct >= 10) {
      const selisihNominal = current.income - prev.income;
      const hemat50 = selisihNominal / 2;
      insights.push({
        priority: 3.6,
        severity: 'positive',
        title: 'Pemasukan Meningkat',
        body: `Pemasukan naik ${pct}%. Coba sisihkan ${formatCurrency(hemat50)} langsung ke dana darurat untuk memperkuat fondasi keuanganmu.`,
        ctaLabel: 'Kelola Dompet',
        ctaRoute: '/wallets',
      });
    }
  }

  // Priority 3.8: Peak Spending Day (Time-Series Pattern)
  if (peakDay) {
    let bodyText = '';
    if (peakDay.dominantCategoryName) {
      bodyText = `Pengeluaran tertinggimu bulan ini paling sering terjadi pada hari ${peakDay.dayName}, terutama pada kategori ${peakDay.dominantCategoryName}. Hari tersebut menyumbang ${peakDay.percentage}% dari total pengeluaran. Pertimbangkan menetapkan batas pengeluaran khusus untuk hari ${peakDay.dayName} atau mengevaluasi transaksi ${peakDay.dominantCategoryName} pada hari tersebut.`;
    } else {
      bodyText = `Pengeluaran tertinggimu bulan ini selalu terjadi pada hari ${peakDay.dayName} (menyumbang ${peakDay.percentage}% dari total). Pertimbangkan meninjau kembali transaksi pada hari tersebut agar pengeluaran tetap terkendali.`;
    }

    insights.push({
      priority: 3.8,
      severity: 'neutral',
      title: 'Pola Pengeluaran Ditemukan',
      body: bodyText,
      ctaLabel: 'Lihat Tren',
      ctaRoute: '/analytics',
    });
  }

  // --- NEW PHASE 1 RULES ---

  // [SP-08] Recurring Merchant Growth
  if (recurringMerchantGrowth) {
    insights.push({
      priority: 3.2,
      severity: 'info',
      title: 'Kenaikan Transaksi Rutin',
      body: `Transaksi untuk '${recurringMerchantGrowth.merchantName}' meningkat signifikan dibanding bulan lalu (${recurringMerchantGrowth.prevCount} → ${recurringMerchantGrowth.currentCount} kali). Total bulan ini: ${formatCurrency(recurringMerchantGrowth.amount)}.`,
      ctaLabel: 'Lihat Transaksi',
      ctaRoute: '/transactions',
    });
  }

  // [SP-09] Morning vs Evening Spending
  if (morningVsEvening) {
    insights.push({
      priority: 3.3,
      severity: 'neutral',
      title: 'Pola Waktu Pengeluaran',
      body: `Lebih dari ${Math.round(morningVsEvening.ratio * 100)}% pengeluaranmu bulan ini terkonsentrasi di sesi ${morningVsEvening.dominantSession} hari (total ${formatCurrency(morningVsEvening.total)}).`,
      ctaLabel: 'Lihat Analisis',
      ctaRoute: '/analytics',
    });
  }

  // [SP-10] Day-of-Month Clustering
  if (dayOfMonthClustering) {
    insights.push({
      priority: 3.4,
      severity: 'neutral',
      title: 'Konsentrasi Pengeluaran',
      body: `Lebih dari ${Math.round(dayOfMonthClustering.ratio * 100)}% pengeluaran bulan ini terpusat pada ${dayOfMonthClustering.topDays.length} hari tertentu saja.`,
      ctaLabel: 'Lihat Analisis',
      ctaRoute: '/analytics',
    });
  }

  // [BG-03] Zero Budget Category
  if (zeroBudgetCategory) {
    insights.push({
      priority: 1.5,
      severity: 'info',
      title: 'Pengeluaran Tanpa Anggaran',
      body: `Kamu sudah mencatat ${formatCurrency(zeroBudgetCategory.amount)} pengeluaran di '${zeroBudgetCategory.categoryName}' bulan ini, tapi belum ada anggaran untuk kategori ini.`,
      ctaLabel: 'Buat Anggaran',
      ctaRoute: '/budgets',
      relatedCategoryId: zeroBudgetCategory.categoryId,
    });
  }

  // [BG-04] Smart Budget Suggestion
  if (smartBudgetSuggestion) {
    insights.push({
      priority: 1.6,
      severity: 'info',
      title: 'Saran Anggaran Baru',
      body: `Kamu rutin mencatat rata-rata ${formatCurrency(smartBudgetSuggestion.averageAmount)}/bulan di '${smartBudgetSuggestion.categoryName}'. Pertimbangkan membuat anggaran dengan nominal tersebut.`,
      ctaLabel: 'Buat Anggaran',
      ctaRoute: '/budgets',
      relatedCategoryId: smartBudgetSuggestion.categoryId,
    });
  }

  // [WL-03] Single Wallet Usage Pattern
  if (singleWalletUsage) {
    insights.push({
      priority: 3.9,
      severity: 'neutral',
      title: 'Penggunaan Dompet Dominan',
      body: `Sebagian besar transaksimu bulan ini (${Math.round(singleWalletUsage.ratio * 100)}%) dicatat menggunakan dompet '${singleWalletUsage.walletName}'.`,
      ctaLabel: 'Lihat Dompet',
      ctaRoute: '/wallets',
    });
  }

  // [AN-08] Income Momentum Alert
  if (incomeMomentum) {
    insights.push({
      priority: 1.7,
      severity: 'warning',
      title: 'Pemasukan Tertinggal',
      body: `Hingga pertengahan bulan ini, pemasukan tercatat (${formatCurrency(incomeMomentum.currentIncome)}) lebih rendah dari biasanya (rata-rata ${formatCurrency(incomeMomentum.avgPrevIncome)}). Pastikan semua pemasukan sudah dicatat.`,
      ctaLabel: 'Catat Pemasukan',
      ctaRoute: '/transactions',
    });
  }

  // [WL-02] Low Cash Warning
  if (lowCashWarning) {
    insights.push({
      priority: 0.5,
      severity: 'critical',
      title: 'Saldo Dompet Menipis',
      body: `Saldo dompet '${lowCashWarning.walletName}' saat ini ${formatCurrency(lowCashWarning.currentBalance)}. Pertimbangkan untuk melakukan top up agar kebutuhan harian terpenuhi.`,
      ctaLabel: 'Lihat Dompet',
      ctaRoute: '/wallets',
    });
  }

  // --- NEW PHASE 2 RULES ---

  // [WL-01] Wallet Drain Rate
  if (walletDrainRate) {
    insights.push({
      priority: 1.8,
      severity: 'warning',
      title: 'Saldo Dompet Turun Cepat',
      body: `Laju pengeluaran dari dompet '${walletDrainRate.walletName}' bulan ini 1,5× lebih cepat dari bulan lalu. Pantau transaksimu dari dompet ini.`,
      ctaLabel: 'Lihat Dompet',
      ctaRoute: '/wallets',
    });
  }

  // [BG-01] Budget Runway Projection
  if (budgetRunway) {
    insights.push({
      priority: 1.9,
      severity: 'warning',
      title: 'Anggaran Berisiko Habis Lebih Awal',
      body: `Dengan laju pengeluaran saat ini, anggaran '${budgetRunway.categoryName}' diperkirakan habis dalam ${budgetRunway.daysUntilExhausted} hari, padahal bulan masih ${budgetRunway.daysRemaining} hari lagi.`,
      ctaLabel: 'Lihat Anggaran',
      ctaRoute: '/budgets',
    });
  }

  // [FT-01] Target Gap Alert
  if (targetGapAlert) {
    insights.push({
      priority: 2.3,
      severity: 'warning',
      title: 'Target Belum Ada Progres',
      body: `Target '${targetGapAlert.targetName}' sudah berjalan ${Math.round(targetGapAlert.elapsedPct * 100)}% dari periodenya, namun belum ada pemasukan yang tercatat. Pastikan target sudah sesuai rencanamu.`,
      ctaLabel: 'Lihat Target',
      ctaRoute: '/targets',
    });
  }

  // [FT-02] Target Progress Impact (Burn Rate vs Target)
  if (targetProgressImpact) {
    let timeframeStr = 'periode ini';
    if (targetProgressImpact.periodType === 'DAILY') timeframeStr = 'hari ini';
    else if (targetProgressImpact.periodType === 'WEEKLY') timeframeStr = 'minggu ini';
    else if (targetProgressImpact.periodType === 'MONTHLY') timeframeStr = 'bulan ini';

    insights.push({
      priority: 2.4,
      severity: 'info',
      title: 'Pengeluaran vs Target Pemasukan',
      body: `Total pengeluaranmu ${timeframeStr} (${formatCurrency(targetProgressImpact.expenseAmount)}) sudah mencapai proporsi yang besar terhadap target pemasukan '${targetProgressImpact.targetName}' (${formatCurrency(targetProgressImpact.targetAmount)}).`,
      ctaLabel: 'Lihat Target',
      ctaRoute: '/targets',
    });
  }

  // [AN-04] New Category Emergence
  if (newCategoryEmergence) {
    insights.push({
      priority: 2.6,
      severity: 'info',
      title: 'Kategori Pengeluaran Baru',
      body: `Kamu mulai mencatat pengeluaran di '${newCategoryEmergence.categoryName}' (${formatCurrency(newCategoryEmergence.amount)} bulan ini). Kategori ini belum pernah muncul dalam 3 bulan terakhir.`,
      ctaLabel: 'Lihat Transaksi',
      ctaRoute: '/transactions',
    });
  }

  // [AN-05] Category Dominance Shift
  if (categoryDominanceShift) {
    insights.push({
      priority: 2.7,
      severity: 'info',
      title: 'Pergeseran Pengeluaran Terbesar',
      body: `Pengeluaran terbesar bulan ini berpindah dari '${categoryDominanceShift.prevTopName}' ke '${categoryDominanceShift.newTopName}' (naik ${categoryDominanceShift.growthPct}% dibanding bulan lalu).`,
      ctaLabel: 'Lihat Analisis',
      ctaRoute: '/analytics',
    });
  }

  // [AN-07] Discretionary Drift
  if (discretionaryDrift) {
    insights.push({
      priority: 2.8,
      severity: 'neutral',
      title: 'Perubahan Pola Pengeluaran',
      body: `Porsi pengeluaran gaya hidupmu naik menjadi ${discretionaryDrift.ratioNow}% dari total pengeluaran (naik ${discretionaryDrift.diffPct} poin dari 3 bulan lalu).`,
      ctaLabel: 'Analisis Kategori',
      ctaRoute: '/analytics',
    });
  }

  // ==========================================
  // PHASE 3 RULES — Multi-Month Historical
  // ==========================================

  // [AN-02] Category Creep
  if (params.categoryCreep) {
    insights.push({
      priority: 2.9,
      severity: 'warning',
      title: 'Pengeluaran Kategori Merayap Naik',
      body: `Pengeluaranmu di kategori '${params.categoryCreep.categoryName}' terus naik >10% tiap bulan selama 3 bulan terakhir (sekarang ${formatCurrency(params.categoryCreep.currentAmount)}).`,
      ctaLabel: 'Lihat Analisis',
      ctaRoute: '/analytics',
    });
  }

  // [AN-03] Savings Gap Shrinking
  if (params.savingsGapShrinking) {
    insights.push({
      priority: 3.1,
      severity: 'warning',
      title: 'Selisih Bersih Menipis',
      body: `Selisih pemasukan dan pengeluaranmu terus menyusut selama 3 bulan terakhir (sekarang sisa ${formatCurrency(params.savingsGapShrinking.netNow)}). Hati-hati agar tidak defisit bulan depan.`,
      ctaLabel: 'Evaluasi Anggaran',
      ctaRoute: '/budgets',
    });
  }

  // [BG-05] Budget Accuracy
  if (params.budgetAccuracyAlert) {
    insights.push({
      priority: 3.2,
      severity: 'warning',
      title: 'Anggaran Mungkin Tidak Realistis',
      body: `Kamu secara konsisten melampaui anggaran '${params.budgetAccuracyAlert.categoryName}' >20% dalam 3 bulan terakhir (rata-rata ${formatCurrency(params.budgetAccuracyAlert.avgExpense)} dari budget ${formatCurrency(params.budgetAccuracyAlert.budgetAmount)}). Pertimbangkan untuk menyesuaikan budget ini.`,
      ctaLabel: 'Sesuaikan Anggaran',
      ctaRoute: '/budgets',
    });
  }

  // [SP-04] Category Spike (Refinement)
  if (params.categorySpike) {
    insights.push({
      priority: 3.3,
      severity: 'warning',
      title: 'Lonjakan Pengeluaran Kategori',
      body: `Pengeluaran '${params.categorySpike.categoryName}' bulan ini melonjak tajam (${formatCurrency(params.categorySpike.currentAmount)}), ${params.categorySpike.spikePct}% lebih tinggi dari rata-rata 3 bulan terakhirmu.`,
      ctaLabel: 'Lihat Transaksi',
      ctaRoute: '/transactions',
    });
  }

  // [AN-06] Expense-to-Income Consistency
  if (expenseConsistency) {
    const [r1, r2, r3] = expenseConsistency.ratios.map(r => Math.round(r * 100));
    insights.push({
      priority: 3.75,
      severity: 'neutral',
      title: 'Rasio Pengeluaran Tidak Konsisten',
      body: `Rasio pengeluaran terhadap pemasukanmu berubah-ubah dalam 3 bulan terakhir: ${r1}% → ${r2}% → ${r3}%. Konsistensi yang lebih stabil memudahkan perencanaan keuangan.`,
      ctaLabel: 'Lihat Analisis',
      ctaRoute: '/analytics',
    });
  }

  // Priority 4: Empathetic Neutral tip (When no anomalies)
  if (insights.length === 0 && current.expense > 0) {
    insights.push({
      priority: 4,
      severity: 'neutral',
      title: 'Pola Pengeluaran Stabil',
      body: `Arus kas kamu bulan ini berjalan stabil. Yuk, tinjau kembali pengeluaranmu untuk memastikan semuanya tetap berada di jalurnya.`,
      ctaLabel: 'Lihat Transaksi',
      ctaRoute: '/transactions',
    });
  }

  // Priority Triage (Weighted Sorting): Ascending sort to surface critical nudges first
  return insights.sort((a, b) => a.priority - b.priority);
}

// ─── Budget Reallocation Recommendation ───────────────────

export interface ReallocationRecommendation {
  sourceBudgetId: string;
  sourceCategoryId: string;
  sourceCategoryName: string;
  targetBudgetId: string;
  targetCategoryId: string;
  targetCategoryName: string;
  recommendedAmount: number;
}

export function findBudgetReallocationRecommendation(
  targetBudget: { id: string; categoryId: string; limit: number; spent: number; name: string },
  allBudgets: Array<{ id: string; categoryId: string; limit: number; spent: number; name: string }>
): ReallocationRecommendation | null {
  
  // We only recommend if target budget is 100% or more utilized
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
    
    // Strict numerical rule: source must have at least 70% remaining before transfer
    if (remainingRatioBefore < 0.7) continue;

    // Strict numerical rule: source must have at least 50% remaining after transfer
    const maxTransferable = remainingAmount - (b.limit * 0.5);
    if (maxTransferable <= 0) continue;
    
    const recommendedAmount = Math.min(targetDeficit, maxTransferable);
    
    if (recommendedAmount <= 0) continue;

    const afterTransferRemainingRatio = (remainingAmount - recommendedAmount) / b.limit;

    // Priority criteria
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
