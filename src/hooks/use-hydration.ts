//********** START: useHydration Hook **********
//********** Detects an empty IndexedDB and performs a one-time full
//********** data pull from PostgreSQL via /api/sync/pull?mode=hydrate.
//**********
//********** This handles the case where a user clears their browser
//********** cache - their data is safe in PostgreSQL and gets
//********** automatically re-populated on next app load.
//********** END: useHydration Hook **********

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getDB } from "@/lib/local-db";
import { STORES } from "@/lib/local-db/schema";
import { upsertCategory } from "@/lib/local-db/repositories/categories";
import { upsertTransaction } from "@/lib/local-db/repositories/transactions";
import { upsertWallet } from "@/lib/local-db/repositories/wallets";
import { upsertBudget } from "@/lib/local-db/repositories/budgets";
import { upsertNotificationLog } from "@/lib/local-db/repositories/notification-logs";
import { upsertTarget } from "@/lib/local-db/repositories/targets";
import { setLastSyncedAt } from "@/lib/local-db/repositories/users";
import { Category, Transaction, Wallet } from "@/types/models.types";
import { SyncPullResponse } from "@/types/sync.types";
import { SyncEvents } from "@/lib/sync/events";

//********** TYPES **********
export type HydrationState = "idle" | "checking" | "hydrating" | "done" | "error";

export interface UseHydrationReturn {
  //********** Current hydration state
  hydrationState: HydrationState;
  //********** Number of records pulled during hydration
  hydratedCount: number;
  //********** Error message if hydration failed
  error: string | null;
}

//********** UTILS **********
/**
 * Check if a given IndexedDB store is empty.
 */
async function isStoreEmpty(storeName: string): Promise<boolean> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    const countReq = store.count();
    countReq.onsuccess = () => resolve(countReq.result === 0);
    countReq.onerror = () => reject(countReq.error);
  });
}

