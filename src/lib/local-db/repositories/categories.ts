/*
 * File: src/lib/local-db/repositories/categories.ts
 * Description: Repositori lokal IndexedDB untuk manajemen operasi CRUD kategori,
 * mendukung arsitektur offline-first dan sinkronisasi ke server.
 */

import { getDB } from "../index";
import { STORES } from "../schema";
import { Category, CategoryType } from "@/types/models.types";
import { enqueueChange } from "./sync-queue";
import { generateClientId } from "@/lib/utils/helpers";

/********** Tipe dan Operasi Pembuatan (Create) **********/

export interface AddCategoryInput {
  name: string;
  type: CategoryType;
  icon?: string | null;
  color?: string | null;
  userId: string;
}

/**
 * Membuat kategori baru dengan UUID lokal yang dibuat oleh klien.
 * Secara otomatis mengatur syncStatus ke PENDING dan memasukkannya ke antrean sinkronisasi.
 *
 * @param input - Data input kategori (name, type, icon, color, userId).
 * @returns Promise berisi objek Category yang dibuat.
 */
export async function addCategory(input: AddCategoryInput): Promise<Category> {
  const now = new Date().toISOString();

  const category: Category = {
    clientId: generateClientId(),
    name: input.name.trim(),
    type: input.type,
    icon: input.icon ?? null,
    color: input.color ?? null,
    isDefault: false,
    userId: input.userId,
    syncStatus: "PENDING",
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  const db = await getDB();

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORES.CATEGORIES, "readwrite");
    const store = tx.objectStore(STORES.CATEGORIES);
    store.put(category);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  /********** Masukkan mutasi ke antrean sinkronisasi. */
  await enqueueChange("category", "create", category.clientId, {
    ...category,
  });

  return category;
}

/********** Operasi Pembaruan (Update) **********/

export interface UpdateCategoryInput {
  clientId: string;
  name?: string;
  type?: CategoryType;
  icon?: string | null;
  color?: string | null;
}

/**
 * Memperbarui field tertentu dari kategori yang sudah ada.
 * Menandai status sinkronisasi sebagai PENDING dan memasukkan mutasi ke antrean sinkronisasi.
 *
 * @param input - Data perubahan kategori berdasarkan clientId.
 * @returns Promise berisi objek Category yang diperbarui, atau null jika tidak ditemukan.
 */
export async function updateCategory(
  input: UpdateCategoryInput
): Promise<Category | null> {
  const existing = await getCategoryById(input.clientId);
  if (!existing) return null;

  const updated: Category = {
    ...existing,
    name: input.name !== undefined ? input.name.trim() : existing.name,
    type: input.type !== undefined ? input.type : existing.type,
    icon: input.icon !== undefined ? input.icon : existing.icon,
    color: input.color !== undefined ? input.color : existing.color,
    syncStatus: "PENDING",
    updatedAt: new Date().toISOString(),
  };

  const db = await getDB();

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORES.CATEGORIES, "readwrite");
    const store = tx.objectStore(STORES.CATEGORIES);
    store.put(updated);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  /********** Masukkan mutasi ke antrean sinkronisasi. */
  await enqueueChange("category", "update", updated.clientId, {
    ...updated,
  });

  return updated;
}

/********** Operasi Penghapusan (Delete) **********/

/**
 * Melakukan soft-delete pada kategori dengan menandai timestamp deletedAt.
 * Rekod tetap ada di IDB namun tidak akan muncul pada kueri UI.
 * Mesin sinkronisasi akan meneruskan penghapusan ini ke server.
 *
 * @param clientId - ID lokal unik dari kategori yang akan dihapus.
 * @returns Promise berisi boolean yang menunjukkan apakah rekod ditemukan dan dihapus.
 */
export async function deleteCategory(clientId: string): Promise<boolean> {
  const existing = await getCategoryById(clientId);
  if (!existing) return false;

  const updated: Category = {
    ...existing,
    deletedAt: new Date().toISOString(),
    syncStatus: "PENDING",
    updatedAt: new Date().toISOString(),
  };

  const db = await getDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORES.CATEGORIES, "readwrite");
    const store = tx.objectStore(STORES.CATEGORIES);
    store.put(updated);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  /********** Masukkan penghapusan ke antrean sinkronisasi. */
  await enqueueChange("category", "delete", clientId, { ...updated });

  return true;
}

/********** Penghapusan Permanen (Khusus Sinkronisasi) **********/

