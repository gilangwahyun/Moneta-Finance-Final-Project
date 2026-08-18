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
import { useLocalMutation } from "@/hooks/use-local-mutation";

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
  removeTransaction: (clientId: string) => Promise<boolean | null | any>;
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
  const [loadError, setLoadError] = useState<string | null>(null);

  /* Memuat data transaksi dan kategori dari IndexedDB */
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setLoadError(null);

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
      setLoadError("Failed to load transactions");
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
  const { mutate: recordTransaction, error: recordErr } = useLocalMutation(
    async (
      input: Omit<AddTransactionInput, "userId">
    ) => {
      const user = await getCurrentUser();
      if (!user) throw new Error("No user session found");
      return addTransaction({ ...input, userId: user.id });
    },
    {
      eventName: SyncEvents.TRANSACTION_UPDATED,
      errorMessage: "Failed to record transaction",
      onSuccess: (created) => {
        if (!created) return;
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
      }
    }
  );
  /********** [END: Rekam Transaksi Baru & Pembaruan Optimistik] **********/

  /********** [START: Edit Transaksi & Pembaruan Ulang Total] **********/
  const { mutate: editTransaction, error: editErr } = useLocalMutation(
    async (input: UpdateTransactionInput) => {
      const updated = await updateTransaction(input);
      if (!updated) throw new Error("Transaction not found");
      return updated;
    },
    {
      eventName: SyncEvents.TRANSACTION_UPDATED,
      errorMessage: "Failed to update transaction",
      onSuccess: async (updated) => {
        if (!updated) return;
        setTransactions((prev) =>
          prev.map((t) => (t.clientId === updated.clientId ? updated : t))
        );

        /* Muat ulang total bulanan dari database (terlalu kompleks untuk dihitung optimistik) */
        const user = await getCurrentUser();
        if (user) {
          const totals = await getCurrentMonthTotals(user.id);
          setMonthlyTotals(totals);
        }
      }
    }
  );
  /********** [END: Edit Transaksi & Pembaruan Ulang Total] **********/

  /********** [START: Hapus Transaksi & Pembaruan Optimistik] **********/
  const { mutate: removeTransaction, error: removeErr } = useLocalMutation(
    async (clientId: string) => {
      /* Ambil data transaksi sebelum dihapus untuk perhitungan pembaruan optimistik total bulanan */
      const toDelete = transactions.find((t) => t.clientId === clientId);
      const success = await deleteTransaction(clientId);
      if (!success) throw new Error("Transaction not found");
      return toDelete; // Return the deleted transaction object for the onSuccess callback
    },
    {
      eventName: SyncEvents.TRANSACTION_UPDATED,
      errorMessage: "Failed to delete transaction",
      onSuccess: (toDelete) => {
        if (!toDelete) return;
        /* Pembaruan optimistik daftar transaksi */
        setTransactions((prev) => prev.filter((t) => t.clientId !== toDelete.clientId));

        /* Perbarui total bulanan secara optimistik — TRANSFER diabaikan dari laba rugi */
        if (isInCurrentMonth(toDelete.date) && toDelete.type !== "TRANSFER") {
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
      }
    }
  );
  /********** [END: Hapus Transaksi & Pembaruan Optimistik] **********/

  const combinedError = loadError || recordErr || editErr || removeErr;

  /********** Pengembalian Data Hook **********/

  return {
    transactions,
    monthlyTotals,
    isLoading,
    error: combinedError,
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
