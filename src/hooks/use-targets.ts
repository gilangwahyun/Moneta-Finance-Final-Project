/*
 * File: src/hooks/use-targets.ts
 * Description: Hook kustom React untuk mengelola target atau tujuan keuangan (saving targets / financial goals) lokal melalui IndexedDB serta menghitung progres pencapaiannya.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { FinancialTarget } from '@/types/models.types';
import {
  getActiveTargets,
  addTarget,
  updateTarget,
  deleteTarget,
  AddTargetInput,
  UpdateTargetInput,
} from '@/lib/local-db/repositories/targets';
import { getAllCategoriesIncludingDeleted } from '@/lib/local-db/repositories/categories';
import { calculateTargetProgress, TargetProgress } from '@/lib/local-db/target-queries';
import { getCurrentUser } from '@/lib/local-db/repositories/users';
import { useSyncContext } from '@/providers/SyncProvider';
import { SyncEvents } from '@/lib/sync/events';
import { useLocalMutation } from '@/hooks/use-local-mutation';

/********** Tipe Data & Antarmuka **********/

export interface TargetWithProgress extends FinancialTarget {
  progress: TargetProgress;
}

export interface UseTargetsReturn {
  /* Daftar target keuangan beserta detail progres pencapaiannya */
  targets: TargetWithProgress[];
  /* Status indikator apakah data target sedang dimuat */
  isLoading: boolean;
  /* Pesan error jika terjadi kegagalan operasi */
  error: string | null;
  /* Merekam atau menambah target keuangan baru */
  recordTarget: (input: Omit<AddTargetInput, 'userId'>) => Promise<FinancialTarget | null>;
  /* Memperbarui data target keuangan yang sudah ada */
  editTarget: (input: UpdateTargetInput) => Promise<FinancialTarget | null>;
  /* Menghapus target keuangan dari sistem */
  removeTarget: (clientId: string) => Promise<boolean | null | any>;
  /* Memuat ulang data dari IndexedDB */
  refresh: () => Promise<void>;
}

/********** Hook Utama (useTargets) **********/

/**
 * Hook kustom untuk memuat target keuangan pengguna, mengalkulasi akumulasi progres dari transaksi terkait, serta menyediakan fungsi mutasi (CRUD).
 *
 * @returns Objek berisi daftar target, status loading, error, dan metode mutasi target.
 */
export function useTargets(): UseTargetsReturn {
  const [targets, setTargets] = useState<TargetWithProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { scheduleSync } = useSyncContext();

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      const user = await getCurrentUser();
      if (!user) {
        setTargets([]);
        return;
      }

      const [activeTargets, allCategories] = await Promise.all([getActiveTargets(user.id), getAllCategoriesIncludingDeleted(user.id)]);

      const categoriesMap = new Map(allCategories.map((c) => [c.clientId, c]));

      const targetsWithProgress = await Promise.all(
        activeTargets.map(async (target) => {
          const progress = await calculateTargetProgress(target);
          return {
            ...target,
            category: target.categoryId ? categoriesMap.get(target.categoryId) : undefined,
            progress,
          };
        }),
      );

      setTargets(targetsWithProgress);
    } catch (err) {
      console.error('[useTargets] Load failed:', err);
      setLoadError('Failed to load targets');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    /* Perbarui UI secara proaktif tanpa menunggu proses sinkronisasi penuh selesai */
    window.addEventListener(SyncEvents.TARGET_UPDATED, handleUpdate);
    window.addEventListener(SyncEvents.CATEGORY_UPDATED, handleUpdate);
    window.addEventListener(SyncEvents.TRANSACTION_UPDATED, handleUpdate);
    window.addEventListener(SyncEvents.SYNC_COMPLETED, handleUpdate);

    return () => {
      window.removeEventListener(SyncEvents.TARGET_UPDATED, handleUpdate);
      window.removeEventListener(SyncEvents.CATEGORY_UPDATED, handleUpdate);
      window.removeEventListener(SyncEvents.TRANSACTION_UPDATED, handleUpdate);
      window.removeEventListener(SyncEvents.SYNC_COMPLETED, handleUpdate);
    };
  }, [loadData]);

  /********** [START: Operasi Mutasi Target] **********/
  const { mutate: recordTarget, error: recordErr } = useLocalMutation(
    async (input: Omit<AddTargetInput, 'userId'>) => {
      const user = await getCurrentUser();
      if (!user) throw new Error('User not found');
      return addTarget({ ...input, userId: user.id });
    },
    { eventName: SyncEvents.TARGET_UPDATED, onSuccess: loadData, errorMessage: 'Failed to create target' },
  );

  const { mutate: editTarget, error: editErr } = useLocalMutation(updateTarget, {
    eventName: SyncEvents.TARGET_UPDATED,
    onSuccess: loadData,
    errorMessage: 'Failed to update target',
  });

  const { mutate: removeTarget, error: removeErr } = useLocalMutation(
    async (clientId: string) => {
      await deleteTarget(clientId);
      return true;
    },
    { eventName: SyncEvents.TARGET_UPDATED, onSuccess: loadData, errorMessage: 'Failed to delete target' },
  );
  /********** [END: Operasi Mutasi Target] **********/

  const combinedError = loadError || recordErr || editErr || removeErr;

  /********** Pengembalian Data Hook **********/

  return { targets, isLoading, error: combinedError, recordTarget, editTarget, removeTarget, refresh: loadData };
}
