'use client';

import { useState, useEffect, useRef } from 'react';
import { FinancialTarget, TargetType, TargetPeriod } from '@/types/models.types';
import { useCategories } from '@/hooks/use-categories';
import { X, Loader2, LayoutGrid } from 'lucide-react';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { DynamicIcon } from '@/components/ui/DynamicIcon';
import { getCategoryIcon } from '@/lib/utils/icons';
import { getTodayDateInputValue } from '@/lib/utils/helpers';

interface TargetModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingTarget: FinancialTarget | null;
  onSave: (input: any) => Promise<void>;
}

export function TargetModal({ isOpen, onClose, editingTarget, onSave }: TargetModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const type: TargetType = 'INCOME_TARGET';
  const [period, setPeriod] = useState<TargetPeriod>('MONTHLY');
  const [categoryId, setCategoryId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { expenseCategories, incomeCategories } = useCategories();

  const amountRef = useRef<HTMLInputElement>(null);
  const prevIsOpen = useRef(false);

  useEffect(() => {
    if (isOpen && !prevIsOpen.current) {
      if (editingTarget) {
        setName(editingTarget.name);
        setTargetAmount(String(Math.round(Number(editingTarget.targetAmount))));
        setPeriod(editingTarget.period);
        setCategoryId(editingTarget.categoryId || '');
        setStartDate(editingTarget.startDate ? editingTarget.startDate.substring(0, 10) : getTodayDateInputValue());
        setEndDate(editingTarget.endDate ? editingTarget.endDate.substring(0, 10) : '');
      } else {
        setName('');
        setTargetAmount('');
        setPeriod('MONTHLY');
        setCategoryId('');
        setStartDate(getTodayDateInputValue());
        setEndDate('');
      }
      setTimeout(() => amountRef.current?.focus(), 50);
    }
    prevIsOpen.current = isOpen;
  }, [isOpen, editingTarget]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !targetAmount) return;

    const parsedAmount = parseInt(targetAmount.replace(/\D/g, ''), 10);
    if (isNaN(parsedAmount) || parsedAmount <= 0) return;

    setIsSubmitting(true);
    try {
      const input = {
        ...(editingTarget ? { clientId: editingTarget.clientId } : {}),
        name,
        type,
        targetAmount: parsedAmount,
        period,
        categoryId: categoryId || null,
        startDate: new Date(startDate).toISOString(),
        endDate: period === 'CUSTOM' && endDate ? new Date(endDate).toISOString() : null,
        isActive: true,
      };

      await onSave(input);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity dark:bg-black/60" onClick={onClose} />

      {/* Modal/Sheet Content */}
      <div className="relative z-10 w-full max-h-[90vh] overflow-y-auto rounded-t-2xl border border-slate-200 bg-white shadow-2xl animate-in slide-in-from-bottom-10 duration-200 dark:border-slate-800 dark:bg-slate-900 sm:max-w-md sm:rounded-2xl sm:slide-in-from-bottom-0 sm:fade-in flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-100 bg-white/80 px-5 py-4 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">{editingTarget ? 'Ubah Target' : 'Buat Target Baru'}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-5">
          {/* Target Type Removed - Only INCOME_TARGET supported */}

          {/* Name */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Nama Target</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Gaji bulanan"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base shadow-sm outline-none transition-colors placeholder:text-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          {/* Amount */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Target Pemasukan</label>
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-semibold text-slate-400">Rp</span>
              <CurrencyInput
                ref={amountRef}
                value={targetAmount}
                onChange={setTargetAmount}
                required
                placeholder="0"
                className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-12 pr-4 text-lg font-bold text-slate-900 shadow-sm transition-colors placeholder:text-slate-300 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>

          {/* Period Selection */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Periode</label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as TargetPeriod)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="DAILY">Harian</option>
              <option value="WEEKLY">Mingguan</option>
              <option value="MONTHLY">Bulanan</option>
              <option value="CUSTOM">Khusus (Custom)</option>
            </select>
            <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
              {period === 'DAILY' && 'Target akan direset setiap hari.'}
              {period === 'WEEKLY' && 'Target akan direset setiap minggu.'}
              {period === 'MONTHLY' && 'Target akan direset setiap bulan.'}
              {period === 'CUSTOM' && 'Target berlaku pada rentang tanggal yang dipilih.'}
            </p>
          </div>

          {/* Dates */}
          <div className={`grid gap-4 ${period === 'CUSTOM' ? 'grid-cols-2' : 'grid-cols-1'}`}>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                {period === 'CUSTOM' ? 'Tanggal Mulai' : 'Mulai Aktif'}
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
            {period === 'CUSTOM' && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Tanggal Selesai</label>
                <input
                  type="date"
                  required={period === 'CUSTOM'}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            )}
          </div>

          {/* Category */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Kategori Target</label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[180px] overflow-y-auto pr-1 pb-1">
              {incomeCategories.map((cat) => {
                const isSelected = categoryId === (cat.clientId || cat.id);
                return (
                  <button
                    key={cat.clientId || cat.id}
                    type="button"
                    onClick={() => setCategoryId(cat.clientId || cat.id || '')}
                    className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border p-2 transition-all active:scale-95 ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:border-indigo-500 dark:bg-indigo-500/20 dark:text-indigo-300 ring-1 ring-indigo-600 dark:ring-indigo-500'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-lg"
                      style={{
                        backgroundColor: cat.color ? `${cat.color}20` : 'rgb(241 245 249)',
                      }}
                    >
                      {cat.icon ? (
                        <DynamicIcon iconName={cat.icon} color={cat.color} className="h-4 w-4" />
                      ) : (
                        getCategoryIcon(cat.name, 'h-4 w-4', cat.color)
                      )}
                    </div>
                    <span className="text-[10px] font-semibold text-center line-clamp-1 w-full px-1">{cat.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="mt-4 flex flex-col gap-3 sm:flex-row-reverse">
            <button
              type="submit"
              disabled={isSubmitting || !name || !targetAmount || !categoryId || (period === 'CUSTOM' && !endDate)}
              className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-500/20 transition-all hover:bg-indigo-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-400 sm:w-auto sm:flex-1"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingTarget ? 'Simpan Perubahan' : 'Simpan Target'}
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
