/*
 * File: src/lib/local-db/repositories/budgets.ts
 * Description: Repositori lokal IndexedDB untuk manajemen data anggaran (budgets),
 * termasuk operasi CRUD, deduping, dan subsidi silang (reallokasi).
 */

import { getDB } from "../index";
import { STORES } from "../schema";
import { Budget } from "@/types/models.types";
import { enqueueChange } from "./sync-queue";
import { generateClientId } from "@/lib/utils/helpers";

/********** Tipe dan Antarmuka Data **********/

export interface UpsertBudgetInput {
  clientId?: string;
  amount: number;
  period: string; /* Format YYYY-MM */
  categoryId: string;
  userId: string;
}

/********** Operasi Utama (CRUD UI) **********/

/**
 * Mengatur atau memperbarui batas anggaran untuk kategori dan periode tertentu (fungsi UI).
 * Perubahan akan dimasukkan ke dalam antrean sinkronisasi (sync queue).
 *
 * Mencegah anggaran duplikat: jika anggaran untuk kombinasi categoryId + period sudah ada,
 * maka rekod tersebut akan diperbarui, bukan membuat rekod baru.
 *
 * @param input - Data input anggaran (amount, period, categoryId, userId, dan clientId opsional).
 * @returns Promise berisi objek Budget yang baru atau diperbarui.
 */
export async function setBudget(input: UpsertBudgetInput): Promise<Budget> {
  /********** 1. Coba cari berdasarkan clientId eksplicit (mode edit). */
  let existing = input.clientId ? await getBudgetById(input.clientId) : null;

  /********** 2. Jika tidak ditemukan berdasarkan clientId, cek apakah ada budget dengan kategori+periode yang sama.
   * Hal ini mencegah duplikasi saat pengguna menekan tombol "Atur Anggaran" berulang kali.
   */
  if (!existing) {
    existing = await getBudgetByCategoryAndPeriod(input.userId, input.categoryId, input.period) ?? null;
  }

  const now = new Date().toISOString();
  
  const budget: Budget = existing ? {
    ...existing,
    amount: input.amount,
    period: input.period,
    categoryId: input.categoryId,
    syncStatus: "PENDING",
    updatedAt: now,
  } : {
    clientId: generateClientId(),
    amount: input.amount,
    period: input.period,
    categoryId: input.categoryId,
    userId: input.userId,
    syncStatus: "PENDING",
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  const db = await getDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORES.BUDGETS, "readwrite");
    const store = tx.objectStore(STORES.BUDGETS);
    store.put(budget);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  const action = existing ? "update" : "create";
  await enqueueChange("budget", action, budget.clientId, { ...budget });

  return budget;
}

/**
 * Mengambil satu anggaran berdasarkan clientId dari IndexedDB lokal.
 *
 * @param clientId - ID unik lokal dari anggaran yang dicari.
 * @returns Promise berisi Budget jika ditemukan, atau undefined.
 */
export async function getBudgetById(clientId: string): Promise<Budget | undefined> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.BUDGETS, "readonly");
    const store = tx.objectStore(STORES.BUDGETS);
    const request = store.get(clientId);
    request.onsuccess = () => resolve(request.result as Budget | undefined);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Mengambil daftar seluruh anggaran aktif milik user untuk periode tertentu.
 *
 * @param userId - ID pengguna pemilik anggaran.
 * @param period - Periode anggaran dalam format YYYY-MM.
 * @returns Promise berisi array Budget.
 */
export async function getBudgetsByPeriod(userId: string, period: string): Promise<Budget[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.BUDGETS, "readonly");
    const store = tx.objectStore(STORES.BUDGETS);
    const index = store.index("by_userId_period");
    const request = index.getAll([userId, period]);

    request.onsuccess = () => {
      const results = (request.result as Budget[]).filter((b) => !b.deletedAt);
      resolve(results);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Mencari anggaran aktif (tidak terhapus) berdasarkan categoryId dan periode untuk seorang user.
 * Digunakan untuk mencegah penambahan anggaran duplikat.
 *
 * @param userId - ID pengguna pemilik anggaran.
 * @param categoryId - ID kategori anggaran.
 * @param period - Periode anggaran dalam format YYYY-MM.
 * @returns Promise berisi Budget jika ditemukan, atau undefined jika tidak.
 */
async function getBudgetByCategoryAndPeriod(
  userId: string,
  categoryId: string,
  period: string
): Promise<Budget | undefined> {
  const budgets = await getBudgetsByPeriod(userId, period);
  return budgets.find((b) => b.categoryId === categoryId);
}

/********** Operasi Sinkronisasi & Low-Level **********/

/**
 * Menerapkan data anggaran dari server secara langsung ke IDB lokal tanpa memicu sync queue.
 *
 * @param budget - Objek Budget dari server.
 * @returns Promise void setelah penyimpanan selesai.
 */
async function applyServerBudget(budget: Budget): Promise<void> {
  const db = await getDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORES.BUDGETS, "readwrite");
    const store = tx.objectStore(STORES.BUDGETS);
    store.put(budget);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Upsert tingkat rendah (low-level) — digunakan oleh mesin sinkronisasi untuk menerapkan data dari server.
 *
 * @param budget - Objek Budget dari server yang akan di-upsert.
 * @param skipQueue - Jika true, perubahan tidak akan dimasukkan kembali ke antrean sinkronisasi.
 * @returns Promise void setelah penyimpanan selesai.
 */
export async function upsertBudget(
  budget: Budget,
  skipQueue: boolean = false
): Promise<void> {
  const db = await getDB();

  const existing = await getBudgetById(budget.clientId);
  const action = existing ? "update" : "create";

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORES.BUDGETS, "readwrite");
    const store = tx.objectStore(STORES.BUDGETS);
    store.put(budget);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  if (!skipQueue) {
    await enqueueChange("budget", action, budget.clientId, {
      ...budget,
    });
  }
}

