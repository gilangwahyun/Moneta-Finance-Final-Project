// ─── UrgentBudgetProgressBar ──────────────────────────────
// Modul 1: Anti-Illusion Nudge
//
// Bug 5 Fix: Added category color dot indicator. The dot is rendered
// inside the category icon container, sourced from categoryColor prop.
//
// Urgency Levels (UCD Neutrality — informatif, tidak punitif):
//   safe     : < 75% terpakai  → indigo  (on-track)
//   warning  : 75–99% terpakai → amber   (perhatian)
//   critical : >= 100% terpakai → slate  (anggaran habis)

"use client";

import { AlertCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils/helpers";
import { getCategoryIcon } from "@/lib/utils/icons";

// ─── Data Shape ─────────────────────────────────────────

export interface BudgetProgressItem {
  categoryId: string;
  categoryName: string;
  /** Hex color string from category.color — e.g. "#EF4444" */
  categoryColor?: string | null;
  spentAmount: number;
  budgetAmount: number;
  /** Math.max(0, budgetAmount - spentAmount) */
  remainingAmount: number;
  /** spentAmount / budgetAmount * 100, unclamped */
  percentage: number;
  /** Math.min(100, percentage) — for bar width */
  clampedPercentage: number;
  urgencyLevel: "safe" | "warning" | "critical";
}

// ─── Urgency Style Map ───────────────────────────────────

const URGENCY_STYLES: Record<
  BudgetProgressItem["urgencyLevel"],
  {
    bar: string;
    remaining: string;
    remainingBg: string;
    remainingBorder: string;
  }
> = {
  safe: {
    bar: "bg-indigo-500",
    remaining: "text-indigo-700 dark:text-indigo-300",
    remainingBg: "bg-indigo-50 dark:bg-indigo-950/60",
    remainingBorder: "border-indigo-100 dark:border-indigo-900/60",
  },
  warning: {
    bar: "bg-amber-500",
    remaining: "text-amber-700 dark:text-amber-300",
    remainingBg: "bg-amber-50 dark:bg-amber-950/60",
    remainingBorder: "border-amber-100 dark:border-amber-900/60",
  },
  critical: {
    // Over-budget: Use rose-500 for the bar fill (loss-aversion nudge)
    bar: "bg-rose-500",
    remaining: "text-rose-600 dark:text-rose-400",
    remainingBg: "bg-rose-50 dark:bg-rose-950/60",
    remainingBorder: "border-rose-200 dark:border-rose-900/60",
  },
};

// ─── Component ───────────────────────────────────────────

interface UrgentBudgetProgressBarProps {
  item: BudgetProgressItem;
}

export function UrgentBudgetProgressBar({ item }: UrgentBudgetProgressBarProps) {
  const styles = URGENCY_STYLES[item.urgencyLevel];
  const isExceeded = item.percentage >= 100;
  // Deficit = how much over the budget limit (only meaningful when exceeded)
  const deficitAmount = isExceeded ? item.spentAmount - item.budgetAmount : 0;
  // Bar color: rose-500 when over-budget, otherwise follow urgency styles
  const barClass = isExceeded ? "bg-rose-500" : styles.bar;

  return (
    <div className="space-y-2.5">
      {/* ── Top row: Category identifier + Remaining (DOMINANT) ── */}
      <div className="flex items-center justify-between gap-3">
        {/* Left: Icon + Color dot + Category name */}
        <div className="flex min-w-0 items-center gap-2.5">
          {/* Dynamic icon-only coloring — no separate dot */}
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800/70">
            {getCategoryIcon(item.categoryName, "h-4 w-4", item.categoryColor)}
          </div>
          <span className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">
            {item.categoryName}
          </span>
        </div>

        {/* Right: Remaining nominal — focal point of this nudge component */}
        <div
          className={`shrink-0 rounded-lg border px-2.5 py-1 ${
            isExceeded
              ? "bg-rose-50 border-rose-200 dark:bg-rose-950/60 dark:border-rose-900/60"
              : `${styles.remainingBg} ${styles.remainingBorder}`
          }`}
        >
          {isExceeded ? (
            <span className="flex items-center gap-1 text-xs font-semibold text-rose-600 dark:text-rose-400">
              <AlertCircle className="h-3 w-3 shrink-0" />
              Melebihi batas
            </span>
          ) : (
            <span className={`whitespace-nowrap text-xs font-bold ${styles.remaining}`}>
              Sisa {formatCurrency(item.remainingAmount)}
            </span>
          )}
        </div>
      </div>

      {/* ── Progress bar — capped at 100% wide, rose-500 when exceeded ── */}
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${barClass}`}
          style={{ width: `${item.clampedPercentage}%` }}
        />
      </div>

      {/* ── Bottom row: Spent/Total + Percentage OR Deficit label ── */}
      <div className="flex items-baseline justify-between">
        <p className="text-xs text-slate-600 dark:text-slate-400">
          <span className="font-medium text-slate-600 dark:text-slate-300">
            {formatCurrency(item.spentAmount)}
          </span>
          {" "}dari {formatCurrency(item.budgetAmount)}
        </p>
        {isExceeded ? (
          /* Over-budget: show human-readable deficit instead of "1015%" */
          <p className="text-xs font-semibold text-rose-500 dark:text-rose-400">
            +{formatCurrency(deficitAmount)} lebih
          </p>
        ) : (
          <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
            {item.clampedPercentage}%
          </p>
        )}
      </div>
    </div>
  );
}
