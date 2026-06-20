'use client';

/********** Imports **********/
import { useState, useMemo, useEffect } from 'react';
import { useCategories } from '@/hooks/use-categories';
import { useSyncContext } from '@/providers/SyncProvider';
import { Budget } from '@/types/models.types';
import { formatCurrency, formatCurrencyCompact } from '@/lib/utils/helpers';
import { showSyncToast, showDeleteToast } from '@/lib/utils/show-toast';
import { useBudgets } from '@/hooks/use-budgets';
import { useBudgetActions } from '@/hooks/use-budget-actions';

import { getCategoryIcon } from '@/lib/utils/icons';
import { DynamicIcon } from '@/components/ui/DynamicIcon';
import {
  Wallet,
  Plus,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  ChevronDown,
  Trash2,
  ArrowDownRight,
  CheckCircle2,
  ArrowRightLeft,
  Info,
} from 'lucide-react';
import { BudgetModal } from '@/components/budgets/BudgetModal';
import { ReallocateModal } from '@/components/budgets/ReallocateModal';
import { CompactSummaryRow } from '@/components/ui/CompactSummaryRow';
import { EntityActionMenu } from '@/components/ui/EntityActionMenu';
import { DeleteConfirmDialog } from '@/components/ui/DeleteConfirmDialog';
import { FilterBottomSheet } from '@/components/ui/FilterBottomSheet';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Tooltip } from '@/components/ui/Tooltip';
import { useSearchParams } from 'next/navigation';

