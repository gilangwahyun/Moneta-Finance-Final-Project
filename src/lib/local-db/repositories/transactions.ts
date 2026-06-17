// ─── Transactions IndexedDB Repository ──────────────────
// Full CRUD operations for transactions in the local IndexedDB store.
//
// Architecture: Local-First
//   - UI reads/writes ONLY to IndexedDB through these functions
//   - All mutations auto-enqueue to sync_queue
//   - The sync engine pushes queued changes to the server

import { getDB } from '../index';
import { STORES } from '../schema';
import { Transaction, TransactionType } from '@/types/models.types';
import { enqueueChange } from './sync-queue';
import { generateClientId } from '@/lib/utils/helpers';
import { evaluateAndTriggerNudges, evaluateTargetNudges } from '@/lib/notifications/local-engine';

/********** Create **********/

export interface AddTransactionInput {
  amount: number;
  type: TransactionType;
  description?: string | null;
  note?: string | null;
  date: string; /********** YYYY-MM-DD */
  walletId: string; /********** clientId of source wallet (required) */
  targetWalletId?: string | null; /********** clientId of destination wallet (TRANSFER only) */
  categoryId?: string | null; /********** clientId of category (optional — null for TRANSFER) */
  userId: string;
}

/**
 * Record a new transaction with a client-generated UUID.
 * Automatically sets syncStatus to PENDING and enqueues for sync.
 *
 * @returns The created transaction (with its clientId)
 */
export async function addTransaction(input: AddTransactionInput): Promise<Transaction> {
  const now = new Date().toISOString();

  const transaction: Transaction = {
    clientId: generateClientId(),
    amount: input.amount,
    type: input.type,
    description: input.description?.trim() || null,
    note: input.note?.trim() || null,
    /********** Always store only YYYY-MM-DD — never a full ISO datetime */
    date: (input.date || '').substring(0, 10),
    walletId: input.walletId,
    targetWalletId: input.targetWalletId ?? null,
    categoryId: input.categoryId ?? null,
    userId: input.userId,
    syncStatus: 'PENDING',
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  const db = await getDB();

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORES.TRANSACTIONS, 'readwrite');
    const store = tx.objectStore(STORES.TRANSACTIONS);
    store.put(transaction);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  await enqueueChange('transaction', 'create', transaction.clientId, {
    ...transaction,
  });

  /********** Trigger offline-first notification evaluation */
  //********** We fire this asynchronously so it doesn't block the UI return. */
  evaluateAndTriggerNudges(transaction).catch((err) => {
    console.error('[TransactionsRepo] evaluateAndTriggerNudges failed:', err);
  });
  evaluateTargetNudges(transaction).catch((err) => {
    console.error('[TransactionsRepo] evaluateTargetNudges failed:', err);
  });

  return transaction;
}

// ─── Update ─────────────────────────────────────────────

export interface UpdateTransactionInput {
  clientId: string;
  amount?: number;
  type?: TransactionType;
  description?: string | null;
  note?: string | null;
  date?: string;
  walletId?: string;
  targetWalletId?: string | null;
  categoryId?: string | null;
}

/**
 * Update specific fields of an existing transaction.
 * Marks as PENDING and enqueues the mutation for sync.
 *
 * @returns The updated transaction, or null if not found
 */
export async function updateTransaction(input: UpdateTransactionInput): Promise<Transaction | null> {
  const existing = await getTransactionById(input.clientId);
  if (!existing) return null;

  const updated: Transaction = {
    ...existing,
    amount: input.amount !== undefined ? input.amount : existing.amount,
    type: input.type !== undefined ? input.type : existing.type,
    description: input.description !== undefined ? input.description?.trim() || null : existing.description,
    note: input.note !== undefined ? input.note?.trim() || null : existing.note,
    date: input.date !== undefined ? (input.date || '').substring(0, 10) : existing.date,
    walletId: input.walletId !== undefined ? input.walletId : existing.walletId,
    targetWalletId: input.targetWalletId !== undefined ? input.targetWalletId : existing.targetWalletId,
    categoryId: input.categoryId !== undefined ? input.categoryId : existing.categoryId,
    syncStatus: 'PENDING',
    updatedAt: new Date().toISOString(),
  };

  const db = await getDB();

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORES.TRANSACTIONS, 'readwrite');
    const store = tx.objectStore(STORES.TRANSACTIONS);
    store.put(updated);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  await enqueueChange('transaction', 'update', updated.clientId, {
    ...updated,
  });

  evaluateTargetNudges(updated).catch((err) => {
    console.error('[TransactionsRepo] evaluateTargetNudges failed on update:', err);
  });

  return updated;
}

