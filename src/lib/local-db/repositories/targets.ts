/*
 * File: src/lib/local-db/repositories/targets.ts
 * Description: Repositori lokal IndexedDB untuk manajemen data target finansial (targets),
 * mendukung arsitektur offline-first dan sinkronisasi ke server.
 */

import { getDB } from "../index";
import { STORES } from "../schema";
import { FinancialTarget, TargetType, TargetPeriod } from "@/types/models.types";
import { enqueueChange } from "./sync-queue";
import { generateClientId } from "@/lib/utils/helpers";

/********** Tipe dan Operasi Pembuatan (Create) **********/

export interface AddTargetInput {
  name: string;
  type: TargetType;
  targetAmount: number;
  period: TargetPeriod;
  startDate: string;         /* Format YYYY-MM-DD */
  endDate?: string | null;   /* Format YYYY-MM-DD */
  categoryId?: string | null;
  walletId?: string | null;
  isActive?: boolean;
  note?: string | null;
  userId: string;
}

/**
 * Mencatat target finansial baru dengan UUID lokal yang dibuat oleh klien.
 * Secara otomatis mengatur syncStatus ke PENDING dan memasukkannya ke antrean sinkronisasi.
 *
 * @param input - Data input target finansial (name, type, targetAmount, period, startDate, dll).
 * @returns Promise berisi objek FinancialTarget yang dibuat.
 */
export async function addTarget(input: AddTargetInput): Promise<FinancialTarget> {
  if (input.type === "SAVING_TARGET" || input.type === "BALANCE_TARGET") {
    throw new Error(`Target type ${input.type} belum didukung di versi ini.`);
  }
  if (!input.categoryId) {
    throw new Error("Kategori wajib diisi untuk target finansial.");
  }
  if (input.period === "CUSTOM") {
    if (!input.endDate) {
      throw new Error("Tanggal selesai wajib diisi untuk periode khusus.");
    }
    if (new Date(input.endDate) < new Date(input.startDate)) {
      throw new Error("Tanggal selesai tidak boleh sebelum tanggal mulai.");
    }
  }

  const now = new Date().toISOString();

  const target: FinancialTarget = {
    clientId: generateClientId(),
    name: input.name.trim(),
    type: input.type,
    targetAmount: input.targetAmount,
    period: input.period,
    startDate: (input.startDate || "").substring(0, 10),
    endDate: input.endDate ? input.endDate.substring(0, 10) : null,
    categoryId: input.categoryId ?? null,
    walletId: input.walletId ?? null,
    isActive: input.isActive ?? true,
    note: input.note?.trim() || null,
    userId: input.userId,
    syncStatus: "PENDING",
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  const db = await getDB();

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORES.FINANCIAL_TARGETS, "readwrite");
    const store = tx.objectStore(STORES.FINANCIAL_TARGETS);
    store.put(target);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  await enqueueChange("financial_target", "create", target.clientId, {
    ...target,
  });

  return target;
}

/********** Operasi Pembaruan (Update) **********/

export interface UpdateTargetInput {
  clientId: string;
  name?: string;
  type?: TargetType;
  targetAmount?: number;
  period?: TargetPeriod;
  startDate?: string;
  endDate?: string | null;
  categoryId?: string | null;
  walletId?: string | null;
  isActive?: boolean;
  note?: string | null;
}

/**
 * Memperbarui field tertentu dari target finansial yang sudah ada.
 * Menandai status sebagai PENDING dan memasukkannya ke antrean sinkronisasi.
 *
 * @param input - Data perubahan target finansial berdasarkan clientId.
 * @returns Promise berisi objek FinancialTarget yang diperbarui.
 */
export async function updateTarget(input: UpdateTargetInput): Promise<FinancialTarget> {
  const db = await getDB();
  const now = new Date().toISOString();

  const updatedTarget = await new Promise<FinancialTarget>((resolve, reject) => {
    const tx = db.transaction(STORES.FINANCIAL_TARGETS, "readwrite");
    const store = tx.objectStore(STORES.FINANCIAL_TARGETS);
    
    const getRequest = store.get(input.clientId);

    getRequest.onsuccess = () => {
      const existing = getRequest.result as FinancialTarget;
      if (!existing) {
        reject(new Error(`Target with clientId ${input.clientId} not found`));
        return;
      }

      const mergedType = input.type ?? existing.type;
      const mergedCategoryId = input.categoryId !== undefined ? input.categoryId : existing.categoryId;
      const mergedPeriod = input.period ?? existing.period;
      const mergedStartDate = input.startDate ?? existing.startDate;
      const mergedEndDate = input.endDate !== undefined ? input.endDate : existing.endDate;

      if (mergedType === "SAVING_TARGET" || mergedType === "BALANCE_TARGET") {
        reject(new Error(`Target type ${mergedType} belum didukung di versi ini.`));
        return;
      }
      if (!mergedCategoryId) {
        reject(new Error("Kategori wajib diisi untuk target finansial."));
        return;
      }
      if (mergedPeriod === "CUSTOM") {
        if (!mergedEndDate) {
          reject(new Error("Tanggal selesai wajib diisi untuk periode khusus."));
          return;
        }
        if (new Date(mergedEndDate) < new Date(mergedStartDate)) {
          reject(new Error("Tanggal selesai tidak boleh sebelum tanggal mulai."));
          return;
        }
      }

      const merged: FinancialTarget = {
        ...existing,
        ...input,
        /********** Pastikan format tanggal sesuai standar (YYYY-MM-DD). */
        startDate: input.startDate ? input.startDate.substring(0, 10) : existing.startDate,
        endDate: input.endDate !== undefined 
          ? (input.endDate ? input.endDate.substring(0, 10) : null)
          : existing.endDate,
        syncStatus: "PENDING",
        updatedAt: now,
      };

      const putRequest = store.put(merged);
      putRequest.onsuccess = () => resolve(merged);
      putRequest.onerror = () => reject(putRequest.error);
    };

    getRequest.onerror = () => reject(getRequest.error);
  });

  await enqueueChange("financial_target", "update", updatedTarget.clientId, {
    ...updatedTarget,
  });

  return updatedTarget;
}

