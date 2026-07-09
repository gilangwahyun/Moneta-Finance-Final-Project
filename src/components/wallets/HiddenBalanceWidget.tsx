/*
 * File: src/components/wallets/HiddenBalanceWidget.tsx
 * Description: Widget tampilan saldo global dengan mekanisme Anti-Illusion Nudge (disembunyikan secara default untuk mengurangi false sense of financial security).
 */

"use client";

import { Eye, EyeOff, Wallet } from "lucide-react";
import { formatCurrency } from "@/lib/utils/helpers";

interface HiddenBalanceWidgetProps {
  totalBalance: number;
  isVisible: boolean;
  onToggle: () => void;
  isLoading?: boolean;
}

/**
 * Merender widget saldo total gabungan yang disembunyikan secara default.
 *
 * @param props - Properti konfigurasi widget saldo tersembunyi
 * @returns Elemen JSX widget saldo
 */
export function HiddenBalanceWidget({
  totalBalance,
  isVisible,
  onToggle,
  isLoading = false,
}: HiddenBalanceWidgetProps) {
  const isPositive = totalBalance >= 0;

  /********** [START: Perenderan Widget Saldo Tersembunyi (Anti-Illusion Nudge)] **********/
  return (
    <div className={`relative overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm dark:border-slate-800/60 dark:bg-slate-900 transition-all duration-300 ${isVisible ? "p-5" : "py-3 px-5"}`}>
      {/* Ornamen latar belakang ikon dompet */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-3 -top-3 text-indigo-400 opacity-[0.05] dark:opacity-[0.07]"
      >
        <Wallet className="h-24 w-24" />
      </div>

      <div className="relative z-10">
        {/* Label judul dan tombol pengalih visibilitas saldo */}
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-600 dark:text-slate-400">
            Total Saldo Bersih
          </p>
          <button
            onClick={onToggle}
            aria-label={isVisible ? "Sembunyikan saldo" : "Tampilkan saldo"}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-slate-600 transition-all hover:bg-slate-100 hover:text-slate-600 active:scale-95 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            {isVisible ? (
              <EyeOff className="h-3.5 w-3.5" />
            ) : (
              <Eye className="h-3.5 w-3.5" />
            )}
            <span>{isVisible ? "Sembunyikan" : "Tampilkan"}</span>
          </button>
        </div>

        {/* Area tampilan nominal saldo atau indikator tersembunyi */}
        <div className="mt-2 min-h-[36px]">
          {isLoading ? (
            /* Kerangka pemuatan data (Skeleton) */
            <div className="mt-1 h-8 w-40 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
          ) : isVisible ? (
            /* Kondisi saldo ditampilkan */
            <p
              className={`text-2xl font-bold tracking-tight transition-all duration-300 ${
                isPositive
                  ? "text-slate-900 dark:text-slate-50"
                  : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {!isPositive && "-"}
              {formatCurrency(Math.abs(totalBalance))}
            </p>
          ) : (
            /* Tampilan topeng titik minimalis untuk menjaga privasi */
            <div className="mt-1 flex items-center gap-3">
              <p
                aria-hidden="true"
                className="select-none font-sans text-xl font-bold tracking-widest text-slate-600 dark:text-slate-600"
              >
                ••••••
              </p>
            </div>
          )}
        </div>

        {/* Subjudul penjelasan tambahan yang hanya tampil saat saldo dibuka */}
        {isVisible && !isLoading && (
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            Gabungan saldo semua dompetmu
          </p>
        )}
      </div>
    </div>
  );
  /********** [END: Perenderan Widget Saldo Tersembunyi (Anti-Illusion Nudge)] **********/
}
