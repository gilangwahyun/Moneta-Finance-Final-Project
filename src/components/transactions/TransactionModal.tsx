//********** START: TransactionModal **********
//********** Modul 2: Seamless Quick Input
//**********
//********** Upgrade dari modal transaksi dasar menjadi form dengan:
//**********   1. Smart Defaults - wallet & kategori otomatis terisi
//**********      berdasarkan pilihan paling sering (most-frequent) dari
//**********      50 transaksi terakhir. Fallback ke item[0] jika kosong.
//**********   2. Quick Chips - 6 tombol keyword kontekstual (EXPENSE only)
//**********      yang mengisi description + categoryId dalam satu ketukan.
//**********
//********** State management: controlled useState (bukan react-hook-form).
//********** Chips langsung memanggil setter state - tidak ada complexity library.
//**********
//********** Keputusan Arsitektur Modul 2:
//**********   - Chips eksklusif EXPENSE (tidak ada di INCOME/TRANSFER)
//**********   - Chips dimmed (tidak hidden) jika kategori belum ada
//**********   - 6 chips dalam grid 3 kolom (Fitts's Law + Hick's Law)
//********** END: TransactionModal **********

import { useState, useEffect, FormEvent, useMemo, useRef } from "react";
import { useTransactions } from "@/hooks/use-transactions";
import { useCategories } from "@/hooks/use-categories";
import { useWallets } from "@/hooks/use-wallets";
import { Transaction, TransactionType } from "@/types/models.types";
import { showSyncToast } from "@/lib/utils/show-toast";
import { TrendingDown, TrendingUp, ArrowLeftRight, X, ClipboardPaste, CheckCircle2, AlertCircle, ChevronDown, Plus } from "lucide-react";
import { parseMutationText } from "@/lib/utils/parse-mutation";
import { DynamicIcon } from "@/components/ui/DynamicIcon";
import { getWalletIcon } from "@/lib/utils/wallet-icons";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { QuickChipGrid } from "@/components/ui/QuickChipGrid";
import { CategoryBuilder } from "@/components/categories/CategoryBuilder";


//********** HELPERS **********

function todayString(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * Menghitung nilai paling sering muncul dari array string.
 * Digunakan untuk smart default wallet dan kategori.
 * Pure function - tidak ada side effect.
 */
function getMostFrequent(arr: string[]): string | null {
  if (arr.length === 0) return null;
  const freq = new Map<string, number>();
  for (const val of arr) {
    if (val) freq.set(val, (freq.get(val) ?? 0) + 1);
  }
  let best: string | null = null;
  let max = 0;
  for (const [val, count] of freq.entries()) {
    if (count > max) {
      max = count;
      best = val;
    }
  }
  return best;
}

//********** TYPES **********

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingTxn?: Transaction | null;
  initialType?: TransactionType;
  //********** Transaksi terbaru dari IndexedDB - digunakan untuk menghitung
  //********** smart default wallet dan kategori berdasarkan frekuensi pakai.
  //********** Di-pass dari TransactionFormProvider yang sudah subscribe ke
  //********** moneta-transaction-updated, sehingga selalu up-to-date.
  recentTransactions?: Transaction[];
  initialWalletId?: string;
}

const TYPE_TABS: { value: TransactionType; label: string; icon: React.ReactNode }[] = [
  { value: "EXPENSE",  label: "Pengeluaran", icon: <TrendingDown className="h-4 w-4" /> },
  { value: "INCOME",   label: "Pemasukan",   icon: <TrendingUp className="h-4 w-4" /> },
  { value: "TRANSFER", label: "Transfer",    icon: <ArrowLeftRight className="h-4 w-4" /> },
];

//********** COMPONENT **********
/**
 * Modal form for creating and editing transactions.
 */
