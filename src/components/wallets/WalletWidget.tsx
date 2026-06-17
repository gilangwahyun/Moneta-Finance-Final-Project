"use client";

// ─── WalletWidget ────────────────────────────────────────
// Compact dashboard widget showing all active wallets and
// their dynamically calculated balances.
//
// Bug 4 Fix: Replaced raw Unicode '−' (U+2212) with ASCII '-'
// to prevent text corruption (Â− / âˆ') on certain screens.

import { Wallet } from "@/types/models.types";
import { formatCurrency } from "@/lib/utils/helpers";
import { calculateWalletBalance } from "@/lib/utils/wallet-utils";
import { Transaction } from "@/types/models.types";
import { Banknote, CreditCard, Smartphone, TrendingUp, Wallet as WalletIcon, ChevronRight } from "lucide-react";
import Link from "next/link";

// ── Wallet type icon map ────────────────────────────────
const WALLET_ICONS: Record<string, React.ReactNode> = {
  TUNAI:      <Banknote className="h-4 w-4" />,
  BANK:       <CreditCard className="h-4 w-4" />,
  E_WALLET:   <Smartphone className="h-4 w-4" />,
  INVESTASI:  <TrendingUp className="h-4 w-4" />,
  LAINNYA:    <WalletIcon className="h-4 w-4" />,
};

const WALLET_TYPE_LABELS: Record<string, string> = {
  TUNAI: "Tunai",
  BANK: "Bank",
  E_WALLET: "Dompet Digital",
  INVESTASI: "Investasi",
  LAINNYA: "Lainnya",
};

interface WalletWidgetProps {
  wallets: Wallet[];
  transactions: Transaction[];
  isLoading?: boolean;
}

export function WalletWidget({ wallets, transactions, isLoading }: WalletWidgetProps) {
  const totalBalance = wallets.reduce(
    (sum, w) => sum + calculateWalletBalance(w, transactions),
    0
  );

  if (isLoading) {
    return (
      <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-3 h-4 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
        {[1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3 py-2.5">
            <div className="h-9 w-9 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
            <div className="flex-1 space-y-1">
              <div className="h-3 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
              <div className="h-2.5 w-14 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
            </div>
            <div className="h-3.5 w-16 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
          </div>
        ))}
      </div>
    );
  }

  if (wallets.length === 0) {
    return (
      <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Dompet</p>
        <div className="mt-3 flex flex-col items-center py-4 text-center">
          <WalletIcon className="h-8 w-8 text-slate-300 dark:text-slate-600" />
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Belum ada dompet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Dompet
        </p>
        <Link
          href="/wallets"
          className="flex items-center gap-0.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
        >
          Kelola
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Wallet list */}
      <div className="divide-y divide-slate-50 dark:divide-slate-800/50 px-3">
        {wallets.map((wallet) => {
          const balance = calculateWalletBalance(wallet, transactions);
          const isNegative = balance < 0;
          return (
            <div key={wallet.clientId} className="flex items-center gap-3 py-2.5 px-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                {WALLET_ICONS[wallet.type] ?? <WalletIcon className="h-4 w-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                  {wallet.name}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {WALLET_TYPE_LABELS[wallet.type] ?? wallet.type}
                </p>
              </div>
              {/* Bug 4: Use ASCII '-' instead of Unicode '−' */}
              <span className={`shrink-0 text-sm font-semibold ${
                isNegative
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-slate-800 dark:text-slate-100"
              }`}>
                {isNegative ? "-" : ""}{formatCurrency(Math.abs(balance))}
              </span>
            </div>
          );
        })}
      </div>

      {/* Total row */}
      <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-5 py-3 dark:border-slate-800/50 dark:bg-slate-800/30">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Saldo</p>
        {/* Bug 4: Use ASCII '-' instead of Unicode '−' */}
        <p className={`text-sm font-bold ${
          totalBalance < 0
            ? "text-rose-600 dark:text-rose-400"
            : "text-indigo-600 dark:text-indigo-400"
        }`}>
          {totalBalance < 0 ? "-" : ""}{formatCurrency(Math.abs(totalBalance))}
        </p>
      </div>
    </div>
  );
}
