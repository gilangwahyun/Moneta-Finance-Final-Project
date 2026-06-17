// ─── Transaction Analytics Query Stubs ──────────────────
// IndexedDB query utilities for aggregating transactions.
//
// Purpose: These functions lay the groundwork for the
// "Client-Side Behavioral Analytics" engine. The analytics
// and rule-based recommendations will be built later using
// the data returned by these functions.
//
// All data is queried from IndexedDB (local-first).

import { Transaction, TransactionType, Category } from "@/types/models.types";
import {
  getAllTransactions,
  getTransactionsByDateRange,
} from "./repositories/transactions";
import { getAllCategories, getAllCategoriesIncludingDeleted } from "./repositories/categories";

// ─── Date Helpers ───────────────────────────────────────

/**
 * Get the first and last day of a given month.
 * @param year - e.g. 2026
 * @param month - 0-indexed (0 = January)
 */
export function getMonthBounds(
  year: number,
  month: number
): { startDate: string; endDate: string } {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0); // Last day of the month

  return {
    startDate: start.toISOString().split("T")[0],
    endDate: end.toISOString().split("T")[0],
  };
}

/**
 * Get the first and last day of the current month.
 */
export function getCurrentMonthBounds(): { startDate: string; endDate: string } {
  const now = new Date();
  return getMonthBounds(now.getFullYear(), now.getMonth());
}

// ─── Monthly Aggregations ───────────────────────────────

/**
 * Get all transactions for a specific month.
 *
 * Usage: Feeding into dashboard totals, monthly breakdown charts.
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
 * Get the total income and expense for a specific month.
 *
 * Usage: Dashboard summary cards ("Total Income: Rp X, Total Expense: Rp Y").
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
    if (t.type === "TRANSFER") continue; // Excluded from P&L
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
 * Get the current month's totals (convenience wrapper).
 */
export async function getCurrentMonthTotals(
  userId: string
): Promise<{ totalIncome: number; totalExpense: number; netBalance: number }> {
  const now = new Date();
  return getMonthlyTotals(userId, now.getFullYear(), now.getMonth());
}

// ─── Category Aggregations ──────────────────────────────

export interface CategoryTotal {
  categoryId: string;
  categoryName: string;
  categoryIcon: string | null;
  categoryColor: string | null;
  // TRANSFER is always excluded from category analytics
  type: "INCOME" | "EXPENSE";
  total: number;
  count: number;
  percentage: number; // Percentage of total for its type (Income or Expense)
}

/**
 * Get totals grouped by category for a specific month.
 *
 * Usage: "You spent Rp 500,000 on Food & Dining (35% of expenses)."
 * This is the primary data source for the future analytics engine.
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

  // Build category lookup
  const catMap = new Map<string, Category>();
  for (const cat of categories) {
    catMap.set(cat.clientId, cat);
  }

  // Aggregate by category -- TRANSFER and uncategorised rows are skipped above
  const aggregated = new Map<
    string,
    { total: number; count: number; type: "INCOME" | "EXPENSE" }
  >();

  for (const t of transactions) {
    if (t.type === "TRANSFER" || !t.categoryId) continue;
    // t.type is narrowed to "INCOME" | "EXPENSE" here
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

  // Calculate totals by type for percentage
  let typeTotal: { INCOME: number; EXPENSE: number } = { INCOME: 0, EXPENSE: 0 };
  for (const agg of aggregated.values()) {
    typeTotal[agg.type] += agg.total;
  }

  // Build result
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

  // Sort by total descending
  result.sort((a, b) => b.total - a.total);

  return result;
}

// ─── Daily Aggregations ─────────────────────────────────

export interface DailyTotal {
  date: string; // YYYY-MM-DD
  income: number;
  expense: number;
  net: number;
}

/**
 * Get daily totals for a specific month.
 *
 * Usage: Trend chart showing daily spending over the month.
 */
export async function getDailyTotals(
  userId: string,
  year: number,
  month: number
): Promise<DailyTotal[]> {
  const transactions = await getTransactionsByMonth(userId, year, month);

  const dailyMap = new Map<string, { income: number; expense: number }>();

  for (const t of transactions) {
    if (t.type === "TRANSFER") continue; // Excluded from daily P&L chart
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

  // Sort by date ascending
  result.sort((a, b) => a.date.localeCompare(b.date));

  return result;
}

// ─── Spending Velocity ──────────────────────────────────

/**
 * Calculate the average daily spending for a month.
 *
 * Usage: "You're averaging Rp 85,000/day this month."
 * Future: Used for projections ("At this rate, you'll spend Rp X by month end").
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

  // Days elapsed so far (at least 1)
  const daysElapsed = Math.max(
    1,
    Math.ceil((Math.min(now.getTime(), monthEnd.getTime()) - monthStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
  );

  // Total days in the month
  const totalDays = monthEnd.getDate();

  const averageDaily = totalExpense / daysElapsed;
  const projectedTotal = averageDaily * totalDays;

  return {
    averageDaily,
    daysElapsed,
    projectedTotal,
  };
}
