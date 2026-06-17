"use client";

//********** START: useWallets Hook **********
//********** Provides reactive access to the user's wallets from IndexedDB.
//********** Re-renders on 'moneta-transaction-updated' window events so that
//********** wallet balances stay live whenever transactions change.
//********** END: useWallets Hook **********

import { useState, useEffect, useCallback } from "react";
import { Wallet, Transaction } from "@/types/models.types";
import { getAllWallets, addWallet, updateWallet, deleteWallet, AddWalletInput, UpdateWalletInput } from "@/lib/local-db/repositories/wallets";
import { calculateWalletBalance, calculateTotalBalance } from "@/lib/utils/wallet-utils";
import { getCurrentUser } from "@/lib/local-db/repositories/users";
import { getAllTransactions } from "@/lib/local-db/repositories/transactions";

//********** TYPES **********
interface UseWalletsReturn {
  //********** Array of wallets
  wallets: Wallet[];
  //********** needed for balance calc
  transactions: Transaction[];
  //********** Whether data is loading
  isLoading: boolean;
  //********** Error message
  error: string | null;
  //********** Total balance across all wallets
  totalBalance: number;
  //********** Get specific wallet balance
  getWalletBalance: (wallet: Wallet) => number;
  //********** Add new wallet
  addNewWallet: (input: Omit<AddWalletInput, "userId">) => Promise<void>;
  //********** Edit existing wallet
  editWallet: (input: UpdateWalletInput) => Promise<void>;
  //********** Remove wallet
  removeWallet: (clientId: string) => Promise<void>;
}

//********** HOOK **********
/**
 * React hook for managing wallets through IndexedDB.
 * @returns Object containing wallets state and methods.
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

    //********** Re-render when transactions or wallets change from any page
    const handler = () => load();
    window.addEventListener("moneta-transaction-updated", handler);
    return () => window.removeEventListener("moneta-transaction-updated", handler);
  }, [load]);

  const dispatch = () =>
    window.dispatchEvent(new CustomEvent("moneta-transaction-updated"));

  const addNewWallet = useCallback(async (input: Omit<AddWalletInput, "userId">) => {
    const user = await getCurrentUser();
    if (!user) throw new Error("Pengguna tidak ditemukan.");
    await addWallet({ ...input, userId: user.id });
    dispatch();
    await load();
  }, [load]);

  const editWallet = useCallback(async (input: UpdateWalletInput) => {
    await updateWallet(input);
    dispatch();
    await load();
  }, [load]);

  const removeWallet = useCallback(async (clientId: string) => {
    await deleteWallet(clientId);
    dispatch();
    await load();
  }, [load]);

  const getWalletBalance = useCallback(
    (wallet: Wallet) => calculateWalletBalance(wallet, transactions),
    [transactions]
  );

  const totalBalance = calculateTotalBalance(wallets, transactions);

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