//********** HOOK **********
export function useHydration(): UseHydrationReturn {
  const [hydrationState, setHydrationState] = useState<HydrationState>("idle");
  const [hydratedCount, setHydratedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const hasRun = useRef(false);

  const hydrate = useCallback(async () => {
    //********** Only run once per session
    if (hasRun.current) return;
    hasRun.current = true;

    setHydrationState("checking");

    try {
      //********** Must be online to hydrate
      if (!navigator.onLine) {
        setHydrationState("done");
        return;
      }

      //********** Check if both stores are empty
      const [catEmpty, txnEmpty] = await Promise.all([
        isStoreEmpty(STORES.CATEGORIES),
        isStoreEmpty(STORES.TRANSACTIONS),
      ]);

      //********** If either store has data, no hydration needed
      if (!catEmpty || !txnEmpty) {
        console.log("[Hydration] IndexedDB has data, skipping hydration.");
        setHydrationState("done");
        return;
      }

      console.log("[Hydration] IndexedDB is empty. Starting full hydration...");
      setHydrationState("hydrating");

      //********** Fetch all data from server (no lastSyncedAt = everything since epoch)
      const response = await fetch("/api/sync/pull?mode=hydrate", {
        credentials: "include",
      });

      if (!response.ok) {
        if (response.status === 401) {
          //********** Not authenticated yet - skip hydration silently
          setHydrationState("done");
          return;
        }
        throw new Error(`Pull failed with status ${response.status}`);
      }

      const json = await response.json();
      if (!json.success || !json.data) {
        throw new Error("Invalid pull response");
      }

      const pullData: SyncPullResponse = json.data;
      let count = 0;
      let partialErrors: string[] = [];
      let categoriesSuccess = true;
      let walletsSuccess = true;

      //********** Bulk-insert categories first (transactions reference them)
      try {
        if (pullData.categories && pullData.categories.length > 0) {
          for (const serverCat of pullData.categories) {
            await upsertCategory(
              { ...serverCat, syncStatus: "SYNCED" } as Category,
              true //********** skipQueue
            );
            count++;
          }
          if (typeof window !== "undefined") window.dispatchEvent(new Event(SyncEvents.CATEGORY_UPDATED));
        }
      } catch (err) {
        console.error("[Hydration] Categories failed:", err);
        categoriesSuccess = false;
        partialErrors.push("Categories hydration failed");
      }

      //********** Bulk-insert wallets
      try {
        const serverWallets: Wallet[] = (pullData as unknown as { wallets?: Wallet[] }).wallets ?? [];
        if (serverWallets.length > 0) {
          for (const serverWallet of serverWallets) {
            await upsertWallet(
              { ...serverWallet, syncStatus: "SYNCED" } as Wallet,
              true //********** skipQueue
            );
            count++;
          }
          if (typeof window !== "undefined") window.dispatchEvent(new Event(SyncEvents.WALLET_UPDATED));
        }
      } catch (err) {
        console.error("[Hydration] Wallets failed:", err);
        walletsSuccess = false;
        partialErrors.push("Wallets hydration failed");
      }

      //********** Bulk-insert transactions
      try {
        if (!categoriesSuccess || !walletsSuccess) {
          throw new Error("Skipped transactions because dependencies failed.");
        }
        if (pullData.transactions && pullData.transactions.length > 0) {
          for (const serverTxn of pullData.transactions) {
            await upsertTransaction(
              { ...serverTxn, syncStatus: "SYNCED" } as Transaction,
              true //********** skipQueue
            );
            count++;
          }
          if (typeof window !== "undefined") window.dispatchEvent(new Event(SyncEvents.TRANSACTION_UPDATED));
        }
      } catch (err) {
        console.error("[Hydration] Transactions failed:", err);
        partialErrors.push(err instanceof Error ? err.message : "Transactions hydration failed");
      }

      //********** Bulk-insert budgets
      try {
        if (!categoriesSuccess) throw new Error("Skipped budgets because categories failed.");
        const serverBudgets: any[] = (pullData as any).budgets ?? [];
        if (serverBudgets.length > 0) {
          for (const serverBdg of serverBudgets) {
            await upsertBudget(
              { ...serverBdg, syncStatus: "SYNCED" },
              true // skipQueue
            );
            count++;
          }
          if (typeof window !== "undefined") window.dispatchEvent(new Event(SyncEvents.BUDGET_UPDATED));
        }
      } catch (err) {
        console.error("[Hydration] Budgets failed:", err);
        partialErrors.push(err instanceof Error ? err.message : "Budgets hydration failed");
      }

      //********** Bulk-insert financial targets
      try {
        if (!categoriesSuccess) throw new Error("Skipped targets because categories failed.");
        const serverTargets: any[] = (pullData as any).financial_targets ?? [];
        if (serverTargets.length > 0) {
          for (const serverTgt of serverTargets) {
            await upsertTarget(
              { ...serverTgt, syncStatus: "SYNCED" } as import("@/types/models.types").FinancialTarget,
              true // skipQueue
            );
            count++;
          }
          if (typeof window !== "undefined") window.dispatchEvent(new Event(SyncEvents.TARGET_UPDATED));
        }
      } catch (err) {
        console.error("[Hydration] Targets failed:", err);
        partialErrors.push(err instanceof Error ? err.message : "Targets hydration failed");
      }

      //********** Bulk-insert notification logs
      try {
        const serverLogs: any[] = (pullData as any).notification_logs ?? [];
        if (serverLogs.length > 0) {
          for (const serverLog of serverLogs) {
            await upsertNotificationLog(
              { ...serverLog, syncStatus: "SYNCED" }
            );
            count++;
          }
          if (typeof window !== "undefined") window.dispatchEvent(new Event(SyncEvents.NOTIFICATION_UPDATED));
        }
      } catch (err) {
        console.error("[Hydration] Notification logs failed:", err);
        partialErrors.push("Notification logs hydration failed");
      }

      //********** Update the last synced timestamp so future delta syncs work
      await setLastSyncedAt(pullData.serverTime);

      if (partialErrors.length > 0) {
        console.warn("[Hydration] Completed with partial errors:", partialErrors);
      }
      console.log(`[Hydration] Complete. Inserted ${count} records.`);
      if (typeof window !== "undefined") window.dispatchEvent(new Event(SyncEvents.SYNC_COMPLETED));
      
      setHydratedCount(count);
      setHydrationState("done");
    } catch (err) {
      console.error("[Hydration] Error:", err);
      setError(err instanceof Error ? err.message : "Hydration failed");
      setHydrationState("error");
    }
  }, []);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return { hydrationState, hydratedCount, error };
}
