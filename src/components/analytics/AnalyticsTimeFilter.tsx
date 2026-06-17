"use client";

//********** START: AnalyticsTimeFilter Component **********
//********** Dedicated period filter for the Analysis Page.
//********** Desktop: Horizontal pill row, custom date picker inline/popover.
//********** Mobile: Single button triggering a Bottom Sheet.
//********** Options: [7 Hari Terakhir] [Bulan Ini] [3 Bulan Terakhir] [Tahun Ini] [Rentang Khusus]
//********** END: AnalyticsTimeFilter Component **********

import { useState, useId, useEffect } from "react";
import { CalendarDays, ChevronDown, Check, RefreshCcw } from "lucide-react";
import { useTimeFilter } from "@/providers/TimeFilterProvider";
import { RangeKey } from "@/lib/utils/time-filter";
import { FilterBottomSheet } from "@/components/ui/FilterBottomSheet";
import dayjs from "dayjs";

const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: "7d",     label: "7 Hari Terakhir" },
  { key: "month",  label: "Bulan Ini" },
  { key: "3month", label: "3 Bulan Terakhir" },
  { key: "year",   label: "Tahun Ini" },
  { key: "custom", label: "Rentang Khusus" },
];

export function AnalyticsTimeFilter() {
  const { rangeKey, customDates, setRange } = useTimeFilter();
  const pickerId = useId();

  const [customStart, setCustomStart] = useState(
    customDates?.start ?? dayjs().startOf("month").format("YYYY-MM-DD")
  );
  const [customEnd, setCustomEnd] = useState(
    customDates?.end ?? dayjs().format("YYYY-MM-DD")
  );
  
  // Desktop inline picker state
  const [pickerOpen, setPickerOpen] = useState(rangeKey === "custom");
  
  // Mobile bottom sheet state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetCustomOpen, setSheetCustomOpen] = useState(rangeKey === "custom");

  function handleDesktopClick(key: RangeKey) {
    if (key === "custom") {
      setPickerOpen(true);
      setRange("custom", { start: customStart, end: customEnd });
    } else {
      setPickerOpen(false);
      setRange(key);
    }
  }

  function handleMobileClick(key: RangeKey) {
    if (key === "custom") {
      setSheetCustomOpen(true);
      setRange("custom", { start: customStart, end: customEnd });
    } else {
      setSheetCustomOpen(false);
      setRange(key);
      setSheetOpen(false); // Auto close sheet on predefined select
    }
  }

  const activeLabel = RANGE_OPTIONS.find((o) => o.key === rangeKey)?.label || "Pilih Waktu";

  return (
    <>
      {/* ─── Desktop View (Hidden on mobile) ─── */}
      <div className="hidden md:flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-1.5 rounded-2xl bg-white/60 p-1.5 shadow-sm backdrop-blur-xl ring-1 ring-slate-200/60 dark:bg-slate-900/60 dark:ring-slate-800/60">
          {RANGE_OPTIONS.map(({ key, label }) => {
            const isActive = rangeKey === key;
            const isCustom = key === "custom";
            return (
              <button
                key={key}
                onClick={() => handleDesktopClick(key)}
                className={`
                  inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold
                  transition-all duration-300 ease-out active:scale-95
                  ${isActive
                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/20 dark:from-indigo-500 dark:to-purple-500"
                    : "text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-sm dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                  }
                `}
              >
                {isCustom && <CalendarDays className={`h-4 w-4 ${isActive ? "text-white/90" : "text-slate-400"}`} />}
                {label}
                {isCustom && <ChevronDown className={`h-3.5 w-3.5 transition-transform ${pickerOpen ? "rotate-180" : ""}`} />}
              </button>
            );
          })}

          {rangeKey !== "month" && (
            <div className="ml-auto pl-2 border-l border-slate-200 dark:border-slate-700">
              <button
                onClick={() => { setPickerOpen(false); setRange("month"); }}
                title="Reset ke Bulan Ini"
                className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-rose-500 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:text-rose-400 dark:hover:bg-rose-950/30 dark:hover:text-rose-300"
              >
                <RefreshCcw className="h-3.5 w-3.5" />
                Reset
              </button>
            </div>
          )}
        </div>

        {pickerOpen && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-200 flex flex-row items-end gap-3 rounded-xl border border-indigo-200/70 bg-white p-4 shadow-md dark:border-indigo-800/40 dark:bg-slate-900">
            <div className="flex flex-1 flex-col gap-1">
              <label htmlFor={`${pickerId}-start-desktop`} className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Dari</label>
              <input
                id={`${pickerId}-start-desktop`}
                type="date"
                value={customStart}
                max={customEnd}
                onChange={(e) => {
                  const val = e.target.value;
                  setCustomStart(val);
                  if (val && customEnd && val <= customEnd) setRange("custom", { start: val, end: customEnd });
                }}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              />
            </div>
            <div className="flex flex-1 flex-col gap-1">
              <label htmlFor={`${pickerId}-end-desktop`} className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Sampai</label>
              <input
                id={`${pickerId}-end-desktop`}
                type="date"
                value={customEnd}
                min={customStart}
                onChange={(e) => {
                  const val = e.target.value;
                  setCustomEnd(val);
                  if (customStart && val && customStart <= val) setRange("custom", { start: customStart, end: val });
                }}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              />
            </div>
          </div>
        )}
      </div>

      {/* ─── Mobile View (Hidden on desktop) ─── */}
      <div className="md:hidden">
        <button
          onClick={() => setSheetOpen(true)}
          className="flex h-[48px] w-full items-center justify-between gap-2 rounded-2xl bg-white/60 px-4 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur-xl ring-1 ring-inset ring-slate-200/60 transition-all hover:bg-white active:scale-95 dark:bg-slate-900/60 dark:text-slate-200 dark:ring-slate-800/60 dark:hover:bg-slate-800"
        >
          <span className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-indigo-500" />
            {activeLabel}
          </span>
          <ChevronDown className="h-4 w-4 text-slate-400" />
        </button>

        <FilterBottomSheet
          isOpen={sheetOpen}
          onClose={() => setSheetOpen(false)}
          title="Pilih Rentang Waktu"
          desktopModal={false}
          value={rangeKey}
          onChange={(val) => handleMobileClick(val as RangeKey)}
          options={RANGE_OPTIONS.filter(o => o.key !== "custom").map(o => ({ value: o.key, label: o.label }))}
          headerRight={
            rangeKey !== "month" && (
              <button onClick={() => { setRange("month"); setSheetOpen(false); }} className="text-xs font-bold text-rose-500 hover:text-rose-600 dark:text-rose-400">
                Reset
              </button>
            )
          }
        >
          <button
            onClick={() => setSheetCustomOpen(!sheetCustomOpen)}
            aria-pressed={rangeKey === "custom" || sheetCustomOpen}
            className={`flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
              rangeKey === "custom" || sheetCustomOpen
                ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400"
                : "bg-slate-50 text-slate-700 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            }`}
          >
            Pilih Tanggal...
            <CalendarDays className={`h-4 w-4 transition-transform ${sheetCustomOpen ? "text-indigo-500" : "text-slate-400"}`} />
          </button>
          
          {sheetCustomOpen && (
            <div className="mt-2 flex flex-col gap-3 rounded-xl border border-slate-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="mb-1 block text-xs font-semibold text-slate-500">Dari</label>
                  <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200" />
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-xs font-semibold text-slate-500">Sampai</label>
                  <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200" />
                </div>
              </div>
              <button onClick={() => { setRange("custom", { start: customStart, end: customEnd }); setSheetOpen(false); }} className="mt-1 w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-500/20 transition-all hover:bg-indigo-500 active:scale-95 dark:bg-indigo-500 dark:hover:bg-indigo-400">
                Terapkan
              </button>
            </div>
          )}
        </FilterBottomSheet>
      </div>
    </>
  );
}
