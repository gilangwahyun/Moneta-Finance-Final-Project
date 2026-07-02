// ─── Notification Logs Repository ─────────────────────────
// Research audit trail for every notification attempt.
// Records both 'delivered' and 'suppressed' events for UCD analysis.

import { getDB } from '../index';
import { STORES } from '../schema';
import { enqueueChange } from './sync-queue';

export interface NotificationLogRecord {
  clientId: string; // Unique ID for offline-first
  dedupeKey: string; // To prevent duplicate alerts
  userId: string;
  title: string;
  body: string;
  type: string;
  status: 'delivered' | 'suppressed';
  severity?: string;
  source?: string;
  relatedTransactionClientId?: string;
  relatedCategoryId?: string;
  relatedBudgetId?: string;
  suppressionReason?: string;
  deliveryModeAtCreation?: string;
  createdAt: string; // ISO
  pushedAt?: string;
  digestSentAt?: string;
  eventType?: string;
  ctaRoute?: string;
  actionType?: string;
  ctaLabel?: string;
  sourceBudgetId?: string;
  targetBudgetId?: string;
  recommendedAmount?: number;
  readAt?: string;
  dismissedAt?: string;
  syncStatus: 'PENDING' | 'SYNCED';
  updatedAt: string;
  
  // Metadata fields for digest and analytics
  categoryName?: string;
  usageRatio?: number;
  budgetLimit?: number;
  budgetSpent?: number;
  deficitAmount?: number;
  todayAmount?: number;
  comparisonAmount?: number;
  comparisonLabel?: string;
  sourceCategoryName?: string;
  targetCategoryName?: string;
}

/** Write or update a log record in IDB. Used by app/SW. Enqueues for sync. */
export async function upsertNotificationLog(record: NotificationLogRecord, skipSyncQueue = false): Promise<void> {
  const db = await getDB();

  if (!record.createdAt) {
    record.createdAt = new Date().toISOString();
  }

  if (!skipSyncQueue) {
    record.updatedAt = new Date().toISOString();
    record.syncStatus = 'PENDING';
  } else if (!record.updatedAt) {
    record.updatedAt = record.createdAt;
  }

  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORES.NOTIFICATION_LOGS, 'readwrite');
      const req = tx.objectStore(STORES.NOTIFICATION_LOGS).put(record);
      req.onerror = (e) => reject((e.target as IDBRequest).error);
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject(tx.error || (e.target as any).error || new Error('IDB Error'));
    });
  } catch (error: any) {
    if (error?.name === 'ConstraintError') {
      console.warn('[LocalDB] ConstraintError in upsertNotificationLog. Deleting old record with same dedupeKey and retrying...');

      // Delete the conflicting record manually using an index lookup
      await new Promise<void>((resolve) => {
        const tx = db.transaction(STORES.NOTIFICATION_LOGS, 'readwrite');
        const store = tx.objectStore(STORES.NOTIFICATION_LOGS);
        const index = store.index('by_dedupeKey');
        const getReq = index.get(record.dedupeKey);

        getReq.onsuccess = () => {
          if (getReq.result) {
            store.delete(getReq.result.clientId);
          }
        };
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve(); // Ignore errors during cleanup
      });

      // Retry the upsert
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORES.NOTIFICATION_LOGS, 'readwrite');
        const req = tx.objectStore(STORES.NOTIFICATION_LOGS).put(record);
        req.onerror = (e) => reject((e.target as IDBRequest).error);
        tx.oncomplete = () => resolve();
      });
    } else {
      throw error;
    }
  }

  if (!skipSyncQueue && record.syncStatus === 'PENDING') {
    await enqueueChange('notification_log', 'update', record.clientId, { ...record });
  }
}

/**
 * Bulk upsert notification logs — used by the sync engine to apply multiple server records in one IDB transaction.
 */
