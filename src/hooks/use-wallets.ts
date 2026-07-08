/*
 * File: src/hooks/use-wallets.ts
 * Description: Hook kustom React untuk mengelola data dompet atau akun keuangan lokal melalui IndexedDB serta memantau perubahan saldo secara real-time.
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { Wallet, Transaction } from "@/types/models.types";
import { getAllWallets, addWallet, updateWallet, deleteWallet, AddWalletInput, UpdateWalletInput } from "@/lib/local-db/repositories/wallets";
import { calculateWalletBalance, calculateTotalBalance } from "@/lib/utils/wallet-utils";
import { getCurrentUser } from "@/lib/local-db/repositories/users";
import { getAllTransactions } from "@/lib/local-db/repositories/transactions";

/********** Tipe Data & Antarmuka **********/

interface UseWalletsReturn {
  /* Daftar dompet atau akun keuangan milik pengguna */
  wallets: Wallet[];
  /* Daftar transaksi yang dibutuhkan untuk mengalkulasi saldo terkini */
  transactions: Transaction[];
  /* Status indikator apakah data sedang dimuat */
  isLoading: boolean;
  /* Pesan error jika terjadi kegagalan operasi */
  error: string | null;
  /* Total akumulasi saldo dari seluruh dompet aktif */
  totalBalance: number;
  /* Menghitung saldo terkini dari suatu dompet spesifik */
  getWalletBalance: (wallet: Wallet) => number;
  /* Menambahkan dompet baru ke dalam sistem */
  addNewWallet: (input: Omit<AddWalletInput, "userId">) => Promise<void>;
  /* Memperbarui rincian dompet yang sudah ada */
  editWallet: (input: UpdateWalletInput) => Promise<void>;
  /* Menghapus dompet dari sistem lokal */
  removeWallet: (clientId: string) => Promise<void>;
}

/********** Hook Utama (useWallets) **********/

/**
 * Hook kustom untuk memuat dan memantau dompet keuangan pengguna dari IndexedDB serta menghitung saldonya secara dinamis berdasarkan histori transaksi.
 *
 * @returns Objek berisi daftar dompet, transaksi, status pemuatan, total saldo, dan metode mutasi dompet.
 */
export function useWallets(): UseWalletsReturn {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const user = await getCurrentUser();
      if (!user) return;
      const [ws, txns] = await Promise.all([
        getAllWallets(user.id),
        getAllTransactions(user.id),
      ]);
      setWallets(ws);
      setTransactions(txns);
    } catch (err) {
      console.error("[useWallets] Load error:", err);
      setError("Gagal memuat data dompet.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();

    /* Muat ulang data saat transaksi atau dompet berubah dari halaman atau komponen lain */
    const handler = () => load();
    window.addEventListener("moneta-transaction-updated", handler);
    return () => window.removeEventListener("moneta-transaction-updated", handler);
  }, [load]);

  const dispatch = () =>
    window.dispatchEvent(new CustomEvent("moneta-transaction-updated"));

  /********** Operasi Mutasi Dompet (CRUD) **********/

  /********** [START: Tambah Dompet Baru & Perbarui UI] **********/
  const addNewWallet = useCallback(async (input: Omit<AddWalletInput, "userId">) => {
    const user = await getCurrentUser();
    if (!user) throw new Error("Pengguna tidak ditemukan.");
    await addWallet({ ...input, userId: user.id });
    dispatch();
    await load();
  }, [load]);
  /********** [END: Tambah Dompet Baru & Perbarui UI] **********/

  /********** [START: Edit Dompet & Perbarui UI] **********/
  const editWallet = useCallback(async (input: UpdateWalletInput) => {
    await updateWallet(input);
    dispatch();
    await load();
  }, [load]);
  /********** [END: Edit Dompet & Perbarui UI] **********/

  /********** [START: Hapus Dompet & Perbarui UI] **********/
  const removeWallet = useCallback(async (clientId: string) => {
    await deleteWallet(clientId);
    dispatch();
    await load();
  }, [load]);
  /********** [END: Hapus Dompet & Perbarui UI] **********/

  /********** Kalkulasi Saldo Dompet **********/

  const getWalletBalance = useCallback(
    (wallet: Wallet) => calculateWalletBalance(wallet, transactions),
    [transactions]
  );

  const totalBalance = calculateTotalBalance(wallets, transactions);

  /********** Pengembalian Data Hook **********/

  return {
    wallets,
    transactions,
    isLoading,
    error,
    totalBalance,
    getWalletBalance,
    addNewWallet,
    editWallet,
    removeWallet,
  };
}
