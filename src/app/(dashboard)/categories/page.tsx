/*
 * File: src/app/(dashboard)/categories/page.tsx
 * Description: Halaman manajemen operasi CRUD untuk kategori transaksi (pemasukan dan pengeluaran) dengan arsitektur Local-First.
 */

'use client';

/********** Impor Modul & Dependensi **********/

import { useState } from 'react';
import { useCategories } from '@/hooks/use-categories';
import { Category } from '@/types/models.types';
import { useSyncContext } from '@/providers/SyncProvider';
import { DynamicIcon } from '@/components/ui/DynamicIcon';
import { CategoryModal } from '@/components/categories/CategoryModal';
import { EntityActionMenu } from '@/components/ui/EntityActionMenu';
import { DeleteConfirmDialog } from '@/components/ui/DeleteConfirmDialog';
import { SecondaryPageLayout } from '@/components/layout/SecondaryPageLayout';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Folder, TrendingDown, TrendingUp, Plus, Pencil, Trash2, Check, ArrowLeft } from 'lucide-react';

/********** Komponen Halaman Manajemen Kategori (CategoriesPage) **********/

/**
 * Komponen utama halaman manajemen kategori, memuat daftar kategori pengeluaran dan pemasukan,
 * serta menyediakan antarmuka penambahan, perubahan, dan penghapusan kategori secara lokal.
 *
 * @returns Elemen JSX tata letak halaman manajemen kategori Moneta
 */
