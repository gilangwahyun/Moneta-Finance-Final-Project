/*
 * File: src/hooks/use-budget-actions.ts
 * Description: Hook kustom React yang menyediakan aksi mutasi untuk menambah, memperbarui, menghapus, serta merealokasi anggaran keuangan lokal.
 */

import { getCurrentUser } from '@/lib/local-db/repositories/users';
import { setBudget as setBudgetDb, deleteBudget as deleteBudgetDb, reallocateBudget as reallocateBudgetDb } from '@/lib/local-db/repositories/budgets';
import { useLocalMutation } from '@/hooks/use-local-mutation';
import { SyncEvents } from '@/lib/sync/events';

export interface UseBudgetActionsReturn {
  error: string | null;
  editBudget: (
    clientId: string | undefined,
    amount: number,
    period: string,
    categoryId: string
  ) => Promise<void | null>;
  deleteBudget: (clientId: string) => Promise<void | null>;
  reallocateBudget: (
    sourceClientId: string,
    destinationClientId: string,
    amount: number
  ) => Promise<void | null>;
}

/********** Hook Utama (useBudgetActions) **********/

/**
 * Hook kustom untuk mengeksekusi operasi mutasi anggaran seperti pembuatan, peremajaan, penghapusan, dan pemindahan saldo anggaran.
 *
 * @returns Objek berisi fungsi-fungsi aksi untuk mengelola anggaran.
 */
export function useBudgetActions(): UseBudgetActionsReturn {
  /********** [START: Mutasi Anggaran & Realokasi] **********/
  /* Menambah anggaran baru atau memperbarui jumlah anggaran yang sudah ada untuk kategori tertentu */
  const { mutate: editBudget, error: addErr } = useLocalMutation(
    async (
      clientId: string | undefined,
      amount: number,
      period: string,
      categoryId: string
    ) => {
      const user = await getCurrentUser();
      if (!user) throw new Error('User not found');

      await setBudgetDb({
        clientId,
        amount,
        period,
        categoryId,
        userId: user.id,
      });
    },
    {
      eventName: SyncEvents.BUDGET_UPDATED,
      errorMessage: 'Failed to save budget'
    }
  );

  /* Menghapus anggaran berdasarkan ID uniknya */
  const { mutate: deleteBudget, error: removeErr } = useLocalMutation(
    async (clientId: string) => {
      await deleteBudgetDb(clientId);
    },
    {
      eventName: SyncEvents.BUDGET_UPDATED,
      errorMessage: 'Failed to delete budget'
    }
  );

  /* Memindahkan atau merealokasi sejumlah dana dari anggaran sumber ke anggaran tujuan */
  const { mutate: reallocateBudget, error: reallocateErr } = useLocalMutation(
    async (
      sourceClientId: string,
      destinationClientId: string,
      amount: number
    ) => {
      await reallocateBudgetDb({
        sourceClientId,
        destinationClientId,
        amount,
      });
    },
    {
      eventName: SyncEvents.BUDGET_UPDATED,
      errorMessage: 'Failed to reallocate budget'
    }
  );
  /********** [END: Mutasi Anggaran & Realokasi] **********/

  const combinedError = addErr || removeErr || reallocateErr;

  /********** Pengembalian Data Hook **********/

  return {
    error: combinedError,
    editBudget,
    deleteBudget,
    reallocateBudget
  };
}
