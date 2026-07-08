/*
 * File: src/lib/local-db/transaction-queries.ts
 * Description: Kumpulan utilitas kueri dan agregasi transaksi pada IndexedDB (local-first),
 * sebagai dasar perhitungan analitik perilaku klien, dasbor ringkasan bulanan, dan proyeksi pengeluaran.
 */

import { Transaction, TransactionType, Category } from "@/types/models.types";
import {
  getAllTransactions,
  getTransactionsByDateRange,
} from "./repositories/transactions";
import { getAllCategories, getAllCategoriesIncludingDeleted } from "./repositories/categories";

/********** Helper Tanggal **********/

/**
 * Mengambil tanggal awal dan akhir untuk bulan tertentu.
 *
 * @param year - Tahun (misal: 2026).
 * @param month - Indeks bulan (0-indexed, 0 = Januari).
 * @returns Objek berisi startDate dan endDate dengan format YYYY-MM-DD.
 */
export function getMonthBounds(
  year: number,
  month: number
): { startDate: string; endDate: string } {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0); /* Hari terakhir dalam bulan tersebut */

  return {
    startDate: start.toISOString().split("T")[0],
    endDate: end.toISOString().split("T")[0],
  };
}

/**
 * Mengambil tanggal awal dan akhir untuk bulan yang sedang berjalan.
 *
 * @returns Objek berisi startDate dan endDate bulan aktif.
 */
export function getCurrentMonthBounds(): { startDate: string; endDate: string } {
  const now = new Date();
  return getMonthBounds(now.getFullYear(), now.getMonth());
}

/********** Agregasi Bulanan (Monthly Aggregations) **********/

/**
 * Mengambil seluruh transaksi pada periode bulan tertentu.
 * Digunakan untuk mengisi total dasbor dan grafik rincian bulanan.
 *
 * @param userId - ID pengguna.
 * @param year - Tahun.
 * @param month - Indeks bulan (0-indexed).
 * @returns Promise berisi daftar transaksi pada bulan tersebut.
 */
export async function getTransactionsByMonth(
  userId: string,
  year: number,
  month: number
): Promise<Transaction[]> {
  const { startDate, endDate } = getMonthBounds(year, month);
  return getTransactionsByDateRange(userId, startDate, endDate);
}

/**
 * Menghitung total pemasukan, pengeluaran, dan saldo bersih untuk bulan tertentu.
 * Transaksi berjenis TRANSFER tidak dimasukkan ke dalam perhitungan laba-rugi.
 *
 * @param userId - ID pengguna.
 * @param year - Tahun.
 * @param month - Indeks bulan.
 * @returns Promise berisi objek totalIncome, totalExpense, dan netBalance.
 */
export async function getMonthlyTotals(
  userId: string,
  year: number,
  month: number
): Promise<{ totalIncome: number; totalExpense: number; netBalance: number }> {
  const transactions = await getTransactionsByMonth(userId, year, month);

  let totalIncome = 0;
  let totalExpense = 0;

  for (const t of transactions) {
    if (t.type === "TRANSFER") continue; /* Dikecualikan dari laba rugi (P&L) */
    if (t.type === "INCOME") {
      totalIncome += t.amount;
    } else {
      totalExpense += t.amount;
    }
  }

  return {
    totalIncome,
    totalExpense,
    netBalance: totalIncome - totalExpense,
  };
}

/**
 * Mengambil total keuangan (pemasukan, pengeluaran, dan saldo bersih) untuk bulan yang sedang berjalan.
 *
 * @param userId - ID pengguna.
 * @returns Promise berisi ringkasan keuangan bulan aktif.
 */
export async function getCurrentMonthTotals(
  userId: string
): Promise<{ totalIncome: number; totalExpense: number; netBalance: number }> {
  const now = new Date();
  return getMonthlyTotals(userId, now.getFullYear(), now.getMonth());
}

/********** Agregasi Kategori (Category Aggregations) **********/

export interface CategoryTotal {
  categoryId: string;
  categoryName: string;
  categoryIcon: string | null;
  categoryColor: string | null;
  /* TRANSFER selalu dikecualikan dari analitik kategori */
  type: "INCOME" | "EXPENSE";
  total: number;
  count: number;
  percentage: number; /* Persentase terhadap total jenisnya (pemasukan/pengeluaran) */
}

/**
 * Menghitung total transaksi yang dikelompokkan berdasarkan kategori pada bulan tertentu.
 * Menjadi sumber data utama untuk mesin analitik dan kartu rekomendasi pengeluaran per kategori.
 *
 * @param userId - ID pengguna.
 * @param year - Tahun.
 * @param month - Indeks bulan.
 * @returns Promise berisi daftar CategoryTotal yang diurutkan dari nominal terbesar.
 */
