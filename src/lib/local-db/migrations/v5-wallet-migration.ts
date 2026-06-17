// ─── v5 Wallet Migration ─────────────────────────────────
// Data migration to handle transactions that existed in IndexedDB
// BEFORE the multi-wallet schema (v5) was introduced.
//
// The problem: old transactions have walletId = null/undefined.
// The server REQUIRES walletId for every transaction.
// Attempting to sync them causes a 500 error.
//
// Fix strategy:
//  1. Find all transactions missing walletId
//  2. Assign them to the user's first available wallet
//  3. If no wallet exists yet, mark them as "orphaned" (no-op on sync)
//  4. Remove stale sync_queue entries for truly un-salvageable records

import { getDB } from "../index";
import { STORES } from "../schema";
import { SyncQueueEntry } from "@/types/models.types";

const MIGRATION_KEY = "v5_wallet_migration_done";

/**
 * Run once: assign the default walletId to any legacy transactions
 * that were created before the multi-wallet feature.
 */
export async function runV5WalletMigration(userId: string): Promise<void> {
  const db = await getDB();

  // Check if migration already ran
  const alreadyRun = await new Promise<boolean>((resolve) => {
    const tx = db.transaction(STORES.SYNC_META, "readonly");
    const req = tx.objectStore(STORES.SYNC_META).get(MIGRATION_KEY);
    req.onsuccess = () => resolve(!!req.result);
    req.onerror = () => resolve(false);
  });

  if (alreadyRun) return;

  console.log("[Migration v5] Running wallet migration...");

  // Find user's first available wallet (by name ascending)
  const firstWallet = await new Promise<{ clientId: string } | null>((resolve) => {
    const tx = db.transaction(STORES.WALLETS, "readonly");
    const index = tx.objectStore(STORES.WALLETS).index("by_userId");
    const req = index.getAll(userId);
    req.onsuccess = () => {
      const wallets = (req.result as any[]).filter((w) => !w.deletedAt);
      wallets.sort((a, b) => a.name.localeCompare(b.name));
      resolve(wallets[0] ?? null);
    };
    req.onerror = () => resolve(null);
  });

  // Get all transactions for this user missing walletId
  const legacyTxns = await new Promise<any[]>((resolve) => {
    const tx = db.transaction(STORES.TRANSACTIONS, "readonly");
    const index = tx.objectStore(STORES.TRANSACTIONS).index("by_userId");
    const req = index.getAll(userId);
    req.onsuccess = () => {
      const results = req.result as any[];
      resolve(results.filter((t) => !t.walletId));
    };
    req.onerror = () => resolve([]);
  });

  if (legacyTxns.length === 0) {
    console.log("[Migration v5] No legacy transactions found. Marking done.");
    await markMigrationDone(db);
    return;
  }

  console.log(
    `[Migration v5] Found ${legacyTxns.length} legacy transactions without walletId.`
  );

  if (!firstWallet) {
    // No wallet exists yet — remove these from the sync queue so they
    // don't trigger 500 errors. They'll be re-synced if/when fixed.
    console.warn(
      "[Migration v5] No wallet available — removing legacy txns from sync queue."
    );
    await removeLegacyQueueEntries(db, legacyTxns.map((t) => t.clientId));
    await markMigrationDone(db);
    return;
  }

  // Assign the first wallet to all legacy transactions
  const now = new Date().toISOString();
  const updatedTxns = legacyTxns.map((t) => ({
    ...t,
    walletId: firstWallet.clientId,
    syncStatus: "PENDING",
    updatedAt: now,
  }));

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORES.TRANSACTIONS, "readwrite");
    const store = tx.objectStore(STORES.TRANSACTIONS);
    for (const txn of updatedTxns) {
      store.put(txn);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  console.log(
    `[Migration v5] Assigned wallet "${firstWallet.clientId}" to ${updatedTxns.length} legacy transactions.`
  );

  await markMigrationDone(db);
}

async function removeLegacyQueueEntries(
  db: IDBDatabase,
  clientIds: string[]
): Promise<void> {
  const clientIdSet = new Set(clientIds);

  // Find all sync_queue entries for these transaction clientIds
  const entriesToRemove = await new Promise<number[]>((resolve) => {
    const tx = db.transaction(STORES.SYNC_QUEUE, "readonly");
    const req = tx.objectStore(STORES.SYNC_QUEUE).getAll();
    req.onsuccess = () => {
      const all = req.result as SyncQueueEntry[];
      const ids = all
        .filter(
          (e) => e.entity === "transaction" && clientIdSet.has(e.clientId)
        )
        .map((e) => e.id!)
        .filter(Boolean);
      resolve(ids);
    };
    req.onerror = () => resolve([]);
  });

  if (entriesToRemove.length === 0) return;

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORES.SYNC_QUEUE, "readwrite");
    const store = tx.objectStore(STORES.SYNC_QUEUE);
    for (const id of entriesToRemove) {
      store.delete(id);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  console.log(
    `[Migration v5] Removed ${entriesToRemove.length} stale sync_queue entries.`
  );
}

async function markMigrationDone(db: IDBDatabase): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORES.SYNC_META, "readwrite");
    tx.objectStore(STORES.SYNC_META).put({
      key: MIGRATION_KEY,
      value: true,
      updatedAt: new Date().toISOString(),
    });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
