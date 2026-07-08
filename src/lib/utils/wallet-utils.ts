/*
 * File: src/lib/utils/wallet-utils.ts
 * Description: Kumpulan utilitas untuk menghitung saldo saat ini pada dompet tunggal
 * maupun akumulasi total saldo seluruh dompet aktif berdasarkan riwayat transaksi.
 */

import { Wallet, Transaction } from "@/types/models.types";

/********** Kalkulasi Saldo Per Dompet **********/

/**
 * Menghitung saldo saat ini untuk suatu dompet berdasarkan riwayat transaksinya.
 * Rumus perhitungan:
 *   initialBalance
 *   + SUM(INCOME di mana walletId === dompet ini)
 *   - SUM(EXPENSE di mana walletId === dompet ini)
 *   + SUM(TRANSFER di mana targetWalletId === dompet ini) ← uang masuk
 *   - SUM(TRANSFER di mana walletId === dompet ini)       ← uang keluar
 *
 * Transaksi TRANSFER dikecualikan dari total pemasukan/pengeluaran tetapi
 * TETAP dimasukkan dalam perhitungan mutasi saldo dompet.
 *
 * @param wallet - Objek dompet (Wallet) yang akan dihitung saldonya.
 * @param allTransactions - Seluruh daftar transaksi pengguna.
 * @returns Nominal saldo terkini dompet.
 */
export function calculateWalletBalance(
  wallet: Wallet,
  allTransactions: Transaction[]
): number {
  const relevant = allTransactions.filter((t) => !t.deletedAt);
  let balance = Number(wallet.initialBalance || 0);

  const matchesWallet = (id: string | null | undefined) =>
    id === wallet.clientId || (!!wallet.id && id === wallet.id);

  for (const t of relevant) {
    const amount = Number(t.amount);
    if (t.type === "INCOME" && matchesWallet(t.walletId)) {
      balance += amount;
    } else if (t.type === "EXPENSE" && matchesWallet(t.walletId)) {
      balance -= amount;
    } else if (t.type === "TRANSFER") {
      if (matchesWallet(t.walletId)) {
        balance -= amount; /* Uang keluar dari dompet ini */
      }
      if (matchesWallet(t.targetWalletId)) {
        balance += amount; /* Uang masuk ke dompet ini */
      }
    }
  }

  return balance;
}

/********** Kalkulasi Total Saldo Keseluruhan **********/

/**
 * Menghitung akumulasi total saldo dari SELURUH dompet yang aktif.
 * Menggantikan nilai monthlyTotals.netBalance pada kartu ringkasan Total Saldo di dasbor.
 *
 * @param wallets - Daftar seluruh dompet pengguna.
 * @param allTransactions - Seluruh daftar transaksi pengguna.
 * @returns Total akumulasi saldo semua dompet.
 */
export function calculateTotalBalance(
  wallets: Wallet[],
  allTransactions: Transaction[]
): number {
  return wallets.reduce(
    (sum, w) => sum + calculateWalletBalance(w, allTransactions),
    0
  );
}
