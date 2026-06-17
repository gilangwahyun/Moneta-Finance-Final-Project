// ─── User Local Storage Repository ──────────────────────
// Stores the authenticated user info in IndexedDB sync_meta store.
// This is NOT for multi-user data — just caching the current session.

import { getDB } from "../index";
import { STORES } from "../schema";
import { User } from "@/types/models.types";

const USER_KEY = "current_user";
const LAST_SYNCED_KEY = "last_synced_at";

/**
 * Save the current authenticated user locally.
 * Also auto-provisions a default "Tunai" wallet if the user has none.
 */
export async function upsertUser(user: User): Promise<void> {
  const db = await getDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORES.SYNC_META, "readwrite");
    const store = tx.objectStore(STORES.SYNC_META);
    store.put({ key: USER_KEY, value: user });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  // Lazy import avoids circular dependency (wallets.ts imports from users.ts via getCurrentUser)
  const { provisionDefaultWallet } = await import("./wallets");
  await provisionDefaultWallet(user.id);

  // Run once-per-device migration: fix legacy transactions missing walletId
  // (transactions created before the multi-wallet v5 schema)
  const { runV5WalletMigration } = await import("../migrations/v5-wallet-migration");
  await runV5WalletMigration(user.id).catch((err) =>
    console.error("[Migration v5] Failed:", err)
  );
}

/**
 * Retrieve the current authenticated user from local storage.
 */
export async function getCurrentUser(): Promise<User | null> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.SYNC_META, "readonly");
    const store = tx.objectStore(STORES.SYNC_META);
    const request = store.get(USER_KEY);

    request.onsuccess = () => {
      const result = request.result;
      resolve(result ? result.value : null);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Save the last sync timestamp.
 */
export async function setLastSyncedAt(timestamp: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.SYNC_META, "readwrite");
    const store = tx.objectStore(STORES.SYNC_META);
    store.put({ key: LAST_SYNCED_KEY, value: timestamp });

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Get the last sync timestamp.
 */
export async function getLastSyncedAt(): Promise<string | null> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.SYNC_META, "readonly");
    const store = tx.objectStore(STORES.SYNC_META);
    const request = store.get(LAST_SYNCED_KEY);

    request.onsuccess = () => {
      const result = request.result;
      resolve(result ? result.value : null);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Clear all local session data (used on logout).
 */
export async function clearLocalSession(): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.SYNC_META, "readwrite");
    const store = tx.objectStore(STORES.SYNC_META);
    store.clear();

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
