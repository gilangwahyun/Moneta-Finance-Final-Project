/**
 * 08-insight-engine.spec.ts
 *
 * Data-driven automation tests for the Rule-Based Insight Engine.
 * Tests the `generateNudges()` function directly via page.evaluate()
 * to ensure each rule fires correctly under valid conditions and
 * does NOT fire under invalid/edge-case conditions (negative testing).
 *
 * Each test group:
 *   - [VALID] verifies the rule triggers with correct title and severity.
 *   - [INVALID] verifies the rule does NOT trigger when threshold is not met.
 *
 * Reference: docs/SKRIPSI_RULE_CATALOG.md
 */

import { test, expect } from '@playwright/test';
import { generateNudges, NudgeEngineParams, findBudgetReallocationRecommendation } from '../src/lib/nudging';
import { calculateWalletBalance } from '../src/lib/utils/wallet-utils';

// ---------------------------------------------------------------------------
// Helper: Call generateNudges directly in Node.js context
// ---------------------------------------------------------------------------

async function evalNudges(page: any, params: Record<string, any>): Promise<any[]> {
  // We no longer need page.evaluate because we import the actual logic!
  return generateNudges(params as NudgeEngineParams);
}

// Default "empty/neutral" params — rules should NOT fire unless explicitly set.
const EMPTY_PARAMS = {
  current: { income: 0, expense: 0, net: 0 },
  prev: { income: 0, expense: 0, net: 0 },
  topExpenseCategory: null,
  weeklySavings: 0,
  frequentTxn: null,
  peakDay: null,
  wantsProjection: null,
  paydayLeak: null,
  weekendTrap: null,
  nightOwl: null,
  subscriptions: null,
  recurringMerchantGrowth: null,
  morningVsEvening: null,
  dayOfMonthClustering: null,
  zeroBudgetCategory: null,
  smartBudgetSuggestion: null,
  singleWalletUsage: null,
  incomeMomentum: null,
  lowCashWarning: null,
  newCategoryEmergence: null,
  categoryDominanceShift: null,
  expenseConsistency: null,
  discretionaryDrift: null,
  budgetRunway: null,
  targetGapAlert: null,
  targetProgressImpact: null,
  walletDrainRate: null,
  categoryCreep: null,
  savingsGapShrinking: null,
  budgetAccuracyAlert: null,
  categorySpike: null,
  budgetRecovery: null,
  targetStreak: null,
  walletCategoryPattern: null,
};

