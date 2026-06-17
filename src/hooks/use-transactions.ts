//********** START: useTransactions Hook **********
//********** React hook for managing transactions through IndexedDB.
//********** Local-first: reads/writes exclusively to IndexedDB, never
//********** directly to the server API.
//********** END: useTransactions Hook **********

"use client";

import { useState, useEffect, useCallback } from "react";
import { Transaction, TransactionType } from "@/types/models.types";
import {
  addTransaction,
  updateTransaction,
  deleteTransaction,
  getRecentTransactions,
  AddTransactionInput,
  UpdateTransactionInput,
} from "@/lib/local-db/repositories/transactions";
import {
  getCurrentMonthTotals,
  getTransactionsByMonth,
} from "@/lib/local-db/transaction-queries";
import { getAllCategoriesIncludingDeleted } from "@/lib/local-db/repositories/categories";
import { getCurrentUser } from "@/lib/local-db/repositories/users";
import { SyncEvents } from "@/lib/sync/events";
import { useSyncContext } from "@/providers/SyncProvider";

//********** TYPES **********
export interface MonthlyTotals {
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
}

export interface UseTransactionsReturn {
  //********** Recent transactions (sorted by date desc)
  transactions: Transaction[];
  //********** Current month totals
  monthlyTotals: MonthlyTotals;
  //********** Whether data is currently loading
  isLoading: boolean;
  //********** Error message if any operation failed
  error: string | null;
  //********** Record a new transaction
  recordTransaction: (
    input: Omit<AddTransactionInput, "userId">
  ) => Promise<Transaction | null>;
  //********** Update an existing transaction
  editTransaction: (
    input: UpdateTransactionInput
  ) => Promise<Transaction | null>;
  //********** Soft-delete a transaction
  removeTransaction: (clientId: string) => Promise<boolean>;
  //********** Force reload from IndexedDB
  refresh: () => Promise<void>;
}

//********** HOOK **********
/**
 * React hook for managing transactions through IndexedDB.
 * @returns Object containing transactions state and methods.
 */