/********** Page Component **********/
export default function BudgetsPage() {
  /********** Month Selector State. */
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  const { user, budgets, budgetsWithStats, transactions, isLoading, reload } = useBudgets(selectedMonth);
  const { handleReallocate, removeBudget } = useBudgetActions();

  const { allCategories } = useCategories();
  const { scheduleSync } = useSyncContext();

  /********** Derived State **********/
  const currentPeriod = useMemo(() => {
    return `${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, '0')}`;
  }, [selectedMonth]);

  const currentMonthName = useMemo(() => {
    return selectedMonth.toLocaleDateString('id-ID', {
      month: 'long',
      year: 'numeric',
    });
  }, [selectedMonth]);

  /********** Types **********/
  type StatusFilter = 'ALL' | 'SAFE' | 'WARNING' | 'DANGER';

  /********** State **********/
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [showStatusSheet, setShowStatusSheet] = useState(false);

  const statusOptions = useMemo(
    () => [
      { value: 'ALL', label: 'Semua Status' },
      { value: 'SAFE', label: 'Aman' },
      { value: 'WARNING', label: 'Mendekati Batas' },
      { value: 'DANGER', label: 'Melebihi Batas' },
    ],
    [],
  );

  /********** Modal State. */
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);

  /********** Reallocate Modal State. */
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

  /********** Effects **********/

  /********** [START: Parse Reallocation Query Params] **********/
  /********** Parses query params to potentially open the reallocation modal with prefilled data. */
  useEffect(() => {
    if (!hasProcessedUrlParams && budgets.length > 0 && actionParam === 'reallocate' && sourceBudgetIdParam && targetBudgetIdParam) {
      const sourceBudget = budgets.find((b) => b.clientId === sourceBudgetIdParam);
      const targetBudget = budgets.find((b) => b.clientId === targetBudgetIdParam);

      // Validation 1: Both budgets exist and are different
      if (!sourceBudget || !targetBudget || sourceBudget.clientId === targetBudget.clientId) {
        showSyncToast('Rekomendasi subsidi silang tidak valid atau kedaluwarsa.');
        setHasProcessedUrlParams(true);
        return;
      }

      const amount = amountParam ? Number(amountParam) : 0;

      // Validation 2: Amount is positive
      if (amount <= 0) {
        showSyncToast('Jumlah subsidi silang tidak valid.');
        setHasProcessedUrlParams(true);
        return;
      }

      // Validation 3: Source has enough remaining safe balance
      const sourceSpent = transactions.reduce((acc, txn) => {
        if (txn.categoryId === sourceBudget.categoryId && txn.date.startsWith(currentPeriod)) {
          return acc + Math.abs(txn.amount);
        }
        return acc;
      }, 0);

      const sourceRemaining = Number(sourceBudget.amount) - sourceSpent;
      const minimumSafeRemaining = Number(sourceBudget.amount) * 0.2; // Example threshold

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
  /********** [END: Parse Reallocation Query Params] **********/

  /********** State **********/
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  /********** Event Handlers **********/

  // Load data and handle event listeners are now managed by useBudgets hook.

  /********** Event Handlers **********/
  const handlePrevMonth = () => {
    setSelectedMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setSelectedMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const openCreateModal = () => {
    setEditingBudget(null);
    setIsModalOpen(true);
  };

  const openEditModal = (budget: Budget) => {
    setEditingBudget(budget);
    setIsModalOpen(true);
  };

  const openReallocateModal = (sourceClientId: string) => {
    setReallocateSourceId(sourceClientId);
    setReallocateDestinationId(null);
    setReallocateAmount(null);
    setIsReallocateModalOpen(true);
  };

  const handleConfirmReallocate = async (sourceClientId: string, destinationClientId: string, amount: number) => {
    if (!user) return;
    try {
      await handleReallocate(
        sourceClientId,
        destinationClientId,
        amount,
      );
      scheduleSync();
      await reload();
      showSyncToast('Subsidi silang berhasil diterapkan');
    } catch (err) {
      console.error('Gagal melakukan subsidi silang', err);
      showSyncToast('Gagal melakukan subsidi silang. Silakan coba lagi.');
    }
  };

  async function handleDelete(clientId: string) {
    if (!user) return;
    setIsDeleting(true);
    try {
      await removeBudget(clientId);
      scheduleSync();
      await reload();
      setDeleteConfirmId(null);
      showDeleteToast('Anggaran dihapus');
    } catch (err) {
      console.error('Gagal menghapus anggaran', err);
      showSyncToast('Gagal menghapus. Silakan coba lagi.');
    } finally {
      setIsDeleting(false);
    }
  }

  const filteredBudgets = useMemo(() => {
    if (statusFilter === 'ALL') return budgetsWithStats;
    return budgetsWithStats.filter((b) => b.status === statusFilter);
  }, [budgetsWithStats, statusFilter]);

  const totalBudget = budgetsWithStats.reduce((acc, b) => acc + Number(b.amount), 0);
  const totalSpent = budgetsWithStats.reduce((acc, b) => acc + b.spentAmount, 0);
  const remainingBudget = Math.max(0, totalBudget - totalSpent);

  /********** Rendering **********/
  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-24">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Anggaran</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Atur batas pengeluaran untuk {currentMonthName}</p>
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
        {/* Month Selector */}
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <button
            onClick={handlePrevMonth}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            aria-label="Bulan sebelumnya"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="w-36 text-center text-sm font-semibold text-slate-700 dark:text-slate-200">{currentMonthName}</span>
          <button
            onClick={handleNextMonth}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            aria-label="Bulan berikutnya"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Status Filter - Desktop */}
        <div className="hidden md:block flex-1 sm:flex-none w-full sm:w-auto min-w-0 overflow-hidden">
          <SegmentedControl options={statusOptions} value={statusFilter} onChange={(v) => setStatusFilter(v as StatusFilter)} fullWidth />
        </div>

        {/* Status Filter - Mobile */}
        <div className="block md:hidden w-full">
          <button
            onClick={() => setShowStatusSheet(true)}
            aria-label="Buka filter status anggaran"
            className="flex h-[48px] w-full items-center justify-between rounded-2xl bg-white/60 px-4 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur-xl ring-1 ring-inset ring-slate-200/60 transition-all hover:bg-white active:scale-95 dark:bg-slate-900/60 dark:text-slate-200 dark:ring-slate-800/60 dark:hover:bg-slate-800"
          >
            <span className="text-slate-500 dark:text-slate-400">Status Anggaran</span>
            <div className="flex items-center gap-2">
              <span className="truncate max-w-[120px]">{statusOptions.find((o) => o.value === statusFilter)?.label}</span>
              <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
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
        /* Empty State: No budgets at all in selected month */
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 px-6 py-16 text-center dark:border-slate-800/50">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 dark:bg-slate-800/50">
            <Wallet className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300">Belum ada anggaran</h3>
          <p className="mt-1.5 max-w-sm text-sm text-slate-500 dark:text-slate-400">
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
        /* Empty State: Budgets exist but filtered out */
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 px-6 py-16 text-center dark:border-slate-800/50">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 dark:bg-slate-800/50">
            <AlertCircle className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300">Tidak ada anggaran</h3>
          <p className="mt-1.5 max-w-sm text-sm text-slate-500 dark:text-slate-400">Tidak ada anggaran yang sesuai dengan filter ini.</p>
          <button
            onClick={() => setStatusFilter('ALL')}
            className="mt-6 inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50 active:scale-95 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            Reset Filter
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredBudgets.map((b) => {
            const clampedPercentage = Math.min(100, b.percentage);

            // Semantic Colors
            let progressColor = 'bg-emerald-500';
            let statusText = 'Aman';
            let statusTextColor = 'text-emerald-600 dark:text-emerald-400';

            if (b.status === 'WARNING') {
              progressColor = 'bg-amber-500';
              statusText = 'Mendekati Batas';
              statusTextColor = 'text-amber-600 dark:text-amber-400';
            } else if (b.status === 'DANGER') {
              progressColor = 'bg-rose-500';
              statusText = 'Melebihi Batas';
              statusTextColor = 'text-rose-600 dark:text-rose-400';
            }

            return (
              <div
                key={b.clientId}
                className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
              >
                {/* Mobile touch target for opening action menu */}
                <div
                  className="absolute inset-0 z-0 sm:hidden"
                  onClick={(e) => {
                    const btn = e.currentTarget.parentElement?.querySelector('[aria-label="Buka menu aksi"]') as HTMLButtonElement;
                    if (btn) btn.click();
                  }}
                />

                <div className="relative z-10 flex flex-col p-4 sm:p-5 outline-none pointer-events-none sm:pointer-events-auto">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                      {/* Icon */}
                      <div
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                        style={{
                          backgroundColor: b.category?.color ? `${b.category.color}20` : 'rgb(241 245 249)',
                        }}
                      >
                        {(() => {
                          const iconName = b.category?.icon;
                          return iconName ? (
                            <DynamicIcon iconName={iconName} color={b.category?.color} className="h-5 w-5" />
                          ) : (
                            getCategoryIcon(b.category?.name || 'Budget', 'h-5 w-5', b.category?.color)
                          );
                        })()}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-base font-semibold text-slate-900 dark:text-slate-50">
                          {b.category?.name || 'Kategori tidak diketahui'}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Batas Bulanan</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            b.status === 'DANGER'
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                              : b.status === 'WARNING'
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          }`}
                        >
                          {statusText}
                        </span>
                      </div>

                      <div className="pointer-events-auto flex md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100 transition-opacity">
                        <EntityActionMenu
                          title={b.category?.name || 'Anggaran'}
                          subtitle={`Batas: ${formatCurrency(Number(b.amount))}`}
                          onEdit={() => openEditModal(b)}
                          onDelete={() => setDeleteConfirmId(b.clientId!)}
                          extraActions={
                            Number(b.amount) - b.spentAmount > 0
                              ? [
                                  {
                                    label: 'Subsidi Silang',
                                    icon: <ArrowRightLeft />,
                                    onClick: () => openReallocateModal(b.clientId!),
                                  },
                                ]
                              : undefined
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {/* Metriks */}
                  <div className="mt-4 flex items-end justify-between">
                    <div className="flex items-baseline gap-1.5 text-sm">
                      <span className="font-bold text-slate-800 dark:text-slate-100 text-base">{formatCurrency(b.spentAmount)}</span>
                      <span className="text-slate-500 dark:text-slate-400">dari</span>
                      <span className="font-medium text-slate-500 dark:text-slate-400">{formatCurrency(Number(b.amount))}</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ease-out ${progressColor}`}
                      style={{ width: `${clampedPercentage}%` }}
                    />
                  </div>

                  {/* Ritme Pengeluaran */}
                  <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800/60">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        Ritme Pengeluaran
                        <Tooltip content="Kalkulasi Ideal: (Batas Bulanan ÷ Total Hari Bulan Ini) × Hari Berjalan. Semua transaksi sejak awal bulan diakumulasikan.">
                          <Info className="h-3.5 w-3.5 text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-300" />
                        </Tooltip>
                      </span>
                      <span
                        className={`font-semibold ${
                          b.spentAmount === 0
                            ? 'text-slate-500 dark:text-slate-400'
                            : b.rhythm.status === 'OVER_BUDGET'
                              ? 'text-rose-600 dark:text-rose-400'
                              : b.rhythm.status === 'OFF_TRACK'
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {b.spentAmount === 0
                          ? 'Belum ada pengeluaran'
                          : b.rhythm.status === 'OVER_BUDGET'
                            ? 'Melebihi anggaran'
                            : b.rhythm.status === 'OFF_TRACK'
                              ? 'Lebih cepat dari rencana'
                              : 'Sesuai ritme'}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-xs">
                      <span className="text-slate-500 dark:text-slate-400">Batas harian:</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {formatCurrency(b.rhythm.dailyAllowance)}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-xs">
                      <span className="text-slate-500 dark:text-slate-400">Total ideal saat ini:</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {formatCurrency(b.rhythm.idealUsageUntilToday)}
                      </span>
                    </div>
                    {(b.rhythm.status === 'OFF_TRACK' || (b.rhythm.projectedMonthlyUsage > Number(b.amount) && b.percentage < 100)) && (
                      <div className="mt-1 flex items-center justify-between text-xs">
                        <span className="text-slate-500 dark:text-slate-400">Proyeksi akhir bulan:</span>
                        <span className="font-medium text-amber-600 dark:text-amber-400">
                          {formatCurrency(b.rhythm.projectedMonthlyUsage)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <BudgetModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        editingBudget={editingBudget} 
        currentPeriod={currentPeriod} 
        existingBudgetCategoryIds={budgets.map(b => b.categoryId)}
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
