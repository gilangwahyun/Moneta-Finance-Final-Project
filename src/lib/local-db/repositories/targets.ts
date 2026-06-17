// ─── Targets IndexedDB Repository ───────────────────────
// Full CRUD operations for financial targets in the local IndexedDB store.
//
// Architecture: Local-First
//   - UI reads/writes ONLY to IndexedDB through these functions
//   - All mutations auto-enqueue to sync_queue
//   - The sync engine pushes queued changes to the server

import { getDB } from "../index";
import { STORES } from "../schema";
import { FinancialTarget, TargetType, TargetPeriod } from "@/types/models.types";
import { enqueueChange } from "./sync-queue";
import { generateClientId } from "@/lib/utils/helpers";

// ─── Create ─────────────────────────────────────────────

export interface AddTargetInput {
  name: string;
  type: TargetType;
  targetAmount: number;
  period: TargetPeriod;
  startDate: string;         // YYYY-MM-DD
  endDate?: string | null;   // YYYY-MM-DD
  categoryId?: string | null;
  walletId?: string | null;
  isActive?: boolean;
  note?: string | null;
  userId: string;
}

/**
 * Record a new financial target with a client-generated UUID.
 * Automatically sets syncStatus to PENDING and enqueues for sync.
 *
 * @returns The created target (with its clientId)
 */
export async function addTarget(input: AddTargetInput): Promise<FinancialTarget> {
  if (input.type === "SAVING_TARGET" || input.type === "BALANCE_TARGET") {
    throw new Error(`Target type ${input.type} belum didukung di versi ini.`);
  }
  if (!input.categoryId) {
    throw new Error("Kategori wajib diisi untuk target finansial.");
  }
  if (input.period === "CUSTOM") {
    if (!input.endDate) {
      throw new Error("Tanggal selesai wajib diisi untuk periode khusus.");
    }
    if (new Date(input.endDate) < new Date(input.startDate)) {
      throw new Error("Tanggal selesai tidak boleh sebelum tanggal mulai.");
    }
  }

  const now = new Date().toISOString();

  const target: FinancialTarget = {
    clientId: generateClientId(),
    name: input.name.trim(),
    type: input.type,
    targetAmount: input.targetAmount,
    period: input.period,
    startDate: (input.startDate || "").substring(0, 10),
    endDate: input.endDate ? input.endDate.substring(0, 10) : null,
    categoryId: input.categoryId ?? null,
    walletId: input.walletId ?? null,
    isActive: input.isActive ?? true,
    note: input.note?.trim() || null,
    userId: input.userId,
    syncStatus: "PENDING",
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  const db = await getDB();

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORES.FINANCIAL_TARGETS, "readwrite");
    const store = tx.objectStore(STORES.FINANCIAL_TARGETS);
    store.put(target);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  await enqueueChange("financial_target", "create", target.clientId, {
    ...target,
  });

  return target;
}

// ─── Update ─────────────────────────────────────────────

export interface UpdateTargetInput {
  clientId: string;
  name?: string;
  type?: TargetType;
  targetAmount?: number;
  period?: TargetPeriod;
  startDate?: string;
  endDate?: string | null;
  categoryId?: string | null;
  walletId?: string | null;
  isActive?: boolean;
  note?: string | null;
}

/**
 * Update specific fields of an existing target.
 * Marks as PENDING and enqueues the mutation for sync.
 */
export async function updateTarget(input: UpdateTargetInput): Promise<FinancialTarget> {
  const db = await getDB();
  const now = new Date().toISOString();

  const updatedTarget = await new Promise<FinancialTarget>((resolve, reject) => {
    const tx = db.transaction(STORES.FINANCIAL_TARGETS, "readwrite");
    const store = tx.objectStore(STORES.FINANCIAL_TARGETS);
    
    const getRequest = store.get(input.clientId);

    getRequest.onsuccess = () => {
      const existing = getRequest.result as FinancialTarget;
      if (!existing) {
        reject(new Error(`Target with clientId ${input.clientId} not found`));
        return;
      }

      const mergedType = input.type ?? existing.type;
      const mergedCategoryId = input.categoryId !== undefined ? input.categoryId : existing.categoryId;
      const mergedPeriod = input.period ?? existing.period;
      const mergedStartDate = input.startDate ?? existing.startDate;
      const mergedEndDate = input.endDate !== undefined ? input.endDate : existing.endDate;

      if (mergedType === "SAVING_TARGET" || mergedType === "BALANCE_TARGET") {
        reject(new Error(`Target type ${mergedType} belum didukung di versi ini.`));
        return;
      }
      if (!mergedCategoryId) {
        reject(new Error("Kategori wajib diisi untuk target finansial."));
        return;
      }
      if (mergedPeriod === "CUSTOM") {
        if (!mergedEndDate) {
          reject(new Error("Tanggal selesai wajib diisi untuk periode khusus."));
          return;
        }
        if (new Date(mergedEndDate) < new Date(mergedStartDate)) {
          reject(new Error("Tanggal selesai tidak boleh sebelum tanggal mulai."));
          return;
        }
      }

      const merged: FinancialTarget = {
        ...existing,
        ...input,
        // Ensure dates are correctly formatted
        startDate: input.startDate ? input.startDate.substring(0, 10) : existing.startDate,
        endDate: input.endDate !== undefined 
          ? (input.endDate ? input.endDate.substring(0, 10) : null)
          : existing.endDate,
        syncStatus: "PENDING",
        updatedAt: now,
      };

      const putRequest = store.put(merged);
      putRequest.onsuccess = () => resolve(merged);
      putRequest.onerror = () => reject(putRequest.error);
    };

    getRequest.onerror = () => reject(getRequest.error);
  });

  await enqueueChange("financial_target", "update", updatedTarget.clientId, {
    ...updatedTarget,
  });

  return updatedTarget;
}