/**
 * Menghapus rekod kategori secara permanen dari IndexedDB lokal.
 *
 * @param clientId - ID lokal unik dari kategori yang akan dihapus permanen.
 * @returns Promise void setelah rekod dihapus.
 */
export async function hardDeleteCategory(clientId: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.CATEGORIES, "readwrite");
    const store = tx.objectStore(STORES.CATEGORIES);
    const request = store.delete(clientId);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/********** Operasi Pembacaan (Read) **********/

/**
 * Mengambil seluruh kategori aktif (tidak terhapus) milik seorang pengguna.
 *
 * @param userId - ID pengguna pemilik kategori.
 * @returns Promise berisi array Category aktif.
 */
export async function getAllCategories(userId: string): Promise<Category[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.CATEGORIES, "readonly");
    const store = tx.objectStore(STORES.CATEGORIES);
    const index = store.index("by_userId");
    const request = index.getAll(userId);

    request.onsuccess = () => {
      const results = (request.result as Category[]).filter(
        (c) => !c.deletedAt
      );
      resolve(results);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Mengambil SELURUH kategori milik pengguna, termasuk yang sudah di-soft-delete.
 * Digunakan untuk pencarian nama kategori pada riwayat transaksi lama.
 *
 * @param userId - ID pengguna.
 * @returns Promise berisi array seluruh Category.
 */
export async function getAllCategoriesIncludingDeleted(userId: string): Promise<Category[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.CATEGORIES, "readonly");
    const store = tx.objectStore(STORES.CATEGORIES);
    const index = store.index("by_userId");
    const request = index.getAll(userId);

    request.onsuccess = () => resolve(request.result as Category[]);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Mengambil daftar kategori aktif berdasarkan tipe (INCOME atau EXPENSE).
 *
 * @param userId - ID pengguna.
 * @param type - Tipe kategori yang dicari.
 * @returns Promise berisi array Category sesuai tipe.
 */
async function getCategoriesByType(
  userId: string,
  type: CategoryType
): Promise<Category[]> {
  const all = await getAllCategories(userId);
  return all.filter((c) => c.type === type);
}

/**
 * Mengambil satu kategori berdasarkan clientId lokal.
 *
 * @param clientId - ID lokal unik kategori.
 * @returns Promise berisi Category jika ditemukan, atau undefined.
 */
export async function getCategoryById(
  clientId: string
): Promise<Category | undefined> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.CATEGORIES, "readonly");
    const store = tx.objectStore(STORES.CATEGORIES);
    const request = store.get(clientId);

    request.onsuccess = () => resolve(request.result as Category | undefined);
    request.onerror = () => reject(request.error);
  });
}

/********** Helper Sinkronisasi (Sync Helpers) **********/

/**
 * Upsert tingkat rendah (low-level) — digunakan oleh mesin sinkronisasi untuk menerapkan data dari server.
 *
 * @param category - Objek Category dari server.
 * @param skipQueue - Jika true, perubahan tidak akan dimasukkan kembali ke antrean sinkronisasi.
 * @returns Promise void setelah penyimpanan selesai.
 */
export async function upsertCategory(
  category: Category,
  skipQueue: boolean = false
): Promise<void> {
  const db = await getDB();

  const existing = await getCategoryById(category.clientId);
  const action = existing ? "update" : "create";

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORES.CATEGORIES, "readwrite");
    const store = tx.objectStore(STORES.CATEGORIES);
    store.put(category);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  if (!skipQueue) {
    await enqueueChange("category", action, category.clientId, {
      ...category,
    });
  }
}

/**
 * Upsert kategori secara massal — digunakan oleh mesin sinkronisasi untuk menerapkan banyak rekod sekaligus dalam satu transaksi IDB.
 *
 * @param categories - Array objek Category dari server.
 * @returns Promise void setelah semua rekod disimpan.
 */
export async function bulkUpsertCategories(categories: Category[]): Promise<void> {
  if (categories.length === 0) return;
  const db = await getDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORES.CATEGORIES, "readwrite");
    const store = tx.objectStore(STORES.CATEGORIES);
    for (const category of categories) {
      store.put(category);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Mengambil semua kategori dengan status sinkronisasi PENDING.
 *
 * @returns Promise berisi array Category yang berstatus PENDING.
 */
async function getPendingCategories(): Promise<Category[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.CATEGORIES, "readonly");
    const store = tx.objectStore(STORES.CATEGORIES);
    const index = store.index("by_syncStatus");
    const request = index.getAll("PENDING");

    request.onsuccess = () => resolve(request.result as Category[]);
    request.onerror = () => reject(request.error);
  });
}
