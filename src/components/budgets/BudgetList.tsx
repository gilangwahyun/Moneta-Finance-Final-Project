/*
 * File: src/components/budgets/BudgetList.tsx
 * Description: Komponen daftar anggaran sederhana per kategori dengan visualisasi bilah progres netral.
 */
"use client";

import { useBudgets } from "@/hooks/use-budgets";
import { formatCurrency } from "@/lib/utils/helpers";

/********** Definisi Tipe Properti Daftar Anggaran **********/

interface BudgetListProps {
  period: string; /* Format periode "YYYY-MM" */
  selectedMonth: Date;
}

/********** Komponen Daftar Anggaran (BudgetList) **********/

/**
 * Merender daftar seluruh anggaran pada periode terpilih beserta kemajuan penggunaannya.
 *
 * @param props - Properti periode dan bulan terpilih
 * @returns Elemen JSX daftar anggaran
 */
export function BudgetList({ period, selectedMonth }: BudgetListProps) {
  const { budgetsWithStats: budgets, isLoading, transactions: txnLoading } = useBudgets(selectedMonth);

  if (isLoading || txnLoading) {
    return <div className="text-sm text-slate-600 dark:text-slate-400">Memuat data anggaran...</div>;
  }

  if (budgets.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 p-5 text-center text-sm text-slate-600 dark:border-slate-800 dark:text-slate-400">
        Belum ada anggaran untuk periode {period}.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {budgets.map((budget) => {
        /********** [START: Kalkulasi Realisasi & Batas Anggaran per Kategori] **********/
        const category = budget.category;
        const spent = budget.spentAmount;
        const limit = Number(budget.amount);
        
        /* Persentase kemajuan untuk bilah visual (dibatas maksimal 100% untuk UI) */
        const percentage = limit > 0 ? Math.min((spent / limit) * 100, 100) : 100;
        /********** [END: Kalkulasi Realisasi & Batas Anggaran per Kategori] **********/

        return (
          <div key={budget.clientId} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium text-slate-700 dark:text-slate-200">
                {category?.name || "Kategori Tidak Diketahui"}
              </span>
              <span className="text-slate-600 dark:text-slate-400">
                Terpakai: {formatCurrency(spent)} / Batas: {formatCurrency(limit)}
              </span>
            </div>
            
            {/* Netralitas UI UCD: Bilah abu-abu/slate solid tanpa pewarnaan menghakimi */}
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div 
                className="h-full bg-slate-600 dark:bg-slate-500 transition-all duration-500 ease-out"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
