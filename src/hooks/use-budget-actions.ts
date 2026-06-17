import { useCallback } from 'react';
import { getCurrentUser } from '@/lib/local-db/repositories/users';
import { setBudget, deleteBudget, reallocateBudget } from '@/lib/local-db/repositories/budgets';

export function useBudgetActions() {
  const addOrEditBudget = useCallback(async (
    clientId: string | undefined,
    amount: number,
    period: string,
    categoryId: string
  ) => {
    const user = await getCurrentUser();
    if (!user) throw new Error('User not found');

    await setBudget({
      clientId,
      amount,
      period,
      categoryId,
      userId: user.id,
    });
  }, []);

  const removeBudget = useCallback(async (clientId: string) => {
    await deleteBudget(clientId);
  }, []);

  const handleReallocate = useCallback(async (
    sourceClientId: string,
    destinationClientId: string,
    amount: number
  ) => {
    await reallocateBudget({
      sourceClientId,
      destinationClientId,
      amount,
    });
  }, []);

  return {
    addOrEditBudget,
    removeBudget,
    handleReallocate
  };
}
