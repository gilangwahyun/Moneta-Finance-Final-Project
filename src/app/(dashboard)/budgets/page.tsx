/*
 * File: src/app/(dashboard)/budgets/page.tsx
 * Description: Komponen halaman pengelolaan anggaran per bulan beserta fitur rekomendasi subsidi silang antar kategori.
 */

'use client';

/********** Impor Modul & Dependensi **********/
import { useState, useMemo, useEffect } from 'react';
import { useCategories } from '@/hooks/use-categories';
import { useSyncContext } from '@/providers/SyncProvider';
import { Budget } from '@/types/models.types';
import { formatCurrency, formatCurrencyCompact } from '@/lib/utils/helpers';
import { showSyncToast, showDeleteToast } from '@/lib/utils/show-toast';
import { useBudgets } from '@/hooks/use-budgets';
import { useBudgetActions } from '@/hooks/use-budget-actions';

import { Wallet, Plus, ChevronLeft, ChevronRight, AlertCircle, ChevronDown, ArrowDownRight, CheckCircle2 } from 'lucide-react';
import { BudgetCard } from '@/components/budgets/BudgetCard';
import { BudgetModal } from '@/components/budgets/BudgetModal';
import { ReallocateModal } from '@/components/budgets/ReallocateModal';
import { CompactSummaryRow } from '@/components/ui/CompactSummaryRow';
import { DeleteConfirmDialog } from '@/components/ui/DeleteConfirmDialog';
import { FilterBottomSheet } from '@/components/ui/FilterBottomSheet';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useSearchParams } from 'next/navigation';

/********** Komponen Halaman Anggaran (BudgetsPage) **********/

/**
 * Komponen utama halaman pengelolaan anggaran bulanan, memuat daftar batas pengeluaran kategori,
 * pemantauan status penggunaan (Aman/Mendekati Batas/Melebihi Batas), serta subsidi silang.
 *
 * @returns Elemen JSX tata letak halaman anggaran Moneta
 */
