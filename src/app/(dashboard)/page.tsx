'use client';

/*
 * File: src/app/(dashboard)/page.tsx
 * Description: Komponen halaman utama (Beranda/Dashboard) Moneta yang menampilkan ringkasan keuangan, peringatan nudging digital, kondisi anggaran, saldo dompet, dan transaksi terbaru.
 *
 * Tujuan Penelitian:
 *   Menerapkan serangkaian Digital Nudge berbasis UCD untuk melawan
 *   "false sense of financial security" yang ditimbulkan oleh paparan
 *   saldo global yang besar dan tidak kontekstual.
 *
 * Urutan Kognitif yang Disengaja (Order Effect):
 *   1. Greeting + Sync status
 *   2. Burn Rate Warning Nudge (jika berlaku)
 *   3. Budget Health Bar (kondisi anggaran global)      <- pengguna melihat ini DULU
 *   4. HiddenBalanceWidget (saldo tersembunyi)          <- baru bisa reveal setelah lihat kondisi
 *   5. Compact Stat Row (Pemasukan / Pengeluaran)
 *   6. UrgentBudgetProgressBar per kategori (top 4 paling kritis)
 *   7. WalletWidget (rincian per dompet)
 *   8. 5 Transaksi Terbaru
 *
 * Arsitektur:
 *   - Offline-first: semua data dipuat dari IndexedDB.
 *   - Budget reload reaktif: subscribe ke 'moneta-transaction-updated' agar subsidi silang dan transaksi baru langsung terrefleksikan.
 *   - Toggle saldo: useState lokal, TIDAK di-persist ke localStorage. Direset ke hidden setiap sesi untuk menjaga konsistensi nudge.
 */

/********** Impor Modul & Dependensi **********/

import { useTransactions } from '@/hooks/use-transactions';
import { useCategories } from '@/hooks/use-categories';
import { useWallets } from '@/hooks/use-wallets';
import { useDashboard } from '@/hooks/use-dashboard';

import { formatCurrency } from '@/lib/utils/helpers';
import { useState, useMemo } from 'react';
import { BudgetHealthBar } from '@/components/budgets/BudgetHealthBar';
import { ArrowDownRight, ArrowUpRight, LayoutList, Sparkles, Compass, CheckCircle2, Info } from 'lucide-react';
import { TransactionItem } from '@/components/transactions/TransactionItem';
import { WalletWidget } from '@/components/wallets/WalletWidget';
import { HiddenBalanceWidget } from '@/components/wallets/HiddenBalanceWidget';
import { UrgentBudgetProgressBar } from '@/components/budgets/UrgentBudgetProgressBar';

/********** Komponen Halaman Utama (DashboardPage) **********/

/**
 * Komponen utama halaman beranda yang merender ringkasan analitik keuangan pengguna,
 * peringatan anggaran kritis, serta status saldo dan daftar transaksi terbaru.
 *
 * @returns Elemen tata letak dashboard utama Moneta
 */
