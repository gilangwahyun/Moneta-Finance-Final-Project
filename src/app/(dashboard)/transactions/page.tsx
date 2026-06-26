'use client';

/********** Imports **********/

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';

import { useTransactions } from '@/hooks/use-transactions';
import { useCategories } from '@/hooks/use-categories';
import { useSyncContext } from '@/providers/SyncProvider';
import { Transaction } from '@/types/models.types';
import { formatCurrency } from '@/lib/utils/helpers';
import { TransactionListSkeleton } from '@/components/Skeletons';
import { TransactionItem } from '@/components/transactions/TransactionItem';
import { useTransactionForm } from '@/providers/TransactionFormProvider';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { DeleteConfirmDialog } from '@/components/ui/DeleteConfirmDialog';
import { FilterBottomSheet } from '@/components/ui/FilterBottomSheet';
import { useTimeFilter } from '@/providers/TimeFilterProvider';
import { Inbox, Plus, X, ChevronDown, Check, CalendarDays, Search } from 'lucide-react';
import dayjs from 'dayjs';

/**
 * Returns today's date in YYYY-MM-DD format.
 */
function todayString(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Groups transactions by their date string.
 */
function groupByDate(txns: Transaction[]): { date: string; items: Transaction[] }[] {
  const map = new Map<string, Transaction[]>();
  for (const t of txns) {
    const dateKey = (t.date || '').substring(0, 10);
    const key = /^\d{4}-\d{2}-\d{2}$/.test(dateKey) ? dateKey : 'unknown';
    const list = map.get(key) ?? [];
    list.push(t);
    map.set(key, list);
  }
  return Array.from(map.entries())
    .sort((a, b) => {
      if (a[0] === 'unknown') return 1;
      if (b[0] === 'unknown') return -1;
      return b[0].localeCompare(a[0]);
    })
    .map(([date, items]) => ({ date, items }));
}

/**
 * Returns a human-readable natural language label for a date string.
 */
function dateLabel(dateStr: string): string {
  if (dateStr === 'unknown') return 'Tanggal Tidak Diketahui';
  const today = todayString();
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  if (dateStr === today) return 'Hari ini';
  if (dateStr === yesterday) return 'Kemarin';
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return 'Tanggal Tidak Diketahui';
  return d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' });
}

/********** Page Component **********/
export default function TransactionsPage() {
  /********** State **********/
  const { transactions, isLoading, error, removeTransaction } = useTransactions();
  const { allCategories } = useCategories();
  const { pendingCount } = useSyncContext();

  const { openForm, editTransaction: openEditForm } = useTransactionForm();

  /********** Delete confirmation state. */
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  /********** Filter and search state. */
  const { activeRange, setRange, rangeKey } = useTimeFilter();
  const [filterType, setFilterType] = useState<'ALL' | 'EXPENSE' | 'INCOME'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder] = useState<'desc' | 'asc'>('desc');

  /********** Generic UI state. */
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [showCustomDate, setShowCustomDate] = useState(false);
  const [customStart, setCustomStart] = useState(dayjs().startOf('month').format('YYYY-MM-DD'));
  const [customEnd, setCustomEnd] = useState(dayjs().format('YYYY-MM-DD'));

  const [displayCount, setDisplayCount] = useState(30);

  /********** Effects **********/

  /********** Reset pagination when filters change. */
  useEffect(() => {
    setDisplayCount(30);
  }, [filterType, searchQuery, activeRange, sortOrder]);

  const timeLabels: Record<string, string> = {
    today: 'Hari Ini',
    '7d': '7 Hari Terakhir',
    month: 'Bulan Ini',
    '3month': '3 Bulan Terakhir',
    year: 'Tahun Ini',
    all: 'Semua Waktu',
  };
  const activeTimeLabel = rangeKey === 'custom' ? 'Pilih tanggal' : timeLabels[rangeKey] || 'Semua Waktu';

  /********** Derived State **********/

  /********** Computes the filtered array of transactions based on type, date range, and search query. */
  const filtered = useMemo(() => {
    let result = transactions.filter((t) => {
      if (filterType !== 'ALL' && t.type !== filterType) return false;

      const txnDate = (t.date || '').substring(0, 10);
      if (activeRange.start && txnDate < activeRange.start) return false;
      if (activeRange.end && txnDate > activeRange.end) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const cat = allCategories.find((c) => c.clientId === t.categoryId || c.id === t.categoryId);
        const name = t.description || cat?.name || 'Transaksi';
        const note = t.note || '';
        if (!name.toLowerCase().includes(q) && !note.toLowerCase().includes(q)) return false;
      }
      return true;
    });

    if (sortOrder === 'asc') {
      result.reverse();
    }
    return result;
  }, [transactions, filterType, activeRange, searchQuery, sortOrder, allCategories]);

  /********** Computes grouped transactions with pagination applied. */
  const paginated = useMemo(() => filtered.slice(0, displayCount), [filtered, displayCount]);
  const grouped = useMemo(() => groupByDate(paginated), [paginated]);

  /********** Computes sum of income and expense for the filtered list. */
  const footerTotals = useMemo(() => {
    let income = 0,
      expense = 0;
    for (const t of filtered) {
      if (t.type === 'INCOME') income += Number(t.amount);
      else if (t.type === 'EXPENSE') expense += Number(t.amount);
    }
    return { income, expense };
  }, [filtered]);

  /********** Dynamic readable subtitle describing the active filters. */
  const subtitle = useMemo(() => {
    let typeLabel = filterType === 'EXPENSE' ? 'pengeluaran' : filterType === 'INCOME' ? 'pemasukan' : 'transaksi';
    let timeLabel = rangeKey === 'custom' ? 'Rentang kustom' : timeLabels[rangeKey] || 'Semua waktu';
    return `${timeLabel} • ${filtered.length} ${typeLabel}`;
  }, [filterType, rangeKey, filtered.length, timeLabels]);

  /********** Event Handlers **********/

  /**
   * Confirms and performs the deletion of a transaction.
   */
  async function confirmDelete() {
    if (!deleteConfirmId) return;
    setIsDeleting(true);
    try {
      await removeTransaction(deleteConfirmId);
      setDeleteConfirmId(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  }

  if (isLoading) return <TransactionListSkeleton />;

  /********** Empty state logic evaluation. */
  const isTotalEmpty = transactions.length === 0;
  const isPeriodEmpty =
    !isTotalEmpty &&
    transactions.filter((t) => {
      const txnDate = (t.date || '').substring(0, 10);
      return (!activeRange.start || txnDate >= activeRange.start) && (!activeRange.end || txnDate <= activeRange.end);
    }).length === 0;

  /********** Rendering **********/
  return (
    <div className="space-y-5 md:space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Transaksi</h1>
          <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">{subtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => openForm()}
            className="hidden md:inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 min-h-[44px] text-sm font-semibold text-white shadow-md shadow-indigo-500/20 transition-all hover:bg-indigo-500 active:scale-95 dark:bg-indigo-500 dark:hover:bg-indigo-400"
          >
            <Plus className="h-4 w-4" /> Tambah Transaksi
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
        {/* Search */}
        <div className="flex h-[48px] flex-1 items-center rounded-2xl bg-white/60 px-4 shadow-sm backdrop-blur-xl ring-1 ring-inset ring-slate-200/60 focus-within:ring-2 focus-within:ring-indigo-500/50 dark:bg-slate-900/60 dark:ring-slate-800/60">
          <Search className="h-4 w-4 shrink-0 text-slate-600" />
          <input
            type="text"
            placeholder="Cari transaksi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="ml-2.5 w-full border-none bg-transparent p-0 text-sm font-semibold text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-0 dark:text-slate-200"
          />
        </div>

        {/* Filters Group */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex-1 sm:flex-none w-full sm:w-auto min-w-0">
            <SegmentedControl
              options={[
                { value: 'ALL', label: 'Semua' },
                { value: 'EXPENSE', label: 'Pengeluaran' },
                { value: 'INCOME', label: 'Pemasukan' },
              ]}
              value={filterType}
              onChange={(v) => setFilterType(v as 'ALL' | 'EXPENSE' | 'INCOME')}
              fullWidth
            />
          </div>
          <button
            onClick={() => setShowFilterSheet(true)}
            className="flex h-[48px] w-full shrink-0 items-center justify-between gap-2 rounded-2xl bg-white/60 px-4 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur-xl ring-1 ring-inset ring-slate-200/60 transition-all hover:bg-white active:scale-95 dark:bg-slate-900/60 dark:text-slate-200 dark:ring-slate-800/60 dark:hover:bg-slate-800 sm:w-auto"
          >
            <span className="truncate">{activeTimeLabel}</span>
            <ChevronDown className="h-3.5 w-3.5 text-slate-600" />
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 px-6 py-16 text-center dark:border-slate-800">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 dark:bg-slate-800/50">
            <Inbox className="h-7 w-7 text-slate-600" />
          </div>
          {isTotalEmpty ? (
            <>
              <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300">Belum ada transaksi</h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Transaksi untuk periode ini belum tersedia.</p>
              <button
                onClick={() => openForm()}
                className="mt-5 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-500/20 transition-all hover:bg-indigo-500 active:scale-95 dark:bg-indigo-500 dark:hover:bg-indigo-400"
              >
                Tambah Transaksi
              </button>
            </>
          ) : isPeriodEmpty ? (
            <>
              <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300">Tidak ada transaksi</h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Tidak ada transaksi untuk periode ini.</p>
              <button
                onClick={() => setRange('month')}
                className="mt-5 rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 active:scale-95 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                Bulan Ini
              </button>
            </>
          ) : (
            <>
              <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300">Tidak ada hasil</h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Tidak ada transaksi yang sesuai dengan pencarian atau filter.
              </p>
              <button
                onClick={() => {
                  setFilterType('ALL');
                  setSearchQuery('');
                  setRange('all');
                }}
                className="mt-5 rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 active:scale-95 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                Reset Filter
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(({ date, items }) => (
            <div key={date}>
              <div className="mb-2">
                <p className="text-[13px] font-semibold text-slate-600 dark:text-slate-400">{dateLabel(date)}</p>
              </div>
              <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm dark:divide-slate-800/60 dark:border-slate-800 dark:bg-slate-900">
                {items.map((txn) => {
                  const cat = allCategories.find((c) => c.clientId === txn.categoryId || c.id === txn.categoryId);
                  return (
                    <TransactionItem
                      key={txn.clientId}
                      transaction={txn}
                      categoryName={cat?.name}
                      categoryColor={cat?.color ?? null}
                      categoryIcon={cat?.icon ?? null}
                      onEdit={(txn) => openEditForm(txn)}
                      onDelete={(txn) => setDeleteConfirmId(txn.clientId)}
                    />
                  );
                })}
              </div>
            </div>
          ))}

          {filtered.length > displayCount && (
            <div className="pt-2 pb-6">
              <button
                onClick={() => setDisplayCount((prev) => prev + 30)}
                className="w-full rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 active:scale-[0.98] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Muat Lebih Banyak
              </button>
            </div>
          )}
        </div>
      )}

      <FilterBottomSheet
        isOpen={showFilterSheet}
        onClose={() => setShowFilterSheet(false)}
        title="Pilih Rentang Waktu"
        desktopModal={true}
        value={rangeKey}
        onChange={(val) => {
          setRange(val as any);
          setShowFilterSheet(false);
        }}
        options={[
          { value: 'all', label: 'Semua Waktu' },
          { value: 'today', label: 'Hari Ini' },
          { value: '7d', label: '7 Hari Terakhir' },
          { value: 'month', label: 'Bulan Ini' },
        ]}
      >
        <button
          onClick={() => setShowCustomDate(!showCustomDate)}
          aria-pressed={rangeKey === 'custom' || showCustomDate}
          className={`flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
            rangeKey === 'custom' || showCustomDate
              ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
              : 'bg-slate-50 text-slate-700 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
          }`}
        >
          Pilih Tanggal...
          <CalendarDays className={`h-4 w-4 transition-transform ${showCustomDate ? 'text-indigo-500' : 'text-slate-600'}`} />
        </button>
        {showCustomDate && (
          <div className="mt-2 flex flex-col gap-3 rounded-xl border border-slate-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="mb-1 block text-xs font-semibold text-slate-600">Dari</label>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                />
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-xs font-semibold text-slate-600">Sampai</label>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                />
              </div>
            </div>
            <button
              onClick={() => {
                setRange('custom', { start: customStart, end: customEnd });
                setShowFilterSheet(false);
              }}
              className="mt-1 w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-500/20 transition-all hover:bg-indigo-500 active:scale-95 dark:bg-indigo-500 dark:hover:bg-indigo-400"
            >
              Terapkan
            </button>
          </div>
        )}
      </FilterBottomSheet>

      <DeleteConfirmDialog
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={confirmDelete}
        isDeleting={isDeleting}
        title="Hapus Transaksi?"
        body="Transaksi akan dihapus dari daftar dan perubahan saldo akan diperbarui."
      />

      {filtered.length > 0 && (
        <div className="rounded-xl border border-slate-100 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900 mt-6">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-400">
            <p>
              <span className="font-semibold text-slate-700 dark:text-slate-300">{filtered.length}</span> transaksi
              <span className="mx-1.5 text-slate-300 dark:text-slate-600" aria-hidden="true">
                |
              </span>
              <span className="text-emerald-600 dark:text-emerald-400">+{formatCurrency(footerTotals.income)}</span>
              <span className="mx-1.5 text-slate-300 dark:text-slate-600" aria-hidden="true">
                |
              </span>
              <span className="text-rose-600 dark:text-rose-400">-{formatCurrency(footerTotals.expense)}</span>
            </p>
            {pendingCount > 0 && <p className="text-amber-500">{pendingCount} perubahan tertunda</p>}
          </div>
        </div>
      )}
    </div>
  );
}
