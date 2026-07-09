/*
 * File: src/components/time-period-filter.tsx
 * Description: Kontrol navigasi periode waktu terpadu bergaya kapsul dengan indikator aktif geser, kalender kustom, dan animasi halus.
 */

"use client";

import { useState, useRef, useEffect, useCallback } from "react";

export type TimePeriod = "today" | "this-week" | "this-month" | "custom";

export interface TimePeriodFilterValue {
  period: TimePeriod;
  customStart: string;
  customEnd: string;
}

interface TimePeriodFilterProps {
  value: TimePeriodFilterValue;
  onChange: (value: TimePeriodFilterValue) => void;
}

const SEGMENTS: { key: TimePeriod; label: string; icon: string }[] = [
  { key: "today",      label: "Hari Ini",   icon: "📅" },
  { key: "this-week",  label: "Minggu Ini", icon: "📆" },
  { key: "this-month", label: "Bulan Ini",  icon: "🗓️" },
  { key: "custom",     label: "Kustom…",    icon: "⚙️" },
];

function formatDateDisplay(dateStr: string): string {
  if (!dateStr) return "Pilih tanggal";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Merender kontrol pemilih periode waktu yang interaktif dengan dukungan rentang tanggal kustom.
 *
 * @param props - Properti nilai periode dan penangan perubahan
 * @returns Elemen JSX pemilih periode waktu
 */
export function TimePeriodFilter({ value, onChange }: TimePeriodFilterProps) {
  /* State rancangan sementara untuk tanggal kustom sebelum diaktifkan dengan tombol Terapkan */
  const [draftStart, setDraftStart] = useState(value.customStart);
  const [draftEnd, setDraftEnd] = useState(value.customEnd);

  /* Referensi untuk elemen masukan tanggal native tersembunyi */
  const startInputRef = useRef<HTMLInputElement>(null);
  const endInputRef = useRef<HTMLInputElement>(null);

  /* Referensi untuk menghitung posisi geser indikator segmen aktif */
  const segmentRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  /********** [START: Perhitungan Posisi Indikator Segmen Aktif] **********/
  const updateIndicator = useCallback(() => {
    const idx = SEGMENTS.findIndex((s) => s.key === value.period);
    const el = segmentRefs.current[idx];
    const container = containerRef.current;
    if (el && container) {
      const containerRect = container.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      setIndicator({
        left: elRect.left - containerRect.left,
        width: elRect.width,
      });
    }
  }, [value.period]);

  useEffect(() => {
    updateIndicator();
    window.addEventListener("resize", updateIndicator);
    return () => window.removeEventListener("resize", updateIndicator);
  }, [updateIndicator]);
  /********** [END: Perhitungan Posisi Indikator Segmen Aktif] **********/

  /********** [START: Penanganan Pilihan Periode dan Rentang Kustom] **********/
  const handleSegmentClick = (period: TimePeriod) => {
    onChange({ ...value, period });
  };

  const handleApply = () => {
    if (draftStart && draftEnd && draftStart <= draftEnd) {
      onChange({
        period: "custom",
        customStart: draftStart,
        customEnd: draftEnd,
      });
    }
  };
  /********** [END: Penanganan Pilihan Periode dan Rentang Kustom] **********/

  const isCustom = value.period === "custom";

  /********** [START: Perenderan Komponen Filter Periode Waktu] **********/
  return (
    <div className="space-y-3">
      {/* Kontrol Segmen Navigasi */}
      <div
        ref={containerRef}
        className="relative inline-flex items-center rounded-full bg-slate-100 p-1 dark:bg-slate-800 shadow-sm dark:shadow-slate-900/40"
      >
        {/* Indikator aktif geser */}
        <div
          className="absolute top-1 h-[calc(100%-0.5rem)] rounded-full bg-indigo-600 shadow-md shadow-indigo-500/20 transition-all duration-300 ease-out dark:bg-indigo-500"
          style={{
            left: `${indicator.left}px`,
            width: `${indicator.width}px`,
          }}
        />

        {/* Tombol segmen pilihan */}
        {SEGMENTS.map(({ key, label, icon }, i) => (
          <button
            key={key}
            ref={(el) => { segmentRefs.current[i] = el; }}
            type="button"
            onClick={() => handleSegmentClick(key)}
            className={`relative z-10 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors duration-200 whitespace-nowrap ${
              value.period === key
                ? "text-white"
                : "text-slate-600 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <span className="text-[0.7rem] leading-none">{icon}</span>
            {label}
          </button>
        ))}
      </div>

      {/* Panel Pilihan Rentang Kustom */}
      <div
        className={`grid transition-all duration-300 ease-out ${
          isCustom
            ? "grid-rows-[1fr] opacity-100"
            : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="flex flex-col gap-2.5 pt-1 sm:flex-row sm:items-center">
            {/* Tampilan tanggal rentang sebaris */}
            <div
              className={`relative flex flex-1 items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 dark:border-slate-600/50 dark:bg-slate-700/50 ${
                isCustom ? "animate-glow-pulse" : ""
              }`}
            >
              {/* Tombol pemicu tanggal mulai */}
              <button
                type="button"
                onClick={() => startInputRef.current?.showPicker()}
                className="flex items-center gap-1.5 text-xs font-medium text-slate-700 transition-colors hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400"
              >
                <svg className="h-3.5 w-3.5 shrink-0 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>{formatDateDisplay(draftStart)}</span>
              </button>

              {/* Panah pemisah */}
              <svg className="h-3.5 w-3.5 shrink-0 text-slate-600 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>

              {/* Tombol pemicu tanggal akhir */}
              <button
                type="button"
                onClick={() => endInputRef.current?.showPicker()}
                className="flex items-center gap-1.5 text-xs font-medium text-slate-700 transition-colors hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400"
              >
                <svg className="h-3.5 w-3.5 shrink-0 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>{formatDateDisplay(draftEnd)}</span>
              </button>

              {/* Masukan tanggal native tersembunyi */}
              <input
                ref={startInputRef}
                type="date"
                value={draftStart}
                onChange={(e) => setDraftStart(e.target.value)}
                className="date-input-hidden"
                tabIndex={-1}
              />
              <input
                ref={endInputRef}
                type="date"
                value={draftEnd}
                onChange={(e) => setDraftEnd(e.target.value)}
                className="date-input-hidden"
                tabIndex={-1}
              />
            </div>

            {/* Tombol Terapkan */}
            <button
              type="button"
              onClick={handleApply}
              disabled={!draftStart || !draftEnd || draftStart > draftEnd}
              className="group relative overflow-hidden rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-500/20 transition-all duration-200 hover:bg-indigo-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-indigo-500 dark:hover:bg-indigo-400"
            >
              <span className="absolute inset-0 bg-indigo-500 opacity-0 transition-opacity duration-200 group-disabled:group-hover:opacity-0" />
              <span className="relative flex items-center gap-1.5">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Terapkan
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
  /********** [END: Perenderan Komponen Filter Periode Waktu] **********/
}
