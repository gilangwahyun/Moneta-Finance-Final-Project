// ─── Target Progress Calculations ───────────────────────
// Calculates the current progress of a financial target by querying
// local transactions via IndexedDB. This ensures that the "progress"
// is always fresh and offline-first without needing server sync or schema changes.

import { getDB } from "./index";
import { STORES } from "./schema";
import { FinancialTarget, Transaction } from "@/types/models.types";
import { getTargetEffectiveDateRange } from "@/lib/utils/target-helpers";

export interface TargetProgress {
  currentAmount: number;
  percentage: number;
  isAchieved: boolean;
  remainingAmount: number;
  periodStart: Date;
  periodEnd: Date;
  isNotStarted?: boolean;
}

/**
 * Calculates progress for a given FinancialTarget dynamically based on a reference date.
 * 
 * Rules:
 * - If target is created in the middle of a period, the first period's start date 
 *   is bounded by the target's actual startDate.
 * - Otherwise, it uses the standard boundary of the period (day, week, month).
 * - CUSTOM strictly uses target.startDate and target.endDate.
 */
export async function calculateTargetProgress(
  target: FinancialTarget, 
  referenceDate: Date = new Date()
): Promise<TargetProgress> {
  const db = await getDB();
  const effectiveRange = getTargetEffectiveDateRange(target, referenceDate);

  if (!effectiveRange) {
    const targetStart = target.startDate ? new Date(target.startDate) : new Date();
    return {
      currentAmount: 0,
      percentage: 0,
      isAchieved: false,
      remainingAmount: target.targetAmount || 0,
      periodStart: targetStart,
      periodEnd: target.endDate ? new Date(target.endDate) : targetStart,
      isNotStarted: true,
    };
  }

  const { periodStart, periodEnd } = effectiveRange;

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.TRANSACTIONS, "readonly");
    const store = tx.objectStore(STORES.TRANSACTIONS);
    const index = store.index("by_date");
    
    // Bounds
    const startIso = periodStart.toISOString();
    const endIso = periodEnd.toISOString();
    const dateRange = IDBKeyRange.bound(startIso, endIso);

    const request = index.getAll(dateRange);

    request.onsuccess = () => {
      const transactions = request.result as Transaction[];
      
      let currentAmount = 0;

      for (const txn of transactions) {
        if (txn.deletedAt) continue;
        if (txn.userId !== target.userId) continue;

        // Target Finansial only tracks INCOME transactions. EXPENSE and TRANSFER are excluded.
        if (txn.type !== "INCOME") continue;
        
        if (!target.categoryId || txn.categoryId !== target.categoryId) continue;
        
        if (target.walletId && txn.walletId !== target.walletId) continue;

        currentAmount += Number(txn.amount);
      }

      const percentage = target.targetAmount > 0 
        ? Math.round((currentAmount / target.targetAmount) * 100)
        : 0;
        
      const isAchieved = currentAmount >= target.targetAmount;
      const remainingAmount = Math.max(0, target.targetAmount - currentAmount);

      resolve({
        currentAmount,
        percentage,
        isAchieved,
        remainingAmount,
        periodStart,
        periodEnd,
      });
    };

    request.onerror = () => reject(request.error);
  });
}
