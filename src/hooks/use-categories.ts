//********** START: useCategories Hook **********
//********** React hook for managing categories through IndexedDB.
//********** The UI reads/writes exclusively through this hook - never
//********** directly to the server API.
//**********
//********** This hook:
//********** 1. Loads categories from IndexedDB on mount
//********** 2. Provides CRUD operations that write to IndexedDB + enqueue sync
//********** 3. Triggers background sync after every mutation
//********** 4. Tracks loading/error state for the UI
//********** END: useCategories Hook **********

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

//********** TYPES **********
export interface UseCategoriesReturn {
  //********** Active (non-deleted) categories
  categories: Category[];
  //********** ALL categories including soft-deleted (for lookups)
  allCategories: Category[];
  //********** Income categories only (active)
  incomeCategories: Category[];
  //********** Expense categories only (active)
  expenseCategories: Category[];
  //********** Whether categories are currently loading
  isLoading: boolean;
  //********** Error message if any operation failed
  error: string | null;
  //********** Create a new category
  createCategory: (input: Omit<AddCategoryInput, "userId">) => Promise<Category | null>;
  //********** Update an existing category
  editCategory: (input: UpdateCategoryInput) => Promise<Category | null>;
  //********** Soft-delete a category
  removeCategory: (clientId: string) => Promise<boolean>;
  //********** Force reload from IndexedDB
  refresh: () => Promise<void>;
}

//********** HOOK **********
/**
 * React hook for managing categories through IndexedDB.
 * @returns Object containing categories state and methods.
 */
export function useCategories(): UseCategoriesReturn {
  const [categories, setCategories] = useState<Category[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { scheduleSync } = useSyncContext();

  //********** Load categories from IndexedDB **********
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

      //********** Sort: defaults first, then alphabetical
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

  //********** Load on mount and listen to updates
  useEffect(() => {
    loadCategories();

    const handleUpdate = () => {
      // console.log("[useCategories] Received update event, reloading...");
      loadCategories();
    };

    window.addEventListener("moneta-category-updated", handleUpdate);
    return () => {
      window.removeEventListener("moneta-category-updated", handleUpdate);
    };
  }, [loadCategories]);

  //********** Create **********
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

        //********** Optimistic UI update
        setCategories((prev) =>
          [...prev, created].sort((a, b) => {
            if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
            return a.name.localeCompare(b.name);
          })
        );

        //********** Schedule background sync
        scheduleSync();
        
        //********** Notify other mounted hooks
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

  //********** Update **********
  const editCategory = useCallback(
    async (input: UpdateCategoryInput): Promise<Category | null> => {
      try {
        setError(null);
        const updated = await updateCategory(input);
        if (!updated) {
          setError("Category not found");
          return null;
        }

        //********** Optimistic UI update
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

  //********** Delete **********
  const removeCategory = useCallback(
    async (clientId: string): Promise<boolean> => {
      try {
        setError(null);
        const success = await deleteCategory(clientId);
        if (!success) {
          setError("Category not found");
          return false;
        }

        //********** Optimistic UI update - remove from list
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

  //********** Derived data **********
  const incomeCategories = categories.filter((c) => c.type === "INCOME");
  const expenseCategories = categories.filter((c) => c.type === "EXPENSE");

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