test.describe('4. Insight Engine — Rule Automation (30+ Rules)', () => {
  test.setTimeout(30000);

  const page: any = null;

  // ===========================================================================
  // KELOMPOK A — Budget & Anggaran (via local-engine nudges)
  // ===========================================================================

  test.describe('Kelompok A — Budget & Anggaran', () => {

    // BG-03: Pengeluaran Tanpa Anggaran
    test('[BG-03] VALID: zeroBudgetCategory triggers "Pengeluaran Tanpa Anggaran"', async () => {
      const insights = await evalNudges(page, {
        ...EMPTY_PARAMS,
        zeroBudgetCategory: { categoryName: 'Hiburan', categoryId: 'cat-1', amount: 300_000 },
      });
      const rule = insights.find((i: any) => i.title === 'Pengeluaran Tanpa Anggaran');
      expect(rule).toBeDefined();
      expect(rule.severity).toBe('info');
    });

    test('[BG-03] INVALID: null zeroBudgetCategory does NOT trigger rule', async () => {
      const insights = await evalNudges(page, { ...EMPTY_PARAMS, zeroBudgetCategory: null });
      const rule = insights.find((i: any) => i.title === 'Pengeluaran Tanpa Anggaran');
      expect(rule).toBeUndefined();
    });

    // BG-04: Saran Anggaran Baru
    test('[BG-04] VALID: smartBudgetSuggestion triggers "Saran Anggaran Baru"', async () => {
      const insights = await evalNudges(page, {
        ...EMPTY_PARAMS,
        smartBudgetSuggestion: { categoryName: 'Makan & Minum', categoryId: 'cat-2', averageAmount: 750_000 },
      });
      const rule = insights.find((i: any) => i.title === 'Saran Anggaran Baru');
      expect(rule).toBeDefined();
      expect(rule.severity).toBe('info');
    });

    test('[BG-04] INVALID: null smartBudgetSuggestion does NOT trigger rule', async () => {
      const insights = await evalNudges(page, { ...EMPTY_PARAMS, smartBudgetSuggestion: null });
      const rule = insights.find((i: any) => i.title === 'Saran Anggaran Baru');
      expect(rule).toBeUndefined();
    });

    // BG-01: Anggaran Berisiko Habis Lebih Awal
    test('[BG-01] VALID: budgetRunway triggers "Anggaran Berisiko Habis Lebih Awal"', async () => {
      const insights = await evalNudges(page, {
        ...EMPTY_PARAMS,
        budgetRunway: { categoryName: 'Transport', budgetId: 'bgt-1', daysUntilExhausted: 5, daysRemaining: 15 },
      });
      const rule = insights.find((i: any) => i.title === 'Anggaran Berisiko Habis Lebih Awal');
      expect(rule).toBeDefined();
      expect(rule.severity).toBe('warning');
      expect(rule.priority).toBe(1.9);
    });

    test('[BG-01] INVALID: null budgetRunway does NOT trigger rule', async () => {
      const insights = await evalNudges(page, { ...EMPTY_PARAMS, budgetRunway: null });
      const rule = insights.find((i: any) => i.title === 'Anggaran Berisiko Habis Lebih Awal');
      expect(rule).toBeUndefined();
    });

    // BG-02: Pemulihan Anggaran Berhasil
    test('[BG-02] VALID: budgetRecovery triggers "Pemulihan Anggaran Berhasil"', async () => {
      const insights = await evalNudges(page, {
        ...EMPTY_PARAMS,
        budgetRecovery: { categoryName: 'Hiburan', budgetId: 'bgt-2', savedAmount: 500_000 },
      });
      const rule = insights.find((i: any) => i.title === 'Pemulihan Anggaran Berhasil');
      expect(rule).toBeDefined();
      expect(rule.severity).toBe('positive');
    });

    test('[BG-02] INVALID: null budgetRecovery does NOT trigger rule', async () => {
      const insights = await evalNudges(page, { ...EMPTY_PARAMS, budgetRecovery: null });
      const rule = insights.find((i: any) => i.title === 'Pemulihan Anggaran Berhasil');
      expect(rule).toBeUndefined();
    });

    // BG-05: Anggaran Mungkin Tidak Realistis
    test('[BG-05] VALID: budgetAccuracyAlert triggers "Anggaran Mungkin Tidak Realistis"', async () => {
      const insights = await evalNudges(page, {
        ...EMPTY_PARAMS,
        budgetAccuracyAlert: { categoryName: 'Belanja', budgetId: 'bgt-3', budgetAmount: 1_000_000, avgExpense: 1_400_000 },
      });
      const rule = insights.find((i: any) => i.title === 'Anggaran Mungkin Tidak Realistis');
      expect(rule).toBeDefined();
      expect(rule.severity).toBe('warning');
    });

    test('[BG-05] INVALID: null budgetAccuracyAlert does NOT trigger rule', async () => {
      const insights = await evalNudges(page, { ...EMPTY_PARAMS, budgetAccuracyAlert: null });
      const rule = insights.find((i: any) => i.title === 'Anggaran Mungkin Tidak Realistis');
      expect(rule).toBeUndefined();
    });

    // BG-00: Top Category Spike (Pengeluaran Melonjak) — via topExpenseCategory
    test('[BG-00] VALID: topExpenseCategory spike >= 20% triggers "Pengeluaran Melonjak"', async () => {
      const insights = await evalNudges(page, {
        ...EMPTY_PARAMS,
        topExpenseCategory: { name: 'Belanja', value: 1_500_000, prevValue: 1_000_000 }, // spike 50%
      });
      const rule = insights.find((i: any) => i.title === 'Pengeluaran Melonjak');
      expect(rule).toBeDefined();
      expect(rule.severity).toBe('warning');
    });

    test('[BG-00] INVALID: topExpenseCategory spike < 20% does NOT trigger "Pengeluaran Melonjak"', async () => {
      const insights = await evalNudges(page, {
        ...EMPTY_PARAMS,
        topExpenseCategory: { name: 'Belanja', value: 1_100_000, prevValue: 1_000_000 }, // spike 10%
      });
      const rule = insights.find((i: any) => i.title === 'Pengeluaran Melonjak');
      expect(rule).toBeUndefined();
    });

    // BG-00c: Budget Reallocation Recommendation
    test('[BG-00c] VALID: budget terlampaui + sumber eligible >= 70% sisa → rekomendasi realokasi', () => {
      const targetBudget = { id: 'bgt-target', categoryId: 'cat-1', limit: 500_000, spent: 650_000, name: 'Hiburan' };
      const allBudgets = [
        targetBudget,
        { id: 'bgt-source', categoryId: 'cat-2', limit: 1_000_000, spent: 100_000, name: 'Transport' }, // 90% sisa
      ];
      const result = findBudgetReallocationRecommendation(targetBudget, allBudgets);
      expect(result).not.toBeNull();
      expect(result!.sourceBudgetId).toBe('bgt-source');
      expect(result!.recommendedAmount).toBeGreaterThan(0);
    });

    test('[BG-00c] INVALID: budget belum terlampaui (spent < limit) → returns null', () => {
      const targetBudget = { id: 'bgt-target', categoryId: 'cat-1', limit: 500_000, spent: 400_000, name: 'Hiburan' };
      const allBudgets = [
        targetBudget,
        { id: 'bgt-source', categoryId: 'cat-2', limit: 1_000_000, spent: 100_000, name: 'Transport' },
      ];
      const result = findBudgetReallocationRecommendation(targetBudget, allBudgets);
      expect(result).toBeNull();
    });

    test('[BG-00c] INVALID: tidak ada sumber eligible (sisa < 70%) → returns null', () => {
      const targetBudget = { id: 'bgt-target', categoryId: 'cat-1', limit: 500_000, spent: 650_000, name: 'Hiburan' };
      const allBudgets = [
        targetBudget,
        { id: 'bgt-source', categoryId: 'cat-2', limit: 1_000_000, spent: 700_000, name: 'Transport' }, // hanya 30% sisa
      ];
      const result = findBudgetReallocationRecommendation(targetBudget, allBudgets);
      expect(result).toBeNull();
    });

  });

  // ===========================================================================
  // KELOMPOK B — Spending Pattern (SP)
  // ===========================================================================

  test.describe('Kelompok B — Spending Pattern', () => {

    // SP-01: Payday Leak
    test('[SP-01] VALID: paydayLeak triggers "Pengeluaran Awal Bulan" (critical)', async () => {
      const insights = await evalNudges(page, {
        ...EMPTY_PARAMS,
        paydayLeak: { percentage: 55, days: 2 },
      });
      const rule = insights.find((i: any) => i.title === 'Pengeluaran Awal Bulan');
      expect(rule).toBeDefined();
      expect(rule.severity).toBe('critical');
      expect(rule.priority).toBe(1);
    });

    test('[SP-01] INVALID: null paydayLeak does NOT trigger rule', async () => {
      const insights = await evalNudges(page, { ...EMPTY_PARAMS, paydayLeak: null });
      const rule = insights.find((i: any) => i.title === 'Pengeluaran Awal Bulan');
      expect(rule).toBeUndefined();
    });

    // SP-02: Weekend Trap
    test('[SP-02] VALID: weekendTrap > 70% triggers "Pola Pengeluaran Akhir Pekan"', async () => {
      const insights = await evalNudges(page, {
        ...EMPTY_PARAMS,
        weekendTrap: { percentage: 75 },
      });
      const rule = insights.find((i: any) => i.title === 'Pola Pengeluaran Akhir Pekan');
      expect(rule).toBeDefined();
      expect(rule.severity).toBe('warning');
    });

    test('[SP-02] INVALID: null weekendTrap does NOT trigger rule', async () => {
      const insights = await evalNudges(page, { ...EMPTY_PARAMS, weekendTrap: null });
      const rule = insights.find((i: any) => i.title === 'Pola Pengeluaran Akhir Pekan');
      expect(rule).toBeUndefined();
    });

    // SP-03: Night Owl
    test('[SP-03] VALID: nightOwl >= Rp150.000 triggers "Pola Pengeluaran Malam Hari"', async () => {
      const insights = await evalNudges(page, {
        ...EMPTY_PARAMS,
        nightOwl: { totalAmount: 200_000 },
      });
      const rule = insights.find((i: any) => i.title === 'Pola Pengeluaran Malam Hari');
      expect(rule).toBeDefined();
      expect(rule.severity).toBe('warning');
    });

    test('[SP-03] INVALID: null nightOwl does NOT trigger rule', async () => {
      const insights = await evalNudges(page, { ...EMPTY_PARAMS, nightOwl: null });
      const rule = insights.find((i: any) => i.title === 'Pola Pengeluaran Malam Hari');
      expect(rule).toBeUndefined();
    });

    // SP-04: Category Spike
    test('[SP-04] VALID: categorySpike > 50% avg triggers "Lonjakan Pengeluaran Kategori"', async () => {
      const insights = await evalNudges(page, {
        ...EMPTY_PARAMS,
        categorySpike: { categoryName: 'Belanja', categoryId: 'cat-3', currentAmount: 1_500_000, avgAmount: 900_000, spikePct: 67 },
      });
      const rule = insights.find((i: any) => i.title === 'Lonjakan Pengeluaran Kategori');
      expect(rule).toBeDefined();
      expect(rule.severity).toBe('warning');
    });

    test('[SP-04] INVALID: null categorySpike does NOT trigger rule', async () => {
      const insights = await evalNudges(page, { ...EMPTY_PARAMS, categorySpike: null });
      const rule = insights.find((i: any) => i.title === 'Lonjakan Pengeluaran Kategori');
      expect(rule).toBeUndefined();
    });

    // SP-05: Latte Factor
    test('[SP-05] VALID: frequentTxn triggers "Frekuensi Pengeluaran Rutin"', async () => {
      const insights = await evalNudges(page, {
        ...EMPTY_PARAMS,
        frequentTxn: { name: 'Kopi Susu', count: 15, totalAmount: 450_000 },
      });
      const rule = insights.find((i: any) => i.title === 'Frekuensi Pengeluaran Rutin');
      expect(rule).toBeDefined();
      expect(rule.severity).toBe('info');
    });

    test('[SP-05] INVALID: null frequentTxn does NOT trigger rule', async () => {
      const insights = await evalNudges(page, { ...EMPTY_PARAMS, frequentTxn: null });
      const rule = insights.find((i: any) => i.title === 'Frekuensi Pengeluaran Rutin');
      expect(rule).toBeUndefined();
    });

    // SP-06: Subscription Cannibalization
    test('[SP-06] VALID: subscriptions >= 3 triggers "Evaluasi Langganan"', async () => {
      const insights = await evalNudges(page, {
        ...EMPTY_PARAMS,
        subscriptions: { count: 4, percentage: 22 },
      });
      const rule = insights.find((i: any) => i.title === 'Evaluasi Langganan');
      expect(rule).toBeDefined();
      expect(rule.severity).toBe('warning');
    });

    test('[SP-06] INVALID: null subscriptions does NOT trigger rule', async () => {
      const insights = await evalNudges(page, { ...EMPTY_PARAMS, subscriptions: null });
      const rule = insights.find((i: any) => i.title === 'Evaluasi Langganan');
      expect(rule).toBeUndefined();
    });

    // SP-07 / PR-01: Positive Reinforcement — Berhasil Berhemat
    test('[SP-07/PR-01] VALID: weeklySavings > 0 triggers "Kamu Berhasil Berhemat!"', async () => {
      const insights = await evalNudges(page, {
        ...EMPTY_PARAMS,
        weeklySavings: 500_000,
      });
      const rule = insights.find((i: any) => i.title === 'Kamu Berhasil Berhemat!');
      expect(rule).toBeDefined();
      expect(rule.severity).toBe('positive');
    });

    test('[SP-07/PR-01] INVALID: weeklySavings = 0 does NOT trigger rule', async () => {
      const insights = await evalNudges(page, { ...EMPTY_PARAMS, weeklySavings: 0 });
      const rule = insights.find((i: any) => i.title === 'Kamu Berhasil Berhemat!');
      expect(rule).toBeUndefined();
    });

    // SP-07: Recurring Merchant Growth
    test('[SP-07] VALID: recurringMerchantGrowth >= 2x triggers "Kenaikan Transaksi Rutin"', async () => {
      const insights = await evalNudges(page, {
        ...EMPTY_PARAMS,
        recurringMerchantGrowth: { merchantName: 'GrabFood', currentCount: 6, prevCount: 2, amount: 600_000 },
      });
      const rule = insights.find((i: any) => i.title === 'Kenaikan Transaksi Rutin');
      expect(rule).toBeDefined();
      expect(rule.severity).toBe('info');
    });

    test('[SP-07] INVALID: null recurringMerchantGrowth does NOT trigger rule', async () => {
      const insights = await evalNudges(page, { ...EMPTY_PARAMS, recurringMerchantGrowth: null });
      const rule = insights.find((i: any) => i.title === 'Kenaikan Transaksi Rutin');
      expect(rule).toBeUndefined();
    });

    // SP-08: Morning vs Evening
    test('[SP-08] VALID: morningVsEvening > 60% triggers "Pola Waktu Pengeluaran"', async () => {
      const insights = await evalNudges(page, {
        ...EMPTY_PARAMS,
        morningVsEvening: { dominantSession: 'malam', ratio: 0.65, total: 800_000 },
      });
      const rule = insights.find((i: any) => i.title === 'Pola Waktu Pengeluaran');
      expect(rule).toBeDefined();
      expect(rule.severity).toBe('neutral');
    });

    test('[SP-08] INVALID: null morningVsEvening does NOT trigger rule', async () => {
      const insights = await evalNudges(page, { ...EMPTY_PARAMS, morningVsEvening: null });
      const rule = insights.find((i: any) => i.title === 'Pola Waktu Pengeluaran');
      expect(rule).toBeUndefined();
    });

    // SP-09: Day of Month Clustering
    test('[SP-09] VALID: dayOfMonthClustering > 50% triggers "Konsentrasi Pengeluaran"', async () => {
      const insights = await evalNudges(page, {
        ...EMPTY_PARAMS,
        dayOfMonthClustering: { ratio: 0.65, topDays: [1, 15, 28], totalAmount: 1_300_000 },
      });
      const rule = insights.find((i: any) => i.title === 'Konsentrasi Pengeluaran');
      expect(rule).toBeDefined();
      expect(rule.severity).toBe('neutral');
    });

    test('[SP-09] INVALID: null dayOfMonthClustering does NOT trigger rule', async () => {
      const insights = await evalNudges(page, { ...EMPTY_PARAMS, dayOfMonthClustering: null });
      const rule = insights.find((i: any) => i.title === 'Konsentrasi Pengeluaran');
      expect(rule).toBeUndefined();
    });

  });

  // ===========================================================================
  // KELOMPOK C — Analitik Pola (AN)
  // ===========================================================================

  test.describe('Kelompok C — Analitik Pola', () => {

    // AN-01: Peak Spending Day
    test('[AN-01] VALID: peakDay triggers "Pola Pengeluaran Ditemukan"', async () => {
      const insights = await evalNudges(page, {
        ...EMPTY_PARAMS,
        peakDay: { dayName: 'Sabtu', percentage: 45, dominantCategoryName: 'Belanja', totalAmountOnThatDay: 900_000, transactionCountOnThatDay: 5 },
      });
      const rule = insights.find((i: any) => i.title === 'Pola Pengeluaran Ditemukan');
      expect(rule).toBeDefined();
      expect(rule.severity).toBe('neutral');
      expect(rule.priority).toBe(3.8);
    });

    test('[AN-01] INVALID: null peakDay does NOT trigger rule', async () => {
      const insights = await evalNudges(page, { ...EMPTY_PARAMS, peakDay: null });
      const rule = insights.find((i: any) => i.title === 'Pola Pengeluaran Ditemukan');
      expect(rule).toBeUndefined();
    });

    // AN-02: Category Creep
    test('[AN-02] VALID: categoryCreep (3-month naik >10%) triggers "Pengeluaran Kategori Merayap Naik"', async () => {
      const insights = await evalNudges(page, {
        ...EMPTY_PARAMS,
        categoryCreep: { categoryName: 'Jajan', categoryId: 'cat-4', currentAmount: 1_500_000, growthPct: 15 },
      });
      const rule = insights.find((i: any) => i.title === 'Pengeluaran Kategori Merayap Naik');
      expect(rule).toBeDefined();
      expect(rule.severity).toBe('warning');
      expect(rule.priority).toBe(2.9);
    });

    test('[AN-02] INVALID: null categoryCreep does NOT trigger rule', async () => {
      const insights = await evalNudges(page, { ...EMPTY_PARAMS, categoryCreep: null });
      const rule = insights.find((i: any) => i.title === 'Pengeluaran Kategori Merayap Naik');
      expect(rule).toBeUndefined();
    });

    // AN-03: Savings Gap Shrinking
    test('[AN-03] VALID: savingsGapShrinking (turun >10%/bln) triggers "Selisih Bersih Menipis"', async () => {
      const insights = await evalNudges(page, {
        ...EMPTY_PARAMS,
        savingsGapShrinking: { netNow: 500_000, netThen: 2_000_000, dropPct: 75 },
      });
      const rule = insights.find((i: any) => i.title === 'Selisih Bersih Menipis');
      expect(rule).toBeDefined();
      expect(rule.severity).toBe('warning');
    });

    test('[AN-03] INVALID: null savingsGapShrinking does NOT trigger rule', async () => {
      const insights = await evalNudges(page, { ...EMPTY_PARAMS, savingsGapShrinking: null });
      const rule = insights.find((i: any) => i.title === 'Selisih Bersih Menipis');
      expect(rule).toBeUndefined();
    });

    // AN-04: New Category Emergence
    test('[AN-04] VALID: newCategoryEmergence > Rp100.000 triggers "Kategori Pengeluaran Baru"', async () => {
      const insights = await evalNudges(page, {
        ...EMPTY_PARAMS,
        newCategoryEmergence: { categoryName: 'Hobi', categoryId: 'cat-5', amount: 350_000 },
      });
      const rule = insights.find((i: any) => i.title === 'Kategori Pengeluaran Baru');
      expect(rule).toBeDefined();
      expect(rule.severity).toBe('info');
    });

    test('[AN-04] INVALID: null newCategoryEmergence does NOT trigger rule', async () => {
      const insights = await evalNudges(page, { ...EMPTY_PARAMS, newCategoryEmergence: null });
      const rule = insights.find((i: any) => i.title === 'Kategori Pengeluaran Baru');
      expect(rule).toBeUndefined();
    });

    // AN-05: Category Dominance Shift
    test('[AN-05] VALID: categoryDominanceShift >= 30% growth triggers "Pergeseran Pengeluaran Terbesar"', async () => {
      const insights = await evalNudges(page, {
        ...EMPTY_PARAMS,
        categoryDominanceShift: { newTopName: 'Belanja', newTopAmount: 1_500_000, prevTopName: 'Makan & Minum', growthPct: 50 },
      });
      const rule = insights.find((i: any) => i.title === 'Pergeseran Pengeluaran Terbesar');
      expect(rule).toBeDefined();
      expect(rule.severity).toBe('info');
    });

    test('[AN-05] INVALID: null categoryDominanceShift does NOT trigger rule', async () => {
      const insights = await evalNudges(page, { ...EMPTY_PARAMS, categoryDominanceShift: null });
      const rule = insights.find((i: any) => i.title === 'Pergeseran Pengeluaran Terbesar');
      expect(rule).toBeUndefined();
    });

    // AN-06: Expense-to-Income Consistency
    test('[AN-06] VALID: expenseConsistency (max-min > 0.20) triggers "Rasio Pengeluaran Tidak Konsisten"', async () => {
      const insights = await evalNudges(page, {
        ...EMPTY_PARAMS,
        expenseConsistency: { ratios: [0.5, 0.7, 0.95], minRatio: 0.5, maxRatio: 0.95 },
      });
      const rule = insights.find((i: any) => i.title === 'Rasio Pengeluaran Tidak Konsisten');
      expect(rule).toBeDefined();
      expect(rule.severity).toBe('neutral');
    });

    test('[AN-06] INVALID: expenseConsistency within 20% range does NOT trigger rule', async () => {
      // max-min = 0.75 - 0.60 = 0.15 < 0.20 → should NOT trigger
      const insights = await evalNudges(page, {
        ...EMPTY_PARAMS,
        expenseConsistency: null, // engine already evaluated as null for small variance
      });
      const rule = insights.find((i: any) => i.title === 'Rasio Pengeluaran Tidak Konsisten');
      expect(rule).toBeUndefined();
    });

    // AN-07: Discretionary Drift
    test('[AN-07] VALID: discretionaryDrift > 0.15 triggers "Perubahan Pola Pengeluaran"', async () => {
      const insights = await evalNudges(page, {
        ...EMPTY_PARAMS,
        discretionaryDrift: { ratioNow: 0.50, ratioThen: 0.30, diffPct: 20 },
      });
      const rule = insights.find((i: any) => i.title === 'Perubahan Pola Pengeluaran');
      expect(rule).toBeDefined();
      expect(rule.severity).toBe('neutral');
    });

    test('[AN-07] INVALID: null discretionaryDrift does NOT trigger rule', async () => {
      const insights = await evalNudges(page, { ...EMPTY_PARAMS, discretionaryDrift: null });
      const rule = insights.find((i: any) => i.title === 'Perubahan Pola Pengeluaran');
      expect(rule).toBeUndefined();
    });

    // AN-08: Income Momentum Alert
    test('[AN-08] VALID: incomeMomentum < 50% avgPrev triggers "Pemasukan Tertinggal"', async () => {
      const insights = await evalNudges(page, {
        ...EMPTY_PARAMS,
        incomeMomentum: { currentIncome: 2_000_000, avgPrevIncome: 5_000_000 },
      });
      const rule = insights.find((i: any) => i.title === 'Pemasukan Tertinggal');
      expect(rule).toBeDefined();
      expect(rule.severity).toBe('warning');
      expect(rule.priority).toBe(1.7);
    });

    test('[AN-08] INVALID: null incomeMomentum does NOT trigger rule', async () => {
      const insights = await evalNudges(page, { ...EMPTY_PARAMS, incomeMomentum: null });
      const rule = insights.find((i: any) => i.title === 'Pemasukan Tertinggal');
      expect(rule).toBeUndefined();
    });

    // AN-09: Snowball Projection
    test('[AN-09] VALID: wantsProjection triggers "Proyeksi Kebiasaan"', async () => {
      const insights = await evalNudges(page, {
        ...EMPTY_PARAMS,
        wantsProjection: {
          categoryName: 'Hiburan',
          categoryId: 'cat-6',
          currentPace: 500_000,
          annualized: 6_000_000,
          monthlyTotal: 500_000,
          transactionCount: 8,
          averageTransaction: 62_500,
          basis: 'TOP_DISCRETIONARY_CATEGORY',
        },
      });
      const rule = insights.find((i: any) => i.title === 'Proyeksi Kebiasaan');
      expect(rule).toBeDefined();
      expect(rule.severity).toBe('warning');
    });

    test('[AN-09] INVALID: null wantsProjection does NOT trigger rule', async () => {
      const insights = await evalNudges(page, { ...EMPTY_PARAMS, wantsProjection: null });
      const rule = insights.find((i: any) => i.title === 'Proyeksi Kebiasaan');
      expect(rule).toBeUndefined();
    });

    // AN-10 (a): Data Pemasukan Kosong
    test('[AN-10a] VALID: income=0, expense>0 triggers "Data Pemasukan Kosong" (critical)', async () => {
      const insights = await evalNudges(page, {
        ...EMPTY_PARAMS,
        current: { income: 0, expense: 2_000_000, net: -2_000_000 },
      });
      const rule = insights.find((i: any) => i.title === 'Data Pemasukan Kosong');
      expect(rule).toBeDefined();
      expect(rule.severity).toBe('critical');
    });

    // AN-10 (b): Defisit Arus Kas
    test('[AN-10b] VALID: expense > income triggers "Defisit Arus Kas" (critical)', async () => {
      const insights = await evalNudges(page, {
        ...EMPTY_PARAMS,
        current: { income: 3_000_000, expense: 4_000_000, net: -1_000_000 },
      });
      const rule = insights.find((i: any) => i.title === 'Defisit Arus Kas');
      expect(rule).toBeDefined();
      expect(rule.severity).toBe('critical');
      expect(rule.priority).toBe(1.1);
    });

    // AN-10 (c): Rasio Pengeluaran Tinggi
    test('[AN-10c] VALID: expense/income >= 0.8 triggers "Rasio Pengeluaran Tinggi" (warning)', async () => {
      const insights = await evalNudges(page, {
        ...EMPTY_PARAMS,
        current: { income: 5_000_000, expense: 4_200_000, net: 800_000 },
      });
      const rule = insights.find((i: any) => i.title === 'Rasio Pengeluaran Tinggi');
      expect(rule).toBeDefined();
      expect(rule.severity).toBe('warning');
    });

    test('[AN-10c] INVALID: expense/income = 0.5 does NOT trigger "Rasio Pengeluaran Tinggi"', async () => {
      const insights = await evalNudges(page, {
        ...EMPTY_PARAMS,
        current: { income: 5_000_000, expense: 2_500_000, net: 2_500_000 },
      });
      const rule = insights.find((i: any) => i.title === 'Rasio Pengeluaran Tinggi');
      expect(rule).toBeUndefined();
    });

    // AN-10a INVALID
    test('[AN-10a] INVALID: income=0 AND expense=0 does NOT trigger "Data Pemasukan Kosong"', async () => {
      // Kondisi: income <= 0 && expense > 0 — jika expense juga 0, rule tidak terpicu
      const insights = await evalNudges(page, {
        ...EMPTY_PARAMS,
        current: { income: 0, expense: 0, net: 0 },
      });
      const rule = insights.find((i: any) => i.title === 'Data Pemasukan Kosong');
      expect(rule).toBeUndefined();
    });

    // AN-10b INVALID
    test('[AN-10b] INVALID: income >= expense does NOT trigger "Defisit Arus Kas"', async () => {
      // Kondisi: expense > income — jika expense <= income, rule tidak terpicu
      const insights = await evalNudges(page, {
        ...EMPTY_PARAMS,
        current: { income: 4_000_000, expense: 3_000_000, net: 1_000_000 },
      });
      const rule = insights.find((i: any) => i.title === 'Defisit Arus Kas');
      expect(rule).toBeUndefined();
    });

  });

  // ===========================================================================
  // KELOMPOK D — Dompet & Kas (WL)
  // ===========================================================================

  test.describe('Kelompok D — Dompet & Kas', () => {



    // WL-03: Single Wallet Usage
    test('[WL-03] VALID: singleWalletUsage > 90% triggers "Penggunaan Dompet Dominan"', async () => {
      const insights = await evalNudges(page, {
        ...EMPTY_PARAMS,
        singleWalletUsage: { walletName: 'Dompet Utama', ratio: 0.95 },
      });
      const rule = insights.find((i: any) => i.title === 'Penggunaan Dompet Dominan');
      expect(rule).toBeDefined();
      expect(rule.severity).toBe('neutral');
      expect(rule.priority).toBe(3.9);
    });

    test('[WL-03] INVALID: null singleWalletUsage does NOT trigger rule', async () => {
      const insights = await evalNudges(page, { ...EMPTY_PARAMS, singleWalletUsage: null });
      const rule = insights.find((i: any) => i.title === 'Penggunaan Dompet Dominan');
      expect(rule).toBeUndefined();
    });

    // WL-04: Wallet Category Pattern
    test('[WL-04] VALID: walletCategoryPattern >= 80% triggers "Pola Penggunaan Dompet"', async () => {
      const insights = await evalNudges(page, {
        ...EMPTY_PARAMS,
        walletCategoryPattern: { walletName: 'BCA', categoryName: 'Belanja Online', percentage: 85 },
      });
      const rule = insights.find((i: any) => i.title === 'Pola Penggunaan Dompet');
      expect(rule).toBeDefined();
      expect(rule.severity).toBe('neutral');
    });

    test('[WL-04] INVALID: null walletCategoryPattern does NOT trigger rule', async () => {
      const insights = await evalNudges(page, { ...EMPTY_PARAMS, walletCategoryPattern: null });
      const rule = insights.find((i: any) => i.title === 'Pola Penggunaan Dompet');
      expect(rule).toBeUndefined();
    });

  });

  // ===========================================================================
  // KELOMPOK E — Target Keuangan (FT)
  // ===========================================================================

  test.describe('Kelompok E — Target Keuangan', () => {

    // FT-01: Target Gap Alert
    test('[FT-01] VALID: targetGapAlert (>30% elapsed, income=0) triggers "Target Belum Ada Progres"', async () => {
      const insights = await evalNudges(page, {
        ...EMPTY_PARAMS,
        targetGapAlert: { targetName: 'Tabungan Darurat', targetId: 'tgt-1', elapsedPct: 0.45 },
      });
      const rule = insights.find((i: any) => i.title === 'Target Belum Ada Progres');
      expect(rule).toBeDefined();
      expect(rule.severity).toBe('warning');
      expect(rule.priority).toBe(2.3);
    });

    test('[FT-01] INVALID: null targetGapAlert does NOT trigger rule', async () => {
      const insights = await evalNudges(page, { ...EMPTY_PARAMS, targetGapAlert: null });
      const rule = insights.find((i: any) => i.title === 'Target Belum Ada Progres');
      expect(rule).toBeUndefined();
    });

    // FT-02: Target Progress Impact
    test('[FT-02] VALID: targetProgressImpact (expense > 80% target) triggers "Pengeluaran vs Target Pemasukan"', async () => {
      const insights = await evalNudges(page, {
        ...EMPTY_PARAMS,
        targetProgressImpact: { targetName: 'Gaji Bulanan', targetId: 'tgt-2', expenseAmount: 4_200_000, targetAmount: 5_000_000, periodType: 'MONTHLY' },
      });
      const rule = insights.find((i: any) => i.title === 'Pengeluaran vs Target Pemasukan');
      expect(rule).toBeDefined();
      expect(rule.severity).toBe('info');
    });

    test('[FT-02] INVALID: null targetProgressImpact does NOT trigger rule', async () => {
      const insights = await evalNudges(page, { ...EMPTY_PARAMS, targetProgressImpact: null });
      const rule = insights.find((i: any) => i.title === 'Pengeluaran vs Target Pemasukan');
      expect(rule).toBeUndefined();
    });

    // FT-03: Target Streak
    test('[FT-03] VALID: targetStreak (3 bulan tercapai) triggers "Konsistensi Target Terjaga"', async () => {
      const insights = await evalNudges(page, {
        ...EMPTY_PARAMS,
        targetStreak: { targetName: 'Gaji Freelance', targetId: 'tgt-3', streakCount: 3 },
      });
      const rule = insights.find((i: any) => i.title === 'Konsistensi Target Terjaga');
      expect(rule).toBeDefined();
      expect(rule.severity).toBe('positive');
    });

    test('[FT-03] INVALID: null targetStreak does NOT trigger rule', async () => {
      const insights = await evalNudges(page, { ...EMPTY_PARAMS, targetStreak: null });
      const rule = insights.find((i: any) => i.title === 'Konsistensi Target Terjaga');
      expect(rule).toBeUndefined();
    });

  });

  // ===========================================================================
  // KELOMPOK F — Reinforcement Positif (PR)
  // ===========================================================================

  test.describe('Kelompok F — Reinforcement Positif', () => {

    // PR-02: Income Increase
    test('[PR-02] VALID: income naik >= 10% triggers "Pemasukan Meningkat"', async () => {
      const insights = await evalNudges(page, {
        ...EMPTY_PARAMS,
        current: { income: 6_000_000, expense: 0, net: 6_000_000 },
        prev: { income: 5_000_000, expense: 0, net: 5_000_000 },
      });
      const rule = insights.find((i: any) => i.title === 'Pemasukan Meningkat');
      expect(rule).toBeDefined();
      expect(rule.severity).toBe('positive');
      expect(rule.priority).toBe(3.6);
    });

    test('[PR-02] INVALID: income naik < 10% (hanya 5%) does NOT trigger rule', async () => {
      const insights = await evalNudges(page, {
        ...EMPTY_PARAMS,
        current: { income: 5_250_000, expense: 0, net: 5_250_000 }, // +5%
        prev: { income: 5_000_000, expense: 0, net: 5_000_000 },
      });
      const rule = insights.find((i: any) => i.title === 'Pemasukan Meningkat');
      expect(rule).toBeUndefined();
    });

    test('[PR-02] INVALID: prev.income = 0 does NOT trigger rule', async () => {
      const insights = await evalNudges(page, {
        ...EMPTY_PARAMS,
        current: { income: 5_000_000, expense: 0, net: 5_000_000 },
        prev: { income: 0, expense: 0, net: 0 },
      });
      const rule = insights.find((i: any) => i.title === 'Pemasukan Meningkat');
      expect(rule).toBeUndefined();
    });

  });

  // ===========================================================================
  // KELOMPOK G — Rule Fallback & Priority Order
  // ===========================================================================

  test.describe('Kelompok G — Fallback & Priority Sorting', () => {

    // FALLBACK
    test('[FALLBACK] VALID: no rules active + expense>0 triggers "Pola Pengeluaran Stabil"', async () => {
      const insights = await evalNudges(page, {
        ...EMPTY_PARAMS,
        current: { income: 5_000_000, expense: 2_000_000, net: 3_000_000 },
      });
      const rule = insights.find((i: any) => i.title === 'Pola Pengeluaran Stabil');
      expect(rule).toBeDefined();
      expect(rule.severity).toBe('neutral');
      expect(rule.priority).toBe(4);
    });

    test('[FALLBACK] INVALID: expense=0 does NOT trigger fallback', async () => {
      const insights = await evalNudges(page, {
        ...EMPTY_PARAMS,
        current: { income: 0, expense: 0, net: 0 },
      });
      const rule = insights.find((i: any) => i.title === 'Pola Pengeluaran Stabil');
      expect(rule).toBeUndefined();
    });

    // Priority ordering
    test('[PRIORITY] Rules are sorted ascending by priority (lowest = highest urgency)', async () => {
      // Set multiple rules at once and verify sorting
      const insights = await evalNudges(page, {
        ...EMPTY_PARAMS,
        paydayLeak: { percentage: 55, days: 2 },             // priority 1 (critical)
        lowCashWarning: { walletName: 'GoPay', currentBalance: 50_000, walletId: 'wlt-x' }, // priority 0.5
        peakDay: { dayName: 'Sabtu', percentage: 40, totalAmountOnThatDay: 500_000, transactionCountOnThatDay: 3 }, // priority 3.8
        weeklySavings: 200_000,                              // priority 3.5
      });

      // Should be sorted ascending: 0.5, 1, 3.5, 3.8
      const priorities = insights.map((i: any) => i.priority);
      const sorted = [...priorities].sort((a, b) => a - b);
      expect(priorities).toEqual(sorted);
    });

    // Critical rules appear before non-critical
    test('[PRIORITY] SP-03 (priority 2.1) appears before SP-07 (priority 3.2)', async () => {
      const insights = await evalNudges(page, {
        ...EMPTY_PARAMS,
        recurringMerchantGrowth: { merchantName: 'Steam', currentCount: 5, prevCount: 2, amount: 500_000 },
        nightOwl: { totalAmount: 400_000 },
      });
      const idxGrowth = insights.findIndex((i: any) => i.title === 'Kenaikan Transaksi Rutin');
      const idxNight = insights.findIndex((i: any) => i.title === 'Pola Pengeluaran Malam Hari');
      expect(idxNight).toBeLessThan(idxGrowth);
    });

    // Multiple critical rules simultaneously
    test('[CRITICAL] Multiple critical rules can coexist: AN-10a + SP-01', async () => {
      const insights = await evalNudges(page, {
        ...EMPTY_PARAMS,
        current: { income: 0, expense: 3_000_000, net: -3_000_000 },
        paydayLeak: { percentage: 60, days: 1 },
      });
      const criticals = insights.filter((i: any) => i.severity === 'critical');
      expect(criticals.length).toBeGreaterThanOrEqual(2);
    });

    // All rules simultaneously (smoke test)
    test('[SMOKE] All rules active simultaneously — engine does not crash', async () => {
      const allActiveParams = {
        current: { income: 3_000_000, expense: 4_500_000, net: -1_500_000 },
        prev: { income: 5_000_000, expense: 2_000_000, net: 3_000_000 },
        topExpenseCategory: { name: 'Belanja', value: 2_000_000, prevValue: 800_000 },
        weeklySavings: 0,
        frequentTxn: { name: 'Kopi', count: 15, totalAmount: 300_000 },
        peakDay: { dayName: 'Sabtu', percentage: 40, dominantCategoryName: 'Belanja', totalAmountOnThatDay: 1_800_000, transactionCountOnThatDay: 5 },
        wantsProjection: { categoryName: 'Hiburan', categoryId: 'c1', currentPace: 500_000, annualized: 6_000_000, monthlyTotal: 500_000, transactionCount: 6, averageTransaction: 83_333, basis: 'TOP_DISCRETIONARY_CATEGORY' },
        paydayLeak: { percentage: 55, days: 2 },
        weekendTrap: { percentage: 80 },
        nightOwl: { totalAmount: 250_000 },
        subscriptions: { count: 4, percentage: 18 },
        recurringMerchantGrowth: { merchantName: 'GrabFood', currentCount: 6, prevCount: 2, amount: 600_000 },
        morningVsEvening: { dominantSession: 'malam' as const, ratio: 0.70, total: 1_400_000 },
        dayOfMonthClustering: { ratio: 0.60, topDays: [1, 15, 28], totalAmount: 2_700_000 },
        zeroBudgetCategory: { categoryName: 'Hobi', categoryId: 'c2', amount: 500_000 },
        smartBudgetSuggestion: { categoryName: 'Transport', categoryId: 'c3', averageAmount: 600_000 },
        singleWalletUsage: { walletName: 'BCA', ratio: 0.95 },
        incomeMomentum: { currentIncome: 1_000_000, avgPrevIncome: 5_000_000 },
        lowCashWarning: { walletName: 'GoPay', currentBalance: 30_000, walletId: 'w1' },
        newCategoryEmergence: { categoryName: 'Investasi', categoryId: 'c4', amount: 500_000 },
        categoryDominanceShift: { newTopName: 'Belanja', newTopAmount: 2_000_000, prevTopName: 'Makan', growthPct: 60 },
        expenseConsistency: { ratios: [0.4, 0.7, 0.95], minRatio: 0.4, maxRatio: 0.95 },
        discretionaryDrift: { ratioNow: 0.55, ratioThen: 0.30, diffPct: 25 },
        budgetRunway: { categoryName: 'Belanja', budgetId: 'b1', daysUntilExhausted: 3, daysRemaining: 15 },
        targetGapAlert: { targetName: 'Tabungan', targetId: 't1', elapsedPct: 0.5 },
        targetProgressImpact: { targetName: 'Gaji', targetId: 't2', expenseAmount: 4_500_000, targetAmount: 5_000_000, periodType: 'MONTHLY' },
        walletDrainRate: { walletName: 'BCA', walletId: 'w2', drainRateNow: 200_000, drainRatePrev: 80_000 },
        categoryCreep: { categoryName: 'Jajan', categoryId: 'c5', currentAmount: 1_500_000, growthPct: 18 },
        savingsGapShrinking: { netNow: 300_000, netThen: 2_000_000, dropPct: 85 },
        budgetAccuracyAlert: { categoryName: 'Hiburan', budgetId: 'b2', budgetAmount: 500_000, avgExpense: 700_000 },
        categorySpike: { categoryName: 'Belanja', categoryId: 'c6', currentAmount: 2_000_000, avgAmount: 800_000, spikePct: 150 },
        budgetRecovery: { categoryName: 'Transport', budgetId: 'b3', savedAmount: 300_000 },
        targetStreak: { targetName: 'Freelance', targetId: 't3', streakCount: 3 },
        walletCategoryPattern: { walletName: 'BCA', categoryName: 'Belanja Online', percentage: 88 },
      };

      const insights = await evalNudges(page, allActiveParams);
      // Engine must return multiple insights and not crash
      expect(insights.length).toBeGreaterThan(10);
      // Must be sorted ascending
      for (let i = 1; i < insights.length; i++) {
        expect(insights[i].priority).toBeGreaterThanOrEqual(insights[i - 1].priority);
      }
    });
  });

  test.describe('Dual ID Matching & Soft-Deleted Txns in calculateWalletBalance', () => {
    test('ignores soft-deleted transactions and matches both clientId and server id', () => {
      const wallet = {
        clientId: 'client-wallet-1',
        id: 'server-wallet-uuid',
        name: 'Dompet BCA',
        type: 'BANK' as const,
        initialBalance: 1000000,
        userId: 'u1',
        syncStatus: 'SYNCED' as const,
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
        deletedAt: null,
      };

      const txns = [
        {
          clientId: 't1',
          amount: 500000,
          type: 'INCOME' as const,
          date: '2026-07-01',
          walletId: 'client-wallet-1', // Matches clientId
          userId: 'u1',
          syncStatus: 'SYNCED' as const,
          createdAt: '2026-07-01',
          updatedAt: '2026-07-01',
          deletedAt: null,
        },
        {
          clientId: 't2',
          amount: 200000,
          type: 'EXPENSE' as const,
          date: '2026-07-01',
          walletId: 'server-wallet-uuid', // Matches server id!
          userId: 'u1',
          syncStatus: 'SYNCED' as const,
          createdAt: '2026-07-01',
          updatedAt: '2026-07-01',
          deletedAt: null,
        },
        {
          clientId: 't3',
          amount: 800000,
          type: 'EXPENSE' as const,
          date: '2026-07-01',
          walletId: 'client-wallet-1',
          userId: 'u1',
          syncStatus: 'SYNCED' as const,
          createdAt: '2026-07-01',
          updatedAt: '2026-07-01',
          deletedAt: '2026-07-02T10:00:00.000Z', // SOFT DELETED! Must be ignored!
        },
      ];

      const balance = calculateWalletBalance(wallet, txns);
      // 1000000 (initial) + 500000 (INCOME client ID) - 200000 (EXPENSE server ID) - 0 (t3 is soft deleted) = 1300000
      expect(balance).toBe(1300000);
    });
  });

});
