/*
 * File: src/components/budgets/BudgetModal.tsx
 * Description: Modal pembuatan atau penyuntingan batas anggaran bulanan per kategori dengan dukungan sinkronisasi luring.
 */

import { useState, useEffect, FormEvent, useRef } from "react";
import { X } from "lucide-react";
import { Budget } from "@/types/models.types";
import { useCategories } from "@/hooks/use-categories";
import { useBudgetActions } from "@/hooks/use-budget-actions";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { DynamicIcon } from "@/components/ui/DynamicIcon";
import { getCategoryIcon } from "@/lib/utils/icons";
import { useSyncContext } from "@/providers/SyncProvider";
import { showSyncToast } from "@/lib/utils/show-toast";

/********** Definisi Tipe Properti Modal Anggaran **********/

interface BudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingBudget: Budget | null;
  currentPeriod: string; /* Format periode YYYY-MM */
  existingBudgetCategoryIds: string[];
}

/********** Komponen Modal Pembuatan/Penyuntingan Anggaran (BudgetModal) **********/

/**
 * Merender modal form untuk membuat atau mengubah batas nominal anggaran pada kategori pengeluaran tertentu.
 *
 * @param props - Properti status modal, periode saat ini, dan fungsi penanganan penutupan
 * @returns Elemen JSX modal anggaran
 */
export function BudgetModal({
  isOpen,
  onClose,
  editingBudget,
  currentPeriod,
  existingBudgetCategoryIds,
}: BudgetModalProps) {
  const { expenseCategories } = useCategories();
  const { editBudget } = useBudgetActions();
  const { scheduleSync } = useSyncContext();

  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const amountRef = useRef<HTMLInputElement>(null);
  const prevIsOpen = useRef(false);

  useEffect(() => {
    if (isOpen && !prevIsOpen.current) {
      if (editingBudget) {
        setAmount(String(Math.round(Number(editingBudget.amount))));
        setCategoryId(editingBudget.categoryId);
      } else {
        setAmount("");
        setCategoryId(""); /* Membiarkan pengguna memilih kategori secara eksplisit */
      }
      /* Jeda singkat agar input nominal langsung menerima fokus */
      setTimeout(() => amountRef.current?.focus(), 50);
    }
    prevIsOpen.current = isOpen;
  }, [isOpen, editingBudget]);

  const handleClose = () => {
    onClose();
  };

  /********** [START: Penanganan Penyimpanan Anggaran Baru / Suntingan] **********/
  const handleSaveBudget = async (e: FormEvent) => {
    e.preventDefault();
    if (!amount || !categoryId) return;

    const parsedAmount = parseInt(amount.replace(/\D/g, ""), 10);
    if (isNaN(parsedAmount) || parsedAmount <= 0) return;

    setIsSubmitting(true);
    try {
      await editBudget(
        editingBudget?.clientId,
        parsedAmount,
        currentPeriod,
        categoryId
      );

      scheduleSync();
      window.dispatchEvent(new Event("moneta-budget-updated"));
      showSyncToast(
        editingBudget ? "Anggaran diperbarui" : "Anggaran dibuat",
        "Disimpan luring. Akan disinkronkan saat terhubung."
      );
      handleClose();
    } catch (error) {
      console.error("Gagal menyimpan anggaran", error);
      showSyncToast("Gagal menyimpan. Silakan coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  };
  /********** [END: Penanganan Penyimpanan Anggaran Baru / Suntingan] **********/

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center">
      {/* Latar Belakang Gelap (Backdrop) */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity dark:bg-black/60"
        onClick={handleClose}
      />
      
      {/* Wadah Konten Lembar Modal (Sheet Modal) */}
      <div className="relative z-10 w-full max-h-[90vh] overflow-y-auto rounded-t-2xl border border-slate-200 bg-white shadow-2xl animate-in slide-in-from-bottom-10 duration-200 dark:border-slate-800 dark:bg-slate-900 sm:max-w-md sm:rounded-2xl sm:slide-in-from-bottom-0 sm:fade-in flex flex-col">
        {/* Bagian Header Modal */}
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-100 bg-white/80 px-5 py-4 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">
            {editingBudget ? "Ubah Batas Anggaran" : "Buat Anggaran Baru"}
          </h2>
          <button
            onClick={handleClose}
            className="rounded-full p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Isi Modal Anggaran */}
        <form onSubmit={handleSaveBudget} className="p-5 flex flex-col gap-5">
          {/* Pilihan Kategori Pengeluaran */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Kategori Pengeluaran
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[180px] overflow-y-auto pr-1 pb-1">
              {expenseCategories
                .filter(c => editingBudget || !existingBudgetCategoryIds.includes(c.clientId || c.id || ''))
                .map((c) => {
                const isSelected = categoryId === (c.clientId || c.id);
                return (
                  <button
                    key={c.clientId || c.id}
                    type="button"
                    onClick={() => setCategoryId(c.clientId || c.id || "")}
                    className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border p-2 transition-all active:scale-95 ${
                      isSelected
                        ? "border-indigo-600 bg-indigo-50 text-indigo-700 dark:border-indigo-500 dark:bg-indigo-500/20 dark:text-indigo-300 ring-1 ring-indigo-600 dark:ring-indigo-500"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700/50"
                    }`}
                  >
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-lg"
                      style={{
                        backgroundColor: c.color ? `${c.color}20` : "rgb(241 245 249)",
                      }}
                    >
                      {c.icon ? (
                        <DynamicIcon iconName={c.icon} color={c.color} className="h-4 w-4" />
                      ) : (
                        getCategoryIcon(c.name, "h-4 w-4", c.color)
                      )}
                    </div>
                    <span className="text-[10px] font-semibold text-center line-clamp-1 w-full px-1">
                      {c.name}
                    </span>
                  </button>
                );
              })}
              
              {!editingBudget && expenseCategories.filter(c => !existingBudgetCategoryIds.includes(c.clientId || c.id || '')).length === 0 && (
                <div className="col-span-3 sm:col-span-4 p-4 text-center rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    Semua kategori pengeluaran sudah memiliki anggaran bulan ini.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Input Batas Nominal Anggaran */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Batas Nominal
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-semibold text-slate-600">
                Rp
              </span>
              <CurrencyInput
                ref={amountRef}
                value={amount}
                onChange={setAmount}
                required
                placeholder="0"
                className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-12 pr-4 text-lg font-bold text-slate-900 shadow-sm transition-colors placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>

          {/* Tombol Simpan dan Batal */}
          <div className="mt-4 flex flex-col gap-3 sm:flex-row-reverse">
            <button
              type="submit"
              disabled={isSubmitting || !amount || !categoryId}
              className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-500/20 transition-all hover:bg-indigo-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-400 sm:w-auto sm:flex-1"
            >
              {isSubmitting && (
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              )}
              {editingBudget ? "Simpan Perubahan" : "Simpan Anggaran"}
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="inline-flex min-h-[48px] w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50 active:scale-95 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 sm:w-auto sm:flex-1"
            >
              Batal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
