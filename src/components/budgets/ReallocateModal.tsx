"use client";

import { useState, useEffect, useMemo, useRef, FormEvent } from "react";
import { Budget, Category } from "@/types/models.types";
import { formatCurrency } from "@/lib/utils/helpers";
import { X, ChevronDown, Check, ArrowRightLeft } from "lucide-react";
import { CurrencyInput } from "@/components/ui/CurrencyInput";

export interface BudgetWithSpent extends Budget {
  spent: number;
  category?: Category;
}

interface ReallocateModalProps {
  budgets: BudgetWithSpent[];
  preselectedSourceId: string | null;
  preselectedDestinationId?: string | null;
  preselectedAmount?: number | null;
  onConfirm: (sourceClientId: string, destinationClientId: string, amount: number) => Promise<void>;
  onClose: () => void;
}

function CustomSelect({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (val: string) => void;
  options: { value: string; title: string; subtitle: string }[];
  placeholder: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selected = options.find((o) => o.value === value);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${
          isOpen
            ? "border-indigo-500 bg-white dark:border-indigo-500 dark:bg-slate-800"
            : "border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700/50"
        }`}
      >
        <div className="flex flex-col min-w-0">
          {selected ? (
            <>
              <span className="truncate text-sm font-semibold text-slate-900 dark:text-slate-50">
                {selected.title}
              </span>
              <span className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">
                {selected.subtitle}
              </span>
            </>
          ) : (
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{placeholder}</span>
          )}
        </div>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1.5 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800">
          <div className="max-h-56 overflow-y-auto p-1.5">
            {options.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => {
                  onChange(o.value);
                  setIsOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition-colors ${
                  value === o.value
                    ? "bg-indigo-50 dark:bg-indigo-500/10"
                    : "hover:bg-slate-50 dark:hover:bg-slate-700/50"
                }`}
              >
                <div className="flex flex-col min-w-0 pr-4">
                  <span className={`truncate text-sm font-semibold ${value === o.value ? "text-indigo-700 dark:text-indigo-400" : "text-slate-900 dark:text-slate-50"}`}>
                    {o.title}
                  </span>
                  <span className={`truncate text-xs font-medium ${value === o.value ? "text-indigo-600/80 dark:text-indigo-400/80" : "text-slate-500 dark:text-slate-400"}`}>
                    {o.subtitle}
                  </span>
                </div>
                {value === o.value && <Check className="h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400" />}
              </button>
            ))}
            {options.length === 0 && (
              <div className="p-4 text-center text-sm font-medium text-slate-500">Tidak ada opsi tersedia</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function ReallocateModal({
  budgets,
  preselectedSourceId,
  preselectedDestinationId,
  preselectedAmount,
  onConfirm,
  onClose,
}: ReallocateModalProps) {
  const [sourceId, setSourceId] = useState(preselectedSourceId ?? "");
  const [destinationId, setDestinationId] = useState(preselectedDestinationId ?? "");
  const [amountStr, setAmountStr] = useState(preselectedAmount ? preselectedAmount.toString() : "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // ── Derived data ──────────────────────────────────────
  const sourceBudget = useMemo(
    () => budgets.find((b) => b.clientId === sourceId),
    [budgets, sourceId]
  );

  const destinationBudget = useMemo(
    () => budgets.find((b) => b.clientId === destinationId),
    [budgets, destinationId]
  );

  const sourceRemaining = useMemo(() => {
    if (!sourceBudget) return 0;
    return Math.max(0, Number(sourceBudget.amount) - sourceBudget.spent);
  }, [sourceBudget]);

  const sourceCandidates = useMemo(
    () => budgets.filter((b) => Number(b.amount) - b.spent > 0),
    [budgets]
  );

  const destinationCandidates = useMemo(
    () => budgets.filter((b) => b.clientId !== sourceId),
    [budgets, sourceId]
  );

  // Reset destination if it becomes the same as source
  useEffect(() => {
    setDestinationId((prev) => {
      if (prev === sourceId) return "";
      return prev;
    });
  }, [sourceId]);

  // Validation
  const parsedAmount = useMemo(() => {
    const n = parseInt(amountStr.replace(/\D/g, ""), 10);
    return isNaN(n) ? 0 : n;
  }, [amountStr]);

  const amountError = useMemo(() => {
    if (!amountStr) return null;
    if (parsedAmount <= 0) return "Nominal harus lebih dari 0.";
    if (parsedAmount > sourceRemaining) return `Nominal tidak boleh melebihi sisa anggaran sumber (${formatCurrency(sourceRemaining)}).`;
    if (sourceId === destinationId) return "Anggaran tujuan harus berbeda dari anggaran sumber.";
    
    // Safety check: Ensure source remains safe (>= 20% limit)
    if (sourceBudget) {
      const remainingAfter = sourceRemaining - parsedAmount;
      const minSafe = Number(sourceBudget.amount) * 0.2;
      if (remainingAfter < minSafe) {
        return `Anggaran sumber tidak akan aman. Sisa minimal harus ${formatCurrency(minSafe)}.`;
      }
    }
    
    return null;
  }, [amountStr, parsedAmount, sourceRemaining, sourceId, destinationId, sourceBudget]);

  const canSubmit = Boolean(sourceId && destinationId && sourceBudget && destinationBudget && parsedAmount > 0 && !amountError && !isSubmitting);

  // Submit
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setApiError(null);
    setIsSubmitting(true);
    try {
      await onConfirm(sourceId, destinationId, parsedAmount);
      onClose();
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Gagal memindahkan anggaran.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity dark:bg-black/60"
        onClick={handleBackdropClick}
      />
      
      {/* Modal/Sheet Content */}
      <div className="relative z-10 w-full max-h-[90vh] overflow-y-auto rounded-t-2xl border border-slate-200 bg-white shadow-2xl animate-in slide-in-from-bottom-10 duration-200 dark:border-slate-800 dark:bg-slate-900 sm:max-w-lg sm:rounded-2xl sm:slide-in-from-bottom-0 sm:fade-in flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-100 bg-white/80 px-5 py-4 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
              <ArrowRightLeft className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-50">
                Subsidi Silang
              </h2>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Pindahkan sebagian sisa anggaran ke kategori lain.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-6">
          
          {/* Source Select */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Dari (Sumber)
            </label>
            <CustomSelect
              value={sourceId}
              onChange={(v) => { setSourceId(v); setAmountStr(""); setApiError(null); }}
              placeholder="Pilih anggaran sumber..."
              options={sourceCandidates.map((b) => ({
                value: b.clientId!,
                title: b.category?.name || "Anggaran",
                subtitle: `Sisa ${formatCurrency(Math.max(0, Number(b.amount) - b.spent))} dari ${formatCurrency(Number(b.amount))}`
              }))}
            />
            {sourceBudget && (
               <div className="mt-3 flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-800/50">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                    <div
                      className="h-full rounded-full bg-indigo-500 transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.round((sourceBudget.spent / Number(sourceBudget.amount)) * 100))}%` }}
                    />
                  </div>
                  <span className="shrink-0 text-xs font-medium text-slate-500 dark:text-slate-400">
                    Sisa <span className="font-bold text-slate-700 dark:text-slate-200">{formatCurrency(sourceRemaining)}</span>
                  </span>
               </div>
            )}
          </div>

          {/* Destination Select */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Ke (Tujuan)
            </label>
            <CustomSelect
              value={destinationId}
              onChange={(v) => { setDestinationId(v); setApiError(null); }}
              placeholder="Pilih anggaran tujuan..."
              options={destinationCandidates.map((b) => ({
                value: b.clientId!,
                title: b.category?.name || "Anggaran",
                subtitle: `Batas saat ini ${formatCurrency(Number(b.amount))}`
              }))}
            />
          </div>

          {/* Amount Input */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Nominal
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-semibold text-slate-400">
                Rp
              </span>
              <CurrencyInput
                value={amountStr}
                onChange={(val) => { setAmountStr(val); setApiError(null); }}
                placeholder="0"
                className={`w-full rounded-xl border bg-white py-3 pl-12 pr-4 text-lg font-bold shadow-sm transition-colors focus:outline-none focus:ring-2 dark:bg-slate-800 ${
                  amountError
                    ? "border-rose-500 text-rose-600 focus:border-rose-500 focus:ring-rose-500/20 dark:text-rose-500"
                    : "border-slate-200 text-slate-900 focus:border-indigo-500 focus:ring-indigo-500/20 dark:border-slate-700 dark:text-white"
                }`}
              />
            </div>
            <p className={`mt-2 text-xs font-medium ${amountError ? "text-rose-500 dark:text-rose-400" : "text-slate-500 dark:text-slate-400"}`}>
              {amountError || "Masukkan nominal yang ingin dipindahkan."}
            </p>
          </div>

          {/* Impact Summary */}
          {canSubmit && sourceBudget && destinationBudget && parsedAmount > 0 && (
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 dark:border-indigo-500/20 dark:bg-indigo-500/5">
              <h4 className="mb-2.5 text-xs font-bold uppercase tracking-wider text-indigo-800 dark:text-indigo-400">
                Dampak Perubahan
              </h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-600 dark:text-slate-300">{sourceBudget.category?.name || "Sumber"}</span>
                  <div className="flex items-center gap-1.5 font-bold">
                    <span className="text-slate-400 line-through decoration-slate-300 dark:decoration-slate-600">{formatCurrency(Number(sourceBudget.amount))}</span>
                    <span className="text-slate-400">→</span>
                    <span className="text-rose-600 dark:text-rose-400">{formatCurrency(Number(sourceBudget.amount) - parsedAmount)}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-600 dark:text-slate-300">{destinationBudget.category?.name || "Tujuan"}</span>
                  <div className="flex items-center gap-1.5 font-bold">
                    <span className="text-slate-400 line-through decoration-slate-300 dark:decoration-slate-600">{formatCurrency(Number(destinationBudget.amount))}</span>
                    <span className="text-slate-400">→</span>
                    <span className="text-emerald-600 dark:text-emerald-400">{formatCurrency(Number(destinationBudget.amount) + parsedAmount)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* API Error */}
          {apiError && (
            <div className="rounded-xl bg-rose-50 p-3 text-sm font-medium text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
              {apiError}
            </div>
          )}

          {/* Footer Actions */}
          <div className="mt-2 flex flex-col gap-3 sm:flex-row-reverse">
            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-500/20 transition-all hover:bg-indigo-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-400 sm:w-auto sm:flex-1"
            >
              {isSubmitting ? (
                <>
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Memproses...
                </>
              ) : (
                "Konfirmasi"
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
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