export default function BudgetsPage() {
  /********** [START: Inisialisasi State & Hook Halaman Anggaran] **********/
  /* State pemilihan bulan aktif */
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  const { user, budgets, budgetsWithStats, transactions, isLoading, loadBudgets } = useBudgets(selectedMonth);
  const { reallocateBudget, deleteBudget } = useBudgetActions();

  const { allCategories } = useCategories();
  const { scheduleSync } = useSyncContext();

  type StatusFilter = 'ALL' | 'SAFE' | 'WARNING' | 'DANGER';

  /* State filter status anggaran dan kontrol tampilan modal/sheet */
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [showStatusSheet, setShowStatusSheet] = useState(false);

  /* State form modal pembuatan atau penyuntingan anggaran */
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);

  /* Parameter URL untuk penanganan aksi subsidi silang otomatis dari notifikasi/nudge */
  const searchParams = useSearchParams();
  const actionParam = searchParams.get('action');
  const sourceBudgetIdParam = searchParams.get('sourceBudgetId');
  const targetBudgetIdParam = searchParams.get('targetBudgetId');
  const amountParam = searchParams.get('amount');

  const [isReallocateModalOpen, setIsReallocateModalOpen] = useState(false);
  const [reallocateSourceId, setReallocateSourceId] = useState<string | null>(null);
  const [reallocateDestinationId, setReallocateDestinationId] = useState<string | null>(null);
  const [reallocateAmount, setReallocateAmount] = useState<number | null>(null);

  const [hasProcessedUrlParams, setHasProcessedUrlParams] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  /********** [END: Inisialisasi State & Hook Halaman Anggaran] **********/

  /********** [START: Kalkulasi Periode, Nama Bulan, & Filter Status (Derived State)] **********/
  const currentPeriod = useMemo(() => {
    return `${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, '0')}`;
  }, [selectedMonth]);

  const currentMonthName = useMemo(() => {
    return selectedMonth.toLocaleDateString('id-ID', {
      month: 'long',
      year: 'numeric',
    });
  }, [selectedMonth]);

  const statusOptions = useMemo(
    () => [
      { value: 'ALL', label: 'Semua Status' },
      { value: 'SAFE', label: 'Aman' },
      { value: 'WARNING', label: 'Mendekati Batas' },
      { value: 'DANGER', label: 'Melebihi Batas' },
    ],
    [],
  );
  /********** [END: Kalkulasi Periode, Nama Bulan, & Filter Status (Derived State)] **********/

  /********** [START: Efek Samping (Side Effects) - Pemrosesan Parameter URL Subsidi Silang] **********/

  /* Memeriksa parameter URL untuk secara otomatis membuka modal subsidi silang jika dipicu melalui rekomendasi */
  useEffect(() => {
    if (!hasProcessedUrlParams && budgets.length > 0 && actionParam === 'reallocate' && sourceBudgetIdParam && targetBudgetIdParam) {
      const sourceBudget = budgets.find((b) => b.clientId === sourceBudgetIdParam);
      const targetBudget = budgets.find((b) => b.clientId === targetBudgetIdParam);

      /* Validasi 1: Kedua anggaran harus ada dan berbeda */
      if (!sourceBudget || !targetBudget || sourceBudget.clientId === targetBudget.clientId) {
        showSyncToast('Rekomendasi subsidi silang tidak valid atau kedaluwarsa.');
        setHasProcessedUrlParams(true);
        return;
      }

      const amount = amountParam ? Number(amountParam) : 0;

      /* Validasi 2: Jumlah transfer subsidi silang harus bernilai positif */
      if (amount <= 0) {
        showSyncToast('Jumlah subsidi silang tidak valid.');
        setHasProcessedUrlParams(true);
        return;
      }

      /* Validasi 3: Kategori sumber harus memiliki sisa saldo aman yang mencukupi */
      const sourceSpent = transactions.reduce((acc, txn) => {
        if (txn.categoryId === sourceBudget.categoryId && txn.date.startsWith(currentPeriod)) {
          return acc + Math.abs(txn.amount);
        }
        return acc;
      }, 0);

      const sourceRemaining = Number(sourceBudget.amount) - sourceSpent;
      const minimumSafeRemaining = Number(sourceBudget.amount) * 0.2; /* Batas aman minimal 20% */

      if (sourceRemaining - amount < minimumSafeRemaining) {
        showSyncToast('Saldo kategori sumber sudah tidak cukup untuk disubsidi.');
        setHasProcessedUrlParams(true);
        return;
      }

      setReallocateSourceId(sourceBudgetIdParam);
      setReallocateDestinationId(targetBudgetIdParam);
      setReallocateAmount(amount);
      setIsReallocateModalOpen(true);
      setHasProcessedUrlParams(true);
    }
  }, [actionParam, sourceBudgetIdParam, targetBudgetIdParam, amountParam, budgets, transactions, currentPeriod, hasProcessedUrlParams]);
  /********** [END: Efek Samping (Side Effects) - Pemrosesan Parameter URL Subsidi Silang] **********/

  /********** [START: Fungsi Penanganan Aksi Pengguna & Navigasi (Event Handlers)] **********/

  /* Pemuatan data dan penanganan event listener dikelola oleh hook useBudgets */

  /** Navigasi ke bulan sebelumnya */
  const handlePrevMonth = () => {
    setSelectedMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  /** Navigasi ke bulan berikutnya */
  const handleNextMonth = () => {
    setSelectedMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  /** Membuka modal form pembuatan anggaran baru */
  const openCreateModal = () => {
    setEditingBudget(null);
    setIsModalOpen(true);
  };

  /** Membuka modal form penyuntingan anggaran yang dipilih */
  const openEditModal = (budget: Budget) => {
    setEditingBudget(budget);
    setIsModalOpen(true);
  };

  /** Membuka modal subsidi silang dari kategori sumber yang dipilih */
  const openReallocateModal = (sourceClientId: string) => {
    setReallocateSourceId(sourceClientId);
    setReallocateDestinationId(null);
    setReallocateAmount(null);
    setIsReallocateModalOpen(true);
  };

  /** Menerapkan subsidi silang antar anggaran kategori */
  const handleConfirmReallocate = async (sourceClientId: string, destinationClientId: string, amount: number) => {
    if (!user) return;
    try {
      await reallocateBudget(sourceClientId, destinationClientId, amount);
      scheduleSync();
      await loadBudgets();
      showSyncToast('Subsidi silang berhasil diterapkan');
    } catch (err) {
      console.error('Gagal melakukan subsidi silang', err);
      showSyncToast('Gagal melakukan subsidi silang. Silakan coba lagi.');
    }
  };

  /** Menghapus anggaran berdasarkan ID klien */
  async function handleDelete(clientId: string) {
    if (!user) return;
    setIsDeleting(true);
    try {
      await deleteBudget(clientId);
      scheduleSync();
      await loadBudgets();
      setDeleteConfirmId(null);
      showDeleteToast('Anggaran dihapus');
    } catch (err) {
      console.error('Gagal menghapus anggaran', err);
      showSyncToast('Gagal menghapus. Silakan coba lagi.');
    } finally {
      setIsDeleting(false);
    }
  }
  /********** [END: Fungsi Penanganan Aksi Pengguna & Navigasi (Event Handlers)] **********/

  /********** [START: Kalkulasi Total Anggaran, Terpakai, & Sisa Anggaran] **********/
  const filteredBudgets = useMemo(() => {
    if (statusFilter === 'ALL') return budgetsWithStats;
    return budgetsWithStats.filter((b) => b.status === statusFilter);
  }, [budgetsWithStats, statusFilter]);

  const totalBudget = budgetsWithStats.reduce((acc, b) => acc + Number(b.amount), 0);
  const totalSpent = budgetsWithStats.reduce((acc, b) => acc + b.spentAmount, 0);
  const remainingBudget = Math.max(0, totalBudget - totalSpent);
  /********** [END: Kalkulasi Total Anggaran, Terpakai, & Sisa Anggaran] **********/

  /********** Pengembalian Tata Letak Halaman Anggaran (JSX) **********/
  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-24">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Anggaran</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Atur batas pengeluaran untuk {currentMonthName}</p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-500/20 transition-all hover:bg-indigo-500 active:scale-95 dark:bg-indigo-500 dark:hover:bg-indigo-400"
        >
          <Plus className="h-4 w-4" />
          Atur Anggaran
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        {/* Navigasi Pemilih Bulan */}
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <button
            onClick={handlePrevMonth}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            aria-label="Bulan sebelumnya"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="w-36 text-center text-sm font-semibold text-slate-700 dark:text-slate-200">{currentMonthName}</span>
          <button
            onClick={handleNextMonth}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            aria-label="Bulan berikutnya"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Filter Status Anggaran - Layar Desktop */}
        <div className="hidden md:block flex-1 sm:flex-none w-full sm:w-auto min-w-0 overflow-hidden">
          <SegmentedControl options={statusOptions} value={statusFilter} onChange={(v) => setStatusFilter(v as StatusFilter)} fullWidth />
        </div>

        {/* Filter Status Anggaran - Layar Mobile */}
        <div className="block md:hidden w-full">
          <button
            onClick={() => setShowStatusSheet(true)}
            aria-label="Buka filter status anggaran"
            className="flex h-[48px] w-full items-center justify-between rounded-2xl bg-white/60 px-4 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur-xl ring-1 ring-inset ring-slate-200/60 transition-all hover:bg-white active:scale-95 dark:bg-slate-900/60 dark:text-slate-200 dark:ring-slate-800/60 dark:hover:bg-slate-800"
          >
            <span className="text-slate-600 dark:text-slate-400">Status Anggaran</span>
            <div className="flex items-center gap-2">
              <span className="truncate max-w-[120px]">{statusOptions.find((o) => o.value === statusFilter)?.label}</span>
              <ChevronDown className="h-4 w-4 text-slate-600 shrink-0" />
            </div>
          </button>
        </div>
      </div>

      <CompactSummaryRow
        metrics={[
          {
            label: 'Total Anggaran',
            compactLabel: 'Total',
            value: totalBudget,
            icon: <Wallet className="h-3.5 w-3.5" />,
          },
          {
            label: 'Terpakai',
            compactLabel: 'Terpakai',
            value: totalSpent,
            icon: <ArrowDownRight className="h-3.5 w-3.5" />,
          },
          {
            label: 'Sisa Anggaran',
            compactLabel: 'Sisa',
            value: remainingBudget,
            icon: <CheckCircle2 className="h-3.5 w-3.5" />,
          },
        ]}
      />

      {isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
        </div>
      ) : budgets.length === 0 ? (
        /* Status Kosong (Empty State): Belum ada anggaran sama sekali pada bulan yang dipilih */
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 px-6 py-16 text-center dark:border-slate-800/50">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 dark:bg-slate-800/50">
            <Wallet className="h-8 w-8 text-slate-600" />
          </div>
          <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300">Belum ada anggaran</h3>
          <p className="mt-1.5 max-w-sm text-sm text-slate-600 dark:text-slate-400">
            Buat batas pengeluaran untuk membantu mengontrol keuangan di bulan ini.
          </p>
          <button
            onClick={openCreateModal}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-500/20 transition-all hover:bg-indigo-500 active:scale-95 dark:bg-indigo-500 dark:hover:bg-indigo-400"
          >
            <Plus className="h-4 w-4" />
            Atur Anggaran
          </button>
        </div>
      ) : filteredBudgets.length === 0 ? (
        /* Status Kosong (Empty State): Anggaran ada namun tidak ditemukan pada filter status yang aktif */
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 px-6 py-16 text-center dark:border-slate-800/50">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 dark:bg-slate-800/50">
            <AlertCircle className="h-8 w-8 text-slate-600" />
          </div>
          <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300">Tidak ada anggaran</h3>
          <p className="mt-1.5 max-w-sm text-sm text-slate-600 dark:text-slate-400">Tidak ada anggaran yang sesuai dengan filter ini.</p>
          <button
            onClick={() => setStatusFilter('ALL')}
            className="mt-6 inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50 active:scale-95 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            Reset Filter
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredBudgets.map((b) => (
            <BudgetCard
              key={b.clientId}
              budget={b}
              onEdit={openEditModal}
              onDelete={(clientId) => setDeleteConfirmId(clientId)}
              onReallocate={openReallocateModal}
            />
          ))}
        </div>
      )}

      <BudgetModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        editingBudget={editingBudget}
        currentPeriod={currentPeriod}
        existingBudgetCategoryIds={budgets.map((b) => b.categoryId)}
      />

      {isReallocateModalOpen && (
        <ReallocateModal
          budgets={budgetsWithStats.map((b) => ({ ...b, spent: b.spentAmount }))}
          preselectedSourceId={reallocateSourceId}
          preselectedDestinationId={reallocateDestinationId}
          preselectedAmount={reallocateAmount}
          onConfirm={handleConfirmReallocate}
          onClose={() => setIsReallocateModalOpen(false)}
        />
      )}

      <DeleteConfirmDialog
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={() => {
          if (deleteConfirmId) handleDelete(deleteConfirmId);
        }}
        isDeleting={isDeleting}
        title="Hapus Anggaran?"
        body="Batas pengeluaran kategori ini akan dihapus untuk periode berjalan."
      />

      <FilterBottomSheet
        isOpen={showStatusSheet}
        onClose={() => setShowStatusSheet(false)}
        title="Pilih Status Anggaran"
        desktopModal={false}
        value={statusFilter}
        onChange={(val) => {
          setStatusFilter(val as StatusFilter);
          setShowStatusSheet(false);
        }}
        options={statusOptions}
      />
    </div>
  );
}