/**
 * Upsert anggaran secara massal — digunakan oleh mesin sinkronisasi untuk menerapkan banyak rekod sekaligus dalam satu transaksi IDB.
 *
 * @param budgets - Array objek Budget dari server.
 * @returns Promise void setelah semua rekod disimpan.
 */
export async function bulkUpsertBudgets(budgets: Budget[]): Promise<void> {
  if (budgets.length === 0) return;
  const db = await getDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORES.BUDGETS, "readwrite");
    const store = tx.objectStore(STORES.BUDGETS);
    for (const budget of budgets) {
      store.put(budget);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Mengambil semua anggaran dengan status sinkronisasi "PENDING".
 * Digunakan untuk memulihkan atau menyinkronkan ulang anggaran yang belum terkirim.
 *
 * @returns Promise berisi array Budget yang berstatus PENDING.
 */
export async function getPendingBudgets(): Promise<Budget[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.BUDGETS, "readonly");
    const store = tx.objectStore(STORES.BUDGETS);
    const index = store.index("by_syncStatus");
    const request = index.getAll("PENDING");

    request.onsuccess = () => resolve(request.result as Budget[]);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Membersihkan anggaran duplikat yang memiliki kombinasi categoryId + period yang sama.
 * Rekod dengan updatedAt terbaru akan dipertahankan, sedangkan sisanya akan di-soft-delete.
 * Dipanggil saat awal proses sinkronisasi untuk mencegah pelanggaran constraint di server.
 *
 * @returns Promise berisi jumlah anggaran duplikat yang dihapus.
 */
export async function deduplicateBudgets(): Promise<number> {
  const db = await getDB();

  /********** Ambil semua anggaran yang belum terhapus dari IDB. */
  const all = await new Promise<Budget[]>((resolve, reject) => {
    const tx = db.transaction(STORES.BUDGETS, "readonly");
    const store = tx.objectStore(STORES.BUDGETS);
    const req = store.getAll();
    req.onsuccess = () => resolve((req.result as Budget[]).filter((b) => !b.deletedAt));
    req.onerror = () => reject(req.error);
  });

  /********** Kelompokkan anggaran berdasarkan userId + period + categoryId. */
  const groups = new Map<string, Budget[]>();
  for (const b of all) {
    const key = `${b.userId}_${b.period}_${b.categoryId}`;
    const list = groups.get(key) ?? [];
    list.push(b);
    groups.set(key, list);
  }

  let removed = 0;
  const now = new Date().toISOString();

  for (const [, list] of groups) {
    if (list.length <= 1) continue;

    /********** Urutkan menurun berdasarkan updatedAt — pertahankan yang pertama (paling baru). */
    list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    const [_keep, ...dupes] = list;

    for (const dupe of dupes) {
      const softDeleted: Budget = {
        ...dupe,
        deletedAt: now,
        updatedAt: now,
        syncStatus: "PENDING",
      };

      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORES.BUDGETS, "readwrite");
        tx.objectStore(STORES.BUDGETS).put(softDeleted);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });

      await enqueueChange("budget", "delete", dupe.clientId, { ...softDeleted });
      removed++;
    }
  }

  if (removed > 0) {
    console.log(`[BudgetRepo] Removed ${removed} duplicate budget(s) from IDB`);
  }

  return removed;
}

/********** Subsidi Silang (Reallokasi Anggaran) **********/

/**
 * Melakukan soft-delete pada anggaran dengan menandai deletedAt dan memasukkannya ke antrean sinkronisasi.
 *
 * @param clientId - ID unik lokal dari anggaran yang akan dihapus.
 * @returns Promise void setelah proses hapus dan antrean selesai.
 */
