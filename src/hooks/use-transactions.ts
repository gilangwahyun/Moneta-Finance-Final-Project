/*
 * File: src/hooks/use-transactions.ts
 * Description: Hook kustom React untuk mengelola transaksi keuangan lokal melalui IndexedDB dengan pendekatan local-first, termasuk operasi penambahan, pembaruan, penghapusan, dan kalkulasi total bulanan.
 */

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

/********** Tipe Data & Antarmuka **********/

export interface MonthlyTotals {
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
}

export interface UseTransactionsReturn {
  /* Daftar transaksi terbaru (diurutkan berdasarkan tanggal menurun) */
  transactions: Transaction[];
  /* Total akumulasi pendapatan dan pengeluaran bulan berjalan */
  monthlyTotals: MonthlyTotals;
  /* Status indikator apakah data sedang dimuat */
  isLoading: boolean;
  /* Pesan error jika terjadi kegagalan operasi */
  error: string | null;
  /* Merekam transaksi baru ke dalam database lokal */
  recordTransaction: (
    input: Omit<AddTransactionInput, "userId">
  ) => Promise<Transaction | null>;
  /* Memperbarui data transaksi yang sudah ada */
  editTransaction: (
    input: UpdateTransactionInput
  ) => Promise<Transaction | null>;
  /* Menghapus (soft-delete) transaksi dari sistem */
  removeTransaction: (clientId: string) => Promise<boolean>;
  /* Memuat ulang data dari IndexedDB */
  refresh: () => Promise<void>;
}

/********** Hook Utama (useTransactions) **********/

/**
 * Hook kustom untuk mengelola transaksi secara local-first, memelihara pembaruan optimistik pada antarmuka pengguna, serta menjadwalkan sinkronisasi latar belakang.
 *
 * @returns Objek yang berisi daftar transaksi, total bulanan, status loading, dan metode mutasi transaksi.
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

  /* Memuat data transaksi dan kategori dari IndexedDB */
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const user = await getCurrentUser();
      
      if (!user) {
        setTransactions([]);
        setIsLoading(false);
        return;
      }

      const [recent, totals, allCategories] = await Promise.all([
        getRecentTransactions(user.id, 500), /* Muat hingga 500 transaksi agar filter bulan lalu tetap memiliki data */
        getCurrentMonthTotals(user.id),
        getAllCategoriesIncludingDeleted(user.id),
      ]);

      const categoriesMap = new Map(allCategories.map(c => [c.clientId, c]));
      const recentWithCategories = recent.map(txn => ({
        ...txn,
        category: txn.categoryId ? categoriesMap.get(txn.categoryId) : undefined
      }));

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

    /* Dengarkan event pembaruan dari instance atau komponen lain */
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

  /********** [START: Rekam Transaksi Baru & Pembaruan Optimistik] **********/
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

        /* Pembaruan optimistik — tambahkan transaksi baru ke posisi teratas daftar */
        setTransactions((prev) => [created, ...prev]);

        /* Perbarui total bulanan secara optimistik — transaksi jenis TRANSFER diabaikan dari laba rugi */
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
  /********** [END: Rekam Transaksi Baru & Pembaruan Optimistik] **********/

  /********** [START: Edit Transaksi & Pembaruan Ulang Total] **********/
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

        /* Muat ulang total bulanan dari database (terlalu kompleks untuk dihitung optimistik) */
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
  /********** [END: Edit Transaksi & Pembaruan Ulang Total] **********/

  /********** [START: Hapus Transaksi & Pembaruan Optimistik] **********/
  const removeTransaction = useCallback(
    async (clientId: string): Promise<boolean> => {
      try {
        setError(null);

        /* Ambil data transaksi sebelum dihapus untuk perhitungan pembaruan optimistik total bulanan */
        const toDelete = transactions.find((t) => t.clientId === clientId);

        const success = await deleteTransaction(clientId);
        if (!success) {
          setError("Transaction not found");
          return false;
        }

        /* Pembaruan optimistik daftar transaksi */
        setTransactions((prev) => prev.filter((t) => t.clientId !== clientId));

        /* Perbarui total bulanan secara optimistik — TRANSFER diabaikan dari laba rugi */
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
  /********** [END: Hapus Transaksi & Pembaruan Optimistik] **********/

  /********** Pengembalian Data Hook **********/

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

/********** Helper Internal **********/

/**
 * Memeriksa apakah string tanggal yang diberikan berada dalam bulan dan tahun berjalan saat ini.
 *
 * @param dateStr - String tanggal dalam format yang dapat diparsing oleh Date.
 * @returns boolean `true` apabila tanggal berada pada bulan berjalan, atau `false` jika sebaliknya.
 */
function isInCurrentMonth(dateStr: string): boolean {
  const now = new Date();
  const date = new Date(dateStr);
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth()
  );
}
