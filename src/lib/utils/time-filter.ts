//********** START: Time Filter Utility **********
//********** getDynamicComparisonPeriods: Given a range key or custom dates,
//********** returns the current period and a correctly-shifted baseline period
//********** for dynamic benchmarking across the Analytics page.
//**********
//********** Design: Pure function, no React deps, safe for useMemo.
//********** END: Time Filter Utility **********

import dayjs from "dayjs";

//********** TYPES **********
export type RangeKey = "today" | "7d" | "month" | "3month" | "year" | "all" | "custom";

export interface DateRange {
  start: string; //********** YYYY-MM-DD
  end: string;   //********** YYYY-MM-DD
}

export interface ComparisonPeriods {
  currentPeriod: DateRange;
  baselinePeriod: DateRange;
  //********** Human-readable label rendered inside trend badges
  comparisonLabel: string;
}

export interface CustomDates {
  start: string;
  end: string;
}

//********** UTILS **********
/**
 * Derive the current + baseline date tuples from a range key.
 * Pass customDates when rangeKey is "custom".
 */
export function getDynamicComparisonPeriods(
  rangeKey: RangeKey,
  customDates?: CustomDates
): ComparisonPeriods {
  const today = dayjs().startOf("day");

  switch (rangeKey) {
    case "today": {
      const currentStart = today;
      const baselineEnd = today.subtract(1, "day");
      const baselineStart = today.subtract(1, "day");
      return {
        currentPeriod: { start: currentStart.format("YYYY-MM-DD"), end: today.format("YYYY-MM-DD") },
        baselinePeriod: { start: baselineStart.format("YYYY-MM-DD"), end: baselineEnd.format("YYYY-MM-DD") },
        comparisonLabel: "vs kemarin",
      };
    }
    case "all": {
      return {
        currentPeriod: { start: "", end: "" },
        baselinePeriod: { start: "", end: "" },
        comparisonLabel: "sepanjang waktu",
      };
    }
    case "7d": {
      const currentStart = today.subtract(6, "day");
      const baselineEnd = today.subtract(7, "day");
      const baselineStart = today.subtract(13, "day");
      return {
        currentPeriod: { start: currentStart.format("YYYY-MM-DD"), end: today.format("YYYY-MM-DD") },
        baselinePeriod: { start: baselineStart.format("YYYY-MM-DD"), end: baselineEnd.format("YYYY-MM-DD") },
        comparisonLabel: "vs 7 hari sebelumnya",
      };
    }
    case "month": {
      const currentStart = today.startOf("month");
      const baselineEnd = currentStart.subtract(1, "day").endOf("day");
      const baselineStart = baselineEnd.startOf("month");
      return {
        currentPeriod: { start: currentStart.format("YYYY-MM-DD"), end: today.format("YYYY-MM-DD") },
        baselinePeriod: { start: baselineStart.format("YYYY-MM-DD"), end: baselineEnd.format("YYYY-MM-DD") },
        comparisonLabel: "vs bulan lalu",
      };
    }
    case "3month": {
      const currentStart = today.subtract(89, "day");
      const baselineEnd = today.subtract(90, "day");
      const baselineStart = today.subtract(179, "day");
      return {
        currentPeriod: { start: currentStart.format("YYYY-MM-DD"), end: today.format("YYYY-MM-DD") },
        baselinePeriod: { start: baselineStart.format("YYYY-MM-DD"), end: baselineEnd.format("YYYY-MM-DD") },
        comparisonLabel: "vs kuartal sebelumnya",
      };
    }
    case "year": {
      const currentStart = today.startOf("year");
      const baselineStart = today.subtract(1, "year").startOf("year");
      //********** YTD: same calendar date last year
      const baselineEnd = today.subtract(1, "year");
      return {
        currentPeriod: { start: currentStart.format("YYYY-MM-DD"), end: today.format("YYYY-MM-DD") },
        baselinePeriod: { start: baselineStart.format("YYYY-MM-DD"), end: baselineEnd.format("YYYY-MM-DD") },
        comparisonLabel: "vs tahun lalu (YTD)",
      };
    }
    case "custom": {
      if (!customDates) {
        //********** Fallback to "month" logic if custom called without dates
        return getDynamicComparisonPeriods("month");
      }
      const custStart = dayjs(customDates.start);
      const custEnd = dayjs(customDates.end);
      const delta = custEnd.diff(custStart, "day");
      const baselineEnd = custStart.subtract(1, "day");
      const baselineStart = baselineEnd.subtract(delta, "day");
      return {
        currentPeriod: { start: custStart.format("YYYY-MM-DD"), end: custEnd.format("YYYY-MM-DD") },
        baselinePeriod: { start: baselineStart.format("YYYY-MM-DD"), end: baselineEnd.format("YYYY-MM-DD") },
        comparisonLabel: "vs periode sebelumnya",
      };
    }
  }
}

/**
 * Filter a transaction array down to a specific date range.
 * Uses the YYYY-MM-DD date string from transaction.date.
 */
export function filterByDateRange<T extends { date: string; type?: string; deletedAt?: string | null }>(
  txns: T[],
  range: DateRange,
  excludeTransfer = true
): T[] {
  return txns.filter((t) => {
    if (excludeTransfer && (t as any).type === "TRANSFER") return false;
    if ((t as any).deletedAt) return false;
    const d = t.date.substring(0, 10);
    return d >= range.start && d <= range.end;
  });
}
