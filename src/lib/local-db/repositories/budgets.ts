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
 */
export async function setBudget(input: UpsertBudgetInput): Promise<Budget> {
  const existing = input.clientId ? await getBudgetById(input.clientId) : null;
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
