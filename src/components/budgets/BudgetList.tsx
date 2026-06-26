"use client";

import { useBudgets } from "@/hooks/use-budgets";
import { formatCurrency } from "@/lib/utils/helpers";

interface BudgetListProps {
  period: string; // "YYYY-MM"
  selectedMonth: Date;
}

export function BudgetList({ period, selectedMonth }: BudgetListProps) {
  const { budgetsWithStats: budgets, isLoading, transactions: txnLoading } = useBudgets(selectedMonth);

  if (isLoading || txnLoading) {
    return <div className="text-sm text-slate-600">Loading budgets...</div>;
  }

  if (budgets.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 p-5 text-center text-sm text-slate-600">
        No budgets set for {period}.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {budgets.map((budget) => {
        const category = budget.category;
        const spent = budget.spentAmount;
        const limit = Number(budget.amount);
        
        // Progress percentage for visual bar (capped at 100% for UI purposes)
        const percentage = limit > 0 ? Math.min((spent / limit) * 100, 100) : 100;

        return (
          <div key={budget.clientId} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium text-slate-700">
                {category?.name || "Unknown Category"}
              </span>
              <span className="text-slate-600">
                Spent: {formatCurrency(spent)} / Limit: {formatCurrency(limit)}
              </span>
            </div>
            
            {/* STRICTLY NEUTRAL UCD UI: Solid slate/gray bar, NO red/yellow/green */}
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div 
                className="h-full bg-slate-600 transition-all duration-500 ease-out"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
