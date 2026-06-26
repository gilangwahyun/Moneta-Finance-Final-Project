'use client';

/********** [START: Halaman Manajemen Dompet] **********/
/**********
 * Halaman administratif CRUD untuk dompet pengguna.
 * Dapat diakses via: Profil > Manajemen Dompet
 * Saldo ditampilkan secara dinamis dari riwayat transaksi.
 **********/
/********** [END: Halaman Manajemen Dompet] **********/

/********** Imports **********/

import { useState } from 'react';
import { useWallets } from '@/hooks/use-wallets';
import { Wallet, WalletType } from '@/types/models.types';
import { formatCurrency } from '@/lib/utils/helpers';
import { SecondaryPageLayout } from '@/components/layout/SecondaryPageLayout';
import { Banknote, CreditCard, Smartphone, TrendingUp, Wallet as WalletIcon, Plus, ArrowLeftRight } from 'lucide-react';
import { WalletModal } from '@/components/wallets/WalletModal';
import { TransactionModal } from '@/components/transactions/TransactionModal';
import { EntityActionMenu } from '@/components/ui/EntityActionMenu';
import { DeleteConfirmDialog } from '@/components/ui/DeleteConfirmDialog';

/********** Constants **********/

const WALLET_TYPES: { value: WalletType; label: string; icon: React.ReactNode }[] = [
  { value: 'TUNAI', label: 'Tunai', icon: <Banknote className="h-4 w-4" /> },
  { value: 'BANK', label: 'Bank', icon: <CreditCard className="h-4 w-4" /> },
  { value: 'E_WALLET', label: 'Dompet Digital', icon: <Smartphone className="h-4 w-4" /> },
  { value: 'INVESTASI', label: 'Investasi', icon: <TrendingUp className="h-4 w-4" /> },
  { value: 'LAINNYA', label: 'Lainnya', icon: <WalletIcon className="h-4 w-4" /> },
];

const TYPE_ICON: Record<WalletType, React.ReactNode> = {
  TUNAI: <Banknote className="h-4 w-4" />,
  BANK: <CreditCard className="h-4 w-4" />,
  E_WALLET: <Smartphone className="h-4 w-4" />,
  INVESTASI: <TrendingUp className="h-4 w-4" />,
  LAINNYA: <WalletIcon className="h-4 w-4" />,
};

const TYPE_LABEL: Record<WalletType, string> = {
  TUNAI: 'Tunai',
  BANK: 'Bank',
  E_WALLET: 'Dompet Digital',
  INVESTASI: 'Investasi',
  LAINNYA: 'Lainnya',
};

