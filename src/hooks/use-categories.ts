/*
 * File: src/hooks/use-categories.ts
 * Description: Hook kustom React untuk mengelola kategori keuangan lokal melalui IndexedDB secara local-first, mencakup operasi pemuatan, penambahan, pembaruan, dan penghapusan.
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { Category, CategoryType } from "@/types/models.types";
import {
  getAllCategories,
  getAllCategoriesIncludingDeleted,
  addCategory as addCategoryDb,
  updateCategory as updateCategoryDb,
  deleteCategory as deleteCategoryDb,
  AddCategoryInput,
  UpdateCategoryInput,
} from "@/lib/local-db/repositories/categories";
import { getCurrentUser } from "@/lib/local-db/repositories/users";
import { useSyncContext } from "@/providers/SyncProvider";
import { useLocalMutation } from "@/hooks/use-local-mutation";
import { SyncEvents } from "@/lib/sync/events";

export type { AddCategoryInput, UpdateCategoryInput };

/********** Tipe Data & Antarmuka **********/

export interface UseCategoriesReturn {
  /* Daftar kategori aktif yang tidak dihapus */
  categories: Category[];
  /* Seluruh daftar kategori termasuk yang sudah dihapus (soft-deleted) untuk keperluan referensi */
  allCategories: Category[];
  /* Daftar kategori khusus untuk tipe pendapatan (INCOME) */
  incomeCategories: Category[];
  /* Daftar kategori khusus untuk tipe pengeluaran (EXPENSE) */
  expenseCategories: Category[];
  /* Status indikator apakah data kategori sedang dimuat */
  isLoading: boolean;
  /* Pesan error jika terjadi kegagalan operasi */
  error: string | null;
  /* Memuat ulang data dari IndexedDB */
  loadCategories: () => Promise<void>;
  /* Membuat kategori baru ke dalam database lokal */
  addCategory: (input: Omit<AddCategoryInput, "userId">) => Promise<Category | null>;
  /* Memperbarui data kategori yang sudah ada */
  editCategory: (input: UpdateCategoryInput) => Promise<Category | null>;
  /* Menghapus (soft-delete) kategori dari sistem */
  deleteCategory: (clientId: string) => Promise<boolean | null | any>;
}

/********** Hook Utama (useCategories) **********/

/**
 * Hook kustom untuk mengelola data kategori secara local-first dengan dukungan pembaruan antarmuka optimistik serta sinkronisasi latar belakang otomatis.
 *
 * @returns Objek berisi daftar kategori aktif dan turunan, status loading, error, serta fungsi CRUD kategori.
 */
export function useCategories(): UseCategoriesReturn {
  const [categories, setCategories] = useState<Category[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  /* Memuat daftar kategori dari IndexedDB */
  const loadCategories = useCallback(async () => {
    try {
      setIsLoading(true);
      setLoadError(null);

      const user = await getCurrentUser();
      if (!user) {
        setCategories([]);
        setIsLoading(false);
        return;
      }

      const result = await getAllCategories(user.id);
      const all = await getAllCategoriesIncludingDeleted(user.id);

      /* Urutkan: kategori default terlebih dahulu, kemudian secara abjad */
      const sortFn = (a: Category, b: Category) => {
        if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
        return a.name.localeCompare(b.name);
      };

      result.sort(sortFn);
      all.sort(sortFn);

      setCategories(result);
      setAllCategories(all);
    } catch (err) {
      console.error("[useCategories] Load failed:", err);
      setLoadError("Failed to load categories");
    } finally {
      setIsLoading(false);
    }
  }, []);

  /* Muat data saat komponen dimount dan dengarkan event pembaruan */
  useEffect(() => {
    loadCategories();

    const handleUpdate = () => {
      loadCategories();
    };

    window.addEventListener(SyncEvents.CATEGORY_UPDATED, handleUpdate);
    window.addEventListener(SyncEvents.SYNC_COMPLETED, handleUpdate);
    return () => {
      window.removeEventListener(SyncEvents.CATEGORY_UPDATED, handleUpdate);
      window.removeEventListener(SyncEvents.SYNC_COMPLETED, handleUpdate);
    };
  }, [loadCategories]);

  /********** [START: Buat Kategori Baru & Pembaruan Optimistik] **********/
  const { mutate: addCategory, error: addErr } = useLocalMutation(
    async (input: Omit<AddCategoryInput, "userId">) => {
      const user = await getCurrentUser();
      if (!user) throw new Error("No user session found");
      return addCategoryDb({ ...input, userId: user.id });
    },
    {
      eventName: SyncEvents.CATEGORY_UPDATED,
      errorMessage: "Failed to create category",
      onSuccess: (created) => {
        if (!created) return;
        /* Pembaruan optimistik antarmuka pengguna */
        setCategories((prev) =>
          [...prev, created].sort((a, b) => {
            if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
            return a.name.localeCompare(b.name);
          })
        );
      }
    }
  );
  /********** [END: Buat Kategori Baru & Pembaruan Optimistik] **********/

  /********** [START: Edit Kategori & Pembaruan Optimistik] **********/
  const { mutate: editCategory, error: editErr } = useLocalMutation(
    async (input: UpdateCategoryInput) => {
      const updated = await updateCategoryDb(input);
      if (!updated) throw new Error("Category not found");
      return updated;
    },
    {
      eventName: SyncEvents.CATEGORY_UPDATED,
      errorMessage: "Failed to update category",
      onSuccess: (updated) => {
        if (!updated) return;
        /* Pembaruan optimistik antarmuka pengguna */
        setCategories((prev) =>
          prev
            .map((c) => (c.clientId === updated.clientId ? updated : c))
            .sort((a, b) => {
              if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
              return a.name.localeCompare(b.name);
            })
        );
      }
    }
  );
  /********** [END: Edit Kategori & Pembaruan Optimistik] **********/

  /********** [START: Hapus Kategori & Pembaruan Optimistik] **********/
  const { mutate: deleteCategory, error: deleteErr } = useLocalMutation(
    async (clientId: string) => {
      const success = await deleteCategoryDb(clientId);
      if (!success) throw new Error("Category not found");
      return clientId; // Pass the clientId to onSuccess
    },
    {
      eventName: SyncEvents.CATEGORY_UPDATED,
      errorMessage: "Failed to delete category",
      onSuccess: (deletedClientId) => {
        if (!deletedClientId) return;
        /* Pembaruan optimistik antarmuka pengguna — hapus dari daftar aktif */
        setCategories((prev) => prev.filter((c) => c.clientId !== deletedClientId));
      }
    }
  );
  /********** [END: Hapus Kategori & Pembaruan Optimistik] **********/

  /********** Kalkulasi Data Turunan **********/
  const incomeCategories = categories.filter((c) => c.type === "INCOME");
  const expenseCategories = categories.filter((c) => c.type === "EXPENSE");
  
  const combinedError = loadError || addErr || editErr || deleteErr;

  /********** Pengembalian Data Hook **********/

  return {
    categories,
    allCategories,
    incomeCategories,
    expenseCategories,
    isLoading,
    error: combinedError,
    loadCategories,
    addCategory,
    editCategory,
    deleteCategory,
  };
}
