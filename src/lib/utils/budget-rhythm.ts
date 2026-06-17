import dayjs from "dayjs";

export type RhythmStatus = "ON_TRACK" | "OFF_TRACK" | "OVER_BUDGET";

export interface BudgetRhythm {
  daysInMonth: number;
  currentDay: number;
  dailyAllowance: number;
  idealUsageUntilToday: number;
  projectedMonthlyUsage: number;
  rhythmRatio: number; // >1 means spending faster than ideal
  status: RhythmStatus;
}

/**
 * Calculates the rhythm of budget spending.
 * @param amount The total budget limit for the period.
 * @param spentAmount The total spent amount in the period.
 * @param period The period in "YYYY-MM" format.
 * @param todayDate (Optional) The current date, defaults to now.
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
    // Future month
    currentDay = 0;
  }

  const dailyAllowance = amount / daysInMonth;
  const idealUsageUntilToday = currentDay * dailyAllowance;
  
  // Projection based on average daily spent so far
  const projectedMonthlyUsage = currentDay > 0 ? (spentAmount / currentDay) * daysInMonth : 0;
  
  // Rhythm ratio: > 1.0 means spending faster than ideal
  const rhythmRatio = idealUsageUntilToday > 0 ? (spentAmount / idealUsageUntilToday) : (spentAmount > 0 ? Infinity : 0);
  
  let status: RhythmStatus = "ON_TRACK";
  if (spentAmount >= amount) {
    status = "OVER_BUDGET";
  } else if (rhythmRatio > 1.1) {
    // 10% faster than ideal triggers a warning
    status = "OFF_TRACK";
  }

  return {
    daysInMonth,
    currentDay,
    dailyAllowance,
    idealUsageUntilToday,
    projectedMonthlyUsage,
    rhythmRatio,
    status
  };
}
