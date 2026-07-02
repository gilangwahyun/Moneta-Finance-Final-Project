// ─── Wallets IndexedDB Repository ───────────────────────
// Full CRUD for wallets in the local IndexedDB store.
//
// Architecture: Local-First
//   - All mutations write to IDB first, then enqueue for sync.
//   - Balance is NEVER stored — always calculated from transactions.
//
// Calculated Balance Formula:
//   initialBalance
//   + SUM(INCOME txns for this wallet)
//   - SUM(EXPENSE txns for this wallet)
//   + SUM(TRANSFER where targetWalletId === this wallet)
//   - SUM(TRANSFER where walletId === this wallet)

import { getDB } from "../index";
import { STORES } from "../schema";
import { Wallet, WalletType, Transaction } from "@/types/models.types";
import { enqueueChange } from "./sync-queue";
import { generateClientId } from "@/lib/utils/helpers";

// ─── Wallet Type Labels ──────────────────────────────────

export const WALLET_TYPE_LABELS: Record<WalletType, string> = {
  TUNAI: "Tunai",
  BANK: "Bank",
  E_WALLET: "Dompet Digital",
  INVESTASI: "Investasi",
  LAINNYA: "Lainnya",
};

// ─── Create ─────────────────────────────────────────────

export interface AddWalletInput {
  name: string;
  type: WalletType;
  initialBalance?: number;
  userId: string;
}

/**
 * Add a new wallet. Auto-generates clientId and sets syncStatus PENDING.
 */
export async function addWallet(input: AddWalletInput): Promise<Wallet> {
  const now = new Date().toISOString();

  const wallet: Wallet = {
    clientId: generateClientId(),
    name: input.name.trim(),
    type: input.type,
    initialBalance: input.initialBalance ?? 0,
    userId: input.userId,
    syncStatus: "PENDING",
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  const db = await getDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORES.WALLETS, "readwrite");
    tx.objectStore(STORES.WALLETS).put(wallet);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  await enqueueChange("wallet", "create", wallet.clientId, { ...wallet });
  return wallet;
}

// ─── Update ─────────────────────────────────────────────

export interface UpdateWalletInput {
  clientId: string;
  name?: string;
  type?: WalletType;
  initialBalance?: number;
}

/**
 * Update wallet fields. Marks PENDING and enqueues for sync.
 */
export async function updateWallet(input: UpdateWalletInput): Promise<Wallet | null> {
  const existing = await getWalletById(input.clientId);
  if (!existing) return null;

  const updated: Wallet = {
    ...existing,
    name: input.name !== undefined ? input.name.trim() : existing.name,
    type: input.type !== undefined ? input.type : existing.type,
    initialBalance: input.initialBalance !== undefined ? input.initialBalance : existing.initialBalance,
    syncStatus: "PENDING",
    updatedAt: new Date().toISOString(),
  };

  const db = await getDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORES.WALLETS, "readwrite");
    tx.objectStore(STORES.WALLETS).put(updated);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  await enqueueChange("wallet", "update", updated.clientId, { ...updated });
  return updated;
}

// ─── Soft Delete ─────────────────────────────────────────

/**
 * Soft-delete a wallet (sets deletedAt timestamp).
 */
export async function deleteWallet(clientId: string): Promise<boolean> {
  const existing = await getWalletById(clientId);
  if (!existing) return false;

  const updated: Wallet = {
    ...existing,
    deletedAt: new Date().toISOString(),
    syncStatus: "PENDING",
    updatedAt: new Date().toISOString(),
  };

  const db = await getDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORES.WALLETS, "readwrite");
    tx.objectStore(STORES.WALLETS).put(updated);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  await enqueueChange("wallet", "delete", clientId, { ...updated });
  return true;
}

// ─── Hard Delete (Sync use only) ────────────────────────
export async function hardDeleteWallet(clientId: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.WALLETS, "readwrite");
    const store = tx.objectStore(STORES.WALLETS);
    const request = store.delete(clientId);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// ─── Read ────────────────────────────────────────────────

/**
 * Get all non-deleted wallets for a user, sorted by name.
 */
export async function getAllWallets(userId: string): Promise<Wallet[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.WALLETS, "readonly");
    const index = tx.objectStore(STORES.WALLETS).index("by_userId");
    const request = index.getAll(userId);

    request.onsuccess = () => {
      const results = (request.result as Wallet[])
        .filter((w) => !w.deletedAt)
        .sort((a, b) => a.name.localeCompare(b.name));
      resolve(results);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get a single wallet by clientId.
 */
export async function getWalletById(clientId: string): Promise<Wallet | undefined> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.WALLETS, "readonly");
    const request = tx.objectStore(STORES.WALLETS).get(clientId);
    request.onsuccess = () => resolve(request.result as Wallet | undefined);
    request.onerror = () => reject(request.error);
  });
}

// ─── Sync Helper ─────────────────────────────────────────

/**
 * Low-level upsert — used by the sync engine to apply server data.
 */
export async function upsertWallet(
  wallet: Wallet,
  skipQueue: boolean = false
): Promise<void> {
  const existing = await getWalletById(wallet.clientId);
  const action = existing ? "update" : "create";

  const db = await getDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORES.WALLETS, "readwrite");
    tx.objectStore(STORES.WALLETS).put(wallet);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  if (!skipQueue) {
    await enqueueChange("wallet", action, wallet.clientId, { ...wallet });
  }
}

/**
 * Bulk upsert wallets — used by the sync engine to apply multiple server records in one IDB transaction.
 */
export async function bulkUpsertWallets(wallets: Wallet[]): Promise<void> {
  if (wallets.length === 0) return;
  const db = await getDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORES.WALLETS, "readwrite");
    const store = tx.objectStore(STORES.WALLETS);
    for (const wallet of wallets) {
      store.put(wallet);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}


/**
 * Provision a default "Tunai" wallet for a user if they have no wallets.
 * Anti-Duplication Fix: Queries the cloud backend FIRST before creating.
 * Only seeds a default wallet if both local IDB AND server return 0 wallets.
 */
export async function provisionDefaultWallet(userId: string): Promise<void> {
  // Step 1: Check local IDB
  const localWallets = await getAllWallets(userId);
  if (localWallets.length > 0) return; // local has wallets already

  // Step 2: Check server (if online) before creating a default
  if (typeof navigator !== "undefined" && navigator.onLine) {
    try {
      const res = await fetch("/api/sync/pull?mode=hydrate");
      if (res.ok) {
        const json = await res.json();
        // The pull response wraps everything in { success: true, data: { wallets: [] } }
        const serverWallets = json?.data?.wallets ?? [];
        if (serverWallets.length > 0) {
          // Server has wallets — import them instead of creating duplicates
          for (const sw of serverWallets) {
            await upsertWallet({
              ...sw,
              syncStatus: "SYNCED",
            });
          }
          console.log(
            `[Wallets] Imported ${serverWallets.length} wallet(s) from server — no default created.`
          );
          return;
        }
      }
    } catch (err) {
      // Network error — fall through to default creation
      console.warn("[Wallets] Server check failed, falling back to default:", err);
    }
  }

  // Step 3: Both local AND server have 0 wallets — safe to create default
  await addWallet({
    name: "Tunai",
    type: "TUNAI",
    initialBalance: 0,
    userId,
  });

  console.log("[Wallets] Default 'Tunai' wallet provisioned for user:", userId);
}