/********** Page Component **********/
export default function WalletsPage() {
  /********** State **********/
  const { wallets, isLoading, removeWallet, totalBalance, getWalletBalance } = useWallets();

  /********** UI and Modal state. */
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWallet, setEditingWallet] = useState<Wallet | null>(null);

  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [initialTransferWalletId, setInitialTransferWalletId] = useState<string | undefined>(undefined);

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const inputCls =
    'w-full min-h-[44px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white';
  const labelCls = 'mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-slate-400';

  /********** Event Handlers **********/

  function openCreateModal() {
    setEditingWallet(null);
    setIsModalOpen(true);
  }

  function openEditModal(w: Wallet) {
    setEditingWallet(w);
    setIsModalOpen(true);
  }

  async function confirmDelete() {
    if (!deleteConfirmId) return;
    setIsDeleting(true);
    try {
      await removeWallet(deleteConfirmId);
      setDeleteConfirmId(null);
    } finally {
      setIsDeleting(false);
    }
  }

  /********** Derived State **********/

  const activeWallets = wallets;

  /********** Rendering **********/

  if (isLoading) {
    return (
      <SecondaryPageLayout
        title="Manajemen Dompet"
        description="Tambah atau ubah rekening, kartu, dan dompet digitalmu."
        backRoute="/profile"
        headerAction={
          <button
            disabled
            className="flex w-full md:w-auto justify-center items-center gap-1.5 rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600 opacity-50 dark:bg-slate-800 dark:text-slate-500"
          >
            <Plus className="h-4 w-4" /> Tambah Dompet
          </button>
        }
      >
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 w-full animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
          ))}
        </div>
      </SecondaryPageLayout>
    );
  }

  return (
    <SecondaryPageLayout
      title="Manajemen Dompet"
      description="Tambah atau ubah rekening, kartu, dan dompet digitalmu."
      backRoute="/profile"
      headerAction={
        <div className="flex w-full md:w-auto flex-col sm:flex-row items-center gap-2">
          <button
            onClick={() => {
              setInitialTransferWalletId(undefined);
              setIsTransactionModalOpen(true);
            }}
            className="flex w-full md:w-auto justify-center items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 transition-all hover:bg-indigo-100 active:scale-95 dark:border-indigo-800/60 dark:bg-indigo-950/40 dark:text-indigo-300 dark:hover:bg-indigo-900/40"
          >
            <ArrowLeftRight className="h-4 w-4" /> Transfer Antar Dompet
          </button>
          <button
            onClick={openCreateModal}
            className="flex w-full md:w-auto justify-center items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-500/20 transition-all hover:bg-indigo-500 active:scale-95 dark:bg-indigo-500 dark:hover:bg-indigo-400"
          >
            <Plus className="h-4 w-4" /> Tambah Dompet
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="rounded-xl border border-slate-100 bg-white px-5 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-slate-400">Total Saldo</p>
          <p
            className={`mt-1 text-2xl font-bold tracking-tight ${totalBalance < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-indigo-600 dark:text-indigo-400'}`}
          >
            {totalBalance < 0 ? '−' : ''}
            {formatCurrency(Math.abs(totalBalance))}
          </p>
          <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">Dari {activeWallets.length} dompet aktif</p>
        </div>

        <p className="text-sm text-slate-600 dark:text-slate-400 rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
          <ArrowLeftRight className="inline h-4 w-4 mr-1.5 mb-0.5 text-slate-600" />
          Transfer antar dompet tersedia melalui menu Transfer pada tombol Tambah Transaksi.
        </p>

        {activeWallets.length === 0 && (
          <div className="flex flex-col items-center rounded-xl border-2 border-dashed border-slate-200 py-14 text-center dark:border-slate-800">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 dark:bg-slate-800/50">
              <WalletIcon className="h-7 w-7 text-slate-600" />
            </div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Belum ada dompet</p>
            <p className="mt-1 text-sm text-slate-600">Tambahkan dompet untuk mulai mengelompokkan saldo dan transaksi.</p>
            <button
              onClick={openCreateModal}
              className="mt-4 flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-500/20 transition-all hover:bg-indigo-500 active:scale-95 dark:bg-indigo-500 dark:hover:bg-indigo-400"
            >
              <Plus className="h-4 w-4" /> Tambah Dompet
            </button>
          </div>
        )}

        {activeWallets.length > 0 && (
          <div className="space-y-4">
            <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm dark:divide-slate-800/50 dark:border-slate-800 dark:bg-slate-900">
              {activeWallets.map((wallet) => {
                const balance = getWalletBalance(wallet);
                const isNeg = balance < 0;

                return (
                  <div key={wallet.clientId} className="group relative">
                    {/* Mobile touch target for opening action menu */}
                    <div
                      className="absolute inset-0 z-0 sm:hidden"
                      onClick={(e) => {
                        const btn = e.currentTarget.parentElement?.querySelector('[aria-label="Buka menu aksi"]') as HTMLButtonElement;
                        if (btn) btn.click();
                      }}
                    />

                    <div className="relative z-10 flex items-center gap-3 px-4 py-4 outline-none transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 pointer-events-none sm:pointer-events-auto">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                        {TYPE_ICON[wallet.type]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{wallet.name}</p>
                        <p className="text-xs text-slate-600 dark:text-slate-400">{TYPE_LABEL[wallet.type]}</p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1 min-w-0 pr-1">
                        <span
                          className={`text-sm font-bold truncate ${isNeg ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-100'}`}
                        >
                          {isNeg ? '−' : ''}
                          {formatCurrency(Math.abs(balance))}
                        </span>
                        {wallet.syncStatus === 'PENDING' && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-600 dark:bg-amber-900/20 dark:text-amber-400">
                            Menunggu sinkron
                          </span>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-1 pointer-events-auto pl-2 md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100 transition-opacity">
                        <EntityActionMenu
                          title={wallet.name}
                          subtitle={`Saldo: ${formatCurrency(Math.abs(balance))}`}
                          onEdit={() => openEditModal(wallet)}
                          onDelete={() => setDeleteConfirmId(wallet.clientId!)}
                          extraActions={[
                            {
                              label: 'Transfer dari Dompet Ini',
                              icon: <ArrowLeftRight className="h-4 w-4" />,
                              onClick: () => {
                                setInitialTransferWalletId(wallet.clientId!);
                                setIsTransactionModalOpen(true);
                              },
                            },
                          ]}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <p className="text-xs text-slate-600 dark:text-slate-400 whitespace-normal text-wrap break-words w-full px-4">
          Saldo ditampilkan berdasarkan kalkulasi dari seluruh riwayat transaksi. Menghapus dompet tidak menghapus transaksi yang terkait.
        </p>
      </div>

      <WalletModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} editingWallet={editingWallet} />

      <TransactionModal
        isOpen={isTransactionModalOpen}
        onClose={() => setIsTransactionModalOpen(false)}
        initialType="TRANSFER"
        initialWalletId={initialTransferWalletId}
      />

      <DeleteConfirmDialog
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={confirmDelete}
        isDeleting={isDeleting}
        title="Hapus Dompet?"
        body="Dompet akan disembunyikan dari daftar. Data transaksi terkait tetap tersimpan."
      />
    </SecondaryPageLayout>
  );
}
