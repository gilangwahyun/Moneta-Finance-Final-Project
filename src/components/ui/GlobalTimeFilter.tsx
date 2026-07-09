/*
 * File: src/components/ui/GlobalTimeFilter.tsx
 * Description: Komponen filter waktu global yang tersinkronisasi dengan TimeFilterContext untuk memvalidasi rentang waktu data aplikasi.
 */

"use client";

import { useState, useId } from "react";
import { CalendarDays, ChevronDown, RefreshCcw } from "lucide-react";
import { useTimeFilter } from "@/providers/TimeFilterProvider";
import { RangeKey } from "@/lib/utils/time-filter";
import dayjs from "dayjs";

const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: "7d",     label: "7 Hari" },
  { key: "month",  label: "Bulan Ini" },
  { key: "3month", label: "3 Bulan" },
  { key: "year",   label: "Tahun Ini" },
  { key: "custom", label: "Pilih Tanggal..." },
];

interface GlobalTimeFilterProps {
  /* Menyembunyikan panel date-picker agar dapat dikontrol oleh komponen induk */
  compact?: boolean;
}

/**
 * Komponen filter waktu global yang menyinkronkan periode aktif aplikasi melalui TimeFilterContext.
 *
 * @param props - Properti konfigurasi tampilan filter global
 * @returns Elemen JSX pil navigasi rentang waktu dan date picker kustom
 */
export function GlobalTimeFilter({ compact = false }: GlobalTimeFilterProps) {
  const { rangeKey, customDates, setRange } = useTimeFilter();
  const pickerId = useId();

  /* State sementara untuk masukan tanggal kustom sebelum diaktifkan */
  const [customStart, setCustomStart] = useState(
    customDates?.start ?? dayjs().startOf("month").format("YYYY-MM-DD")
  );
  const [customEnd, setCustomEnd] = useState(
    customDates?.end ?? dayjs().format("YYYY-MM-DD")
  );
  const [pickerOpen, setPickerOpen] = useState(rangeKey === "custom");

  /********** [START: Penanganan Pemilihan Rentang Waktu Global] **********/
  function handleRangeClick(key: RangeKey) {
    if (key === "custom") {
      setPickerOpen(true);
      /* Segera terapkan tanggal yang sedang aktif pada state sementara */
      setRange("custom", { start: customStart, end: customEnd });
    } else {
      setPickerOpen(false);
      setRange(key);
    }
  }
  /********** [END: Penanganan Pemilihan Rentang Waktu Global] **********/

  /********** [START: Perenderan Komponen Filter Waktu Global] **********/
  return (
    <div className="flex flex-col gap-2">
      {/* Baris Pilihan Rentang Waktu */}
      <div
        role="group"
        aria-label="Pilih rentang waktu"
        className="flex flex-wrap items-center gap-1.5 rounded-2xl bg-white/60 p-1.5 shadow-sm backdrop-blur-xl ring-1 ring-slate-200/60 dark:bg-slate-900/60 dark:ring-slate-800/60"
      >
        {RANGE_OPTIONS.map(({ key, label }) => {
          const isActive = rangeKey === key;
          const isCustom = key === "custom";
          return (
            <button
              key={key}
              id={`time-filter-${key}`}
              onClick={() => handleRangeClick(key)}
              aria-pressed={isActive}
              className={`
                inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold
                transition-all duration-300 ease-out active:scale-95
                ${isActive
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20 dark:bg-indigo-500"
                  : "text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-sm dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                }
              `}
            >
              {isCustom && <CalendarDays className={`h-4 w-4 ${isActive ? "text-white/90" : "text-slate-600"}`} />}
              {label}
              {isCustom && (
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform ${pickerOpen ? "rotate-180" : ""}`}
                />
              )}
            </button>
          );
        })}

        {/* Tombol Atur Ulang (hanya ditampilkan jika rentang aktif bukan bulan berjalan) */}
        {rangeKey !== "month" && (
          <div className="ml-auto pl-2 border-l border-slate-200 dark:border-slate-700">
            <button
              onClick={() => {
                setPickerOpen(false);
                setRange("month");
              }}
              aria-label="Reset filter"
              title="Reset ke Bulan Ini"
              className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-rose-500 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:text-rose-400 dark:hover:bg-rose-950/30 dark:hover:text-rose-300"
            >
              <RefreshCcw className="h-3.5 w-3.5" />
              Reset
            </button>
          </div>
        )}
      </div>

      {/* Panel Pemilihan Tanggal Rentang Kustom */}
      {!compact && pickerOpen && (
        <div
          className="
            animate-in fade-in slide-in-from-top-2 duration-200
            flex flex-col gap-3 rounded-xl border border-indigo-200/70
            bg-white p-4 shadow-md
            dark:border-indigo-800/40 dark:bg-slate-900
            sm:flex-row sm:items-end
          "
          aria-label="Pilih rentang tanggal kustom"
        >
          <div className="flex flex-1 flex-col gap-1">
            <label
              htmlFor={`${pickerId}-start`}
              className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400"
            >
              Dari
            </label>
            <input
              id={`${pickerId}-start`}
              type="date"
              value={customStart}
              max={customEnd}
              onChange={(e) => {
                const val = e.target.value;
                setCustomStart(val);
                if (val && customEnd && val <= customEnd) {
                  setRange("custom", { start: val, end: customEnd });
                }
              }}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            />
          </div>

          <div className="flex flex-1 flex-col gap-1">
            <label
              htmlFor={`${pickerId}-end`}
              className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400"
            >
              Sampai
            </label>
            <input
              id={`${pickerId}-end`}
              type="date"
              value={customEnd}
              min={customStart}
              onChange={(e) => {
                const val = e.target.value;
                setCustomEnd(val);
                if (customStart && val && customStart <= val) {
                  setRange("custom", { start: customStart, end: val });
                }
              }}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            />
          </div>
        </div>
      )}
    </div>
  );
  /********** [END: Perenderan Komponen Filter Waktu Global] **********/
}
