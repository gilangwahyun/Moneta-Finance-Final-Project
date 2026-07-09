/*
 * File: src/components/analytics/CategoryDrilldownDrawer.tsx
 * Description: Komponen laci samping (desktop) dan bottom sheet (seluler) untuk melihat detail rincian transaksi per kategori pada analisis keuangan.
 */

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Transaction } from "@/types/models.types";
import { TransactionItem } from "@/components/transactions/TransactionItem";
import { DynamicIcon } from "@/components/ui/DynamicIcon";
import { getCategoryIcon } from "@/lib/utils/icons";
import { formatCurrency } from "@/lib/utils/helpers";

interface CategoryDrilldownDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  categoryName: string;
  categoryIcon?: string | null;
  categoryColor?: string | null;
  totalAmount?: number;
  percentage?: number;
  activePeriod?: string;
  activeSegment?: string;
}

/**
 * Merender panel laci rincian transaksi untuk kategori yang dipilih.
 *
 * @param props - Properti konfigurasi laci rincian kategori
 * @returns Elemen JSX laci atau null jika belum dimuat
 */
export function CategoryDrilldownDrawer({
  isOpen,
  onClose,
  transactions,
  categoryName,
  categoryIcon,
  categoryColor,
  totalAmount,
  percentage,
  activePeriod,
  activeSegment,
}: CategoryDrilldownDrawerProps) {
  const [mounted, setMounted] = useState(false);
  const avgPerTxn = transactions.length > 0 && totalAmount ? totalAmount / transactions.length : 0;

  /********** [START: Efek Penguncian Pengguliran Layar Latar Belakang] **********/
  useEffect(() => {
    setMounted(true);
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);
  /********** [END: Efek Penguncian Pengguliran Layar Latar Belakang] **********/

  if (!mounted) return null;

  return (
    <>
      {/* Lapis Gelap Latar Belakang (Overlay) */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Kontainer Panel Laci (Drawer / Bottom Sheet) */}
      <div
        className={`fixed inset-x-0 bottom-0 z-50 w-full h-[85vh] bg-white dark:bg-slate-900 rounded-t-3xl shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out
          md:inset-y-0 md:right-0 md:left-auto md:bottom-auto md:h-full md:w-[400px] md:rounded-none md:rounded-l-2xl
          ${
            isOpen
              ? "translate-y-0 md:translate-x-0"
              : "translate-y-full md:translate-y-0 md:translate-x-full"
          }
        `}
      >
        {/* Indikator Pegangan Geser pada Perangkat Seluler */}
        <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mt-3 mb-2 md:hidden"></div>

        {/* Header Laci Kategori */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 pb-4 md:py-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
              style={{
                backgroundColor: categoryColor ? `${categoryColor}20` : "rgb(241 245 249)",
              }}
            >
              {categoryIcon ? (
                <DynamicIcon iconName={categoryIcon} color={categoryColor} className="h-5 w-5" />
              ) : (
                getCategoryIcon(categoryName, "h-5 w-5", categoryColor)
              )}
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-50">
                {categoryName}
              </h2>
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                {activeSegment} • {activePeriod || `${transactions.length} Transaksi`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 hover:text-slate-600 active:scale-95 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Area Konten Utama Daftar Transaksi */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-6 pt-4 md:p-5">
          {/* Ringkasan Statistik Kategori */}
          {totalAmount !== undefined && (
            <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/50">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">Total Nominal</p>
                <p className="mt-1 text-sm font-bold text-slate-900 dark:text-slate-50">{formatCurrency(totalAmount)}</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/50">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">Kontribusi</p>
                <p className="mt-1 text-sm font-bold text-slate-900 dark:text-slate-50">{percentage}%</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/50">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">Jumlah Transaksi</p>
                <p className="mt-1 text-sm font-bold text-slate-900 dark:text-slate-50">{transactions.length}</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/50">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">Rata-rata</p>
                <p className="mt-1 text-sm font-bold text-slate-900 dark:text-slate-50">{formatCurrency(avgPerTxn)}</p>
              </div>
            </div>
          )}

          {transactions.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center text-center">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Tidak ada transaksi
              </p>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                Tidak ditemukan transaksi untuk periode ini.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((txn) => (
                <div
                  key={txn.clientId}
                  className="overflow-hidden rounded-xl border border-slate-100 bg-white dark:border-slate-800 dark:bg-slate-900"
                >
                  <TransactionItem
                    transaction={txn}
                    categoryName={categoryName}
                    categoryIcon={categoryIcon}
                    categoryColor={categoryColor}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
