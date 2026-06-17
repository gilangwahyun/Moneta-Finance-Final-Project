import { useState, useEffect, useMemo, useCallback } from 'react';
import { Budget, Transaction, Category } from '@/types/models.types';
import { getBudgetsByPeriod } from '@/lib/local-db/repositories/budgets';
import { getCurrentUser } from '@/lib/local-db/repositories/users';
import { BudgetProgressItem } from '@/components/budgets/UrgentBudgetProgressBar';

export interface UseDashboardProps {
  transactions: Transaction[];
  allCategories: Category[];
}

export interface UseDashboardReturn {
  username: string;
  budgetProgress: BudgetProgressItem[];
  totalBudget: number;
  totalSpent: number;
  dailySafeToSpend: number;
  showBurnRateWarning: boolean;
  isLoading: boolean;
  reload: () => Promise<void>;
}

export function useDashboard({ transactions, allCategories }: UseDashboardProps): UseDashboardReturn {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [username, setUsername] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  const currentPeriod = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const user = await getCurrentUser();
      if (!user) return;
      setUsername(user.username || '');
      const loadedBudgets = await getBudgetsByPeriod(user.id, currentPeriod);
      setBudgets(loadedBudgets);
    } finally {
      setIsLoading(false);
    }
  }, [currentPeriod]);

  useEffect(() => {
    load();
    const handler = () => load();
    window.addEventListener('moneta-transaction-updated', handler);
    return () => window.removeEventListener('moneta-transaction-updated', handler);
  }, [load]);

  const { totalBudget, totalSpent } = useMemo(() => {
    const totalBudget = budgets.reduce((sum, b) => sum + Number(b.amount), 0);
    const totalSpent = transactions
      .filter((t) => t.type === 'EXPENSE' && t.date.startsWith(currentPeriod))
      .reduce((sum, t) => sum + Number(t.amount), 0);
    return { totalBudget, totalSpent };
  }, [budgets, transactions, currentPeriod]);

  const budgetProgress = useMemo((): BudgetProgressItem[] => {
    return budgets
      .map((budget) => {
        const category = allCategories.find((c) => c.clientId === budget.categoryId || c.id === budget.categoryId);

        const spentAmount = transactions.reduce((acc, txn) => {
          if (txn.type === 'EXPENSE' && txn.categoryId === budget.categoryId && txn.date.startsWith(currentPeriod)) {
            return acc + Math.abs(Number(txn.amount));
          }
          return acc;
        }, 0);

        const budgetAmount = Number(budget.amount);
        const remainingAmount = Math.max(0, budgetAmount - spentAmount);
        const percentage = budgetAmount > 0 ? Math.round((spentAmount / budgetAmount) * 100) : 0;
        const clampedPercentage = Math.min(100, percentage);

        const urgencyLevel: BudgetProgressItem['urgencyLevel'] = percentage >= 100 ? 'critical' : percentage >= 75 ? 'warning' : 'safe';

        return {
          categoryId: budget.categoryId,
          categoryName: category?.name || 'Tak dikenal',
          categoryColor: category?.color ?? null,
          spentAmount,
          budgetAmount,
          remainingAmount,
          percentage,
          clampedPercentage,
          urgencyLevel,
        };
      })
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 4);
  }, [budgets, transactions, allCategories, currentPeriod]);

  const { dailySafeToSpend, showBurnRateWarning } = useMemo(() => {
    const now = new Date();
    const currentDay = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysLeft = Math.max(1, daysInMonth - currentDay + 1);

    const totalRemaining = Math.max(0, totalBudget - totalSpent);
    const dailySafeToSpend = totalRemaining / daysLeft;

    const timePassedPct = (currentDay / daysInMonth) * 100;
    const spentPct = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
    const showBurnRateWarning = totalBudget > 0 && spentPct - timePassedPct > 10;

    return { dailySafeToSpend, showBurnRateWarning };
  }, [totalBudget, totalSpent]);

  return {
    username,
    budgetProgress,
    totalBudget,
    totalSpent,
    dailySafeToSpend,
    showBurnRateWarning,
    isLoading,
    reload: load,
  };
}
