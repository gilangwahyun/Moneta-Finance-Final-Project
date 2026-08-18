/*
 * File: src/hooks/use-wallets.ts
 * Description: Hook kustom React untuk mengelola data dompet atau akun keuangan lokal melalui IndexedDB serta memantau perubahan saldo secara real-time.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Wallet, Transaction } from '@/types/models.types';
import {
  getAllWallets,
  addWallet,
  updateWallet,
  deleteWallet,
  AddWalletInput,
  UpdateWalletInput,
} from '@/lib/local-db/repositories/wallets';
import { calculateWalletBalance, calculateTotalBalance } from '@/lib/utils/wallet-utils';
import { getCurrentUser } from '@/lib/local-db/repositories/users';
import { getAllTransactions } from '@/lib/local-db/repositories/transactions';
import { useLocalMutation } from '@/hooks/use-local-mutation';
import { SyncEvents } from '@/lib/sync/events';

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
  addNewWallet: (input: Omit<AddWalletInput, 'userId'>) => Promise<Wallet | null>;
  /* Memperbarui rincian dompet yang sudah ada */
  editWallet: (input: UpdateWalletInput) => Promise<Wallet | null>;
  /* Menghapus dompet dari sistem lokal */
  removeWallet: (clientId: string) => Promise<void | boolean | null | any>;
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
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const user = await getCurrentUser();
      if (!user) return;
      const [ws, txns] = await Promise.all([getAllWallets(user.id), getAllTransactions(user.id)]);
      setWallets(ws);
      setTransactions(txns);
      setLoadError(null);
    } catch (err) {
      console.error('[useWallets] Load error:', err);
      setLoadError('Gagal memuat data dompet.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();

    /* Muat ulang data saat transaksi atau dompet berubah dari halaman atau komponen lain */
    const handler = () => load();
    window.addEventListener(SyncEvents.TRANSACTION_UPDATED, handler);
    window.addEventListener(SyncEvents.WALLET_UPDATED, handler);
    window.addEventListener(SyncEvents.SYNC_COMPLETED, handler);
    return () => {
      window.removeEventListener(SyncEvents.TRANSACTION_UPDATED, handler);
      window.removeEventListener(SyncEvents.WALLET_UPDATED, handler);
      window.removeEventListener(SyncEvents.SYNC_COMPLETED, handler);
    };
  }, [load]);

  /********** Operasi Mutasi Dompet (CRUD) **********/

  const { mutate: addNewWallet, error: addErr } = useLocalMutation(
    async (input: Omit<AddWalletInput, 'userId'>) => {
      const user = await getCurrentUser();
      if (!user) throw new Error('Pengguna tidak ditemukan.');
      return addWallet({ ...input, userId: user.id });
    },
    { eventName: SyncEvents.WALLET_UPDATED, onSuccess: load, errorMessage: 'Gagal menambahkan dompet' },
  );

  const { mutate: editWallet, error: editErr } = useLocalMutation(updateWallet, {
    eventName: SyncEvents.WALLET_UPDATED,
    onSuccess: load,
    errorMessage: 'Gagal memperbarui dompet',
  });

  const { mutate: removeWallet, error: removeErr } = useLocalMutation(deleteWallet, {
    eventName: SyncEvents.WALLET_UPDATED,
    onSuccess: load,
    errorMessage: 'Gagal menghapus dompet',
  });

  /********** Kalkulasi Saldo Dompet **********/

  const getWalletBalance = useCallback((wallet: Wallet) => calculateWalletBalance(wallet, transactions), [transactions]);

  const totalBalance = calculateTotalBalance(wallets, transactions);

  const combinedError = loadError || addErr || editErr || removeErr;

  /********** Pengembalian Data Hook **********/

  return {
    wallets,
    transactions,
    isLoading,
    error: combinedError,
    totalBalance,
    getWalletBalance,
    addNewWallet,
    editWallet,
    removeWallet,
  };
}
