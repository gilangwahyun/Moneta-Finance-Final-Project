/*
 * File: src/hooks/use-budget-actions.ts
 * Description: Hook kustom React yang menyediakan aksi mutasi untuk menambah, memperbarui, menghapus, serta merealokasi anggaran keuangan lokal.
 */

import { useCallback } from 'react';
import { getCurrentUser } from '@/lib/local-db/repositories/users';
import { setBudget, deleteBudget, reallocateBudget } from '@/lib/local-db/repositories/budgets';

/********** Hook Utama (useBudgetActions) **********/

/**
 * Hook kustom untuk mengeksekusi operasi mutasi anggaran seperti pembuatan, peremajaan, penghapusan, dan pemindahan saldo anggaran.
 *
 * @returns Objek berisi fungsi-fungsi aksi untuk mengelola anggaran.
 */
export function useBudgetActions() {
  /********** [START: Mutasi Anggaran & Realokasi] **********/
  /* Menambah anggaran baru atau memperbarui jumlah anggaran yang sudah ada untuk kategori tertentu */
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

  /* Menghapus anggaran berdasarkan ID uniknya */
  const removeBudget = useCallback(async (clientId: string) => {
    await deleteBudget(clientId);
  }, []);

  /* Memindahkan atau merealokasi sejumlah dana dari anggaran sumber ke anggaran tujuan */
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
  /********** [END: Mutasi Anggaran & Realokasi] **********/

  /********** Pengembalian Data Hook **********/

  return {
    addOrEditBudget,
    removeBudget,
    handleReallocate
  };
}