export async function deleteBudget(clientId: string): Promise<void> {
  const existing = await getBudgetById(clientId);
  if (!existing) return;

  const now = new Date().toISOString();
  const softDeleted: Budget = {
    ...existing,
    deletedAt: now,
    updatedAt: now,
    syncStatus: "PENDING",
  };

  const db = await getDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORES.BUDGETS, "readwrite");
    const req = tx.objectStore(STORES.BUDGETS).put(softDeleted);
    tx.oncomplete = () => resolve();
    tx.onerror = (e) => reject(tx.error || (e.target as any).error || new Error("IDB Error"));
  });

  await enqueueChange("budget", "delete", clientId, { ...softDeleted });
}

/********** Penghapusan Permanen (Khusus Sinkronisasi) **********/

/**
 * Menghapus rekod anggaran secara permanen dari IndexedDB lokal.
 *
 * @param clientId - ID unik lokal dari anggaran yang akan dihapus permanen.
 * @returns Promise void setelah rekod dihapus dari store IDB.
 */
export async function hardDeleteBudget(clientId: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.BUDGETS, "readwrite");
    const store = tx.objectStore(STORES.BUDGETS);
    const request = store.delete(clientId);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export interface ReallocationInput {
  /** clientId of the source budget (limit will be decremented) */
  sourceClientId: string;
  /** clientId of the destination budget (limit will be incremented) */
  destinationClientId: string;
  /** Amount to transfer. Must be > 0 and ≤ source.amount - spentAmount */
  amount: number;
}

export interface ReallocationResult {
  source: Budget;
  destination: Budget;
}

/**
 * Memindahkan batas anggaran bulanan secara atomik dari kategori sumber ke kategori tujuan pada periode yang sama.
 *
 * Kontrak Validasi (wajib dihitung dan dipastikan oleh pemanggil):
 * - amount > 0
 * - amount <= source.amount - spentAmount (sisa anggaran aktual yang belum terpakai, bukan batas total)
 *
 * Kedua penulisan ke IDB dilakukan dalam satu transaksi readwrite agar kegagalan parsial
 * tidak menyebabkan data tidak konsisten. Setelah sukses, kedua perubahan dimasukkan ke sync_queue.
 *
 * @param input - Data reallokasi (sourceClientId, destinationClientId, dan amount).
 * @returns Promise berisi hasil reallokasi (rekod sumber dan tujuan yang diperbarui).
 * @throws Error jika sumber/tujuan tidak ditemukan atau nominal tidak valid.
 */
export async function reallocateBudget(
  input: ReallocationInput
): Promise<ReallocationResult> {
  const { sourceClientId, destinationClientId, amount } = input;

  /********** 1. Ambil data anggaran sumber dan tujuan saat ini. */
  const [source, destination] = await Promise.all([
    getBudgetById(sourceClientId),
    getBudgetById(destinationClientId),
  ]);

  if (!source) {
    throw new Error(`REALLOC_SOURCE_NOT_FOUND: ${sourceClientId}`);
  }
  if (!destination) {
    throw new Error(`REALLOC_DESTINATION_NOT_FOUND: ${destinationClientId}`);
  }

  if (amount <= 0 || isNaN(amount)) {
    throw new Error(`REALLOC_INVALID_AMOUNT: Amount must be greater than 0`);
  }
  if (amount > source.amount) {
    throw new Error(`REALLOC_EXCEEDS_LIMIT: Amount (${amount}) exceeds source budget limit (${source.amount})`);
  }

  /********** 2. Buat objek mutasi baru dengan nominal yang diperbarui. */
  const now = new Date().toISOString();

  const updatedSource: Budget = {
    ...source,
    amount: source.amount - amount,
    syncStatus: "PENDING",
    updatedAt: now,
  };

  const updatedDestination: Budget = {
    ...destination,
    amount: destination.amount + amount,
    syncStatus: "PENDING",
    updatedAt: now,
  };

  /********** 3. Simpan kedua rekod dalam satu transaksi IDB readwrite. */
  const db = await getDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORES.BUDGETS, "readwrite");
    const store = tx.objectStore(STORES.BUDGETS);

    store.put(updatedSource);
    store.put(updatedDestination);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });

  /********** 4. Masukkan kedua mutasi ke antrean sinkronisasi.
   * Dua entri antrean terpisah agar mesin sinkronisasi dapat memproses
   * masing-masing sebagai operasi pembaruan (update) standar.
   */
  await enqueueChange("budget", "update", updatedSource.clientId, {
    ...updatedSource,
  });
  await enqueueChange("budget", "update", updatedDestination.clientId, {
    ...updatedDestination,
  });

  return { source: updatedSource, destination: updatedDestination };
}
