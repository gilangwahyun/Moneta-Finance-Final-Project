/*
 * File: src/lib/local-db/repositories/notification-settings.ts
 * Description: Repositori lokal IndexedDB untuk manajemen pengaturan notifikasi pengguna,
 * mendukung preferensi pengiriman pesan dan sinkronisasi ke server.
 */

import { getDB } from "../index";
import { STORES } from "../schema";
import { enqueueChange } from "./sync-queue";

/********** Tipe Data & Antarmuka **********/

export interface NotificationSettingsRecord {
  clientId: string;    /* Format "notification-settings:" + userId */
  userId: string;
  isEnabled: boolean;
  deliveryMode: "INSTANT" | "BATCH" | "NONE";
  instantAlerts: boolean;
  dailyDigest: boolean;
  dailyReminder: boolean;
  digestTime: string;  /* Format jam "HH:MM" */
  dailyCap?: number;
  syncStatus: "SYNCED" | "PENDING" | "CONFLICT";
  updatedAt: string;   /* Format timestamp ISO */
}

/********** Operasi Pembacaan (Read) **********/

/**
 * Mengambil rekod pengaturan notifikasi pengguna dari IndexedDB lokal.
 *
 * @param userId - ID pengguna.
 * @returns Promise berisi NotificationSettingsRecord jika ada, atau null.
 */
export async function getNotificationSettings(userId: string): Promise<NotificationSettingsRecord | null> {
  const db = await getDB();
  const clientId = `notification-settings:${userId}`;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.NOTIFICATION_SETTINGS, "readonly");
    const store = tx.objectStore(STORES.NOTIFICATION_SETTINGS);
    const request = store.get(clientId);
    request.onsuccess = () => resolve(request.result as NotificationSettingsRecord || null);
    request.onerror = () => reject(request.error);
  });
}

/********** Operasi Penyimpanan & Sinkronisasi **********/

/**
 * Menyimpan atau memperbarui pengaturan notifikasi pengguna di database lokal.
 * Secara otomatis mengubah status sinkronisasi ke PENDING dan memasukkannya ke antrean sinkronisasi.
 *
 * @param settings - Objek pengaturan notifikasi yang akan disimpan.
 * @param skipSyncQueue - Jika true, perubahan tidak akan dimasukkan kembali ke antrean sinkronisasi.
 * @returns Promise void setelah penyimpanan selesai.
 */
export async function saveNotificationSettings(
  settings: NotificationSettingsRecord,
  skipSyncQueue = false
): Promise<void> {
  const db = await getDB();
  
  if (!skipSyncQueue) {
    settings.syncStatus = "PENDING";
    settings.updatedAt = new Date().toISOString();
  }

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORES.NOTIFICATION_SETTINGS, "readwrite");
    const store = tx.objectStore(STORES.NOTIFICATION_SETTINGS);
    const request = store.put(settings);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });

  if (!skipSyncQueue) {
    await enqueueChange(
      "notification_settings",
      "update",
      settings.clientId,
      { ...settings }
    );
  }
}

/**
 * Upsert pengaturan notifikasi secara massal — digunakan oleh mesin sinkronisasi untuk menerapkan banyak rekod sekaligus dalam satu transaksi IDB.
 *
 * @param settingsArray - Array objek NotificationSettingsRecord dari server.
 * @returns Promise void setelah semua rekod disimpan.
 */
export async function bulkUpsertNotificationSettings(settingsArray: NotificationSettingsRecord[]): Promise<void> {
  if (settingsArray.length === 0) return;
  const db = await getDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORES.NOTIFICATION_SETTINGS, "readwrite");
    const store = tx.objectStore(STORES.NOTIFICATION_SETTINGS);
    for (const settings of settingsArray) {
      store.put(settings);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
