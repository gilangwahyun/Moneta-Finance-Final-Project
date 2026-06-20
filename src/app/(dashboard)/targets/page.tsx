'use client';

import { useState, useMemo } from 'react';
import { useTargets } from '@/hooks/use-targets';
import { TargetModal } from '@/components/targets/TargetModal';
import { FinancialTarget } from '@/types/models.types';
import { formatCurrency, formatDate } from '@/lib/utils/helpers';
import { Plus, Target as TargetIcon, Trash2, Edit2, AlertCircle } from 'lucide-react';
import { EntityActionMenu } from '@/components/ui/EntityActionMenu';
import { DeleteConfirmDialog } from '@/components/ui/DeleteConfirmDialog';
import { FilterBottomSheet } from '@/components/ui/FilterBottomSheet';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { ChevronDown } from 'lucide-react';
import { DynamicIcon } from '@/components/ui/DynamicIcon';
import { getCategoryIcon } from '@/lib/utils/icons';

export default function TargetsPage() {
  const { targets, isLoading, recordTarget, editTarget, removeTarget } = useTargets();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTarget, setEditingTarget] = useState<FinancialTarget | null>(null);

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  type StatusFilter = 'ALL' | 'NOT_STARTED' | 'SAFE' | 'WARNING' | 'DANGER';

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [showStatusSheet, setShowStatusSheet] = useState(false);

  const statusOptions = useMemo(
    () => [
      { value: 'ALL', label: 'Semua Status' },
      { value: 'SAFE', label: 'Belum Tercapai' },
      { value: 'WARNING', label: 'Hampir Tercapai' },
      { value: 'DANGER', label: 'Tercapai' },
      { value: 'NOT_STARTED', label: 'Belum Aktif' },
    ],
    []
  );

  const targetsWithStats = useMemo(() => {
    return targets.map((target) => {
      let status: 'NOT_STARTED' | 'SAFE' | 'WARNING' | 'DANGER' = 'SAFE';

      if (target.progress.isNotStarted) {
        status = 'NOT_STARTED';
      } else if (target.progress.percentage >= 100) {
        status = 'DANGER';
      } else if (target.progress.percentage >= 80) {
        status = 'WARNING';
      }

      return {
        ...target,
        status,
      };
    });
  }, [targets]);

  const filteredTargets = useMemo(() => {
    if (statusFilter === 'ALL') return targetsWithStats;
    return targetsWithStats.filter((t) => t.status === statusFilter);
  }, [targetsWithStats, statusFilter]);

  const handleOpenCreate = () => {
    setEditingTarget(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (target: FinancialTarget) => {
    setEditingTarget(target);
    setIsModalOpen(true);
  };

  const handleSave = async (input: any) => {
    if (editingTarget) {
      await editTarget(input);
    } else {
      await recordTarget(input);
    }
  };

  const handleDelete = async (clientId: string) => {
    setIsDeleting(true);
    await removeTarget(clientId);
    setIsDeleting(false);
    setDeleteConfirmId(null);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-24">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Target Keuangan</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Pantau pencapaian pemasukan kamu dari waktu ke waktu.</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-500/20 transition-all hover:bg-indigo-500 active:scale-95 dark:bg-indigo-500 dark:hover:bg-indigo-400"
        >
          <Plus className="h-4 w-4" />
          Tambah Target Pemasukan
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        {/* Status Filter - Desktop */}
        <div className="hidden md:block flex-1 sm:flex-none w-full sm:w-auto min-w-0 overflow-hidden">
          <SegmentedControl
            options={statusOptions}
            value={statusFilter}
            onChange={(v) => setStatusFilter(v as StatusFilter)}
            fullWidth
          />
        </div>

        {/* Status Filter - Mobile */}
        <div className="block md:hidden w-full">
          <button
            onClick={() => setShowStatusSheet(true)}
            aria-label="Buka filter status target"
            className="flex h-[48px] w-full items-center justify-between rounded-2xl bg-white/60 px-4 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur-xl ring-1 ring-inset ring-slate-200/60 transition-all hover:bg-white active:scale-95 dark:bg-slate-900/60 dark:text-slate-200 dark:ring-slate-800/60 dark:hover:bg-slate-800"
          >
            <span className="text-slate-500 dark:text-slate-400">Status Target</span>
            <div className="flex items-center gap-2">
              <span className="truncate max-w-[120px]">{statusOptions.find((o) => o.value === statusFilter)?.label}</span>
              <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
            </div>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
        </div>
      ) : targets.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 px-6 py-16 text-center dark:border-slate-800/50">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 dark:bg-slate-800/50">
            <TargetIcon className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300">Belum ada target</h3>
          <p className="mt-1.5 max-w-sm text-sm text-slate-500 dark:text-slate-400">
            Buat target untuk memantau pencapaian pemasukanmu setiap periode.
          </p>
          <button
            onClick={handleOpenCreate}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-500/20 transition-all hover:bg-indigo-500 active:scale-95 dark:bg-indigo-500 dark:hover:bg-indigo-400"
          >
            <Plus className="h-4 w-4" />
            Tambah Target Pemasukan
          </button>
        </div>
      ) : filteredTargets.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 px-6 py-16 text-center dark:border-slate-800/50">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 dark:bg-slate-800/50">
            <AlertCircle className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300">Tidak ada target</h3>
          <p className="mt-1.5 max-w-sm text-sm text-slate-500 dark:text-slate-400">
            Tidak ada target yang sesuai dengan filter status ini.
          </p>
          <button
            onClick={() => setStatusFilter('ALL')}
            className="mt-6 inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50 active:scale-95 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            Reset Filter
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTargets.map((target) => {
            const clampedPercentage = Math.min(100, target.progress.percentage);

            let progressColor = 'bg-indigo-500';
            let statusText = 'Belum Tercapai';
            let statusTextColor = 'text-indigo-600 dark:text-indigo-400';

            if (target.progress.isNotStarted) {
              progressColor = 'bg-slate-300 dark:bg-slate-600';
              statusText = 'Belum Aktif';
              statusTextColor = 'text-slate-500 dark:text-slate-400';
            } else if (target.progress.percentage >= 100) {
              progressColor = 'bg-emerald-500';
              statusText = 'Tercapai';
              statusTextColor = 'text-emerald-600 dark:text-emerald-400';
            } else if (target.progress.percentage >= 80) {
              progressColor = 'bg-amber-500';
              statusText = 'Hampir Tercapai';
              statusTextColor = 'text-amber-600 dark:text-amber-400';
            }

            return (
              <div
                key={target.clientId}
                className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      {/* Icon */}
                      <div
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                        style={{
                          backgroundColor: target.category?.color ? `${target.category.color}20` : "rgb(241 245 249)",
                        }}
                      >
                        {(() => {
                          const iconName = target.category?.icon;
                          return iconName 
                            ? <DynamicIcon iconName={iconName} color={target.category?.color} className="h-5 w-5" />
                            : getCategoryIcon(target.category?.name || "Target", "h-5 w-5", target.category?.color);
                        })()}
                      </div>
                      
                      <div className="min-w-0">
                        <p className="truncate text-base font-semibold text-slate-900 dark:text-slate-50">{target.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Target Pemasukan
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          statusText === 'Tercapai' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                          statusText === 'Hampir Tercapai' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                          statusText === 'Belum Aktif' ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400' :
                          'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
                        }`}>
                          {statusText}
                        </span>
                      </div>

                      <div className="pointer-events-auto">
                        <EntityActionMenu
                          title={target.name}
                          onEdit={() => handleOpenEdit(target)}
                          onDelete={() => setDeleteConfirmId(target.clientId!)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 flex items-end justify-between">
                    <div className="flex items-baseline gap-1.5 text-sm">
                      <span className="font-bold text-slate-800 dark:text-slate-100 text-base">{formatCurrency(target.progress.currentAmount)}</span>
                      <span className="text-slate-500 dark:text-slate-400">dari</span>
                      <span className="font-medium text-slate-500 dark:text-slate-400">{formatCurrency(target.targetAmount)}</span>
                    </div>
                  </div>

                  <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ease-out ${progressColor}`}
                      style={{ width: `${clampedPercentage}%` }}
                    />
                  </div>

                  {/* Target Details */}
                  <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800/60">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 dark:text-slate-400">Kategori</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {target.category?.name || 'Semua Kategori'}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-xs">
                      <span className="text-slate-500 dark:text-slate-400">Periode Target</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {target.period === 'DAILY'
                          ? 'Hari Ini'
                          : target.period === 'WEEKLY'
                            ? 'Minggu Ini'
                            : target.period === 'MONTHLY'
                              ? 'Bulan Ini'
                              : `${formatDate(new Date(target.progress.periodStart).toISOString())} - ${formatDate(new Date(target.progress.periodEnd).toISOString())}`}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <TargetModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} editingTarget={editingTarget} onSave={handleSave} />

      <DeleteConfirmDialog
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={() => {
          if (deleteConfirmId) handleDelete(deleteConfirmId);
        }}
        isDeleting={isDeleting}
        title="Hapus Target?"
        body="Target ini akan dihapus secara permanen. Apakah kamu yakin?"
      />

      <FilterBottomSheet
        isOpen={showStatusSheet}
        onClose={() => setShowStatusSheet(false)}
        title="Pilih Status Target"
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
