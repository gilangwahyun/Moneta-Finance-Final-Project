import { Wallet, Transaction } from "@/types/models.types";

/**
 * Calculate the current balance of a wallet from its transaction history.
 *
 * Formula:
 *   initialBalance
 *   + SUM(INCOME where walletId === this wallet)
 *   - SUM(EXPENSE where walletId === this wallet)
 *   + SUM(TRANSFER where targetWalletId === this wallet)   ← money coming in
 *   - SUM(TRANSFER where walletId === this wallet)          ← money going out
 *
 * TRANSFER transactions are excluded from income/expense totals but
 * ARE included in wallet balance calculations.
 */
export function calculateWalletBalance(
  wallet: Wallet,
  allTransactions: Transaction[]
): number {
  const relevant = allTransactions.filter((t) => !t.deletedAt);
  let balance = Number(wallet.initialBalance);

  for (const t of relevant) {
    const amount = Number(t.amount);
    if (t.type === "INCOME" && t.walletId === wallet.clientId) {
      balance += amount;
    } else if (t.type === "EXPENSE" && t.walletId === wallet.clientId) {
      balance -= amount;
    } else if (t.type === "TRANSFER") {
      if (t.walletId === wallet.clientId) {
        balance -= amount; // money leaving this wallet
      }
      if (t.targetWalletId === wallet.clientId) {
        balance += amount; // money arriving at this wallet
      }
    }
  }

  return balance;
}

/**
 * Get the aggregate total balance across ALL active wallets.
 * This replaces the old monthlyTotals.netBalance for the Total Saldo card.
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
