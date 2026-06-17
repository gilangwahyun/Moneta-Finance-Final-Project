"use client";

import { useState } from "react";
import { useCategories } from "@/hooks/use-categories";
import { useBudgetActions } from "@/hooks/use-budget-actions";

interface BudgetFormProps {
  onSuccess?: () => void;
  defaultPeriod?: string; // "YYYY-MM"
}

export function BudgetForm({ onSuccess, defaultPeriod = new Date().toISOString().substring(0, 7) }: BudgetFormProps) {
  const { expenseCategories } = useCategories();
  const { addOrEditBudget } = useBudgetActions();
  
  const [period, setPeriod] = useState(defaultPeriod);
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId || !amount || !period) return;

    setIsSubmitting(true);
    try {
      const numAmount = parseFloat(amount.replace(/[^0-9.-]+/g, ""));
      
      await addOrEditBudget(
        undefined,
        numAmount,
        period,
        categoryId
      );

      // Dispatch event to trigger UI refresh
      window.dispatchEvent(new Event("moneta-budget-updated"));
      
      setAmount("");
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error("Failed to save budget", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-800">Set Monthly Budget</h3>
      
      <div className="space-y-3">
        <div>
          <label htmlFor="period" className="mb-1 block text-sm font-medium text-slate-700">Month</label>
          <input
            id="period"
            type="month"
            required
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="w-full rounded-lg border border-slate-300 p-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
        </div>

        <div>
          <label htmlFor="category" className="mb-1 block text-sm font-medium text-slate-700">Category</label>
          <select
            id="category"
            required
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full rounded-lg border border-slate-300 p-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          >
            <option value="" disabled>Select a category</option>
            {expenseCategories.map((c) => (
              <option key={c.clientId} value={c.clientId}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="amount" className="mb-1 block text-sm font-medium text-slate-700">Budget Limit Amount</label>
          <input
            id="amount"
            type="number"
            required
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="e.g. 1000000"
            className="w-full rounded-lg border border-slate-300 p-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-lg bg-slate-800 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-700 disabled:opacity-50"
      >
        {isSubmitting ? "Saving..." : "Save Budget"}
      </button>
    </form>
  );
}
