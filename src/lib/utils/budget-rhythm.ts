/*
 * File: src/lib/utils/budget-rhythm.ts
 * Description: Utilitas kalkulasi ritme dan kecepatan pengeluaran anggaran bulanan,
 * menghitung estimasi pengeluaran ideal harian, proyeksi bulanan, serta status anggaran (ON_TRACK, OFF_TRACK, OVER_BUDGET).
 */

import dayjs from "dayjs";

/********** Tipe Data & Antarmuka **********/

type RhythmStatus = "ON_TRACK" | "OFF_TRACK" | "OVER_BUDGET";

export interface BudgetRhythm {
  daysInMonth: number;
  currentDay: number;
  dailyAllowance: number;
  idealUsageUntilToday: number;
  projectedMonthlyUsage: number;
  rhythmRatio: number; /* > 1 berarti pengeluaran lebih cepat dari batas ideal */
  status: RhythmStatus;
  daysLeft: number;
  dailySafeRemaining: number;
}

/********** Kalkulasi Ritme Anggaran (calculateBudgetRhythm) **********/

/**
 * Menghitung ritme pengeluaran anggaran bulanan.
 *
 * @param amount - Batas total anggaran untuk periode tersebut.
 * @param spentAmount - Total pengeluaran yang telah terpakai.
 * @param period - Periode bulan dalam format "YYYY-MM".
 * @param todayDate - Tanggal referensi evaluasi (default: tanggal saat ini).
 * @returns Objek BudgetRhythm yang memuat status, estimasi harian aman, dan rasio kecepatan.
 */
export function calculateBudgetRhythm(
  amount: number,
  spentAmount: number,
  period: string,
  todayDate: Date = new Date()
): BudgetRhythm {
  const periodDate = dayjs(period + "-01");
  const daysInMonth = periodDate.daysInMonth();
  const today = dayjs(todayDate);
  
  let currentDay = 1;
  const isCurrentMonth = today.format("YYYY-MM") === period;
  const isPastMonth = periodDate.isBefore(today, 'month');
  
  if (isCurrentMonth) {
    currentDay = today.date();
  } else if (isPastMonth) {
    currentDay = daysInMonth;
  } else {
    /********** Bulan di masa depan. */
    currentDay = 0;
  }

  const dailyAllowance = amount / daysInMonth;
  const idealUsageUntilToday = currentDay * dailyAllowance;
  
  /********** Proyeksi pengeluaran akhir bulan berdasarkan rata-rata harian sejauh ini. */
  const projectedMonthlyUsage = currentDay > 0 ? (spentAmount / currentDay) * daysInMonth : 0;
  
  /********** Rasio ritme: > 1.0 berarti kecepatan pengeluaran melebihi laju ideal. */
  const rhythmRatio = idealUsageUntilToday > 0 ? (spentAmount / idealUsageUntilToday) : (spentAmount > 0 ? Infinity : 0);
  
  let status: RhythmStatus = "ON_TRACK";
  if (spentAmount >= amount) {
    status = "OVER_BUDGET";
  } else if (rhythmRatio > 1.1) {
    /********** Pengeluaran 10% lebih cepat dari ideal akan memicu peringatan (OFF_TRACK). */
    status = "OFF_TRACK";
  }

  const daysLeft = Math.max(1, daysInMonth - currentDay + 1);
  const remainingBudget = Math.max(0, amount - spentAmount);
  const dailySafeRemaining = remainingBudget / daysLeft;

  return {
    daysInMonth,
    currentDay,
    dailyAllowance,
    idealUsageUntilToday,
    projectedMonthlyUsage,
    rhythmRatio,
    status,
    daysLeft,
    dailySafeRemaining
  };
}
