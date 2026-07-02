import { getDB } from "../index";
import { STORES } from "../schema";
import { Budget } from "@/types/models.types";
import { enqueueChange } from "./sync-queue";
import { generateClientId } from "@/lib/utils/helpers";

export interface UpsertBudgetInput {
  clientId?: string;
  amount: number;
  period: string; // YYYY-MM
  categoryId: string;
  userId: string;
}

/**
 * Set a budget for a given category and period (UI function).
 * Enqueues the change for synchronization.
 *
 * Prevents duplicate budgets: if a budget already exists for the same
 * categoryId + period, it will be updated instead of creating a new one.
 */
export async function setBudget(input: UpsertBudgetInput): Promise<Budget> {
  // 1. Try to find by explicit clientId (edit mode)
  let existing = input.clientId ? await getBudgetById(input.clientId) : null;

  // 2. If not found by clientId, check for an existing budget with same category+period
  //    This prevents creating duplicates when the user clicks "Atur Anggaran" again.
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
 * Find an existing (non-deleted) budget by categoryId and period for a user.
 * Used to prevent creating duplicate budgets.
 */
export async function getBudgetByCategoryAndPeriod(
  userId: string,
  categoryId: string,
  period: string
): Promise<Budget | undefined> {
  const budgets = await getBudgetsByPeriod(userId, period);
  return budgets.find((b) => b.categoryId === categoryId);
}

export async function applyServerBudget(budget: Budget): Promise<void> {
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
 * Low-level upsert — used by the sync engine to apply server data.
 * Pass `skipQueue: true` to avoid re-enqueuing server-applied changes.
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
 * Bulk upsert budgets — used by the sync engine to apply multiple server records in one IDB transaction.
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
 * Get all budgets with PENDING sync status.
 * Used to recover orphaned budgets.
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
 * Clean up duplicate budgets that share the same categoryId + period.
 * Keeps the one with the most recent updatedAt; soft-deletes the rest.
 * Called during sync startup to prevent constraint violations on the server.
 */
export async function deduplicateBudgets(): Promise<number> {
  const db = await getDB();

  // Read all non-deleted budgets
  const all = await new Promise<Budget[]>((resolve, reject) => {
    const tx = db.transaction(STORES.BUDGETS, "readonly");
    const store = tx.objectStore(STORES.BUDGETS);
    const req = store.getAll();
    req.onsuccess = () => resolve((req.result as Budget[]).filter((b) => !b.deletedAt));
    req.onerror = () => reject(req.error);
  });

  // Group by userId + period + categoryId
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

    // Sort descending by updatedAt — keep the first (most recent)
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

// ─── Budget Reallocation (Subsidi Silang) ────────────────

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

// ─── Hard Delete (Sync use only) ────────────────────────
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
 * Atomically transfer `amount` of monthly budget limit from the source
 * category to the destination category within the same period.
 *
 * Validation contract (caller MUST pre-compute and enforce):
 *   - amount > 0
 *   - amount <= source.amount - spentAmount  (true remaining, not raw limit)
 *
 * Both IDB writes happen inside a single readwrite transaction so that
 * a partial failure leaves neither record in an inconsistent state.
 * After a successful write, both records are enqueued in the sync_queue.
 */
export async function reallocateBudget(
  input: ReallocationInput
): Promise<ReallocationResult> {
  const { sourceClientId, destinationClientId, amount } = input;

  // ── 1. Read current records ────────────────────────────
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

  // ── 2. Apply mutations ────────────────────────────────
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

  // ── 3. Write both records in one IDB transaction ───────
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

  // ── 4. Enqueue both mutations for sync ─────────────────
  // Two separate queue entries so the sync engine can process
  // each as a standard budget "update" operation.
  await enqueueChange("budget", "update", updatedSource.clientId, {
    ...updatedSource,
  });
  await enqueueChange("budget", "update", updatedDestination.clientId, {
    ...updatedDestination,
  });

  return { source: updatedSource, destination: updatedDestination };
}
