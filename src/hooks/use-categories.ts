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
  addCategory,
  updateCategory,
  deleteCategory,
  AddCategoryInput,
  UpdateCategoryInput,
} from "@/lib/local-db/repositories/categories";
import { getCurrentUser } from "@/lib/local-db/repositories/users";
import { useSyncContext } from "@/providers/SyncProvider";

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
  /* Membuat kategori baru ke dalam database lokal */
  createCategory: (input: Omit<AddCategoryInput, "userId">) => Promise<Category | null>;
  /* Memperbarui data kategori yang sudah ada */
  editCategory: (input: UpdateCategoryInput) => Promise<Category | null>;
  /* Menghapus (soft-delete) kategori dari sistem */
  removeCategory: (clientId: string) => Promise<boolean>;
  /* Memuat ulang data dari IndexedDB */
  refresh: () => Promise<void>;
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
  const [error, setError] = useState<string | null>(null);
  const { scheduleSync } = useSyncContext();

  /* Memuat daftar kategori dari IndexedDB */
  const loadCategories = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

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
      setError("Failed to load categories");
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

    window.addEventListener("moneta-category-updated", handleUpdate);
    return () => {
      window.removeEventListener("moneta-category-updated", handleUpdate);
    };
  }, [loadCategories]);

  /********** [START: Buat Kategori Baru & Pembaruan Optimistik] **********/
  const createCategory = useCallback(
    async (input: Omit<AddCategoryInput, "userId">): Promise<Category | null> => {
      try {
        setError(null);
        const user = await getCurrentUser();
        if (!user) {
          setError("No user session found");
          return null;
        }

        const created = await addCategory({ ...input, userId: user.id });

        /* Pembaruan optimistik antarmuka pengguna */
        setCategories((prev) =>
          [...prev, created].sort((a, b) => {
            if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
            return a.name.localeCompare(b.name);
          })
        );

        /* Jadwalkan sinkronisasi latar belakang */
        scheduleSync();
        
        /* Beri tahu hook atau komponen lain yang sedang aktif */
        window.dispatchEvent(new Event("moneta-category-updated"));

        return created;
      } catch (err) {
        console.error("[useCategories] Create failed:", err);
        setError("Failed to create category");
        return null;
      }
    },
    [scheduleSync]
  );
  /********** [END: Buat Kategori Baru & Pembaruan Optimistik] **********/

  /********** [START: Edit Kategori & Pembaruan Optimistik] **********/
  const editCategory = useCallback(
    async (input: UpdateCategoryInput): Promise<Category | null> => {
      try {
        setError(null);
        const updated = await updateCategory(input);
        if (!updated) {
          setError("Category not found");
          return null;
        }

        /* Pembaruan optimistik antarmuka pengguna */
        setCategories((prev) =>
          prev
            .map((c) => (c.clientId === updated.clientId ? updated : c))
            .sort((a, b) => {
              if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
              return a.name.localeCompare(b.name);
            })
        );

        scheduleSync();
        window.dispatchEvent(new Event("moneta-category-updated"));
        return updated;
      } catch (err) {
        console.error("[useCategories] Update failed:", err);
        setError("Failed to update category");
        return null;
      }
    },
    [scheduleSync]
  );
  /********** [END: Edit Kategori & Pembaruan Optimistik] **********/

  /********** [START: Hapus Kategori & Pembaruan Optimistik] **********/
  const removeCategory = useCallback(
    async (clientId: string): Promise<boolean> => {
      try {
        setError(null);
        const success = await deleteCategory(clientId);
        if (!success) {
          setError("Category not found");
          return false;
        }

        /* Pembaruan optimistik antarmuka pengguna — hapus dari daftar aktif */
        setCategories((prev) => prev.filter((c) => c.clientId !== clientId));

        scheduleSync();
        window.dispatchEvent(new Event("moneta-category-updated"));
        return true;
      } catch (err) {
        console.error("[useCategories] Delete failed:", err);
        setError("Failed to delete category");
        return false;
      }
    },
    [scheduleSync]
  );
  /********** [END: Hapus Kategori & Pembaruan Optimistik] **********/

  /********** Kalkulasi Data Turunan **********/
  const incomeCategories = categories.filter((c) => c.type === "INCOME");
  const expenseCategories = categories.filter((c) => c.type === "EXPENSE");

  /********** Pengembalian Data Hook **********/

  return {
    categories,
    allCategories,
    incomeCategories,
    expenseCategories,
    isLoading,
    error,
    createCategory,
    editCategory,
    removeCategory,
    refresh: loadCategories,
  };
}
