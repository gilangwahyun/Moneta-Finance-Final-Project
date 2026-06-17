// ─── HiddenBalanceWidget ──────────────────────────────────
// Modul 1: Anti-Illusion Nudge
//
// Saldo global disembunyikan secara default setiap kali aplikasi
// dibuka. Pengguna harus secara aktif memilih untuk melihatnya.
//
// Tujuan Akademis (Digital Nudge):
//   Mereduksi "false sense of financial security" yang muncul ketika
//   pengguna langsung disuguhi angka saldo besar tanpa konteks.
//   State toggle TIDAK di-persist ke localStorage — direset setiap
//   sesi agar efek nudge tetap konsisten sepanjang eksperimen.
//
// Bug 7 Fix: Hidden state sekarang menggunakan dot mask minimalis
// (••••••) alih-alih grid skeleton abu-abu yang terlihat berat.

"use client";

import { Eye, EyeOff, Wallet } from "lucide-react";
import { formatCurrency } from "@/lib/utils/helpers";

interface HiddenBalanceWidgetProps {
  totalBalance: number;
  isVisible: boolean;
  onToggle: () => void;
  isLoading?: boolean;
}

export function HiddenBalanceWidget({
  totalBalance,
  isVisible,
  onToggle,
  isLoading = false,
}: HiddenBalanceWidgetProps) {
  const isPositive = totalBalance >= 0;

  return (
    <div className={`relative overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm dark:border-slate-800/60 dark:bg-slate-900 transition-all duration-300 ${isVisible ? "p-5" : "py-3 px-5"}`}>
      {/* ── Decorative background glyph ──────────────────── */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-3 -top-3 text-indigo-400 opacity-[0.05] dark:opacity-[0.07]"
      >
        <Wallet className="h-24 w-24" />
      </div>

      <div className="relative z-10">
        {/* ── Label + Toggle button ─────────────────────── */}
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Total Saldo Bersih
          </p>
          <button
            onClick={onToggle}
            aria-label={isVisible ? "Sembunyikan saldo" : "Tampilkan saldo"}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-600 active:scale-95 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            {isVisible ? (
              <EyeOff className="h-3.5 w-3.5" />
            ) : (
              <Eye className="h-3.5 w-3.5" />
            )}
            <span>{isVisible ? "Sembunyikan" : "Tampilkan"}</span>
          </button>
        </div>

        {/* ── Balance display area ──────────────────────── */}
        <div className="mt-2 min-h-[36px]">
          {isLoading ? (
            /* Loading skeleton */
            <div className="mt-1 h-8 w-40 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
          ) : isVisible ? (
            /* Revealed state */
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
            /* Bug 7 Fix: Minimalist dot mask — clean native financial app feel */
            <div className="mt-1 flex items-center gap-3">
              <p
                aria-hidden="true"
                className="select-none font-sans text-xl font-bold tracking-widest text-slate-400 dark:text-slate-600"
              >
                ••••••
              </p>
            </div>
          )}
        </div>

        {/* ── Subtitle shown only when balance is visible ── */}
        {isVisible && !isLoading && (
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Gabungan saldo semua dompetmu
          </p>
        )}
      </div>
    </div>
  );
}