export default function DashboardPage() {
  /********** [START: Inisialisasi State & Pengambilan Data] **********/
  const { transactions, monthlyTotals, isLoading: txnLoading } = useTransactions();

  const { wallets, transactions: walletTxns, isLoading: walletsLoading, totalBalance } = useWallets();

  const { allCategories, isLoading: catLoading } = useCategories();

  const {
    username,
    budgetProgress,
    totalBudget,
    totalSpent,
    dashboardInsight,
    isLoading: dashLoading,
  } = useDashboard({ transactions, allCategories });

  /* Modul 1: Status sembunyikan saldo (false = tersembunyi secara default).
   * Tidak disimpan di localStorage agar direset setiap sesi demi menjaga konsistensi efek nudging. */
  const [isBalanceVisible, setIsBalanceVisible] = useState(false);

  const isLoading = txnLoading || catLoading || dashLoading;

  /* Format label bulan dan tahun saat ini untuk ditampilkan di header */
  const monthLabel = useMemo(() => {
    return new Date().toLocaleDateString('id-ID', {
      month: 'long',
      year: 'numeric',
    });
  }, []);
  /********** [END: Inisialisasi State & Pengambilan Data] **********/

  /********** Komponen Pembantu (Render Helpers) **********/

  /** Komponen kerangka muat (skeleton) sebaris untuk tampilan dashboard. */
  const Skeleton = ({ className }: { className: string }) => (
    <div className={`animate-pulse rounded bg-slate-200 dark:bg-slate-700 ${className}`} />
  );

  /********** Pengembalian Tata Letak Halaman (JSX) **********/
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          {isLoading ? (
            <Skeleton className="h-7 w-48" />
          ) : (
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-50 sm:text-2xl">
              {username ? `Hai, ${username}!` : 'Beranda'}
            </h1>
          )}
          <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">{monthLabel}</p>
        </div>
      </div>

      {!isLoading && dashboardInsight && (
        <div
          className={`flex items-start gap-3 rounded-xl border p-4 shadow-sm transition-all
            ${dashboardInsight.type === 'critical' ? 'border-indigo-200 bg-indigo-50/70 dark:border-indigo-800/60 dark:bg-indigo-950/20' : ''}
            ${dashboardInsight.type === 'warning' ? 'border-slate-200 bg-slate-50/90 dark:border-slate-800/60 dark:bg-slate-900/60' : ''}
            ${dashboardInsight.type === 'positive' ? 'border-emerald-200 bg-emerald-50/80 dark:border-emerald-800/60 dark:bg-emerald-950/20' : ''}
            ${dashboardInsight.type === 'info' ? 'border-sky-200 bg-sky-50/80 dark:border-sky-800/60 dark:bg-sky-950/20' : ''}
          `}
        >
          {dashboardInsight.type === 'critical' && (
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600 dark:text-indigo-400" />
          )}
          {dashboardInsight.type === 'warning' && (
            <Compass className="mt-0.5 h-5 w-5 shrink-0 text-slate-600 dark:text-slate-400" />
          )}
          {dashboardInsight.type === 'positive' && (
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          )}
          {dashboardInsight.type === 'info' && (
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-sky-600 dark:text-sky-400" />
          )}

          <div className="flex-1 min-w-0">
            <p
              className={`text-sm font-bold
              ${dashboardInsight.type === 'critical' ? 'text-indigo-950 dark:text-indigo-200' : ''}
              ${dashboardInsight.type === 'warning' ? 'text-slate-900 dark:text-slate-100' : ''}
              ${dashboardInsight.type === 'positive' ? 'text-emerald-950 dark:text-emerald-200' : ''}
              ${dashboardInsight.type === 'info' ? 'text-sky-950 dark:text-sky-200' : ''}
            `}
            >
              {dashboardInsight.title}
            </p>
            <p
              className={`mt-1 text-sm leading-relaxed
              ${dashboardInsight.type === 'critical' ? 'text-indigo-900/80 dark:text-indigo-300/80' : ''}
              ${dashboardInsight.type === 'warning' ? 'text-slate-600 dark:text-slate-300' : ''}
              ${dashboardInsight.type === 'positive' ? 'text-emerald-900/80 dark:text-emerald-300/80' : ''}
              ${dashboardInsight.type === 'info' ? 'text-sky-900/80 dark:text-sky-300/80' : ''}
            `}
            >
              {dashboardInsight.message}
            </p>
            {dashboardInsight.action && (
              <a
                href={dashboardInsight.action.route}
                className={`mt-3 inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold text-white shadow-sm transition-all active:scale-95
                  ${dashboardInsight.type === 'critical' ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/20' : ''}
                  ${dashboardInsight.type === 'warning' ? 'bg-slate-800 hover:bg-slate-700 shadow-slate-500/20 dark:bg-slate-700 dark:hover:bg-slate-600' : ''}
                  ${dashboardInsight.type === 'positive' ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20' : ''}
                  ${dashboardInsight.type === 'info' ? 'bg-sky-600 hover:bg-sky-500 shadow-sky-500/20' : ''}
                `}
              >
                {dashboardInsight.action.label}
              </a>
            )}
          </div>
        </div>
      )}

      {isLoading ? (
        <Skeleton className="h-[116px] w-full rounded-xl" />
      ) : (
        <BudgetHealthBar totalSpent={totalSpent} totalBudget={totalBudget} />
      )}

      <HiddenBalanceWidget
        totalBalance={totalBalance}
        isVisible={isBalanceVisible}
        onToggle={() => setIsBalanceVisible((v) => !v)}
        isLoading={walletsLoading}
      />

      <div className="grid grid-cols-2 gap-3">
        {[
          {
            label: 'Pemasukan',
            value: monthlyTotals.totalIncome,
            amountColor: 'text-emerald-600 dark:text-emerald-400',
            iconColor: 'text-emerald-600 dark:text-emerald-400',
            prefix: '+',
            Icon: ArrowUpRight,
            subtext: monthlyTotals.totalIncome === 0 ? 'Belum ada pemasukan tercatat bulan ini.' : null,
          },
          {
            label: 'Pengeluaran',
            value: monthlyTotals.totalExpense,
            amountColor: 'text-rose-600 dark:text-rose-400',
            iconColor: 'text-rose-600 dark:text-rose-400',
            prefix: '-',
            Icon: ArrowDownRight,
            subtext: null,
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="group relative overflow-hidden rounded-xl border border-slate-100 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
          >
            <div
              aria-hidden="true"
              className={`absolute -right-4 -top-4 opacity-[0.08] transition-transform duration-300 group-hover:scale-110 dark:opacity-[0.12] ${stat.iconColor}`}
            >
              <stat.Icon className="h-20 w-20" />
            </div>
            <div className="relative z-10">
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400">{stat.label}</p>
              <div className="min-h-[52px] pt-1">
                {isLoading ? (
                  <Skeleton className="mt-0.5 h-6 w-20" />
                ) : (
                  <>
                    <p className={`text-base font-bold sm:text-lg ${stat.amountColor}`}>
                      {stat.prefix}
                      {formatCurrency(stat.value)}
                    </p>
                    {stat.subtext && <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{stat.subtext}</p>}
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800/60 dark:bg-slate-900">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="h-7 w-7 rounded-lg" />
              <Skeleton className="h-5 w-32" />
            </div>
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="space-y-5">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
            ))}
          </div>
        </div>
      ) : budgetProgress.length > 0 ? (
        <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800/60 dark:bg-slate-900">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/50">
                <LayoutList className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Anggaran per Kategori</h2>
            </div>
            <a
              href="/budgets"
              className="text-xs font-medium text-indigo-600 transition-colors hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              Lihat Semua &rarr;
            </a>
          </div>

          <div className="space-y-5">
            {budgetProgress.map((item) => (
              <UrgentBudgetProgressBar key={item.categoryId} item={item} />
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-8 text-center dark:border-slate-800/60 dark:bg-slate-950">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/50">
            <LayoutList className="h-6 w-6 text-indigo-500 dark:text-indigo-400" />
          </div>
          <p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-300">Belum ada anggaran bulan ini</p>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">Atur anggaran untuk mulai memantau pengeluaranmu</p>
          <a
            href="/budgets"
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-500/20 transition-all hover:bg-indigo-500 active:scale-95 dark:bg-indigo-500 dark:hover:bg-indigo-400"
          >
            Atur Anggaran Sekarang
          </a>
        </div>
      )}

      <WalletWidget wallets={wallets} transactions={walletTxns} isLoading={walletsLoading} />

      <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm dark:border-slate-800/60 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">Transaksi Terbaru</h2>
          <a
            href="/transactions"
            className="text-xs font-medium text-indigo-600 transition-colors hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
          >
            Lihat semua &rarr;
          </a>
        </div>

        {isLoading ? (
          <div className="space-y-0 divide-y divide-slate-100 dark:divide-slate-800">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-xl" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-3.5 w-28" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-slate-600 dark:text-slate-400">Belum ada transaksi</p>
            <button
              onClick={() => {}}
              className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
            >
              Catat transaksi pertamamu &rarr;
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2 p-4">
            {transactions.slice(0, 5).map((txn) => {
              const cat = allCategories.find((c) => c.clientId === txn.categoryId) || allCategories.find((c) => c.id === txn.categoryId);
              return <TransactionItem key={txn.clientId} transaction={txn} categoryName={cat?.name} categoryColor={cat?.color ?? null} />;
            })}
          </div>
        )}
      </div>

      <div className="flex justify-center pt-2 pb-8">
        <a
          href="/analytics"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition-colors hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
        >
          Lihat Analisis Lengkap &rarr;
        </a>
      </div>
    </div>
  );
}