export function useTransactions(): UseTransactionsReturn {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [monthlyTotals, setMonthlyTotals] = useState<MonthlyTotals>({
    totalIncome: 0,
    totalExpense: 0,
    netBalance: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { scheduleSync } = useSyncContext();

  //********** Load data from IndexedDB **********
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const user = await getCurrentUser();
      // console.log(`[useTransactions] Loading data for user: ${user?.username || "NONE"}`);
      
      if (!user) {
        setTransactions([]);
        setIsLoading(false);
        return;
      }

      const [recent, totals, allCategories] = await Promise.all([
        getRecentTransactions(user.id, 50),
        getCurrentMonthTotals(user.id),
        getAllCategoriesIncludingDeleted(user.id),
      ]);

      const categoriesMap = new Map(allCategories.map(c => [c.clientId, c]));
      const recentWithCategories = recent.map(txn => ({
        ...txn,
        category: txn.categoryId ? categoriesMap.get(txn.categoryId) : undefined
      }));

      // console.log(`[useTransactions] Loaded ${recent.length} txns, totals:`, totals);
      setTransactions(recentWithCategories);
      setMonthlyTotals(totals);
    } catch (err) {
      console.error("[useTransactions] Load failed:", err);
      setError("Failed to load transactions");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    //********** Listen for custom event from other instances
    const handleUpdate = () => {
      loadData();
    };

    window.addEventListener(SyncEvents.TRANSACTION_UPDATED, handleUpdate);
    window.addEventListener(SyncEvents.CATEGORY_UPDATED, handleUpdate);
    window.addEventListener(SyncEvents.WALLET_UPDATED, handleUpdate);
    window.addEventListener(SyncEvents.SYNC_COMPLETED, handleUpdate);
    return () => {
      window.removeEventListener(SyncEvents.TRANSACTION_UPDATED, handleUpdate);
      window.removeEventListener(SyncEvents.CATEGORY_UPDATED, handleUpdate);
      window.removeEventListener(SyncEvents.WALLET_UPDATED, handleUpdate);
      window.removeEventListener(SyncEvents.SYNC_COMPLETED, handleUpdate);
    };
  }, [loadData]);

  //********** Create **********
  const recordTransaction = useCallback(
    async (
      input: Omit<AddTransactionInput, "userId">
    ): Promise<Transaction | null> => {
      try {
        setError(null);
        const user = await getCurrentUser();
        if (!user) {
          setError("No user session found");
          return null;
        }

        const created = await addTransaction({ ...input, userId: user.id });

        //********** Optimistic update - add to the top of the list
        setTransactions((prev) => [created, ...prev]);

        //********** Update monthly totals optimistically - TRANSFER excluded from P&L
        setMonthlyTotals((prev) => {
          const isCurrentMonth = isInCurrentMonth(created.date);
          if (!isCurrentMonth || created.type === "TRANSFER") return prev;

          if (created.type === "INCOME") {
            return {
              totalIncome: prev.totalIncome + created.amount,
              totalExpense: prev.totalExpense,
              netBalance: prev.netBalance + created.amount,
            };
          } else {
            return {
              totalIncome: prev.totalIncome,
              totalExpense: prev.totalExpense + created.amount,
              netBalance: prev.netBalance - created.amount,
            };
          }
        });

        scheduleSync();
        window.dispatchEvent(new Event("moneta-transaction-updated"));
        return created;
      } catch (err) {
        console.error("[useTransactions] Create failed:", err);
        setError("Failed to record transaction");
        return null;
      }
    },
    [scheduleSync]
  );

  //********** Update **********
  const editTransaction = useCallback(
    async (input: UpdateTransactionInput): Promise<Transaction | null> => {
      try {
        setError(null);
        const updated = await updateTransaction(input);
        if (!updated) {
          setError("Transaction not found");
          return null;
        }

        setTransactions((prev) =>
          prev.map((t) => (t.clientId === updated.clientId ? updated : t))
        );

        //********** Reload totals (too complex to optimistically recalculate)
        const user = await getCurrentUser();
        if (user) {
          const totals = await getCurrentMonthTotals(user.id);
          setMonthlyTotals(totals);
        }

        scheduleSync();
        window.dispatchEvent(new Event("moneta-transaction-updated"));
        return updated;
      } catch (err) {
        console.error("[useTransactions] Update failed:", err);
        setError("Failed to update transaction");
        return null;
      }
    },
    [scheduleSync]
  );

  //********** Delete **********
  const removeTransaction = useCallback(
    async (clientId: string): Promise<boolean> => {
      try {
        setError(null);

        //********** Get the transaction before deleting for optimistic totals update
        const toDelete = transactions.find((t) => t.clientId === clientId);

        const success = await deleteTransaction(clientId);
        if (!success) {
          setError("Transaction not found");
          return false;
        }

        //********** Optimistic update
        setTransactions((prev) => prev.filter((t) => t.clientId !== clientId));

        //********** Update monthly totals optimistically - TRANSFER excluded from P&L
        if (toDelete && isInCurrentMonth(toDelete.date) && toDelete.type !== "TRANSFER") {
          setMonthlyTotals((prev) => {
            if (toDelete.type === "INCOME") {
              return {
                totalIncome: prev.totalIncome - toDelete.amount,
                totalExpense: prev.totalExpense,
                netBalance: prev.netBalance - toDelete.amount,
              };
            } else {
              return {
                totalIncome: prev.totalIncome,
                totalExpense: prev.totalExpense - toDelete.amount,
                netBalance: prev.netBalance + toDelete.amount,
              };
            }
          });
        }

        scheduleSync();
        window.dispatchEvent(new Event("moneta-transaction-updated"));
        return true;
      } catch (err) {
        console.error("[useTransactions] Delete failed:", err);
        setError("Failed to delete transaction");
        return false;
      }
    },
    [scheduleSync, transactions]
  );

  return {
    transactions,
    monthlyTotals,
    isLoading,
    error,
    recordTransaction,
    editTransaction,
    removeTransaction,
    refresh: loadData,
  };
}

//********** HELPERS **********

function isInCurrentMonth(dateStr: string): boolean {
  const now = new Date();
  const date = new Date(dateStr);
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth()
  );
}