/********** Operasi Penghapusan (Delete) **********/

/**
 * Melakukan soft-delete pada target finansial dengan menandai timestamp deletedAt.
 * Digunakan untuk meneruskan status penghapusan ke server saat sinkronisasi.
 *
 * @param clientId - ID lokal unik dari target yang akan dihapus.
 * @returns Promise void setelah rekod ditandai hapus.
 */
export async function deleteTarget(clientId: string): Promise<void> {
  const db = await getDB();
  const now = new Date().toISOString();

  const updatedTarget = await new Promise<FinancialTarget>((resolve, reject) => {
    const tx = db.transaction(STORES.FINANCIAL_TARGETS, "readwrite");
    const store = tx.objectStore(STORES.FINANCIAL_TARGETS);
    const getRequest = store.get(clientId);

    getRequest.onsuccess = () => {
      const target = getRequest.result as FinancialTarget;
      if (!target) {
        reject(new Error("Target not found"));
        return;
      }

      target.deletedAt = now;
      target.syncStatus = "PENDING";
      target.updatedAt = now;

      const putRequest = store.put(target);
      putRequest.onsuccess = () => resolve(target);
      putRequest.onerror = () => reject(putRequest.error);
    };

    getRequest.onerror = () => reject(getRequest.error);
  });

  await enqueueChange("financial_target", "delete", clientId, {
    ...updatedTarget,
  });
}

/********** Penghapusan Permanen (Khusus Sinkronisasi) **********/

/**
 * Menghapus rekod target secara permanen dari IndexedDB lokal.
 *
 * @param clientId - ID lokal unik dari target yang akan dihapus permanen.
 * @returns Promise void setelah rekod dihapus.
 */
export async function hardDeleteTarget(clientId: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.FINANCIAL_TARGETS, "readwrite");
    const store = tx.objectStore(STORES.FINANCIAL_TARGETS);
    const request = store.delete(clientId);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/********** Operasi Upsert (Khusus Sinkronisasi) **********/

/**
 * Upsert tingkat rendah (low-level) — digunakan oleh mesin sinkronisasi untuk menerapkan data dari server.
 *
 * @param target - Objek FinancialTarget dari server.
 * @param skipSyncQueue - Jika true, perubahan tidak akan dimasukkan kembali ke antrean sinkronisasi.
 * @returns Promise void setelah penyimpanan selesai.
 */
export async function upsertTarget(target: FinancialTarget, skipSyncQueue = false): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.FINANCIAL_TARGETS, "readwrite");
    const store = tx.objectStore(STORES.FINANCIAL_TARGETS);
    
    /********** Tambahkan atau perbarui rekod di store IDB. */
    const request = store.put(target);
    
    request.onsuccess = () => {
      if (!skipSyncQueue) {
        enqueueChange("financial_target", "update", target.clientId, { ...target })
          .then(() => resolve())
          .catch(reject);
      } else {
        resolve();
      }
    };
    request.onerror = () => reject(request.error);
  });
}

/********** Operasi Pembacaan (Queries) **********/

/**
 * Mengambil seluruh target aktif (tidak terhapus) milik seorang pengguna, diurutkan menurun berdasarkan createdAt.
 *
 * @param userId - ID pengguna pemilik target.
 * @returns Promise berisi array FinancialTarget aktif.
 */
export async function getActiveTargets(userId: string): Promise<FinancialTarget[]> {
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.FINANCIAL_TARGETS, "readonly");
    const store = tx.objectStore(STORES.FINANCIAL_TARGETS);
    const index = store.index("by_userId");
    const request = index.getAll(userId);

    request.onsuccess = () => {
      const targets = request.result as FinancialTarget[];
      /********** Filter rekod terhapus dan urutkan menurun berdasarkan createdAt. */
      const activeTargets = targets
        .filter((t) => !t.deletedAt)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      resolve(activeTargets);
    };

    request.onerror = () => reject(request.error);
  });
}

/**
 * Mengambil satu target finansial berdasarkan clientId lokal.
 *
 * @param clientId - ID lokal unik target finansial.
 * @returns Promise berisi FinancialTarget jika ditemukan, atau null.
 */
export async function getTargetById(clientId: string): Promise<FinancialTarget | null> {
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.FINANCIAL_TARGETS, "readonly");
    const store = tx.objectStore(STORES.FINANCIAL_TARGETS);
    const request = store.get(clientId);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Upsert target secara massal — digunakan oleh mesin sinkronisasi (Pull Sync) untuk menerapkan data server di lokal.
 *
 * @param targets - Array objek FinancialTarget dari server.
 * @returns Promise void setelah semua rekod disimpan.
 */
export async function bulkUpsertTargets(targets: FinancialTarget[]): Promise<void> {
  if (!targets.length) return;
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.FINANCIAL_TARGETS, "readwrite");
    const targetStore = tx.objectStore(STORES.FINANCIAL_TARGETS);

    targets.forEach((target) => {
      targetStore.put(target);
    });

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
