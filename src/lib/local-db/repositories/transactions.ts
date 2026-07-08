/*
 * File: src/lib/local-db/repositories/transactions.ts
 * Description: Repositori lokal IndexedDB untuk manajemen operasi CRUD transaksi,
 * mendukung arsitektur offline-first dengan antrean sinkronisasi otomatis.
 */

import { getDB } from '../index';
import { STORES } from '../schema';
import { Transaction, TransactionType } from '@/types/models.types';
import { enqueueChange } from './sync-queue';
import { generateClientId } from '@/lib/utils/helpers';
import { evaluateAndTriggerNudges, evaluateTargetNudges } from '@/lib/notifications/local-engine';

/********** Tipe dan Operasi Pembuatan (Create) **********/

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
 * Mencatat transaksi baru dengan UUID lokal yang dibuat oleh klien.
 * Secara otomatis mengatur syncStatus ke PENDING dan memasukkannya ke antrean sinkronisasi.
 *
 * @param input - Data input transaksi (amount, type, description, note, date, walletId, dll).
 * @returns Promise berisi objek Transaction yang baru dibuat.
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

  /********** Memicu evaluasi notifikasi offline-first secara asinkron (tanpa memblokir UI). */
  evaluateAndTriggerNudges(transaction).catch((err) => {
    console.error('[TransactionsRepo] evaluateAndTriggerNudges failed:', err);
  });
  evaluateTargetNudges(transaction).catch((err) => {
    console.error('[TransactionsRepo] evaluateTargetNudges failed:', err);
  });

  return transaction;
}

/********** Operasi Pembaruan (Update) **********/

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
 * Memperbarui field tertentu dari transaksi yang sudah ada.
 * Menandai status sinkronisasi sebagai PENDING dan memasukkan mutasi ke antrean sinkronisasi.
 *
 * @param input - Data perubahan transaksi berdasarkan clientId.
 * @returns Promise berisi objek Transaction yang diperbarui, atau null jika tidak ditemukan.
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

/********** Operasi Penghapusan (Delete) **********/

/**
 * Melakukan soft-delete pada transaksi dengan menandai timestamp deletedAt.
 *
 * @param clientId - ID lokal unik dari transaksi yang akan dihapus.
 * @returns Promise berisi boolean yang menunjukkan apakah rekod ditemukan dan dihapus.
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
 * Menghapus transaksi secara permanen dari IndexedDB lokal.
 * Digunakan saat resolusi konflik ketika server menolak transaksi.
 *
 * @param clientId - ID lokal unik dari transaksi yang akan dihapus permanen.
 * @returns Promise void setelah rekod dihapus.
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

/********** Helper Kueri Pencarian (Query Helpers) **********/

/**
 * Mengambil seluruh transaksi aktif (tidak terhapus) milik seorang pengguna.
 *
 * @param userId - ID pengguna pemilik transaksi.
 * @returns Promise berisi array Transaction.
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
 * Mengambil satu transaksi berdasarkan clientId lokal.
 *
 * @param clientId - ID lokal unik transaksi.
 * @returns Promise berisi Transaction jika ditemukan, atau undefined.
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
 * Mengambil daftar transaksi dalam rentang tanggal tertentu untuk seorang pengguna.
 *
 * @param userId - ID pengguna.
 * @param startDate - Tanggal awal dalam format YYYY-MM-DD.
 * @param endDate - Tanggal akhir dalam format YYYY-MM-DD.
 * @returns Promise berisi array Transaction dalam rentang tersebut.
 */
export async function getTransactionsByDateRange(userId: string, startDate: string, endDate: string): Promise<Transaction[]> {
  const all = await getAllTransactions(userId);
  return all.filter((t) => {
    /********** Normalisasi: ambil bagian YYYY-MM-DD saja untuk perbandingan. */
    const txnDate = t.date.substring(0, 10);
    return txnDate >= startDate && txnDate <= endDate;
  });
}

/**
 * Mengambil transaksi terbaru, diurutkan menurun berdasarkan tanggal.
 *
 * @param userId - ID pengguna.
 * @param limit - Jumlah maksimal transaksi yang diambil (default 20).
 * @returns Promise berisi array Transaction terbaru.
 */
export async function getRecentTransactions(userId: string, limit: number = 20): Promise<Transaction[]> {
  const all = await getAllTransactions(userId);
  return all
    .sort((a, b) => {
      /********** Urutkan berdasarkan tanggal menurun, kemudian createdAt menurun. */
      const dateCmp = b.date.localeCompare(a.date);
      if (dateCmp !== 0) return dateCmp;
      return b.createdAt.localeCompare(a.createdAt);
    })
    .slice(0, limit);
}

/********** Helper Sinkronisasi (Sync Helpers) **********/

/**
 * Upsert tingkat rendah (low-level) — digunakan oleh mesin sinkronisasi untuk menerapkan data dari server.
 *
 * @param transaction - Objek Transaction dari server.
 * @param skipQueue - Jika true, perubahan tidak akan dimasukkan kembali ke antrean sinkronisasi.
 * @returns Promise void setelah penyimpanan selesai.
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
 * Upsert transaksi secara massal — digunakan oleh mesin sinkronisasi untuk menerapkan banyak rekod sekaligus dalam satu transaksi IDB.
 *
 * @param transactions - Array objek Transaction dari server.
 * @returns Promise void setelah semua rekod disimpan.
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
 * Mengambil semua transaksi dengan status sinkronisasi PENDING.
 *
 * @returns Promise berisi array Transaction yang berstatus PENDING.
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
