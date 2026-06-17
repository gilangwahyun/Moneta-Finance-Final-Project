// ─── Sync Queue IndexedDB Repository ────────────────────
// Logs every local mutation (create/update/delete) as an ordered
// entry in the sync_queue store. The sync engine reads from this
// queue to push changes to the server.
//
// Using auto-increment IDs guarantees ordering of mutations.

import { getDB } from "../index";
import { STORES } from "../schema";
import { SyncQueueEntry, SyncQueueAction, SyncQueueEntity } from "@/types/models.types";

/**
 * Enqueue a mutation into the sync queue.
 * Called automatically by the entity repositories on create/update/delete.
 */
export async function enqueueChange(
  entity: SyncQueueEntity,
  action: SyncQueueAction,
  clientId: string,
  data: Record<string, unknown>
): Promise<number> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.SYNC_QUEUE, "readwrite");
    const store = tx.objectStore(STORES.SYNC_QUEUE);

    const entry: Omit<SyncQueueEntry, "id"> = {
      entity,
      action,
      clientId,
      data,
      createdAt: new Date().toISOString(),
      retryCount: 0,
    };

    const request = store.add(entry);

    request.onsuccess = () => resolve(request.result as number);
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Get all pending entries from the sync queue, ordered by id (insertion order).
 */
export async function getAllPending(): Promise<SyncQueueEntry[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.SYNC_QUEUE, "readonly");
    const store = tx.objectStore(STORES.SYNC_QUEUE);
    const request = store.getAll();

    request.onsuccess = () => {
      const results = (request.result as SyncQueueEntry[]).sort(
        (a, b) => (a.id ?? 0) - (b.id ?? 0)
      );
      resolve(results);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get the count of active pending entries in the queue (excluding quarantined).
 */
export async function getPendingCount(): Promise<number> {
  const all = await getAllPending();
  return all.filter(e => !e.failedAt && (e.retryCount ?? 0) < 3).length;
}

/**
 * Get the count of permanently failed/quarantined entries.
 */
export async function getQuarantinedCount(): Promise<number> {
  const all = await getAllPending();
  return all.filter(e => !!e.failedAt || (e.retryCount ?? 0) >= 3).length;
}

export interface SyncQueueSummary {
  entity: string;
  action: string;
  retryCount: number;
  lastError?: string;
  failedAt?: string;
}

/**
 * Get a lightweight summary of all queue items.
 */
export async function getSyncQueueSummary(): Promise<SyncQueueSummary[]> {
  const all = await getAllPending();
  return all.map(e => ({
    entity: e.entity,
    action: e.action,
    retryCount: e.retryCount ?? 0,
    lastError: e.lastError,
    failedAt: e.failedAt
  }));
}

/**
 * Remove specific entries by their IDs after successful sync.
 */
export async function dequeueProcessed(ids: number[]): Promise<void> {
  if (ids.length === 0) return;

  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.SYNC_QUEUE, "readwrite");
    const store = tx.objectStore(STORES.SYNC_QUEUE);

    for (const id of ids) {
      store.delete(id);
    }

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Mark a queue entry as attempted. Increments retryCount and stores the error.
 * If retryCount >= maxRetries, sets failedAt to quarantine it.
 */
export async function markEntryAttempt(id: number, errorMsg: string, maxRetries: number = 3): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.SYNC_QUEUE, "readwrite");
    const store = tx.objectStore(STORES.SYNC_QUEUE);
    const getReq = store.get(id);

    getReq.onsuccess = () => {
      const entry = getReq.result as SyncQueueEntry | undefined;
      if (entry) {
        entry.retryCount = (entry.retryCount ?? 0) + 1;
        entry.lastError = errorMsg;
        entry.lastAttemptAt = new Date().toISOString();
        if (entry.retryCount >= maxRetries) {
          entry.failedAt = new Date().toISOString();
        }
        store.put(entry);
      }
    };

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Get all permanently failed/quarantined entries for developer inspection.
 */
export async function getFailedSyncQueueEntries(): Promise<SyncQueueEntry[]> {
  const all = await getAllPending();
  return all.filter((e) => !!e.failedAt);
}

/**
 * Recover quarantined notification log entries that failed due to a specific error.
 */
export async function recoverQuarantinedNotificationLogs(): Promise<void> {
  const db = await getDB();
  const all = await getAllPending();
  const quarantinedLogs = all.filter(e => e.entity === "notification_log" && !!e.failedAt);
  
  if (quarantinedLogs.length === 0) return;

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORES.SYNC_QUEUE, "readwrite");
    const store = tx.objectStore(STORES.SYNC_QUEUE);
    
    for (const log of quarantinedLogs) {
      // The bug caused either "DataError" or general "Push failed" errors due to try/catch
      if (log.id && (!log.lastError || log.lastError.includes("DataError") || log.lastError.includes("Push failed"))) {
        log.retryCount = 0;
        log.failedAt = undefined;
        log.lastError = undefined;
        store.put(log);
        console.log(`[Sync] Recovered quarantined notification log queue item: ${log.id}`);
      }
    }
    
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Clear the entire sync queue. Used after a full successful sync
 * or when resetting the local database.
 */
export async function clearAll(): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.SYNC_QUEUE, "readwrite");
    const store = tx.objectStore(STORES.SYNC_QUEUE);
    store.clear();

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Get pending entries grouped by entity type.
 */
export async function getPendingByEntity(): Promise<{
  categories: SyncQueueEntry[];
  transactions: SyncQueueEntry[];
  budgets: SyncQueueEntry[];
  notification_logs: SyncQueueEntry[];
  financial_targets: SyncQueueEntry[];
}> {
  const all = await getAllPending();
  return {
    categories: all.filter((e) => e.entity === "category"),
    transactions: all.filter((e) => e.entity === "transaction"),
    budgets: all.filter((e) => e.entity === "budget"),
    notification_logs: all.filter((e) => e.entity === "notification_log"),
    financial_targets: all.filter((e) => e.entity === "financial_target"),
  };
}
