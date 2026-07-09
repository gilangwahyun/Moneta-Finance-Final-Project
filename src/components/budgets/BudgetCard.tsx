/*
 * File: src/components/budgets/BudgetCard.tsx
 * Description: Komponen kartu anggaran bulanan yang menampilkan progres penggunaan, alokasi harian adaptif, status ritme, serta menu aksi.
 */
'use client';

import { useState, useEffect } from 'react';
import { BudgetWithStats } from '@/hooks/use-budgets';
import { formatCurrency } from '@/lib/utils/helpers';
import { getCategoryIcon } from '@/lib/utils/icons';
import { DynamicIcon } from '@/components/ui/DynamicIcon';
import { EntityActionMenu } from '@/components/ui/EntityActionMenu';
import { Tooltip } from '@/components/ui/Tooltip';
import { ArrowRightLeft, Info, AlertCircle, ChevronDown } from 'lucide-react';
import { Budget } from '@/types/models.types';

/********** Definisi Tipe Properti Komponen Kartu Anggaran **********/

interface BudgetCardProps {
  budget: BudgetWithStats;
  onEdit: (budget: Budget) => void;
  onDelete: (clientId: string) => void;
  onReallocate: (clientId: string) => void;
}

/********** Komponen Utama Kartu Anggaran (BudgetCard) **********/

/**
 * Merender kartu visual untuk satu kategori anggaran beserta indikator ritme, batas harian adaptif, dan menu aksi.
 *
 * @param props - Properti anggaran beserta aksi kelolanya
 * @returns Elemen JSX kartu anggaran
 */
