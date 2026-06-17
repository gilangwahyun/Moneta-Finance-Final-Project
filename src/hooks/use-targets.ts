// ─── useTargets Hook ──────────────────────────
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

export interface TargetWithProgress extends FinancialTarget {
  progress: TargetProgress;
}

export interface UseTargetsReturn {
  targets: TargetWithProgress[];
  isLoading: boolean;
  error: string | null;
  recordTarget: (input: Omit<AddTargetInput, "userId">) => Promise<FinancialTarget | null>;
  editTarget: (input: UpdateTargetInput) => Promise<FinancialTarget | null>;
  removeTarget: (clientId: string) => Promise<boolean>;
  refresh: () => Promise<void>;
}

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
    // Update UI proactively without waiting for full sync to finish
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

  return { targets, isLoading, error, recordTarget, editTarget, removeTarget, refresh: loadData };
}
