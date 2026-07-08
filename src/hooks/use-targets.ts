/*
 * File: src/hooks/use-targets.ts
 * Description: Hook kustom React untuk mengelola target atau tujuan keuangan (saving targets / financial goals) lokal melalui IndexedDB serta menghitung progres pencapaiannya.
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { FinancialTarget } from "@/types/models.types";
import {
  getActiveTargets,
  addTarget,
  updateTarget,
  deleteTarget,
  AddTargetInput,
  UpdateTargetInput,
} from "@/lib/local-db/repositories/targets";
import { getAllCategoriesIncludingDeleted } from "@/lib/local-db/repositories/categories";
import { calculateTargetProgress, TargetProgress } from "@/lib/local-db/target-queries";
import { getCurrentUser } from "@/lib/local-db/repositories/users";
import { useSyncContext } from "@/providers/SyncProvider";
import { SyncEvents } from "@/lib/sync/events";

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
  recordTarget: (input: Omit<AddTargetInput, "userId">) => Promise<FinancialTarget | null>;
  /* Memperbarui data target keuangan yang sudah ada */
  editTarget: (input: UpdateTargetInput) => Promise<FinancialTarget | null>;
  /* Menghapus target keuangan dari sistem */
  removeTarget: (clientId: string) => Promise<boolean>;
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
  const [error, setError] = useState<string | null>(null);
  const { scheduleSync } = useSyncContext();

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const user = await getCurrentUser();
      if (!user) {
        setTargets([]);
        return;
      }
      
      const [activeTargets, allCategories] = await Promise.all([
        getActiveTargets(user.id),
        getAllCategoriesIncludingDeleted(user.id)
      ]);
      
      const categoriesMap = new Map(allCategories.map(c => [c.clientId, c]));

      const targetsWithProgress = await Promise.all(
        activeTargets.map(async (target) => {
          const progress = await calculateTargetProgress(target);
          return { 
            ...target, 
            category: target.categoryId ? categoriesMap.get(target.categoryId) : undefined,
            progress 
          };
        })
      );
      
      setTargets(targetsWithProgress);
    } catch (err) {
      console.error("[useTargets] Load failed:", err);
      setError("Failed to load targets");
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

  /********** [START: Buat Target Baru & Jadwalkan Sinkronisasi] **********/
  const recordTarget = useCallback(
    async (input: Omit<AddTargetInput, "userId">) => {
      try {
        const user = await getCurrentUser();
        if (!user) return null;
        const created = await addTarget({ ...input, userId: user.id });
        scheduleSync();
        loadData();
        return created;
      } catch (err) {
        setError("Failed to create target");
        return null;
      }
    },
    [scheduleSync, loadData]
  );
  /********** [END: Buat Target Baru & Jadwalkan Sinkronisasi] **********/

  /********** [START: Edit Target & Jadwalkan Sinkronisasi] **********/
  const editTarget = useCallback(
    async (input: UpdateTargetInput) => {
      try {
        const updated = await updateTarget(input);
        scheduleSync();
        loadData();
        return updated;
      } catch (err) {
        setError("Failed to update target");
        return null;
      }
    },
    [scheduleSync, loadData]
  );
  /********** [END: Edit Target & Jadwalkan Sinkronisasi] **********/

  /********** [START: Hapus Target & Jadwalkan Sinkronisasi] **********/
  const removeTarget = useCallback(
    async (clientId: string) => {
      try {
        await deleteTarget(clientId);
        scheduleSync();
        loadData();
        return true;
      } catch (err) {
        setError("Failed to delete target");
        return false;
      }
    },
    [scheduleSync, loadData]
  );
  /********** [END: Hapus Target & Jadwalkan Sinkronisasi] **********/

  /********** Pengembalian Data Hook **********/

  return { targets, isLoading, error, recordTarget, editTarget, removeTarget, refresh: loadData };
}
