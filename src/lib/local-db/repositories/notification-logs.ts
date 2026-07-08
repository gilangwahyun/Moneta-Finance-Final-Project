/*
 * File: src/lib/local-db/repositories/notification-logs.ts
 * Description: Repositori lokal IndexedDB untuk pencatatan jejak audit (audit trail) setiap upaya notifikasi,
 * merekam event yang 'delivered' maupun 'suppressed' untuk kebutuhan analisis UCD dan sinkronisasi.
 */

import { getDB } from '../index';
import { STORES } from '../schema';
import { enqueueChange } from './sync-queue';

/********** Tipe Data & Antarmuka **********/

export interface NotificationLogRecord {
  clientId: string; /* ID unik untuk arsitektur offline-first */
  dedupeKey: string; /* Kunci untuk mencegah peringatan ganda */
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
  createdAt: string; /* Format timestamp ISO */
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
  
  /* Field metadata untuk rangkuman (digest) dan analitik */
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

/********** Operasi Upsert & Penyimpanan **********/

/**
 * Menyimpan atau memperbarui rekod log notifikasi di IndexedDB.
 * Digunakan oleh aplikasi maupun Service Worker, dan otomatis memasukkan mutasi ke antrean sinkronisasi.
 *
 * @param record - Objek NotificationLogRecord yang akan disimpan.
 * @param skipSyncQueue - Jika true, perubahan tidak akan dimasukkan ke antrean sinkronisasi.
 * @returns Promise void setelah penyimpanan selesai.
 */
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

      /********** Hapus rekod yang konflik secara manual menggunakan pencarian indeks. */
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
        tx.onerror = () => resolve(); /* Abaikan error saat pembersihan */
      });

      /********** Coba kembali operasi upsert setelah pembersihan. */
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
 * Upsert log notifikasi secara massal — digunakan oleh mesin sinkronisasi untuk menerapkan banyak rekod sekaligus dalam satu transaksi IDB.
 *
 * @param records - Array objek NotificationLogRecord dari server.
 * @returns Promise void setelah semua rekod disimpan.
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

/********** Operasi Pembacaan & Penghapusan **********/

/**
 * Mengambil rekod log notifikasi berdasarkan clientId lokal.
 *
 * @param clientId - ID lokal unik log notifikasi.
 * @returns Promise berisi NotificationLogRecord jika ditemukan, atau undefined.
 */
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

/**
 * Menghapus log notifikasi dari IndexedDB berdasarkan clientId.
 * Digunakan saat resolusi konflik sinkronisasi.
 *
 * @param clientId - ID lokal unik log notifikasi.
 * @returns Promise void setelah rekod dihapus.
 */
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

/**
 * Mengecek apakah notifikasi dengan dedupeKey tertentu sudah ada di database lokal.
 *
 * @param dedupeKey - Kunci unik deduplikasi notifikasi.
 * @returns Promise berisi boolean (true jika sudah ada).
 */
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

/**
 * Menghitung jumlah notifikasi yang berhasil dikirim hari ini untuk seorang pengguna (pengecekan batas global).
 *
 * @param userId - ID pengguna.
 * @returns Promise berisi jumlah notifikasi terkirim hari ini.
 */
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

/**
 * Mengambil semua rekod log yang belum tersinkronisasi (berstatus PENDING) untuk sinkronisasi massal ke server.
 *
 * @returns Promise berisi array NotificationLogRecord yang belum tersinkron.
 */
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

/**
 * Mengambil seluruh riwayat log notifikasi untuk pengguna tertentu.
 *
 * @param userId - ID pengguna.
 * @returns Promise berisi array seluruh NotificationLogRecord milik pengguna.
 */
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

/********** Operasi Perubahan Status (Status Mutations) **********/

/**
 * Menandai daftar rekod log sebagai tersinkronisasi (SYNCED) setelah berhasil di-POST ke server.
 *
 * @param clientIds - Array clientId log yang sukses dikirim.
 * @returns Promise void setelah pembaruan status selesai.
 */
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

/**
 * Menandai satu rekod log sebagai sudah dibaca (read) di lokal dan memperbarui status pada store inbox jika ada.
 *
 * @param clientId - ID lokal unik log notifikasi.
 * @returns Promise void setelah status dibaca diperbarui.
 */
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

/**
 * Menandai semua rekod log sebagai sudah dibaca (read) untuk seorang pengguna.
 *
 * @param userId - ID pengguna.
 * @returns Promise void setelah semua log diperbarui.
 */
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

/**
 * Menandai rekod log sebagai telah di-push (notifikasi sistem/perangkat benar-benar ditampilkan).
 *
 * @param clientId - ID lokal unik log notifikasi.
 * @param pushedAt - Timestamp ISO kapan notifikasi ditampilkan.
 * @returns Promise void setelah status push diperbarui.
 */
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

/**
 * Menandai daftar rekod log sebagai telah dirangkum dalam notifikasi digest.
 *
 * @param clientIds - Array clientId log yang masuk dalam digest.
 * @param sentAt - Timestamp ISO kapan digest dikirimkan.
 * @returns Promise void setelah status digest diperbarui.
 */
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
