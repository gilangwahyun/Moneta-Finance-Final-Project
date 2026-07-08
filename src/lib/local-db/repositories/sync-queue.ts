/*
 * File: src/lib/local-db/repositories/sync-queue.ts
 * Description: Repositori lokal IndexedDB untuk pencatatan antrean sinkronisasi (sync queue),
 * merekam setiap mutasi lokal (create, update, delete) secara terurut menggunakan ID auto-increment.
 */

import { getDB } from "../index";
import { STORES } from "../schema";
import { SyncQueueEntry, SyncQueueAction, SyncQueueEntity } from "@/types/models.types";

/********** Operasi Penambahan Antrean (Enqueue) **********/

/**
 * Memasukkan mutasi ke dalam antrean sinkronisasi.
 * Dipanggil secara otomatis oleh repositori entitas saat operasi create, update, atau delete.
 *
 * @param entity - Jenis entitas yang dimutasi (misal: category, transaction).
 * @param action - Jenis aksi (create, update, delete).
 * @param clientId - ID unik lokal dari rekod yang dimutasi.
 * @param data - Payload data mutasi.
 * @returns Promise berisi ID auto-increment dari entri antrean yang baru dibuat.
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

/********** Operasi Pembacaan & Status Antrean **********/

/**
 * Mengambil semua entri antrean yang tertunda dari store, diurutkan berdasarkan ID (urutan masukan).
 *
 * @returns Promise berisi array SyncQueueEntry.
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
 * Menghitung jumlah entri aktif yang tertunda di antrean (tidak termasuk yang dikarantina/gagal permanen).
 *
 * @returns Promise berisi jumlah entri aktif.
 */
export async function getPendingCount(): Promise<number> {
  const all = await getAllPending();
  return all.filter(e => !e.failedAt && (e.retryCount ?? 0) < 3).length;
}

/**
 * Menghitung jumlah entri yang mengalami kegagalan permanen atau masuk karantina.
 *
 * @returns Promise berisi jumlah entri ter-karantina.
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
 * Mengambil ringkasan ringan dari seluruh item di dalam antrean.
 *
 * @returns Promise berisi array SyncQueueSummary.
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

/********** Operasi Penghapusan Antrean (Dequeue) **********/

/**
 * Menghapus entri tertentu berdasarkan ID dari antrean setelah sinkronisasi berhasil.
 *
 * @param ids - Array ID angka dari item antrean yang akan dihapus.
 * @returns Promise void setelah item dihapus.
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

/********** Penanganan Kegagalan & Karantina (Fault Handling) **********/

/**
 * Menandai entri antrean telah dicoba untuk dikirim.
 * Meningkatkan retryCount dan mencatat pesan error. Jika retryCount mencapai batas maksimal, entri masuk karantina (failedAt diisi).
 *
 * @param id - ID item antrean.
 * @param errorMsg - Pesan error kegagalan.
 * @param maxRetries - Batas maksimal percobaan ulang (default: 3).
 * @returns Promise void setelah status percobaan disimpan.
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
 * Mengambil seluruh entri yang gagal permanen/ter-karantina untuk keperluan inspeksi pengembang.
 *
 * @returns Promise berisi array SyncQueueEntry yang ter-karantina.
 */
export async function getFailedSyncQueueEntries(): Promise<SyncQueueEntry[]> {
  const all = await getAllPending();
  return all.filter((e) => !!e.failedAt);
}

/**
 * Memulihkan entri log notifikasi ter-karantina yang gagal karena error tertentu (misal: DataError atau Push failed).
 *
 * @returns Promise void setelah item log dipulihkan ke antrean aktif.
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
      /********** Bug sebelumnya menyebabkan error "DataError" atau "Push failed"; reset retryCount jika memenuhi syarat. */
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

/********** Operasi Pembersihan & Pengelompokan **********/

/**
 * Mengosongkan seluruh isi antrean sinkronisasi.
 * Digunakan setelah sinkronisasi penuh berhasil atau saat mereset database lokal.
 *
 * @returns Promise void setelah antrean dikosongkan.
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
 * Mengambil daftar entri tertunda yang dikelompokkan berdasarkan jenis entitasnya.
 *
 * @returns Promise berisi objek yang mengelompokkan SyncQueueEntry berdasarkan entitas.
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
