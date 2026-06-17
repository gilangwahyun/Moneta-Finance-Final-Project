import dayjs from "dayjs";
import { FinancialTarget } from "@/types/models.types";

/**
 * Check if the target is active for the given selectedDate.
 */
export function isTargetActiveForDate(target: FinancialTarget, selectedDate: Date): boolean {
  if (!target || !target.isActive) return false;
  if (!target.categoryId) return false;

  const date = dayjs(selectedDate).startOf("day");
  const start = dayjs(target.startDate).startOf("day");

  if (date.isBefore(start)) return false;

  if (target.period === "CUSTOM" && target.endDate) {
    const end = dayjs(target.endDate).endOf("day");
    if (date.isAfter(end)) return false;
  }

  return true;
}

/**
 * Calculate the effective date range for the target based on the selectedDate.
 */
export function getTargetEffectiveDateRange(target: FinancialTarget, selectedDate: Date): { periodStart: Date, periodEnd: Date } | null {
  if (!isTargetActiveForDate(target, selectedDate)) return null;

  const date = dayjs(selectedDate);
  const targetStart = dayjs(target.startDate).startOf("day");

  let periodStart = date;
  let periodEnd = date;

  if (target.period === "DAILY") {
    periodStart = date.startOf("day");
    periodEnd = date.endOf("day");
  } else if (target.period === "WEEKLY") {
    periodStart = date.startOf("week");
    periodEnd = date.endOf("week");
  } else if (target.period === "MONTHLY") {
    periodStart = date.startOf("month");
    periodEnd = date.endOf("month");
  } else if (target.period === "CUSTOM") {
    periodStart = targetStart;
    periodEnd = target.endDate ? dayjs(target.endDate).endOf("day") : periodStart.endOf("day");
  }

  // Ensure periodStart is not before target.startDate
  if (target.period !== "CUSTOM" && periodStart.isBefore(targetStart)) {
    periodStart = targetStart;
  }

  return {
    periodStart: periodStart.toDate(),
    periodEnd: periodEnd.toDate()
  };
}