export default function CategoriesPage() {
  /********** [START: Inisialisasi State & Hook Halaman Kategori] **********/
  const { categories, incomeCategories, expenseCategories, isLoading, error, addCategory, editCategory, deleteCategory } =
    useCategories();

  const { pendingCount } = useSyncContext();

  /* State tab aktif antara kategori pengeluaran (EXPENSE) dan pemasukan (INCOME) */
  const [activeTab, setActiveTab] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');

  /* State tampilan modal form kategori dan dialog konfirmasi penghapusan */
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  /********** [END: Inisialisasi State & Hook Halaman Kategori] **********/

  /********** [START: Fungsi Penanganan Aksi Pengguna (Event Handlers)] **********/

  /** Membuka modal form pembuatan kategori baru */
  function startCreate() {
    setEditingCategory(null);
    setIsModalOpen(true);
  }

  /** Membuka modal form untuk menyunting kategori yang dipilih */
  function startEdit(category: Category) {
    setEditingCategory(category);
    setIsModalOpen(true);
  }

  /** Mengonfirmasi dan mengeksekusi penghapusan kategori yang dipilih */
  async function confirmDelete() {
    if (!deleteConfirmId) return;
    setIsDeleting(true);
    try {
      await deleteCategory(deleteConfirmId);
      setDeleteConfirmId(null);
    } finally {
      setIsDeleting(false);
    }
  }
  /********** [END: Fungsi Penanganan Aksi Pengguna (Event Handlers)] **********/

  /********** [START: Pemilihan Daftar Kategori Berdasarkan Tab Aktif (Derived State)] **********/
  const displayedCategories = activeTab === 'EXPENSE' ? expenseCategories : incomeCategories;
  /********** [END: Pemilihan Daftar Kategori Berdasarkan Tab Aktif (Derived State)] **********/

  /********** Pengembalian Tata Letak Halaman Manajemen Kategori (JSX) **********/

  if (isLoading) {
    return (
      <SecondaryPageLayout
        title="Manajemen Kategori"
        description="Atur dan sesuaikan kategori pengeluaran serta pemasukanmu."
        backRoute="/profile"
        headerAction={
          <button
            disabled
            className="flex w-full md:w-auto justify-center items-center gap-1.5 rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600 opacity-50 dark:bg-slate-800 dark:text-slate-500"
          >
            <Plus className="h-4 w-4" /> Tambah Kategori
          </button>
        }
      >
        <div className="flex items-center justify-center py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
        </div>
      </SecondaryPageLayout>
    );
  }

  return (
    <SecondaryPageLayout
      title="Manajemen Kategori"
      description="Atur dan sesuaikan kategori pengeluaran serta pemasukanmu."
      backRoute="/profile"
      headerAction={
        <button
          onClick={startCreate}
          className="flex w-full md:w-auto justify-center items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-500/20 transition-all hover:bg-indigo-500 active:scale-95 dark:bg-indigo-500 dark:hover:bg-indigo-400"
        >
          <Plus className="h-4 w-4" /> Tambah Kategori
        </button>
      }
    >
      <div className="space-y-6">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        <SegmentedControl
          options={[
            { value: 'EXPENSE', label: 'Pengeluaran', icon: <TrendingDown className="h-4 w-4" />, count: expenseCategories.length },
            { value: 'INCOME', label: 'Pemasukan', icon: <TrendingUp className="h-4 w-4" />, count: incomeCategories.length },
          ]}
          value={activeTab}
          onChange={(v) => setActiveTab(v as 'EXPENSE' | 'INCOME')}
          fullWidth
        />

        {displayedCategories.length === 0 ? (
          <div className="flex flex-col items-center rounded-xl border-2 border-dashed border-slate-200 py-14 text-center dark:border-slate-800">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 dark:bg-slate-800/50">
              <Folder className="h-7 w-7 text-slate-600" />
            </div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Belum ada kategori</p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Tambahkan kategori agar transaksi lebih mudah dikelompokkan.</p>
            <button
              onClick={startCreate}
              className="mt-4 flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-500/20 transition-all hover:bg-indigo-500 active:scale-95 dark:bg-indigo-500 dark:hover:bg-indigo-400"
            >
              <Plus className="h-4 w-4" /> Tambah Kategori
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm dark:divide-slate-800/60 dark:border-slate-800 dark:bg-slate-900">
              {displayedCategories.map((category) => (
                <div
                  key={category.clientId}
                  className="group relative flex items-center justify-between px-4 py-3.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40"
                >
                  {/* Area sentuh mobile untuk membuka menu aksi */}
                  <div
                    className="absolute inset-0 z-0 sm:hidden"
                    onClick={(e) => {
                      const btn = e.currentTarget.parentElement?.querySelector('[aria-label="Buka menu aksi"]') as HTMLButtonElement;
                      if (btn) btn.click();
                    }}
                  />

                  <div className="relative z-10 flex min-w-0 items-center gap-3 pointer-events-none sm:pointer-events-auto">
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                      style={{ backgroundColor: category.color ? `${category.color}22` : '#6366f122' }}
                    >
                      <DynamicIcon iconName={category.icon} color={category.color || '#6366f1'} className="h-4 w-4" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{category.name}</span>
                        {category.isDefault && (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                            Bawaan
                          </span>
                        )}
                        {category.syncStatus === 'PENDING' && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-600 dark:bg-amber-900/20 dark:text-amber-400">
                            Menunggu sinkron
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1 pointer-events-auto pl-2 md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100 transition-opacity">
                    <EntityActionMenu
                      title={category.name}
                      onEdit={() => startEdit(category)}
                      onDelete={() => setDeleteConfirmId(category.clientId)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/50">
          <p className="text-xs text-slate-600 dark:text-slate-400">
            {categories.length} total kategori · {expenseCategories.length} pengeluaran · {incomeCategories.length} pemasukan
            {pendingCount > 0 && ` · ${pendingCount} perubahan menunggu sinkron`}
          </p>
        </div>
      </div>

      <CategoryModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} editingCategory={editingCategory} initialType={activeTab} />

      <DeleteConfirmDialog
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={confirmDelete}
        isDeleting={isDeleting}
        title="Hapus Kategori?"
        body="Kategori akan disembunyikan dari daftar. Transaksi lama yang memakai kategori ini tetap tersimpan."
      />
    </SecondaryPageLayout>
  );
}
