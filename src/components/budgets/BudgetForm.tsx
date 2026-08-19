/*
 * File: src/components/budgets/BudgetForm.tsx
 * Description: Komponen form inline untuk mengatur batas anggaran bulanan berdasarkan kategori pengeluaran.
 */
"use client";

import { useState } from "react";
import { useCategories } from "@/hooks/use-categories";
import { useBudgetActions } from "@/hooks/use-budget-actions";

/********** Definisi Tipe Properti Form Anggaran **********/

interface BudgetFormProps {
  onSuccess?: () => void;
  defaultPeriod?: string; /* Format periode "YYYY-MM" */
}

/********** Komponen Form Pengaturan Anggaran (BudgetForm) **********/

/**
 * Merender form untuk mengatur atau menambahkan anggaran bulanan baru secara langsung.
 *
 * @param props - Properti panggilan balik setelah sukses dan default periode
 * @returns Elemen JSX form anggaran
 */
export function BudgetForm({ onSuccess, defaultPeriod = new Date().toISOString().substring(0, 7) }: BudgetFormProps) {
  const { expenseCategories } = useCategories();
  const { editBudget } = useBudgetActions();
  
  const [period, setPeriod] = useState(defaultPeriod);
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  /********** [START: Penanganan Eksekusi Penyimpanan Anggaran] **********/
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId || !amount || !period) return;

    setIsSubmitting(true);
    try {
      const numAmount = parseFloat(amount.replace(/[^0-9.-]+/g, ""));
      
      await editBudget(
        undefined,
        numAmount,
        period,
        categoryId
      );

      /* Memicu pembaruan UI di seluruh aplikasi setelah penyimpanan anggaran */
      window.dispatchEvent(new Event("moneta-budget-updated"));
      
      setAmount("");
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error("Gagal menyimpan anggaran", err);
    } finally {
      setIsSubmitting(false);
    }
  };
  /********** [END: Penanganan Eksekusi Penyimpanan Anggaran] **********/

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Atur Anggaran Bulanan</h3>
      
      <div className="space-y-3">
        {/* Pilihan Bulan Periode Anggaran */}
        <div>
          <label htmlFor="period" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Bulan</label>
          <input
            id="period"
            type="month"
            required
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="w-full rounded-lg border border-slate-300 p-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>

        {/* Pilihan Kategori Pengeluaran */}
        <div>
          <label htmlFor="category" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Kategori</label>
          <select
            id="category"
            required
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full rounded-lg border border-slate-300 p-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            <option value="" disabled>Pilih kategori</option>
            {expenseCategories.map((c) => (
              <option key={c.clientId} value={c.clientId}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Input Batas Nominal Anggaran */}
        <div>
          <label htmlFor="amount" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Batas Nominal Anggaran</label>
          <input
            id="amount"
            type="number"
            required
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Contoh: 1000000"
            className="w-full rounded-lg border border-slate-300 p-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>
      </div>

      {/* Tombol Simpan Anggaran */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-lg bg-slate-800 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-700 dark:hover:bg-slate-600"
      >
        {isSubmitting ? "Menyimpan..." : "Simpan Anggaran"}
      </button>
    </form>
  );
}
