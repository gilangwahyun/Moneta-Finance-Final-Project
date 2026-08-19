/*
 * File: src/components/Skeletons.tsx
 * Description: Kumpulan komponen kerangka pemuatan (skeleton loading) yang meniru tata letak konten saat proses pengambilan data dari IndexedDB.
 */

"use client";

/**
 * Merender kerangka pemuatan untuk kartu ringkasan keuangan.
 *
 * @returns Elemen JSX kerangka kartu
 */
function SummaryCardSkeleton() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="flex items-center gap-2">
        <div className="h-5 w-5 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
        <div className="h-3 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
      </div>
      <div className="mt-3 h-6 w-28 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
      <div className="mt-2 h-2.5 w-16 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
    </div>
  );
}


/**
 * Merender kerangka pemuatan untuk satu item transaksi dalam daftar.
 *
 * @returns Elemen JSX kerangka item transaksi
 */
function TransactionItemSkeleton() {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
        <div className="space-y-1.5">
          <div className="h-3.5 w-28 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
          <div className="h-2.5 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
        </div>
      </div>
      <div className="text-right space-y-1.5">
        <div className="ml-auto h-3.5 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
        <div className="ml-auto h-2.5 w-14 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
      </div>
    </div>
  );
}

/**
 * Merender kerangka pemuatan keseluruhan halaman daftar transaksi beserta kartu ringkasan.
 *
 * @param props - Jumlah baris item kerangka yang dirender (default: 5)
 * @returns Elemen JSX kerangka daftar transaksi
 */
export function TransactionListSkeleton({ count = 5 }: { count?: number }) {
  /********** [START: Perenderan Komponen Kerangka Pemuatan Daftar Transaksi] **********/
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Kerangka bagian header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-6 w-36 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
          <div className="h-3.5 w-56 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
        </div>
        <div className="h-9 w-9 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700" />
      </div>

      {/* Kerangka kartu ringkasan */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <SummaryCardSkeleton />
        <SummaryCardSkeleton />
        <div className="hidden sm:block">
          <SummaryCardSkeleton />
        </div>
      </div>

      {/* Kerangka tab navigasi */}
      <div className="flex gap-4 border-b border-slate-200 dark:border-slate-700 pb-1">
        <div className="h-4 w-12 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
        <div className="h-4 w-16 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
        <div className="h-4 w-14 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
      </div>

      {/* Kerangka daftar item transaksi */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="divide-y divide-slate-100 dark:divide-slate-700">
          {Array.from({ length: count }).map((_, i) => (
            <TransactionItemSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
  /********** [END: Perenderan Komponen Kerangka Pemuatan Daftar Transaksi] **********/
}