export async function bulkUpsertNotificationLogs(records: NotificationLogRecord[]): Promise<void> {
  if (records.length === 0) return;
  const db = await getDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORES.NOTIFICATION_LOGS, 'readwrite');
    const store = tx.objectStore(STORES.NOTIFICATION_LOGS);
    for (const record of records) {
      store.put(record);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Get a notification log by its clientId */
export async function getNotificationLogById(clientId: string): Promise<NotificationLogRecord | undefined> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.NOTIFICATION_LOGS, 'readonly');
    const store = tx.objectStore(STORES.NOTIFICATION_LOGS);
    const request = store.get(clientId);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Delete a notification log by clientId. Used during conflict resolution. */
export async function deleteNotificationLog(clientId: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.NOTIFICATION_LOGS, 'readwrite');
    const req = tx.objectStore(STORES.NOTIFICATION_LOGS).delete(clientId);
    req.onerror = (e) => reject((e.target as IDBRequest).error);
    tx.oncomplete = () => resolve();
    tx.onerror = (e) => reject(tx.error || (e.target as any).error || new Error('IDB Error'));
  });
}

/** Check if a notification with this dedupeKey already exists locally. */
export async function checkDedupeKeyExists(dedupeKey: string): Promise<boolean> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.NOTIFICATION_LOGS, 'readonly');
    const store = tx.objectStore(STORES.NOTIFICATION_LOGS);
    const index = store.index('by_dedupeKey');
    const req = index.get(dedupeKey);
    req.onsuccess = () => resolve(!!req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Count today's delivered notifications for a user (global cap check). */
export async function countTodayDelivered(userId: string): Promise<number> {
  const db = await getDB();
  const today = new Date().toISOString().split('T')[0];
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.NOTIFICATION_LOGS, 'readonly');
    const store = tx.objectStore(STORES.NOTIFICATION_LOGS);
    const request = store.index('by_userId').getAll(userId);
    request.onsuccess = () => {
      const records = (request.result || []) as NotificationLogRecord[];
      const todayDelivered = records.filter((r) => r.status === 'delivered' && r.createdAt.startsWith(today));
      resolve(todayDelivered.length);
    };
    request.onerror = () => reject(request.error);
  });
}

/** Get all unsynced log records for bulk server sync. */
export async function getUnsyncedLogs(): Promise<NotificationLogRecord[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.NOTIFICATION_LOGS, 'readonly');
    const store = tx.objectStore(STORES.NOTIFICATION_LOGS);
    const request = store.index('by_syncStatus').getAll('PENDING');
    request.onsuccess = () => resolve((request.result || []) as NotificationLogRecord[]);
    request.onerror = () => reject(request.error);
  });
}

/** Get all logs for the current user. */
export async function getAllLogs(userId: string): Promise<NotificationLogRecord[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.NOTIFICATION_LOGS, 'readonly');
    const store = tx.objectStore(STORES.NOTIFICATION_LOGS);
    const request = store.index('by_userId').getAll(userId);
    request.onsuccess = () => resolve((request.result || []) as NotificationLogRecord[]);
    request.onerror = () => reject(request.error);
  });
}

