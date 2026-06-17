import { useState, useEffect, FormEvent, useRef } from "react";
import { X, Banknote, CreditCard, Smartphone, TrendingUp, Wallet as WalletIcon } from "lucide-react";
import { Wallet, WalletType } from "@/types/models.types";
import { useWallets } from "@/hooks/use-wallets";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { showSyncToast } from "@/lib/utils/show-toast";

const WALLET_TYPES: { value: WalletType; label: string; icon: React.ReactNode }[] = [
  { value: 'TUNAI', label: 'Tunai', icon: <Banknote className="h-4 w-4" /> },
  { value: 'BANK', label: 'Bank', icon: <CreditCard className="h-4 w-4" /> },
  { value: 'E_WALLET', label: 'Dompet Digital', icon: <Smartphone className="h-4 w-4" /> },
  { value: 'INVESTASI', label: 'Investasi', icon: <TrendingUp className="h-4 w-4" /> },
  { value: 'LAINNYA', label: 'Lainnya', icon: <WalletIcon className="h-4 w-4" /> },
];

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingWallet: Wallet | null;
}

export function WalletModal({ isOpen, onClose, editingWallet }: WalletModalProps) {
  const { addNewWallet, editWallet } = useWallets();

  const [name, setName] = useState("");
  const [type, setType] = useState<WalletType>("TUNAI");
  const [initialBalance, setInitialBalance] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const nameRef = useRef<HTMLInputElement>(null);
  const prevIsOpen = useRef(false);

  useEffect(() => {
    if (isOpen && !prevIsOpen.current) {
      if (editingWallet) {
        setName(editingWallet.name);
        setType(editingWallet.type);
        setInitialBalance("");
      } else {
        setName("");
        setType("TUNAI");
        setInitialBalance("");
      }
      setTimeout(() => nameRef.current?.focus(), 50);
    }
    prevIsOpen.current = isOpen;
  }, [isOpen, editingWallet]);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      if (editingWallet) {
        await editWallet({ clientId: editingWallet.clientId, name: name.trim(), type });
        showSyncToast("Dompet diperbarui", "Disimpan luring. Akan disinkronkan saat terhubung.");
      } else {
        await addNewWallet({ 
          name: name.trim(), 
          type, 
          initialBalance: initialBalance ? parseInt(initialBalance.replace(/\D/g, ""), 10) : 0 
        });
        showSyncToast("Dompet dibuat", "Disimpan luring. Akan disinkronkan saat terhubung.");
      }
      onClose();
    } catch (error) {
      console.error("Gagal menyimpan dompet", error);
      showSyncToast("Gagal menyimpan. Silakan coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity dark:bg-black/60" onClick={onClose} />
      
      <div className="relative z-10 w-full max-h-[90vh] overflow-y-auto rounded-t-2xl border border-slate-200 bg-white shadow-2xl animate-in slide-in-from-bottom-10 duration-200 dark:border-slate-800 dark:bg-slate-900 sm:max-w-md sm:rounded-2xl sm:slide-in-from-bottom-0 sm:fade-in flex flex-col">
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-100 bg-white/80 px-5 py-4 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">
            {editingWallet ? "Ubah Dompet" : "Tambah Dompet Baru"}
          </h2>
          <button onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-5 flex flex-col gap-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Nama Dompet</label>
            <input
              ref={nameRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="contoh: BCA, GoPay"
              required
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Tipe Dompet</label>
            <div className="relative">
              <select
                value={type}
                onChange={(e) => setType(e.target.value as WalletType)}
                className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                {WALLET_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          {!editingWallet ? (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Saldo Awal (Opsional)</label>
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">Rp</span>
                <CurrencyInput
                  value={initialBalance}
                  onChange={setInitialBalance}
                  placeholder="0"
                  className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-12 pr-4 text-sm font-semibold text-slate-900 shadow-sm transition-colors placeholder:text-slate-300 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>
          ) : (
            <div>
              <p className="text-xs text-slate-500 font-medium dark:text-slate-400 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800/50 text-center">
                Saldo dihitung otomatis dari riwayat transaksi.
              </p>
            </div>
          )}

          <div className="mt-4 flex flex-col gap-3 sm:flex-row-reverse">
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-500/20 transition-all hover:bg-indigo-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-400 sm:w-auto sm:flex-1"
            >
              {isSubmitting && <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
              {editingWallet ? "Simpan Perubahan" : "Simpan Dompet"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-[48px] w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50 active:scale-95 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 sm:w-auto sm:flex-1"
            >
              Batal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
