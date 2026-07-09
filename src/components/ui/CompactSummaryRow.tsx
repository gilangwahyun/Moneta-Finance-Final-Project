/*
 * File: src/components/ui/CompactSummaryRow.tsx
 * Description: Baris ringkasan metrik keuangan yang adaptif untuk tampilan seluler dan desktop dengan indikator tren perbandingan.
 */

import React from "react";
import { formatCurrency, formatCurrencyCompact } from "@/lib/utils/helpers";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";

export type MetricItem = {
  label: string;
  compactLabel: string;
  value: number;
  isNegative?: boolean;

  /* Properti tren untuk tampilan desktop */
  previousValue?: number;
  comparisonLabel?: string;
  isCost?: boolean;

  /* Ikon opsional */
  icon?: React.ReactNode;
};

/**
 * Merender baris ringkasan berisi hingga tiga item metrik keuangan secara ringkas.
 *
 * @param props - Properti komponen berupa tepat tiga item metrik
 * @returns Elemen JSX baris ringkasan keuangan
 */
export function CompactSummaryRow({ metrics }: { metrics: [MetricItem, MetricItem, MetricItem] }) {
  /********** [START: Perenderan Baris Ringkasan Metrik Keuangan] **********/
  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm dark:border-slate-800/60 dark:bg-slate-900 sm:bg-transparent sm:border-none sm:shadow-none sm:dark:bg-transparent transition-all duration-300">
      {/* Tata letak baris adaptif seluler dan desktop */}
      <div className="grid grid-cols-3 divide-x divide-slate-100 sm:gap-4 sm:divide-none dark:divide-slate-800/60">
        {metrics.map((metric, i) => {
          const delta = metric.previousValue !== undefined ? metric.value - metric.previousValue : 0;
          const pct = metric.previousValue ? Math.round(Math.abs((delta / metric.previousValue) * 100)) : null;
          const isGood = metric.isCost ? delta <= 0 : delta >= 0;
          const isZero = delta === 0;
          const hasTrend = metric.previousValue !== undefined;

          return (
            <div
              key={i}
              className="group flex flex-col p-3.5 transition-all hover:bg-slate-50 dark:hover:bg-slate-800/50 sm:rounded-xl sm:border sm:border-slate-100 sm:bg-white sm:p-5 sm:shadow-sm sm:hover:bg-slate-50 sm:dark:border-slate-800/60 sm:dark:bg-slate-900 sm:dark:hover:bg-slate-800/50"
            >
              <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-medium uppercase tracking-wider text-slate-600 dark:text-slate-400">
                {metric.icon && <span className="text-slate-600 dark:text-slate-400">{metric.icon}</span>}
                <span className="sm:hidden">{metric.compactLabel}</span>
                <span className="hidden sm:inline">{metric.label}</span>
              </div>

              <p className={`mt-1.5 truncate text-base font-bold tracking-tight sm:mt-2 sm:text-2xl transition-all duration-300 ${metric.isNegative ? "text-rose-600 dark:text-rose-400" : "text-slate-900 dark:text-slate-50"}`}>
                <span className="sm:hidden">{formatCurrencyCompact(metric.value)}</span>
                <span className="hidden sm:inline">{formatCurrency(metric.value)}</span>
              </p>

              {/* Teks indikator tren perbandingan pada tampilan desktop */}
              <div className="hidden sm:block">
                {hasTrend && metric.previousValue! > 0 && pct !== null && (
                  <div
                    className={`mt-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors group-hover:bg-opacity-80 ${
                      isZero
                        ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                        : isGood
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                        : "bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400"
                    }`}
                  >
                    {isZero ? (
                      <Minus className="h-3 w-3" />
                    ) : isGood ? (
                      <TrendingDown className="h-3 w-3" />
                    ) : (
                      <TrendingUp className="h-3 w-3" />
                    )}
                    <span>
                      {isZero
                        ? "Sama"
                        : `${delta > 0 ? "+" : ""}${pct}% ${metric.comparisonLabel}`}
                    </span>
                  </div>
                )}
                {hasTrend && metric.previousValue === 0 && (
                  <p className="mt-3 text-xs font-medium text-slate-600 dark:text-slate-400">
                    Tidak ada data periode lalu
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
  /********** [END: Perenderan Baris Ringkasan Metrik Keuangan] **********/
}
