// ─── BudgetHealthBar ────────────────────────────────────
// Visual indicator for overall monthly budget health.
// Used exclusively on the Dashboard as a replacement for
// the 3-card summary (Income / Expense / Balance).
//
// Colour semantics (UCD Neutrality applied):
//   Strictly neutral (slate/blue) to avoid judgmental colours.

"use client";

import { formatCurrency } from "@/lib/utils/helpers";
import Link from "next/link";
import { Activity, AlertCircle } from "lucide-react";

interface BudgetHealthBarProps {
  totalSpent: number;
  totalBudget: number;
}

export function BudgetHealthBar({
  totalSpent,
  totalBudget,
}: BudgetHealthBarProps) {
  // ── No budget set ─────────────────────────────────────
  if (totalBudget === 0) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-dashed border-slate-200 bg-slate-50 px-5 py-4 dark:border-slate-800/50 dark:bg-slate-800/20">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Anggaran bulan ini belum diatur
          </p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Atur anggaran untuk memantau kesehatan pengeluaranmu
          </p>
        </div>
        <Link
          href="/budgets"
          className="shrink-0 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-indigo-700"
        >
          Atur Anggaran →
        </Link>
      </div>
    );
  }

  const percentage = Math.round((totalSpent / totalBudget) * 100);
  const clamped = Math.min(100, percentage);
  
  // UCD Neutrality: Always neutral blue/slate
  const status = percentage >= 100 
    ? {
        label: "Melebihi Anggaran",
        color: "text-slate-600 dark:text-slate-300",
        barColor: "bg-slate-400 dark:bg-slate-500",
        trackColor: "bg-slate-100 dark:bg-slate-800",
        badge: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
        Icon: AlertCircle,
      }
    : {
        label: "Anggaran Aktif",
        color: "text-blue-600 dark:text-blue-400",
        barColor: "bg-blue-500",
        trackColor: "bg-slate-100 dark:bg-slate-800",
        badge: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
        Icon: Activity,
      };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800/50 dark:bg-slate-900">
      {/* Header row */}
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
          Kesehatan Anggaran Bulanan
        </p>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border border-transparent dark:border-slate-800/50 ${status.badge}`}
        >
          <status.Icon className="h-3.5 w-3.5" />
          {status.label}
        </span>
      </div>

      {/* Progress bar */}
      <div className={`h-2.5 w-full overflow-hidden rounded-full ${status.trackColor}`}>
        <div
          className={`h-full rounded-full transition-all duration-700 ${status.barColor}`}
          style={{ width: `${clamped}%` }}
        />
      </div>

      {/* Numbers row */}
      <div className="mt-3 flex items-baseline justify-between">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          <span className={`text-sm font-semibold ${status.color}`}>
            {formatCurrency(totalSpent)}
          </span>{" "}
          dari total{" "}
          <span className="font-medium text-slate-600 dark:text-slate-300">
            {formatCurrency(totalBudget)}
          </span>{" "}
          anggaran
        </p>
        <p className={`text-sm font-semibold ${status.color}`}>{percentage}%</p>
      </div>
    </div>
  );
}