// ─── Soft Delete ────────────────────────────────────────

/**
 * Soft-delete a transaction by setting deletedAt timestamp.
 */
export async function deleteTransaction(clientId: string): Promise<boolean> {
  const existing = await getTransactionById(clientId);
  if (!existing) return false;

  const now = new Date().toISOString();
  const updated: Transaction = {
    ...existing,
    deletedAt: now,
    syncStatus: 'PENDING',
    updatedAt: now,
  };

  const db = await getDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORES.TRANSACTIONS, 'readwrite');
    const store = tx.objectStore(STORES.TRANSACTIONS);
    store.put(updated);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  await enqueueChange('transaction', 'delete', clientId, { deletedAt: now });

  return true;
}

/**
 * Hard-delete a transaction from IndexedDB.
 * Used during conflict resolution when the server rejects a transaction.
 */
export async function hardDeleteTransaction(clientId: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.TRANSACTIONS, 'readwrite');
    const req = tx.objectStore(STORES.TRANSACTIONS).delete(clientId);
    req.onerror = (e) => reject((e.target as IDBRequest).error);
    tx.oncomplete = () => resolve();
    tx.onerror = (e) => reject(tx.error || (e.target as any).error || new Error('IDB Error'));
  });
}

// ─── Query Helpers ───────────────────────────────────────────────

/**
 * Get all non-deleted transactions for a user.
 */
export async function getAllTransactions(userId: string): Promise<Transaction[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.TRANSACTIONS, 'readonly');
    const store = tx.objectStore(STORES.TRANSACTIONS);
    const index = store.index('by_userId');
    const request = index.getAll(userId);

    request.onsuccess = () => {
      const results = (request.result as Transaction[]).filter((t) => !t.deletedAt);
      resolve(results);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get a single transaction by clientId.
 */
export async function getTransactionById(clientId: string): Promise<Transaction | undefined> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.TRANSACTIONS, 'readonly');
    const store = tx.objectStore(STORES.TRANSACTIONS);
    const request = store.get(clientId);

    request.onsuccess = () => resolve(request.result as Transaction | undefined);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get transactions within a date range for a user.
 */
export async function getTransactionsByDateRange(userId: string, startDate: string, endDate: string): Promise<Transaction[]> {
  const all = await getAllTransactions(userId);
  return all.filter((t) => {
    // Normalize: take only YYYY-MM-DD portion for comparison
    const txnDate = t.date.substring(0, 10);
    return txnDate >= startDate && txnDate <= endDate;
  });
}

/**
 * Get recent transactions, sorted by date descending.
 */
export async function getRecentTransactions(userId: string, limit: number = 20): Promise<Transaction[]> {
  const all = await getAllTransactions(userId);
  return all
    .sort((a, b) => {
      // Sort by date desc, then by createdAt desc
      const dateCmp = b.date.localeCompare(a.date);
      if (dateCmp !== 0) return dateCmp;
      return b.createdAt.localeCompare(a.createdAt);
    })
    .slice(0, limit);
}

// ─── Sync Helpers ───────────────────────────────────────

/**
 * Low-level upsert — used by the sync engine to apply server data.
 */
export async function upsertTransaction(transaction: Transaction, skipQueue: boolean = false): Promise<void> {
  const db = await getDB();

  const existing = await getTransactionById(transaction.clientId);
  const action = existing ? 'update' : 'create';

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORES.TRANSACTIONS, 'readwrite');
    const store = tx.objectStore(STORES.TRANSACTIONS);
    store.put(transaction);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  if (!skipQueue) {
    await enqueueChange('transaction', action, transaction.clientId, {
      ...transaction,
    });
  }
}

/**
 * Bulk upsert transactions — used by the sync engine to apply multiple server records in one IDB transaction.
 */
export async function bulkUpsertTransactions(transactions: Transaction[]): Promise<void> {
  if (transactions.length === 0) return;
  const db = await getDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORES.TRANSACTIONS, 'readwrite');
    const store = tx.objectStore(STORES.TRANSACTIONS);
    for (const transaction of transactions) {
      store.put(transaction);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Get all transactions with PENDING sync status.
 */
export async function getPendingTransactions(): Promise<Transaction[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.TRANSACTIONS, 'readonly');
    const store = tx.objectStore(STORES.TRANSACTIONS);
    const index = store.index('by_syncStatus');
    const request = index.getAll('PENDING');

    request.onsuccess = () => resolve(request.result as Transaction[]);
    request.onerror = () => reject(request.error);
  });
}
