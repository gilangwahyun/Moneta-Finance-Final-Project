//********** START: Global Time Filter Context **********
//********** Lightweight React Context (no Zustand needed) that provides a
//********** shared time range across Dashboard, Transactions, and Analytics.
//**********
//********** State is also synced to the URL via a ?range= search param so
//********** links and browser navigation preserve the selected filter.
//********** END: Global Time Filter Context **********

"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  Suspense,
} from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import dayjs from "dayjs";
import {
  RangeKey,
  CustomDates,
  getDynamicComparisonPeriods,
  ComparisonPeriods,
  DateRange,
} from "@/lib/utils/time-filter";

//********** TYPES **********

export interface TimeFilterState {
  rangeKey: RangeKey;
  customDates: CustomDates | undefined;
  //********** The active date range for filtering transactions
  activeRange: DateRange;
  //********** The baseline range for comparison badges
  comparison: ComparisonPeriods;
  setRange: (key: RangeKey, custom?: CustomDates) => void;
}

//********** DEFAULT VALUES **********

function getDefaultRange(key: RangeKey): DateRange {
  const today = dayjs();
  switch (key) {
    case "today":
      return { start: today.format("YYYY-MM-DD"), end: today.format("YYYY-MM-DD") };
    case "all":
      return { start: "", end: "" };
    case "7d":
      return { start: today.subtract(6, "day").format("YYYY-MM-DD"), end: today.format("YYYY-MM-DD") };
    case "3month":
      return { start: today.subtract(89, "day").format("YYYY-MM-DD"), end: today.format("YYYY-MM-DD") };
    case "year":
      return { start: today.startOf("year").format("YYYY-MM-DD"), end: today.format("YYYY-MM-DD") };
    case "month":
    default:
      return { start: today.startOf("month").format("YYYY-MM-DD"), end: today.endOf("month").format("YYYY-MM-DD") };
  }
}

//********** CONTEXT **********

const TimeFilterContext = createContext<TimeFilterState | null>(null);

function TimeFilterProviderInner({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  //********** Restore from URL param on first load; fall back to "month"
  const initialKey = (searchParams.get("range") as RangeKey) || "month";
  const [rangeKey, setRangeKey] = useState<RangeKey>(initialKey);
  const [customDates, setCustomDates] = useState<CustomDates | undefined>(undefined);

  const setRange = useCallback(
    (key: RangeKey, custom?: CustomDates) => {
      setRangeKey(key);
      setCustomDates(key === "custom" ? custom : undefined);
      //********** Sync to URL without a hard navigation (preserves scroll position)
      const params = new URLSearchParams(searchParams.toString());
      params.set("range", key);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  //********** Keep in sync if the user navigates back/forward
  useEffect(() => {
    const paramKey = (searchParams.get("range") as RangeKey) || "month";
    if (paramKey !== rangeKey) setRangeKey(paramKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const activeRange = useMemo<DateRange>(() => {
    if (rangeKey === "custom" && customDates) {
      return { start: customDates.start, end: customDates.end };
    }
    return getDefaultRange(rangeKey);
  }, [rangeKey, customDates]);

  const comparison = useMemo<ComparisonPeriods>(
    () => getDynamicComparisonPeriods(rangeKey, customDates),
    [rangeKey, customDates]
  );

  const value: TimeFilterState = { rangeKey, customDates, activeRange, comparison, setRange };

  return (
    <TimeFilterContext.Provider value={value}>
      {children}
    </TimeFilterContext.Provider>
  );
}

export function TimeFilterProvider({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<>{children}</>}>
      <TimeFilterProviderInner>{children}</TimeFilterProviderInner>
    </Suspense>
  );
}

//********** HOOK **********
/**
 * Access the global time filter from any page or component.
 * Must be a descendant of <TimeFilterProvider>.
 */
export function useTimeFilter(): TimeFilterState {
  const ctx = useContext(TimeFilterContext);
  if (!ctx) throw new Error("useTimeFilter must be used within a TimeFilterProvider");
  return ctx;
}
