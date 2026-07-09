/*
 * File: src/providers/TimeFilterProvider.tsx
 * Description: Penyedia konteks global untuk rentang waktu yang tersinkronisasi ke parameter URL agar konsisten di Dashboard, Transaksi, dan Analitik.
 */

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

export interface TimeFilterState {
  rangeKey: RangeKey;
  customDates: CustomDates | undefined;
  /* Rentang tanggal aktif untuk pemfilteran transaksi */
  activeRange: DateRange;
  /* Rentang acuan untuk pembandingan tren pada lencana atau statistik */
  comparison: ComparisonPeriods;
  setRange: (key: RangeKey, custom?: CustomDates) => void;
}

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

const TimeFilterContext = createContext<TimeFilterState | null>(null);

function TimeFilterProviderInner({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  /********** [START: Pengaturan State dan Sinkronisasi URL Filter Waktu] **********/
  /* Memulihkan filter dari parameter URL pada muatan pertama; nilai bawaan "month" */
  const initialKey = (searchParams.get("range") as RangeKey) || "month";
  const [rangeKey, setRangeKey] = useState<RangeKey>(initialKey);
  const [customDates, setCustomDates] = useState<CustomDates | undefined>(undefined);

  const setRange = useCallback(
    (key: RangeKey, custom?: CustomDates) => {
      setRangeKey(key);
      setCustomDates(key === "custom" ? custom : undefined);
      /* Sinkronkan ke URL tanpa memicu hard navigation agar posisi gulir tetap utuh */
      const params = new URLSearchParams(searchParams.toString());
      params.set("range", key);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  /* Menjaga sinkronisasi saat pengguna melakukan navigasi maju/mundur di peramban */
  useEffect(() => {
    const paramKey = (searchParams.get("range") as RangeKey) || "month";
    if (paramKey !== rangeKey) setRangeKey(paramKey);
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [searchParams]);
  /********** [END: Pengaturan State dan Sinkronisasi URL Filter Waktu] **********/

  /********** [START: Perhitungan Rentang Waktu Aktif dan Periode Perbandingan] **********/
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
  /********** [END: Perhitungan Rentang Waktu Aktif dan Periode Perbandingan] **********/

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

/**
 * Hook untuk mengakses filter waktu global dari halaman atau komponen mana pun.
 * Komponen harus berada di bawah struktur <TimeFilterProvider>.
 *
 * @returns State dan metode pengaturan rentang waktu global
 */
export function useTimeFilter(): TimeFilterState {
  const ctx = useContext(TimeFilterContext);
  if (!ctx) throw new Error("useTimeFilter harus digunakan di dalam TimeFilterProvider");
  return ctx;
}
