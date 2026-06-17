"use client";

//********** START: TransactionFormProvider **********
//********** Global context provider untuk form transaksi.
//********** Memungkinkan komponen mana pun di dalam layout membuka form
//********** tanpa prop drilling (SpeedDialFAB, tombol "+ Tambah" sidebar, dll).
//**********
//********** Modul 2 - Smart Defaults:
//**********   Provider sekarang mengambil 50 transaksi terbaru dari IndexedDB
//**********   via useTransactions() dan mem-pass-nya ke TransactionModal sebagai
//**********   recentTransactions. Modal menggunakan data ini untuk menghitung
//**********   most-frequent wallet/kategori saat form dibuka.
//**********
//**********   Catatan performa: ini menciptakan instance useTransactions() kedua
//**********   di samping yang ada di DashboardPage. Kedua instance independen,
//**********   sama-sama subscribe ke moneta-transaction-updated, sehingga
//**********   smart default selalu menggunakan data terkini. Overhead IDB
//**********   diabaikan (read-only, fast, sudah dikache dalam React state).
//********** END: TransactionFormProvider **********

import { createContext, useContext, useState, ReactNode } from "react";
import { Transaction, TransactionType } from "@/types/models.types";
import { TransactionModal } from "@/components/transactions/TransactionModal";
import { useTransactions } from "@/hooks/use-transactions";

type TransactionFormContextType = {
  openForm: (type?: TransactionType) => void;
  editTransaction: (txn: Transaction) => void;
  closeForm: () => void;
};

const TransactionFormContext = createContext<
  TransactionFormContextType | undefined
>(undefined);

export function TransactionFormProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [editingTxn, setEditingTxn] = useState<Transaction | null>(null);
  const [initialType, setInitialType] = useState<TransactionType>("EXPENSE");

  //********** Smart Default data source **********
  //********** Transaksi terbaru untuk kalkulasi most-frequent wallet & kategori.
  //********** Subscribe ke moneta-transaction-updated sehingga selalu fresh.
  const { transactions } = useTransactions();

  const openForm = (type: TransactionType = "EXPENSE") => {
    setEditingTxn(null);
    setInitialType(type);
    setIsOpen(true);
  };

  const editTransaction = (txn: Transaction) => {
    setEditingTxn(txn);
    setIsOpen(true);
  };

  const closeForm = () => {
    setIsOpen(false);
    setTimeout(() => {
      setEditingTxn(null);
    }, 300); //********** Beri waktu animasi keluar selesai
  };

  return (
    <TransactionFormContext.Provider
      value={{ openForm, editTransaction, closeForm }}
    >
      {children}
      <TransactionModal
        isOpen={isOpen}
        onClose={closeForm}
        editingTxn={editingTxn}
        initialType={initialType}
        recentTransactions={transactions}
      />
    </TransactionFormContext.Provider>
  );
}

export function useTransactionForm() {
  const context = useContext(TransactionFormContext);
  if (context === undefined) {
    throw new Error(
      "useTransactionForm must be used within a TransactionFormProvider"
    );
  }
  return context;
}
