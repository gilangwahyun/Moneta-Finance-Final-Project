import { getDB } from "../index";
import { STORES } from "../schema";
import { enqueueChange } from "./sync-queue";

export interface NotificationSettingsRecord {
  clientId: string;    // "notification-settings:" + userId
  userId: string;
  isEnabled: boolean;
  deliveryMode: "INSTANT" | "BATCH" | "NONE";
  instantAlerts: boolean;
  dailyDigest: boolean;
  dailyReminder: boolean;
  digestTime: string;  // "HH:MM"
  dailyCap?: number;
  syncStatus: "SYNCED" | "PENDING" | "CONFLICT";
  updatedAt: string;   // ISO string
}

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
 * Bulk upsert notification settings — used by the sync engine to apply multiple server records in one IDB transaction.
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