export function BudgetCard({
  budget,
  onEdit,
  onDelete,
  onReallocate,
}: BudgetCardProps) {
  /* Pengingat Kontekstual (Nudging): Terbuka otomatis apabila status ritme OFF_TRACK atau OVER_BUDGET */
  const [isExpanded, setIsExpanded] = useState(() => {
    return budget.rhythm?.status === 'OFF_TRACK' || budget.rhythm?.status === 'OVER_BUDGET';
  });

  useEffect(() => {
    if (budget.rhythm?.status === 'OFF_TRACK' || budget.rhythm?.status === 'OVER_BUDGET') {
      setIsExpanded(true);
    }
  }, [budget.rhythm?.status]);

  const clampedPercentage = Math.min(100, budget.percentage);

  /********** [START: Kalkulasi Status Warna & Teks Anggaran] **********/
  let progressColor = 'bg-emerald-500';
  let statusText = 'Aman';

  if (budget.status === 'WARNING') {
    progressColor = 'bg-amber-500';
    statusText = 'Mendekati Batas';
  } else if (budget.status === 'DANGER') {
    progressColor = 'bg-rose-500';
    statusText = 'Melebihi Batas';
  }
  /********** [END: Kalkulasi Status Warna & Teks Anggaran] **********/

  return (
    <div className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700">
      {/* Area sentuh seluler untuk membuka menu aksi secara langsung */}
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
            {/* Ikon Kategori Anggaran */}
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
              style={{
                backgroundColor: budget.category?.color ? `${budget.category.color}20` : 'rgb(241 245 249)',
              }}
            >
              {(() => {
                const iconName = budget.category?.icon;
                return iconName ? (
                  <DynamicIcon iconName={iconName} color={budget.category?.color} className="h-5 w-5" />
                ) : (
                  getCategoryIcon(budget.category?.name || 'Budget', 'h-5 w-5', budget.category?.color)
                );
              })()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-slate-900 dark:text-slate-50">
                {budget.category?.name || 'Kategori tidak diketahui'}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400">Batas Bulanan</p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  budget.status === 'DANGER'
                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                    : budget.status === 'WARNING'
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                      : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                }`}
              >
                {statusText}
              </span>
            </div>

            <div className="pointer-events-auto flex md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100 transition-opacity">
              <EntityActionMenu
                title={budget.category?.name || 'Anggaran'}
                subtitle={`Batas: ${formatCurrency(Number(budget.amount))}`}
                onEdit={() => onEdit(budget)}
                onDelete={() => onDelete(budget.clientId!)}
                extraActions={
                  Number(budget.amount) - budget.spentAmount > 0
                    ? [
                        {
                          label: 'Subsidi Silang',
                          icon: <ArrowRightLeft />,
                          onClick: () => onReallocate(budget.clientId!),
                        },
                      ]
                    : undefined
                }
              />
            </div>
          </div>
        </div>

        {/* Metrik Realisasi Pengeluaran */}
        <div className="mt-4 flex items-end justify-between">
          <div className="flex items-baseline gap-1.5 text-sm">
            <span className="font-bold text-slate-800 dark:text-slate-100 text-base">{formatCurrency(budget.spentAmount)}</span>
            <span className="text-slate-600 dark:text-slate-400">dari</span>
            <span className="font-medium text-slate-600 dark:text-slate-400">{formatCurrency(Number(budget.amount))}</span>
          </div>
        </div>

        {/* Bilah Progres Penggunaan */}
        <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div
            className={`h-full rounded-full transition-all duration-500 ease-out ${progressColor}`}
            style={{ width: `${clampedPercentage}%` }}
          />
        </div>

        {/* Blok Peringatan atau Alokasi Harian Adaptif */}
        {budget.spentAmount >= Number(budget.amount) ? (
          <div className="mt-3.5 flex items-center justify-between rounded-xl bg-rose-50/80 px-3.5 py-2.5 border border-rose-100 dark:bg-rose-950/30 dark:border-rose-900/50">
            <div className="flex items-center gap-2 text-xs font-semibold text-rose-700 dark:text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <span>Anggaran habis bulan ini</span>
            </div>
            <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">
              +{formatCurrency(budget.spentAmount - Number(budget.amount))} berlebih
            </span>
          </div>
        ) : (
          <div
            className={`mt-3.5 flex items-center justify-between rounded-xl px-3.5 py-2.5 border transition-all ${
              budget.rhythm.status === 'OFF_TRACK'
                ? 'bg-amber-50/80 border-amber-200/80 dark:bg-amber-950/30 dark:border-amber-900/50'
                : 'bg-slate-50/80 border-slate-200/60 dark:bg-slate-800/40 dark:border-slate-700/60'
            }`}
          >
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-600 dark:text-slate-400 font-medium flex items-center gap-1">
                Alokasi Harian:
                <Tooltip content="Proyeksi batas pengeluaran harian adaptif (Sisa Anggaran ÷ Sisa Hari). Berlaku universal sebagai laju pembakaran (burn rate) kapasitas finansial harian Anda.">
                  <Info className="h-3 w-3 text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-300" />
                </Tooltip>
              </span>
              <span
                className={`font-bold ${
                  budget.rhythm.status === 'OFF_TRACK'
                    ? 'text-amber-700 dark:text-amber-300'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {formatCurrency(budget.rhythm.dailySafeRemaining)}{' '}
                <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">/ hari</span>
              </span>
            </div>
            <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 bg-white/80 dark:bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-200/60 dark:border-slate-700/60 shadow-2xs">
              sisa {budget.rhythm.daysLeft} hari
            </span>
          </div>
        )}

        {/* Accordion Detail Ritme & Proyeksi */}
        <div className="mt-2.5 border-t border-slate-100 pt-2 dark:border-slate-800/60">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex w-full items-center justify-between py-1 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors pointer-events-auto"
          >
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-slate-400 dark:bg-slate-500" />
              <span>Detail Ritme & Proyeksi</span>
            </span>
            <div className="flex items-center gap-1.5">
              <span
                className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                  budget.spentAmount === 0
                    ? 'text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-400'
                    : budget.rhythm.status === 'OVER_BUDGET'
                      ? 'text-rose-700 bg-rose-100 dark:bg-rose-900/30 dark:text-rose-400'
                      : budget.rhythm.status === 'OFF_TRACK'
                        ? 'text-amber-700 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400'
                        : 'text-emerald-700 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400'
                }`}
              >
                {budget.spentAmount === 0
                  ? 'Belum ada pengeluaran'
                  : budget.rhythm.status === 'OVER_BUDGET'
                    ? 'Melebihi anggaran'
                    : budget.rhythm.status === 'OFF_TRACK'
                      ? 'Lebih cepat dari rencana'
                      : 'Sesuai ritme'}
              </span>
              <ChevronDown
                className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
              />
            </div>
          </button>

          {isExpanded && (
            <div className="mt-2.5 space-y-2 rounded-xl bg-slate-50/70 p-3 text-xs dark:bg-slate-800/30 border border-slate-200/60 dark:border-slate-800 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                  Batas harian statis
                  <Tooltip content="Kalkulasi rata-rata: Batas Bulanan ÷ Total Hari Bulan Ini. Nilai tetap sejak hari ke-1.">
                    <Info className="h-3.5 w-3.5 text-slate-600 transition-colors hover:text-slate-600 dark:hover:text-slate-300" />
                  </Tooltip>
                </span>
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {formatCurrency(budget.rhythm.dailyAllowance)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                  Total ideal saat ini
                  <Tooltip content="Kalkulasi akumulasi ideal: Batas Harian Statis × Hari Berjalan.">
                    <Info className="h-3.5 w-3.5 text-slate-600 transition-colors hover:text-slate-600 dark:hover:text-slate-300" />
                  </Tooltip>
                </span>
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {formatCurrency(budget.rhythm.idealUsageUntilToday)}
                </span>
              </div>
              {(budget.rhythm.status === 'OFF_TRACK' ||
                (budget.rhythm.projectedMonthlyUsage > Number(budget.amount) && budget.percentage < 100)) && (
                <div className="flex items-center justify-between border-t border-slate-200/60 pt-2 dark:border-slate-700/60">
                  <span className="text-slate-600 dark:text-slate-400 font-medium">Proyeksi akhir bulan:</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">
                    {formatCurrency(budget.rhythm.projectedMonthlyUsage)}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
