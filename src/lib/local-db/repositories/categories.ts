// ─── Categories IndexedDB Repository ────────────────────
// Full CRUD operations for categories in the local IndexedDB store.
//
// Architecture: Local-First
//   - UI reads/writes ONLY to IndexedDB through these functions
//   - All mutations auto-enqueue to sync_queue
//   - The sync engine pushes queued changes to the server
//
// Functions:
//   addCategory()       — Create a new category (generates clientId)
//   updateCategory()    — Update an existing category's fields
//   deleteCategory()    — Soft-delete (sets deletedAt)
//   getAllCategories()   — List all active (non-deleted) categories
//   getCategoryById()   — Get one category by clientId
//   upsertCategory()    — Low-level put (used by sync engine)
//   getPendingCategories() — Get PENDING items for sync

import { getDB } from "../index";
import { STORES } from "../schema";
import { Category, CategoryType } from "@/types/models.types";
import { enqueueChange } from "./sync-queue";
import { generateClientId } from "@/lib/utils/helpers";

// ─── Create ─────────────────────────────────────────────

export interface AddCategoryInput {
  name: string;
  type: CategoryType;
  icon?: string | null;
  color?: string | null;
  userId: string;
}

/**
 * Create a new category with a client-generated UUID.
 * Automatically sets syncStatus to PENDING and enqueues for sync.
 *
 * @returns The created category (with its clientId)
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

  // Enqueue for sync
  await enqueueChange("category", "create", category.clientId, {
    ...category,
  });

  return category;
}

// ─── Update ─────────────────────────────────────────────

export interface UpdateCategoryInput {
  clientId: string;
  name?: string;
  type?: CategoryType;
  icon?: string | null;
  color?: string | null;
}

/**
 * Update specific fields of an existing category.
 * Marks as PENDING and enqueues the mutation for sync.
 *
 * @returns The updated category, or null if not found
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

  // Enqueue for sync
  await enqueueChange("category", "update", updated.clientId, {
    ...updated,
  });

  return updated;
}

// ─── Soft Delete ────────────────────────────────────────

/**
 * Soft-delete a category by setting deletedAt timestamp.
 * The record remains in IndexedDB but is filtered out of UI queries.
 * The sync engine will propagate the deletion to the server.
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

  // Enqueue the delete
  await enqueueChange("category", "delete", clientId, { ...updated });

  return true;
}

// ─── Hard Delete (Sync use only) ────────────────────────
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

// ─── Read ───────────────────────────────────────────────

/**
 * Get all non-deleted categories for a user.
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
 * Get ALL categories for a user, including soft-deleted ones.
 * Used for category name lookups in transaction history.
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
 * Get categories filtered by type (INCOME or EXPENSE).
 */
export async function getCategoriesByType(
  userId: string,
  type: CategoryType
): Promise<Category[]> {
  const all = await getAllCategories(userId);
  return all.filter((c) => c.type === type);
}

/**
 * Get a single category by clientId.
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

// ─── Sync Helpers ───────────────────────────────────────

/**
 * Low-level upsert — used by the sync engine to apply server data.
 * Pass `skipQueue: true` to avoid re-enqueuing server-applied changes.
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
 * Bulk upsert categories — used by the sync engine to apply multiple server records in one IDB transaction.
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
 * Get all categories with PENDING sync status.
 */
export async function getPendingCategories(): Promise<Category[]> {
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
