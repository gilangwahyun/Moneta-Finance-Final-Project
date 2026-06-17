import { useState, useEffect, useCallback, useMemo } from 'react';
import { getCurrentUser } from '@/lib/local-db/repositories/users';
import { getBudgetsByPeriod } from '@/lib/local-db/repositories/budgets';
import { getAllCategoriesIncludingDeleted } from '@/lib/local-db/repositories/categories';
import { getTransactionsByMonth } from '@/lib/local-db/transaction-queries';
import { Budget, User, Transaction, Category } from '@/types/models.types';
import { calculateBudgetRhythm, BudgetRhythm } from '@/lib/utils/budget-rhythm';
import { SyncEvents } from '@/lib/sync/events';

export interface BudgetWithStats extends Budget {
  category?: Category;
  spentAmount: number;
  percentage: number;
  status: "SAFE" | "WARNING" | "DANGER";
  rhythm: BudgetRhythm;
}

export interface UseBudgetsReturn {
  user: User | null;
  budgets: Budget[];
  budgetsWithStats: BudgetWithStats[];
  transactions: Transaction[];
  isLoading: boolean;
  reload: () => Promise<void>;
}

export function useBudgets(selectedMonth: Date): UseBudgetsReturn {
  const [user, setUser] = useState<User | null>(null);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const currentPeriod = useMemo(() => {
    return `${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, "0")}`;
  }, [selectedMonth]);

  const loadBudgets = useCallback(async (userId: string, period: string) => {
    setIsLoading(true);
    const data = await getBudgetsByPeriod(userId, period);
    const allCats = await getAllCategoriesIncludingDeleted(userId);
    setAllCategories(allCats);
    
    setBudgets(data);
    
    // Load transactions for the selected month to calculate usage
    const [year, month] = period.split("-").map(Number);
    const txns = await getTransactionsByMonth(userId, year, month - 1);
    setTransactions(txns);
    setIsLoading(false);
  }, []);

  const reload = useCallback(async () => {
    if (user) {
      await loadBudgets(user.id, currentPeriod);
    }
  }, [user, loadBudgets, currentPeriod]);

  useEffect(() => {
    async function init() {
      const u = await getCurrentUser();
      if (u) {
        setUser(u);
        await loadBudgets(u.id, currentPeriod);
      } else {
        setIsLoading(false);
      }
    }
    init();

    const handleUpdate = async () => {
      const u = await getCurrentUser();
      if (u) {
        await loadBudgets(u.id, currentPeriod);
      }
    };
    
    window.addEventListener(SyncEvents.BUDGET_UPDATED, handleUpdate);
    window.addEventListener(SyncEvents.CATEGORY_UPDATED, handleUpdate);
    window.addEventListener(SyncEvents.TRANSACTION_UPDATED, handleUpdate);
    window.addEventListener(SyncEvents.SYNC_COMPLETED, handleUpdate);
    return () => {
      window.removeEventListener(SyncEvents.BUDGET_UPDATED, handleUpdate);
      window.removeEventListener(SyncEvents.CATEGORY_UPDATED, handleUpdate);
      window.removeEventListener(SyncEvents.TRANSACTION_UPDATED, handleUpdate);
      window.removeEventListener(SyncEvents.SYNC_COMPLETED, handleUpdate);
    };
  }, [currentPeriod, loadBudgets]);

  const budgetsWithStats = useMemo(() => {
    return budgets.map((budget) => {
      const category = allCategories.find((c) => c.clientId === budget.categoryId || c.id === budget.categoryId);
      
      const spentAmount = transactions.reduce((acc, txn) => {
        if (txn.categoryId === budget.categoryId && txn.date.startsWith(currentPeriod)) {
          return acc + Math.abs(txn.amount);
        }
        return acc;
      }, 0);

      const limit = Number(budget.amount) || 1; // guard against div by zero
      let percentage = (spentAmount / limit) * 100;
      if (percentage < 0) percentage = 0;
      
      let status: "SAFE" | "WARNING" | "DANGER" = "SAFE";
      if (percentage >= 100) status = "DANGER";
      else if (percentage >= 80) status = "WARNING";

      const rhythm = calculateBudgetRhythm(limit, spentAmount, budget.period);

      return {
        ...budget,
        category,
        spentAmount,
        percentage,
        status,
        rhythm
      };
    });
  }, [budgets, transactions, currentPeriod, allCategories]);

  return {
    user,
    budgets,
    budgetsWithStats,
    transactions,
    isLoading,
    reload
  };
}
