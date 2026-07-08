/*
 * File: src/lib/local-db/target-queries.ts
 * Description: Modul kalkulasi kemajuan (progress) target finansial secara dinamis,
 * melakukan kueri transaksi lokal di IndexedDB untuk menjamin data selalu mutakhir dengan pendekatan offline-first.
 */

import { getDB } from "./index";
import { STORES } from "./schema";
import { FinancialTarget, Transaction } from "@/types/models.types";
import { getTargetEffectiveDateRange } from "@/lib/utils/target-helpers";

/********** Antarmuka Progress Target **********/

export interface TargetProgress {
  currentAmount: number;
  percentage: number;
  isAchieved: boolean;
  remainingAmount: number;
  periodStart: Date;
  periodEnd: Date;
  isNotStarted?: boolean;
  /** True jika periode telah berakhir (hari ini > periodEnd), target belum tercapai, dan periodenya adalah CUSTOM */
  isExpired?: boolean;
}

/********** Kalkulasi Kemajuan Target (calculateTargetProgress) **********/

/**
 * Menghitung kemajuan untuk suatu target finansial secara dinamis berdasarkan tanggal referensi.
 * Aturan perhitungan:
 * - Jika target dibuat di pertengahan periode, tanggal mulai periode pertama dibatasi oleh startDate target itu sendiri.
 * - Jika tidak, menggunakan batas standar periode (hari, minggu, bulan).
 * - Tipe CUSTOM secara ketat mengikuti startDate dan endDate yang ditentukan di target.
 *
 * @param target - Objek FinancialTarget yang akan dihitung kemajuannya.
 * @param referenceDate - Tanggal referensi untuk evaluasi periode (default: hari ini).
 * @returns Promise berisi objek TargetProgress yang mencatat nominal, persentase, dan status pencapaian.
 */
export async function calculateTargetProgress(
  target: FinancialTarget, 
  referenceDate: Date = new Date()
): Promise<TargetProgress> {
  const db = await getDB();
  const effectiveRange = getTargetEffectiveDateRange(target, referenceDate);

  if (!effectiveRange) {
    const targetStart = target.startDate ? new Date(target.startDate) : new Date();
    return {
      currentAmount: 0,
      percentage: 0,
      isAchieved: false,
      remainingAmount: target.targetAmount || 0,
      periodStart: targetStart,
      periodEnd: target.endDate ? new Date(target.endDate) : targetStart,
      isNotStarted: true,
    };
  }

  const { periodStart, periodEnd } = effectiveRange;

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.TRANSACTIONS, "readonly");
    const store = tx.objectStore(STORES.TRANSACTIONS);
    const index = store.index("by_date");
    
    /********** Tentukan batas tanggal pencarian IDB. */
    const startIso = periodStart.toISOString();
    const endIso = periodEnd.toISOString();
    const dateRange = IDBKeyRange.bound(startIso, endIso);

    const request = index.getAll(dateRange);

    request.onsuccess = () => {
      const transactions = request.result as Transaction[];
      
      let currentAmount = 0;

      for (const txn of transactions) {
        if (txn.deletedAt) continue;
        if (txn.userId !== target.userId) continue;

        /********** Target Finansial hanya melacak transaksi pemasukan (INCOME); EXPENSE dan TRANSFER dilewati. */
        if (txn.type !== "INCOME") continue;
        
        if (!target.categoryId || txn.categoryId !== target.categoryId) continue;
        
        if (target.walletId && txn.walletId !== target.walletId) continue;

        currentAmount += Number(txn.amount);
      }

      const percentage = target.targetAmount > 0 
        ? Math.round((currentAmount / target.targetAmount) * 100)
        : 0;
        
      const isAchieved = currentAmount >= target.targetAmount;
      const remainingAmount = Math.max(0, target.targetAmount - currentAmount);

      /********** Target periode CUSTOM dianggap kedaluwarsa jika hari ini telah melewati periodEnd dan belum tercapai. */
      const isExpired =
        target.period === 'CUSTOM' &&
        !isAchieved &&
        new Date() > periodEnd;

      resolve({
        currentAmount,
        percentage,
        isAchieved,
        remainingAmount,
        periodStart,
        periodEnd,
        isExpired,
      });
    };

    request.onerror = () => reject(request.error);
  });
}
