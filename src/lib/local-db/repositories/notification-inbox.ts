// ─── Notification Inbox Repository ──────────────────────
// Local IndexedDB store for received notifications.
// Persists the notification inbox without needing a server round-trip.
//
// Type: 'INSTANT' | 'DIGEST'
// isRead tracks read status locally (mirrored to server when online).

import { getDB } from "../index";
import { STORES } from "../schema";

type NotificationInboxType = "INSTANT" | "DIGEST";

export interface NotificationInboxItem {
  id?: number;           // Auto-increment key
  title: string;
  body: string;
  type: NotificationInboxType;
  createdAt: string;     // ISO 8601
  isRead: boolean;
  logId?: string | null; // Server-side NotificationLog UUID (for mark-read)
}

/**
 * Add a notification to the local inbox.
 */
export async function addToInbox(
  item: Omit<NotificationInboxItem, "id">
): Promise<number> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.NOTIFICATION_INBOX, "readwrite");
    const req = tx.objectStore(STORES.NOTIFICATION_INBOX).add(item);
    req.onsuccess = () => resolve(req.result as number);
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Get all notifications, newest first.
 */
async function getAllInboxItems(): Promise<NotificationInboxItem[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.NOTIFICATION_INBOX, "readonly");
    const req = tx.objectStore(STORES.NOTIFICATION_INBOX).getAll();
    req.onsuccess = () => {
      const items = (req.result as NotificationInboxItem[]).sort(
        (a, b) => b.createdAt.localeCompare(a.createdAt)
      );
      resolve(items);
    };
    req.onerror = () => reject(req.error);
  });
}

/**
 * Count unread notifications.
 */
export async function getUnreadCount(): Promise<number> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.NOTIFICATION_INBOX, "readonly");
    const index = tx.objectStore(STORES.NOTIFICATION_INBOX).index("by_isRead");
    // IDBKeyRange.only(false) counts all isRead === false entries
    const req = index.count(IDBKeyRange.only(false));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Mark a single notification as read by its auto-increment id.
 */
async function markInboxItemRead(id: number): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.NOTIFICATION_INBOX, "readwrite");
    const store = tx.objectStore(STORES.NOTIFICATION_INBOX);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const item = getReq.result as NotificationInboxItem | undefined;
      if (item) {
        item.isRead = true;
        store.put(item);
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Mark all notifications as read.
 */
async function markAllInboxRead(): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.NOTIFICATION_INBOX, "readwrite");
    const store = tx.objectStore(STORES.NOTIFICATION_INBOX);
    const req = store.openCursor();
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) {
        const item = cursor.value as NotificationInboxItem;
        if (!item.isRead) {
          cursor.update({ ...item, isRead: true });
        }
        cursor.continue();
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Delete notifications older than 30 days (cleanup).
 */
async function pruneOldInboxItems(): Promise<void> {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.NOTIFICATION_INBOX, "readwrite");
    const store = tx.objectStore(STORES.NOTIFICATION_INBOX);
    const req = store.openCursor();
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) {
        const item = cursor.value as NotificationInboxItem;
        if (item.createdAt < cutoff) {
          cursor.delete();
        }
        cursor.continue();
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