export function TransactionModal({
  isOpen,
  onClose,
  editingTxn,
  initialType = "EXPENSE",
  recentTransactions = [],
  initialWalletId,
}: TransactionModalProps) {
  const { recordTransaction, editTransaction, removeTransaction } = useTransactions();
  const { expenseCategories, incomeCategories, createCategory } = useCategories();
  const { wallets } = useWallets();

  //********** Form state **********
  const [formType, setFormType] = useState<TransactionType>(initialType);
  const [formAmount, setFormAmount] = useState("");
  const [formDate, setFormDate] = useState(todayString());
  const [formCategoryId, setFormCategoryId] = useState("");
  const [formWalletId, setFormWalletId] = useState("");
  const [formTargetWalletId, setFormTargetWalletId] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formNote, setFormNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showNote, setShowNote] = useState(false);

  //********** Mutation Parser state **********
  const [showMutationParser, setShowMutationParser] = useState(false);
  const [mutationText, setMutationText] = useState("");
  //********** "idle" | "success" | "error"
  const [mutationStatus, setMutationStatus] = useState<"idle" | "success" | "error">("idle");

  //********** Category inline-expansion state **********
  const [isCategoryExpanded, setIsCategoryExpanded] = useState(false);

  //********** Modal view switch **********
  //********** "form" = normal transaction entry, "category-builder" = Buat Kategori Baru
  //********** All form state is preserved during the switch - only rendering changes.
  type ModalView = "form" | "category-builder";
  const [modalView, setModalView] = useState<ModalView>("form");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isTransfer = formType === "TRANSFER";

  const availableCategories = useMemo(
    () => (formType === "EXPENSE" ? expenseCategories : incomeCategories),
    [formType, expenseCategories, incomeCategories]
  );

  //********** Smart Default: Wallet **********
  //********** Prioritas: wallet paling sering dipakai untuk tipe transaksi ini
  //********** -> fallback ke wallets[0] jika belum ada history.
  useEffect(() => {
    if (!formWalletId && wallets.length > 0) {
      const mostUsedId = getMostFrequent(
        recentTransactions
          .filter((t) => t.type === formType)
          .map((t) => t.walletId)
      );
      const preferred = wallets.find((w) => w.clientId === mostUsedId);
      setFormWalletId(preferred?.clientId ?? wallets[0].clientId);
    }
  }, [wallets, formWalletId, recentTransactions, formType]);

  //********** Smart Default: Kategori saat type berubah **********
  //********** Reset formCategoryId lalu isi dengan most-frequent untuk tipe baru.
  const prevTypeRef = useRef(formType);
  useEffect(() => {
    if (prevTypeRef.current !== formType) {
      prevTypeRef.current = formType;
      if (!isTransfer && availableCategories.length > 0 && !editingTxn) {
        const mostUsedId = getMostFrequent(
          recentTransactions
            .filter((t) => t.type === formType && t.categoryId)
            .map((t) => t.categoryId as string)
        );
        const preferred = availableCategories.find(
          (c) => c.clientId === mostUsedId
        );
        setFormCategoryId(
          preferred?.clientId ?? availableCategories[0].clientId
        );
      }
      if (isTransfer) setFormCategoryId("");
    }
  }, [formType, availableCategories, editingTxn, isTransfer, recentTransactions]);

  //********** Smart Default: Kategori saat form pertama dibuka **********
  //********** Menangkap kasus saat availableCategories load async setelah mount.
  useEffect(() => {
    if (
      !formCategoryId &&
      availableCategories.length > 0 &&
      !editingTxn &&
      !isTransfer
    ) {
      const mostUsedId = getMostFrequent(
        recentTransactions
          .filter((t) => t.type === formType && t.categoryId)
          .map((t) => t.categoryId as string)
      );
      const preferred = availableCategories.find(
        (c) => c.clientId === mostUsedId
      );
      setFormCategoryId(
        preferred?.clientId ?? availableCategories[0].clientId
      );
    }
  }, [
    availableCategories,
    formCategoryId,
    editingTxn,
    isTransfer,
    recentTransactions,
    formType,
  ]);

  //********** Populate form saat mode edit **********
  useEffect(() => {
    if (isOpen) {
      if (editingTxn) {
        setFormType(editingTxn.type);
        setFormAmount(String(Math.round(editingTxn.amount)));
        setFormDate(editingTxn.date.split("T")[0]);
        setFormCategoryId(editingTxn.categoryId ?? "");
        setFormWalletId(editingTxn.walletId ?? "");
        setFormTargetWalletId(editingTxn.targetWalletId ?? "");
        setFormDescription(editingTxn.description || "");
        setFormNote(editingTxn.note || "");
        setShowNote(!!editingTxn.note);
        setShowDeleteConfirm(false);
      } else {
        //********** Form baru: reset semua field kecuali wallet
        //********** (wallet dipertahankan dari pilihan sebelumnya via smart default)
        setFormType(initialType);
        setFormAmount("");
        setFormDate(todayString());
        setFormCategoryId("");
        setFormDescription("");
        setFormNote("");
        setShowNote(false);
        //********** Reset mutation parser
        setShowMutationParser(false);
        setMutationText("");
        setMutationStatus("idle");
        //********** Reset UI state
        setIsCategoryExpanded(false);
        setModalView("form");
        setShowDeleteConfirm(false);
        //********** formWalletId tetap - akan di-override oleh smart default effect
        //********** jika kosong, atau dipertahankan untuk convenience
        if (initialWalletId) {
          setFormWalletId(initialWalletId);
        }
      }
    }
  }, [isOpen, editingTxn, initialType, initialWalletId]);

  //********** Quick Chip Handler **********
  //********** Satu ketukan chip mengisi description DAN memilih kategori.
  //********** State update bersifat sinkron - tidak ada race condition.
  function handleChipSelect({
    description,
    categoryId,
  }: {
    description: string;
    categoryId: string;
  }) {
    setFormDescription(description);
    setFormCategoryId(categoryId);
  }

  //********** Mutation Parser Handler **********
  //********** Runs on every keystroke/paste inside the mutation textarea.
  //********** parseMutationText is pure & synchronous - safe to call on change.
  function handleMutationChange(text: string) {
    setMutationText(text);
    if (!text.trim()) {
      setMutationStatus("idle");
      return;
    }
    const parsed = parseMutationText(text);
    if (parsed !== null && parsed > 0) {
      //********** CurrencyInput expects a raw digit string (no separators)
      setFormAmount(String(parsed));
      setMutationStatus("success");
    } else {
      setMutationStatus("error");
    }
  }

  //********** Validation **********
  const isValid = useMemo(() => {
    const amount = parseInt(formAmount, 10);
    if (isNaN(amount) || amount <= 0) return false;
    if (!formWalletId) return false;
    if (isTransfer) {
      return !!formTargetWalletId && formWalletId !== formTargetWalletId;
    }
    return !!formCategoryId;
  }, [formAmount, formWalletId, formTargetWalletId, formCategoryId, isTransfer]);

  //********** Submit **********
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    const amount = parseInt(formAmount, 10);
    setIsSubmitting(true);

    try {
      if (editingTxn?.clientId) {
        await editTransaction({
          clientId: editingTxn.clientId,
          amount,
          type: formType,
          date: formDate,
          walletId: formWalletId,
          targetWalletId: isTransfer ? formTargetWalletId : null,
          categoryId: isTransfer ? null : formCategoryId,
          description: formDescription || null,
          note: formNote || null,
        });
        showSyncToast(
          "Transaksi diperbarui",
          "Disimpan luring. Akan disinkronkan saat terhubung."
        );
      } else {
        const created = await recordTransaction({
          amount,
          type: formType,
          date: formDate,
          walletId: formWalletId,
          targetWalletId: isTransfer ? formTargetWalletId : null,
          categoryId: isTransfer ? null : formCategoryId,
          description: formDescription || null,
          note: formNote || null,
        });
        showSyncToast(
          "Transaksi tersimpan",
          "Disimpan luring. Akan disinkronkan saat terhubung."
        );
      }
      onClose();
    } catch {
      showSyncToast("Gagal menyimpan. Silakan coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteTransaction() {
    if (!editingTxn?.clientId) return;
    setIsSubmitting(true);
    try {
      await removeTransaction(editingTxn.clientId);
      showSyncToast("Transaksi dihapus", "Akan disinkronkan saat terhubung.");
      onClose();
    } catch {
      showSyncToast("Gagal menghapus. Silakan coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isOpen) return null;

  //********** Style tokens **********
  const inputCls =
    "w-full min-h-[44px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-50";
  const labelCls =
    "mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300";

  //********** Render **********
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center">
      {/* //********** Backdrop ********** */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* //********** Modal sheet ********** */}
      <div className="relative z-10 w-full max-h-[90vh] overflow-y-auto rounded-t-2xl border border-slate-200 bg-white shadow-2xl animate-in slide-in-from-bottom-10 duration-200 dark:border-slate-800 dark:bg-slate-900 sm:max-w-2xl sm:rounded-2xl sm:slide-in-from-bottom-0 sm:fade-in">

        {/* //********** Header ********** */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">
            {modalView === "category-builder"
              ? "Buat Kategori Baru"
              : editingTxn ? "Ubah Transaksi" : "Tambah Transaksi"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
            aria-label="Tutup form"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* //********** View: Category Builder ********** */}
        {modalView === "category-builder" && (
          <CategoryBuilder
            type={formType === "INCOME" ? "INCOME" : "EXPENSE"}
            onCreateCategory={createCategory}
            onSave={(clientId) => {
              //********** Delay slightly so the DOM has the new category rendered from the
              //********** parent's updated state before we auto-select it, avoiding race condition
              setTimeout(() => {
                setFormCategoryId(clientId);
                setIsCategoryExpanded(true);  //********** expand so new category is visible
                setModalView("form");
              }, 0);
            }}
            onCancel={() => setModalView("form")}
          />
        )}

        {/* //********** View: Transaction Form ********** */}
        {modalView === "form" && (
        <form onSubmit={handleSubmit} className="space-y-5 px-5 py-4 pb-safe">

          {/* //********** Tabs: Pengeluaran | Pemasukan | Transfer ********** */}
          <div className="flex gap-2">
            {TYPE_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setFormType(tab.value)}
                className={`flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-all active:scale-95 ${
                  formType === tab.value
                    ? "border-indigo-600 bg-indigo-600 text-white dark:border-indigo-500 dark:bg-indigo-500"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 hover:dark:bg-slate-800/60"
                }`}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* //********** Mutation Parser (collapsible) ********** */}
          <div className="rounded-xl border border-dashed border-indigo-200 bg-indigo-50/50 dark:border-indigo-800/50 dark:bg-indigo-950/20 overflow-hidden transition-all duration-200">
            {/* //********** Toggle header ********** */}
            <button
              type="button"
              onClick={() => {
                setShowMutationParser((v) => !v);
                if (showMutationParser) {
                  //********** Collapsing - clear parser state but keep filled amount
                  setMutationText("");
                  setMutationStatus("idle");
                }
              }}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-indigo-100/60 dark:hover:bg-indigo-900/30"
            >
              <ClipboardPaste className="h-4 w-4 shrink-0 text-indigo-500 dark:text-indigo-400" />
              <span className="flex-1 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                Paste Teks Mutasi M-Banking
              </span>
              {mutationStatus === "success" && (
                <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Nominal terisi
                </span>
              )}
              <span
                className={`text-xs text-indigo-400 transition-transform duration-200 ${showMutationParser ? "rotate-180" : ""}`}
                aria-hidden="true"
              >
                ▾
              </span>
            </button>

            {/* //********** Expandable body ********** */}
            {showMutationParser && (
              <div className="animate-in slide-in-from-top-1 fade-in duration-200 border-t border-indigo-200/70 px-3 pb-3 pt-2.5 dark:border-indigo-800/40">
                <p className="mb-2 text-[11px] leading-relaxed text-indigo-600/80 dark:text-indigo-400/80">
                  Tempel notifikasi SMS / push dari aplikasi m-banking kamu. Sistem akan otomatis mengekstrak nominalnya.
                </p>
                <div className="relative">
                  <textarea
                    id="txn-mutation-text"
                    value={mutationText}
                    onChange={(e) => handleMutationChange(e.target.value)}
                    onPaste={(e) => {
                      //********** Allow default paste, then let onChange fire
                      //********** Extra: immediately parse clipboard text for instant feedback
                      const pasted = e.clipboardData.getData("text");
                      if (pasted) {
                        e.preventDefault();
                        const combined = mutationText + pasted;
                        handleMutationChange(combined);
                      }
                    }}
                    rows={4}
                    placeholder={`Contoh:\nBCA - Debit Rp150.000 dari rek 1234567890 ke rek 0987654321 berhasil. Saldo akhir Rp2.350.000`}
                    className="w-full resize-none rounded-lg border border-indigo-200 bg-white px-3 py-2 text-[13px] leading-relaxed text-slate-700 shadow-sm placeholder:text-slate-300 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-indigo-800/60 dark:bg-slate-800 dark:text-slate-200 dark:placeholder:text-slate-600"
                  />
                  {/* //********** Status badge ********** */}
                  {mutationStatus !== "idle" && (
                    <div
                      className={`absolute bottom-2 right-2 flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                        mutationStatus === "success"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                          : "bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400"
                      }`}
                    >
                      {mutationStatus === "success" ? (
                        <><CheckCircle2 className="h-3 w-3" /> Nominal ditemukan</>
                      ) : (
                        <><AlertCircle className="h-3 w-3" /> Nominal tidak ditemukan</>
                      )}
                    </div>
                  )}
                </div>
                {mutationStatus === "error" && (
                  <p className="mt-1.5 text-[11px] text-rose-500 dark:text-rose-400">
                    Pastikan teks mengandung nominal seperti &quot;Rp50.000&quot; atau &quot;IDR 50.000&quot;.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* //********** Nominal ********** */}
          <div>
            <label htmlFor="txn-amount" className={labelCls}>
              Nominal
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lg font-semibold text-slate-400">
                Rp
              </span>
              <CurrencyInput
                id="txn-amount"
                value={formAmount}
                onChange={setFormAmount}
                placeholder="0"
                required
                autoFocus
                className="w-full min-h-[56px] rounded-lg border border-slate-200 bg-white py-3 pl-12 pr-4 text-2xl font-bold text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-50"
              />
            </div>
          </div>

          {/* //********** Tanggal ********** */}
          <div>
            <label htmlFor="txn-date" className={labelCls}>
              Tanggal
            </label>
            <input
              id="txn-date"
              type="date"
              value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
              required
              className={inputCls}
            />
          </div>

          {/* //********** Dompet - Visual icon-button row ********** */}
          <div className="space-y-3">
            <div>
              <label className={labelCls}>
                {isTransfer ? "Dompet Asal" : "Dompet"}
              </label>
              <div className="flex flex-wrap gap-2">
                {wallets.map((w) => {
                  const isActive = w.clientId === formWalletId;
                  return (
                    <button
                      key={w.clientId}
                      type="button"
                      onClick={() => setFormWalletId(w.clientId)}
                      aria-pressed={isActive}
                      aria-label={w.name}
                      className={[
                        "inline-flex items-center gap-2 rounded-xl border px-3 py-2",
                        "text-xs font-medium transition-all duration-150 active:scale-95",
                        isActive
                          ? "border-indigo-300 bg-indigo-50 text-indigo-700 shadow-sm dark:border-indigo-700/60 dark:bg-indigo-950/40 dark:text-indigo-300"
                          : "border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-indigo-800/60 dark:hover:bg-indigo-950/30 dark:hover:text-indigo-300",
                      ].join(" ")}
                    >
                      <span
                        className={[
                          "flex h-7 w-7 items-center justify-center rounded-full shrink-0",
                          isActive ? "bg-indigo-100 dark:bg-indigo-900/50" : "bg-slate-100 dark:bg-slate-800",
                        ].join(" ")}
                      >
                        {getWalletIcon(w.type, "h-3.5 w-3.5")}
                      </span>
                      <span>{w.name}</span>
                    </button>
                  );
                })}
              </div>
              {!formWalletId && (
                <p className="mt-1 text-[11px] text-rose-500 dark:text-rose-400">Pilih dompet.</p>
              )}
            </div>

            {/* //********** Dompet Tujuan - hanya untuk TRANSFER ********** */}
            {isTransfer && (
              <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                <label className={labelCls}>Dompet Tujuan</label>
                <div className="flex flex-wrap gap-2">
                  {wallets
                    .filter((w) => w.clientId !== formWalletId)
                    .map((w) => {
                      const isActive = w.clientId === formTargetWalletId;
                      return (
                        <button
                          key={w.clientId}
                          type="button"
                          onClick={() => setFormTargetWalletId(w.clientId)}
                          aria-pressed={isActive}
                          aria-label={w.name}
                          className={[
                            "inline-flex items-center gap-2 rounded-xl border px-3 py-2",
                            "text-xs font-medium transition-all duration-150 active:scale-95",
                            isActive
                              ? "border-indigo-300 bg-indigo-50 text-indigo-700 shadow-sm dark:border-indigo-700/60 dark:bg-indigo-950/40 dark:text-indigo-300"
                              : "border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-indigo-800/60 dark:hover:bg-indigo-950/30 dark:hover:text-indigo-300",
                          ].join(" ")}
                        >
                          <span
                            className={[
                              "flex h-7 w-7 items-center justify-center rounded-full shrink-0",
                              isActive ? "bg-indigo-100 dark:bg-indigo-900/50" : "bg-slate-100 dark:bg-slate-800",
                            ].join(" ")}
                          >
                            {getWalletIcon(w.type, "h-3.5 w-3.5")}
                          </span>
                          <span>{w.name}</span>
                        </button>
                      );
                    })}
                </div>
                {!formTargetWalletId && (
                  <p className="mt-1 text-[11px] text-rose-500 dark:text-rose-400">Pilih dompet tujuan.</p>
                )}
              </div>
            )}
          </div>

          {/* //********** Kategori - Inline Expand / Collapse Grid ********** */}
          {!isTransfer && (
            <div className="animate-in fade-in duration-150 space-y-2">
              <label className={labelCls}>Kategori</label>

              {/* //********** Category grid - top-4 collapsed, all shown when expanded ********** */}
              <div className="grid grid-cols-4 gap-2">
                {(isCategoryExpanded
                  ? availableCategories
                  : availableCategories.slice(0, 8)
                ).map((cat) => {
                  const isActive = cat.clientId === formCategoryId;
                  return (
                    <button
                      key={cat.clientId}
                      type="button"
                      onClick={() => setFormCategoryId(cat.clientId)}
                      aria-pressed={isActive}
                      aria-label={cat.name}
                      className={[
                        "flex flex-col items-center justify-center gap-1.5",
                        "rounded-xl border px-1 py-3 text-[10px] font-medium leading-tight",
                        "transition-all duration-150 active:scale-95 min-h-[60px]",
                        isActive
                          ? "border-indigo-300 bg-indigo-50 text-indigo-700 shadow-sm dark:border-indigo-700/60 dark:bg-indigo-950/40 dark:text-indigo-300"
                          : "border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-indigo-800/60 dark:hover:bg-indigo-950/30 dark:hover:text-indigo-300",
                      ].join(" ")}
                    >
                      <span
                        className={[
                          "flex h-7 w-7 items-center justify-center rounded-full",
                          isActive
                            ? "bg-indigo-100 dark:bg-indigo-900/50"
                            : "bg-slate-100 dark:bg-slate-800",
                        ].join(" ")}
                      >
                        <DynamicIcon
                          iconName={cat.icon}
                          color={isActive ? (cat.color ?? "#6366f1") : (cat.color ?? undefined)}
                          className="h-3.5 w-3.5"
                        />
                      </span>
                      <span className="text-center line-clamp-2 px-0.5 w-full">
                        {cat.name}
                      </span>
                    </button>
                  );
                })}

                {/* //********** "+ Tambah Baru" - always visible, opens full Category Builder view ********** */}
                <button
                  type="button"
                  onClick={() => setModalView("category-builder")}
                  className={[
                    "flex flex-col items-center justify-center gap-1.5 min-h-[60px]",
                    "rounded-xl border-2 border-dashed border-slate-200 px-1 py-3",
                    "text-[10px] font-medium text-slate-400",
                    "transition-all duration-150 active:scale-95",
                    "hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-600",
                    "dark:border-slate-700 dark:text-slate-600 dark:hover:border-indigo-700/60 dark:hover:bg-indigo-950/20 dark:hover:text-indigo-400",
                  ].join(" ")}
                >
                  <Plus className="h-4 w-4" />
                  <span>Tambah</span>
                </button>
              </div>

              {/* //********** Expand / Collapse toggle ********** */}
              {availableCategories.length > 8 && (
                <button
                  type="button"
                  onClick={() => {
                    setIsCategoryExpanded((v) => !v);
                  }}
                  className="flex w-full items-center justify-center gap-1 pt-0.5 text-[11px] font-medium text-slate-400 transition-colors hover:text-indigo-600 dark:text-slate-500 dark:hover:text-indigo-400"
                >
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform duration-200 ${
                      isCategoryExpanded ? "rotate-180" : ""
                    }`}
                  />
                  {isCategoryExpanded ? "Lebih Sedikit" : `${availableCategories.length - 8} kategori lainnya`}
                </button>
              )}

              {/* //********** Validation hint ********** */}
              {!formCategoryId && (
                <p className="text-[11px] text-rose-500 dark:text-rose-400">
                  Pilih kategori untuk melanjutkan.
                </p>
              )}
            </div>
          )}

          {/* //********** Info catatan untuk TRANSFER ********** */}
          {isTransfer && (
            <p className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs text-indigo-700 dark:border-indigo-800/60 dark:bg-indigo-950/40 dark:text-indigo-300">
              Transfer antar dompet tidak memengaruhi total pemasukan atau
              pengeluaran.
            </p>
          )}

          {/* //********** Quick Chips - ABOVE description, EXPENSE only, not editing ********** */}
          {!isTransfer && !editingTxn && formType === "EXPENSE" && (
            <div className="animate-in fade-in duration-200">
              <QuickChipGrid
                availableCategories={availableCategories}
                onSelect={handleChipSelect}
                selectedCategoryId={formCategoryId}
              />
            </div>
          )}

          {/* //********** Deskripsi - tersembunyi untuk TRANSFER ********** */}
          {!isTransfer && (
            <div>
              <label htmlFor="txn-desc" className={labelCls}>
                Deskripsi{" "}
                <span className="font-normal text-slate-400">(Opsional)</span>
              </label>
              <input
                id="txn-desc"
                type="text"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Contoh: Makan siang"
                className={inputCls + " placeholder:text-slate-300"}
              />
            </div>
          )}

          {/* //********** Catatan (progressive disclosure) ********** */}
          {!isTransfer &&
            (showNote ? (
              <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                <label htmlFor="txn-note" className={labelCls}>
                  Catatan{" "}
                  <span className="font-normal text-slate-400">(Opsional)</span>
                </label>
                <textarea
                  id="txn-note"
                  value={formNote}
                  onChange={(e) => setFormNote(e.target.value)}
                  placeholder="Catatan tambahan..."
                  rows={2}
                  autoFocus
                  className={inputCls + " placeholder:text-slate-300"}
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowNote(true)}
                className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 transition-colors hover:text-emerald-700 dark:text-emerald-400"
              >
                <span className="text-lg leading-none">+</span>
                Tambah Catatan Opsional
              </button>
            ))}

          {/* //********** Tombol Aksi ********** */}
          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center">
            {showDeleteConfirm ? (
              <div className="flex w-full flex-col gap-3 rounded-xl border border-rose-100 bg-rose-50 p-4 dark:border-rose-900/30 dark:bg-rose-900/10">
                <p className="text-sm font-semibold text-rose-800 dark:text-rose-300 text-center sm:text-left">Yakin ingin menghapus transaksi ini?</p>
                <div className="flex gap-2 w-full">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleDeleteTransaction}
                    className="flex-1 rounded-lg bg-rose-600 py-2.5 text-sm font-bold text-white hover:bg-rose-700 active:scale-95 disabled:opacity-50"
                  >
                    {isSubmitting ? "Menghapus..." : "Ya, Hapus"}
                  </button>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 rounded-lg border border-rose-200 bg-white py-2.5 text-sm font-bold text-rose-700 hover:bg-rose-50 active:scale-95 dark:border-rose-800 dark:bg-transparent dark:text-rose-400 disabled:opacity-50"
                  >
                    Batal
                  </button>
                </div>
              </div>
            ) : (
              <>
                <button
                  type="submit"
                  disabled={isSubmitting || !isValid}
                  className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-500/20 transition-all hover:bg-indigo-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-400"
                >
                  {isSubmitting && (
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  )}
                  {editingTxn ? "Simpan Perubahan" : "Simpan"}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-[44px] flex-1 rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 transition-all hover:bg-slate-50 active:scale-95 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  Batal
                </button>
                {editingTxn && (
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setShowDeleteConfirm(true)}
                    className="min-h-[44px] rounded-lg border border-rose-200 bg-rose-50 px-5 py-2.5 text-sm font-medium text-rose-700 transition-all hover:bg-rose-100 active:scale-95 disabled:opacity-50 dark:border-rose-900/30 dark:bg-rose-900/10 dark:text-rose-400 dark:hover:bg-rose-900/20"
                  >
                    Hapus
                  </button>
                )}
              </>
            )}
          </div>
        </form>
        )}
      </div>
    </div>
  );
}
