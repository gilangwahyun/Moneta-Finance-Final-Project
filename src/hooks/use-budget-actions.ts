/*
 * File: src/hooks/use-budget-actions.ts
 * Description: Hook kustom React yang menyediakan aksi mutasi untuk menambah, memperbarui, menghapus, serta merealokasi anggaran keuangan lokal.
 */

import { getCurrentUser } from '@/lib/local-db/repositories/users';
import { setBudget, deleteBudget, reallocateBudget } from '@/lib/local-db/repositories/budgets';
import { useLocalMutation } from '@/hooks/use-local-mutation';
import { SyncEvents } from '@/lib/sync/events';

/********** Hook Utama (useBudgetActions) **********/

/**
 * Hook kustom untuk mengeksekusi operasi mutasi anggaran seperti pembuatan, peremajaan, penghapusan, dan pemindahan saldo anggaran.
 *
 * @returns Objek berisi fungsi-fungsi aksi untuk mengelola anggaran.
 */
export function useBudgetActions() {
  /********** [START: Mutasi Anggaran & Realokasi] **********/
  /* Menambah anggaran baru atau memperbarui jumlah anggaran yang sudah ada untuk kategori tertentu */
  const { mutate: addOrEditBudget, error: addErr } = useLocalMutation(
    async (
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
    },
    {
      eventName: SyncEvents.BUDGET_UPDATED,
      errorMessage: 'Failed to save budget'
    }
  );

  /* Menghapus anggaran berdasarkan ID uniknya */
  const { mutate: removeBudget, error: removeErr } = useLocalMutation(
    async (clientId: string) => {
      await deleteBudget(clientId);
    },
    {
      eventName: SyncEvents.BUDGET_UPDATED,
      errorMessage: 'Failed to delete budget'
    }
  );

  /* Memindahkan atau merealokasi sejumlah dana dari anggaran sumber ke anggaran tujuan */
  const { mutate: handleReallocate, error: reallocateErr } = useLocalMutation(
    async (
      sourceClientId: string,
      destinationClientId: string,
      amount: number
    ) => {
      await reallocateBudget({
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
    addOrEditBudget,
    removeBudget,
    handleReallocate
  };
}
