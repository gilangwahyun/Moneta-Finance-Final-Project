import { getDB } from "./index";
import { STORES } from "./schema";

/**
 * Clears all local IndexedDB data stores except the users store.
 * The users store is preserved to maintain the current session.
 * 
 * Called before hydration (full pull from server) to reset local state.
 * Does NOT affect server data.
 */
export async function clearLocalCache(): Promise<void> {
  const db = await getDB();
  
  const storesToClear = [
    STORES.TRANSACTIONS,
    STORES.CATEGORIES,
    STORES.WALLETS,
    STORES.BUDGETS,
    STORES.FINANCIAL_TARGETS,
    STORES.SYNC_QUEUE,
    STORES.NOTIFICATION_LOGS,
    STORES.NOTIFICATION_INBOX,
  ] as const;
  
  for (const storeName of storesToClear) {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(storeName, "readwrite");
      tx.objectStore(storeName).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}