/** Mark log records as synced after successful server POST. */
export async function markLogsSynced(clientIds: string[]): Promise<void> {
  if (clientIds.length === 0) return;
  const db = await getDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORES.NOTIFICATION_LOGS, 'readwrite');
    const store = tx.objectStore(STORES.NOTIFICATION_LOGS);
    for (const id of clientIds) {
      const req = store.get(id);
      req.onsuccess = () => {
        const record = req.result;
        if (record) {
          record.syncStatus = 'SYNCED';
          store.put(record);
        }
      };
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Mark a log record as read locally. */
export async function markLogRead(clientId: string): Promise<void> {
  const db = await getDB();
  await new Promise<void>((resolve, reject) => {
    const storeNames: string[] = [STORES.NOTIFICATION_LOGS];
    if (db.objectStoreNames.contains(STORES.NOTIFICATION_INBOX)) {
      storeNames.push(STORES.NOTIFICATION_INBOX);
    }
    const tx = db.transaction(storeNames, 'readwrite');
    const store = tx.objectStore(STORES.NOTIFICATION_LOGS);
    const req = store.get(clientId);
    req.onsuccess = () => {
      const record = req.result;
      if (record && !record.readAt) {
        const now = new Date().toISOString();
        record.readAt = now;
        record.updatedAt = now;
        record.syncStatus = 'PENDING';
        store.put(record);

        enqueueChange('notification_log', 'update', clientId, { readAt: now, updatedAt: now }).catch(console.error);
      }
    };

    if (db.objectStoreNames.contains(STORES.NOTIFICATION_INBOX)) {
      try {
        const inboxStore = tx.objectStore(STORES.NOTIFICATION_INBOX);
        const cursorReq = inboxStore.openCursor();
        cursorReq.onsuccess = () => {
          const cursor = cursorReq.result;
          if (cursor) {
            const item = cursor.value;
            if (!item.isRead && (item.logId === clientId || (item as any).clientId === clientId || String(item.id) === String(clientId) || (item as any).clientId === Number(clientId))) {
              cursor.update({ ...item, isRead: true });
            }
            cursor.continue();
          }
        };
      } catch (err) {
        console.warn('[LocalDB] Could not update inbox isRead status:', err);
      }
    }

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Mark all logs as read for a user. */
export async function markAllLogsRead(userId: string): Promise<void> {
  const db = await getDB();
  const now = new Date().toISOString();
  await new Promise<void>((resolve, reject) => {
    const storeNames: string[] = [STORES.NOTIFICATION_LOGS];
    if (db.objectStoreNames.contains(STORES.NOTIFICATION_INBOX)) {
      storeNames.push(STORES.NOTIFICATION_INBOX);
    }
    const tx = db.transaction(storeNames, 'readwrite');
    const store = tx.objectStore(STORES.NOTIFICATION_LOGS);
    const index = store.index('by_userId');
    const req = index.getAll(userId);

    req.onsuccess = () => {
      const records = req.result;
      for (const record of records) {
        if (!record.readAt) {
          record.readAt = now;
          record.updatedAt = now;
          record.syncStatus = 'PENDING';
          store.put(record);
          enqueueChange('notification_log', 'update', record.clientId, { readAt: now, updatedAt: now }).catch(console.error);
        }
      }
    };

    if (db.objectStoreNames.contains(STORES.NOTIFICATION_INBOX)) {
      try {
        const inboxStore = tx.objectStore(STORES.NOTIFICATION_INBOX);
        const cursorReq = inboxStore.openCursor();
        cursorReq.onsuccess = () => {
          const cursor = cursorReq.result;
          if (cursor) {
            const item = cursor.value;
            if (!item.isRead) {
              cursor.update({ ...item, isRead: true });
            }
            cursor.continue();
          }
        };
      } catch (err) {
        console.warn('[LocalDB] Could not update inbox markAllRead:', err);
      }
    }

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Mark a log record as pushed (i.e. system/device notification actually shown). */
export async function markLogPushed(clientId: string, pushedAt: string): Promise<void> {
  const db = await getDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORES.NOTIFICATION_LOGS, 'readwrite');
    const store = tx.objectStore(STORES.NOTIFICATION_LOGS);
    const req = store.get(clientId);
    req.onsuccess = () => {
      const record = req.result;
      if (record && !record.pushedAt) {
        record.pushedAt = pushedAt;
        record.updatedAt = new Date().toISOString();
        record.syncStatus = 'PENDING';
        store.put(record);
        enqueueChange('notification_log', 'update', clientId, { pushedAt, updatedAt: record.updatedAt }).catch(console.error);
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Mark logs as included in a digest summary. */
export async function markLogsDigestSent(clientIds: string[], sentAt: string): Promise<void> {
  if (clientIds.length === 0) return;
  const db = await getDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORES.NOTIFICATION_LOGS, 'readwrite');
    const store = tx.objectStore(STORES.NOTIFICATION_LOGS);
    for (const id of clientIds) {
      const req = store.get(id);
      req.onsuccess = () => {
        const record = req.result;
        if (record && !record.digestSentAt) {
          record.digestSentAt = sentAt;
          record.updatedAt = new Date().toISOString();
          record.syncStatus = 'PENDING';
          store.put(record);
          enqueueChange('notification_log', 'update', id, { digestSentAt: sentAt, updatedAt: record.updatedAt }).catch(console.error);
        }
      };
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