// ─── Soft Delete ────────────────────────────────────────

/**
 * Soft delete a target by setting deletedAt.
 * Used to propagate deletions to the server.
 */
export async function deleteTarget(clientId: string): Promise<void> {
  const db = await getDB();
  const now = new Date().toISOString();

  const updatedTarget = await new Promise<FinancialTarget>((resolve, reject) => {
    const tx = db.transaction(STORES.FINANCIAL_TARGETS, "readwrite");
    const store = tx.objectStore(STORES.FINANCIAL_TARGETS);
    const getRequest = store.get(clientId);

    getRequest.onsuccess = () => {
      const target = getRequest.result as FinancialTarget;
      if (!target) {
        reject(new Error("Target not found"));
        return;
      }

      target.deletedAt = now;
      target.syncStatus = "PENDING";
      target.updatedAt = now;

      const putRequest = store.put(target);
      putRequest.onsuccess = () => resolve(target);
      putRequest.onerror = () => reject(putRequest.error);
    };

    getRequest.onerror = () => reject(getRequest.error);
  });

  await enqueueChange("financial_target", "delete", clientId, {
    ...updatedTarget,
  });
}

// ─── Hard Delete (Sync use only) ────────────────────────

export async function hardDeleteTarget(clientId: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.FINANCIAL_TARGETS, "readwrite");
    const store = tx.objectStore(STORES.FINANCIAL_TARGETS);
    const request = store.delete(clientId);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// ─── Upsert (Sync use only) ─────────────────────────────

export async function upsertTarget(target: FinancialTarget, skipSyncQueue = false): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.FINANCIAL_TARGETS, "readwrite");
    const store = tx.objectStore(STORES.FINANCIAL_TARGETS);
    
    // Add/Update
    const request = store.put(target);
    
    request.onsuccess = () => {
      if (!skipSyncQueue) {
        enqueueChange("financial_target", "update", target.clientId, { ...target })
          .then(() => resolve())
          .catch(reject);
      } else {
        resolve();
      }
    };
    request.onerror = () => reject(request.error);
  });
}

// ─── Queries ────────────────────────────────────────────

/**
 * Get all active targets (not soft-deleted) for a user, sorted by descending createdAt.
 */
export async function getActiveTargets(userId: string): Promise<FinancialTarget[]> {
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.FINANCIAL_TARGETS, "readonly");
    const store = tx.objectStore(STORES.FINANCIAL_TARGETS);
    const index = store.index("by_userId");
    const request = index.getAll(userId);

    request.onsuccess = () => {
      const targets = request.result as FinancialTarget[];
      // Filter out deleted and sort desc by createdAt
      const activeTargets = targets
        .filter((t) => !t.deletedAt)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      resolve(activeTargets);
    };

    request.onerror = () => reject(request.error);
  });
}

/**
 * Get a single target by clientId.
 */
export async function getTargetById(clientId: string): Promise<FinancialTarget | null> {
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.FINANCIAL_TARGETS, "readonly");
    const store = tx.objectStore(STORES.FINANCIAL_TARGETS);
    const request = store.get(clientId);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Upsert multiple targets (used by Pull Sync to apply server data locally).
 * Automatically joins Category and Wallet if they exist locally.
 */
export async function bulkUpsertTargets(targets: FinancialTarget[]): Promise<void> {
  if (!targets.length) return;
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.FINANCIAL_TARGETS, "readwrite");
    const targetStore = tx.objectStore(STORES.FINANCIAL_TARGETS);

    targets.forEach((target) => {
      targetStore.put(target);
    });

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
