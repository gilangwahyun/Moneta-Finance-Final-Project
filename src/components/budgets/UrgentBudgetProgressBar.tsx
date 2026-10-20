/*
 * File: src/components/budgets/UrgentBudgetProgressBar.tsx
 * Description: Komponen bilah kemajuan anggaran mendesak dengan pengingat anti-ilusi (Anti-Illusion Nudge) untuk memantau sisa anggaran secara efektif.
 */

"use client";

import { AlertCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils/helpers";
import { getCategoryIcon } from "@/lib/utils/icons";

/********** Struktur Data Progres Anggaran **********/

export interface BudgetProgressItem {
  categoryId: string;
  categoryName: string;
  categoryColor?: string | null;
  spentAmount: number;
  budgetAmount: number;
  remainingAmount: number;
  percentage: number;
  clampedPercentage: number;
  urgencyLevel: "safe" | "warning" | "critical";
}

/********** Pemetaan Gaya Warna Urgensi (UCD Neutrality) **********/

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
    bar: "bg-indigo-500 dark:bg-indigo-400",
    remaining: "text-indigo-700 dark:text-indigo-300",
    remainingBg: "bg-indigo-50 dark:bg-indigo-950/60",
    remainingBorder: "border-indigo-100 dark:border-indigo-900/60",
  },
  warning: {
    bar: "bg-indigo-500/80 dark:bg-indigo-400/80",
    remaining: "text-slate-700 dark:text-slate-300",
    remainingBg: "bg-slate-100 dark:bg-slate-800/60",
    remainingBorder: "border-slate-200 dark:border-slate-700",
  },
  critical: {
    bar: "bg-slate-600 dark:bg-slate-400",
    remaining: "text-slate-700 dark:text-slate-300",
    remainingBg: "bg-slate-100 dark:bg-slate-800/60",
    remainingBorder: "border-slate-200 dark:border-slate-700",
  },
};

/********** Komponen Bilah Progres Anggaran Mendesak (UrgentBudgetProgressBar) **********/

interface UrgentBudgetProgressBarProps {
  item: BudgetProgressItem;
}

/**
 * Merender bilah kemajuan untuk kategori anggaran beserta indikator alokasi dan sisa dana.
 *
 * @param props - Properti item progres anggaran
 * @returns Elemen JSX bilah progres mendesak
 */
export function UrgentBudgetProgressBar({ item }: UrgentBudgetProgressBarProps) {
  /********** [START: Kalkulasi Defisit & Kelas Warna Urgensi] **********/
  const styles = URGENCY_STYLES[item.urgencyLevel];
  const isExceeded = item.percentage >= 100;
  
  /* Kalkulasi jumlah kelebihan nominal pengeluaran di atas batas anggaran */
  const deficitAmount = isExceeded ? item.spentAmount - item.budgetAmount : 0;
  
  /* Warna bilah: slate saat alokasi penuh, atau mengikuti gaya alokasi */
  const barClass = isExceeded ? "bg-slate-600 dark:bg-slate-400" : styles.bar;
  /********** [END: Kalkulasi Defisit & Kelas Warna Urgensi] **********/

  return (
    <div className="space-y-2.5">
      {/* Baris Atas: Identitas Kategori + Sisa Anggaran (Dominan) */}
      <div className="flex items-center justify-between gap-3">
        {/* Kiri: Ikon + Titik Warna + Nama Kategori */}
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800/70">
            {getCategoryIcon(item.categoryName, "h-4 w-4", item.categoryColor)}
          </div>
          <span className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">
            {item.categoryName}
          </span>
        </div>

        {/* Kanan: Nominal Sisa Anggaran sebagai fokus utama pengingat */}
        <div
          className={`shrink-0 rounded-lg border px-2.5 py-1 ${
            isExceeded
              ? "bg-slate-100 border-slate-200 dark:bg-slate-800/60 dark:border-slate-700"
              : `${styles.remainingBg} ${styles.remainingBorder}`
          }`}
        >
          {isExceeded ? (
            <span className="flex items-center gap-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
              Alokasi penuh
            </span>
          ) : (
            <span className={`whitespace-nowrap text-xs font-bold ${styles.remaining}`}>
              Sisa {formatCurrency(item.remainingAmount)}
            </span>
          )}
        </div>
      </div>

      {/* Bilah Kemajuan (Dibatasi maksimal 100% untuk lebar elemen visual) */}
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${barClass}`}
          style={{ width: `${item.clampedPercentage}%` }}
        />
      </div>

      {/* Baris Bawah: Terpakai/Total + Persentase atau Label Defisit */}
      <div className="flex items-baseline justify-between">
        <p className="text-xs text-slate-600 dark:text-slate-400">
          <span className="font-medium text-slate-600 dark:text-slate-300">
            {formatCurrency(item.spentAmount)}
          </span>
          {" "}dari {formatCurrency(item.budgetAmount)}
        </p>
        {isExceeded ? (
          <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
            +{formatCurrency(deficitAmount)}
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