export async function getTotalsByCategory(
  userId: string,
  year: number,
  month: number
): Promise<CategoryTotal[]> {
  const [transactions, categories] = await Promise.all([
    getTransactionsByMonth(userId, year, month),
    getAllCategoriesIncludingDeleted(userId),
  ]);

  /********** Buat lookup kategori berdasarkan clientId. */
  const catMap = new Map<string, Category>();
  for (const cat of categories) {
    catMap.set(cat.clientId, cat);
  }

  /********** Agregasi per kategori (TRANSFER dan transaksi tanpa kategori dilewati). */
  const aggregated = new Map<
    string,
    { total: number; count: number; type: "INCOME" | "EXPENSE" }
  >();

  for (const t of transactions) {
    if (t.type === "TRANSFER" || !t.categoryId) continue;
    /* Tipe dipersempit menjadi "INCOME" | "EXPENSE" */
    const txType = t.type as "INCOME" | "EXPENSE";
    const existing = aggregated.get(t.categoryId) || {
      total: 0,
      count: 0,
      type: txType,
    };
    existing.total += t.amount;
    existing.count += 1;
    aggregated.set(t.categoryId, existing);
  }

  /********** Hitung total per tipe untuk kalkulasi persentase. */
  let typeTotal: { INCOME: number; EXPENSE: number } = { INCOME: 0, EXPENSE: 0 };
  for (const agg of aggregated.values()) {
    typeTotal[agg.type] += agg.total;
  }

  /********** Susun hasil akhir. */
  const result: CategoryTotal[] = [];

  for (const [categoryId, agg] of aggregated) {
    const cat = catMap.get(categoryId);
    result.push({
      categoryId,
      categoryName: cat?.name || "Unknown",
      categoryIcon: cat?.icon || null,
      categoryColor: cat?.color || null,
      type: agg.type,
      total: agg.total,
      count: agg.count,
      percentage:
        typeTotal[agg.type] > 0
          ? Math.round((agg.total / typeTotal[agg.type]) * 100)
          : 0,
    });
  }

  /* Urutkan berdasarkan total terbesar */
  result.sort((a, b) => b.total - a.total);

  return result;
}

/********** Agregasi Harian (Daily Aggregations) **********/

export interface DailyTotal {
  date: string; /* Format tanggal YYYY-MM-DD */
  income: number;
  expense: number;
  net: number;
}

/**
 * Menghitung total pemasukan dan pengeluaran per hari dalam suatu bulan tertentu.
 * Digunakan pada grafik tren transaksi harian di dasbor.
 *
 * @param userId - ID pengguna.
 * @param year - Tahun.
 * @param month - Indeks bulan.
 * @returns Promise berisi daftar DailyTotal yang diurutkan berdasarkan tanggal.
 */
export async function getDailyTotals(
  userId: string,
  year: number,
  month: number
): Promise<DailyTotal[]> {
  const transactions = await getTransactionsByMonth(userId, year, month);

  const dailyMap = new Map<string, { income: number; expense: number }>();

  for (const t of transactions) {
    if (t.type === "TRANSFER") continue; /* Dikecualikan dari grafik tren laba rugi harian */
    const existing = dailyMap.get(t.date) || { income: 0, expense: 0 };
    if (t.type === "INCOME") {
      existing.income += t.amount;
    } else {
      existing.expense += t.amount;
    }
    dailyMap.set(t.date, existing);
  }

  const result: DailyTotal[] = [];
  for (const [date, totals] of dailyMap) {
    result.push({
      date,
      income: totals.income,
      expense: totals.expense,
      net: totals.income - totals.expense,
    });
  }

  /* Urutkan berdasarkan tanggal secara urut waktu */
  result.sort((a, b) => a.date.localeCompare(b.date));

  return result;
}

/********** Kecepatan Pengeluaran & Proyeksi (Spending Velocity) **********/

/**
 * Menghitung rata-rata pengeluaran harian pada bulan berjalan dan memproyeksikan total pengeluaran akhir bulan.
 *
 * @param userId - ID pengguna.
 * @param year - Tahun.
 * @param month - Indeks bulan.
 * @returns Promise berisi rata-rata harian (averageDaily), hari berjalan (daysElapsed), dan estimasi total (projectedTotal).
 */
export async function getAverageDailySpending(
  userId: string,
  year: number,
  month: number
): Promise<{ averageDaily: number; daysElapsed: number; projectedTotal: number }> {
  const { totalExpense } = await getMonthlyTotals(userId, year, month);
  const { endDate } = getMonthBounds(year, month);

  const now = new Date();
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(endDate);

  /* Jumlah hari berjalan (minimal 1) */
  const daysElapsed = Math.max(
    1,
    Math.ceil((Math.min(now.getTime(), monthEnd.getTime()) - monthStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
  );

  /* Total hari dalam bulan tersebut */
  const totalDays = monthEnd.getDate();

  const averageDaily = totalExpense / daysElapsed;
  const projectedTotal = averageDaily * totalDays;

  return {
    averageDaily,
    daysElapsed,
    projectedTotal,
  };
}
