/*
 * File: src/lib/utils/time-filter.ts
 * Description: Utilitas filter waktu dan kalkulasi periode pembanding dinamis,
 * menghasilkan rentang waktu periode saat ini dan periode dasar (baseline) untuk benchmarking analitik.
 */

import dayjs from "dayjs";

/********** Tipe Data & Antarmuka **********/

export type RangeKey = "today" | "7d" | "month" | "3month" | "year" | "all" | "custom";

export interface DateRange {
  start: string; /* Format YYYY-MM-DD */
  end: string;   /* Format YYYY-MM-DD */
}

export interface ComparisonPeriods {
  currentPeriod: DateRange;
  baselinePeriod: DateRange;
  /* Label yang mudah dibaca untuk badge tren */
  comparisonLabel: string;
}

export interface CustomDates {
  start: string;
  end: string;
}

/********** Utilitas Periode Pembanding (Comparison Periods) **********/

/**
 * Menghitung rentang tanggal untuk periode saat ini dan periode pembanding (baseline) berdasarkan kunci rentang waktu.
 * Menerima tanggal kustom jika rangeKey bernilai "custom".
 *
 * @param rangeKey - Kunci rentang waktu (today, 7d, month, 3month, year, all, custom).
 * @param customDates - Tanggal mulai dan selesai opsional untuk mode kustom.
 * @returns Objek ComparisonPeriods berisi currentPeriod, baselinePeriod, dan comparisonLabel.
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
      /********** Year-to-Date (YTD): tanggal kalender yang sama pada tahun sebelumnya. */
      const baselineEnd = today.subtract(1, "year");
      return {
        currentPeriod: { start: currentStart.format("YYYY-MM-DD"), end: today.format("YYYY-MM-DD") },
        baselinePeriod: { start: baselineStart.format("YYYY-MM-DD"), end: baselineEnd.format("YYYY-MM-DD") },
        comparisonLabel: "vs tahun lalu (YTD)",
      };
    }
    case "custom": {
      if (!customDates) {
        /********** Fallback ke logika bulan lalu jika mode custom dipanggil tanpa parameter tanggal. */
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

/********** Filter Transaksi Berdasarkan Rentang Waktu **********/

/**
 * Menyaring array transaksi berdasarkan rentang tanggal awal dan akhir (inclusive).
 * Secara default mengabaikan transaksi berjenis TRANSFER dan transaksi yang sudah dihapus (deletedAt ada).
 *
 * @param txns - Daftar transaksi atau objek yang memiliki properti tanggal.
 * @param range - Rentang tanggal awal dan akhir (format YYYY-MM-DD).
 * @param excludeTransfer - Jika true, transaksi bertipe TRANSFER tidak akan dimasukkan.
 * @returns Array transaksi yang sudah disaring.
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
