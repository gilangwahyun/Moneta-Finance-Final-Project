/*
 * File: src/providers/TransactionFormProvider.tsx
 * Description: Penyedia konteks global untuk membuka modal form transaksi (tambah/ubah) dari mana pun di dalam hierarki aplikasi beserta pasokan Smart Defaults.
 */

"use client";

/*
 * Global context provider untuk form transaksi.
 * Memungkinkan komponen mana pun di dalam layout membuka form
 * tanpa prop drilling (SpeedDialFAB, tombol "+ Tambah" sidebar, dll).
 *
 * Modul 2 - Smart Defaults:
 *   Provider mengambil transaksi terbaru dari IndexedDB
 *   via useTransactions() dan meneruskannya ke TransactionModal sebagai
 *   recentTransactions. Modal menggunakan data ini untuk menghitung
 *   dompet/kategori paling sering digunakan saat form dibuka.
 */

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

/**
 * Komponen penyedia konteks form transaksi yang menyediakan metode pembukaan/penutupan modal di seluruh aplikasi.
 *
 * @param props - Properti penyedia form transaksi
 * @returns Elemen JSX penyedia konteks beserta komponen TransactionModal
 */
export function TransactionFormProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [editingTxn, setEditingTxn] = useState<Transaction | null>(null);
  const [initialType, setInitialType] = useState<TransactionType>("EXPENSE");

  /* Sumber data Smart Default: transaksi terbaru untuk kalkulasi dompet & kategori paling sering digunakan */
  const { transactions } = useTransactions();

  /********** [START: Kontrol Modal Form Transaksi Global] **********/
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
    }, 300); /* Beri waktu agar animasi penutupan modal selesai */
  };
  /********** [END: Kontrol Modal Form Transaksi Global] **********/

  /********** [START: Perenderan Konteks dan Modal Form Transaksi] **********/
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
  /********** [END: Perenderan Konteks dan Modal Form Transaksi] **********/
}

/**
 * Hook untuk mengakses kontrol form transaksi global (buka form baru, ubah transaksi, atau tutup form).
 *
 * @returns Objek fungsi dari TransactionFormContextType
 */
export function useTransactionForm() {
  const context = useContext(TransactionFormContext);
  if (context === undefined) {
    throw new Error(
      "useTransactionForm harus digunakan di dalam TransactionFormProvider"
    );
  }
  return context;
}
