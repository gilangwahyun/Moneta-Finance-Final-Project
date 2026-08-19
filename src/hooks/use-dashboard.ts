/*
 * File: src/hooks/use-dashboard.ts
 * Description: Hook kustom React untuk mengelola dan menghitung ringkasan data dasbor utama, termasuk progres anggaran darurat, batas aman pengeluaran harian, serta analisis wawasan pintar (dashboard insight).
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Budget, Transaction, Category } from '@/types/models.types';
import { getBudgetsByPeriod } from '@/lib/local-db/repositories/budgets';
import { getCurrentUser } from '@/lib/local-db/repositories/users';
import { BudgetProgressItem } from '@/components/budgets/UrgentBudgetProgressBar';
import { findBudgetReallocationRecommendation } from '@/lib/nudging';
import dayjs from 'dayjs';

/********** Tipe Data & Antarmuka **********/

export interface UseDashboardProps {
  transactions: Transaction[];
  allCategories: Category[];
}

interface DashboardInsight {
  type: 'critical' | 'warning' | 'positive' | 'info';
  title: string;
  message: string;
  action?: {
    label: string;
    route: string;
  };
}

export interface UseDashboardReturn {
  username: string;
  budgetProgress: BudgetProgressItem[];
  totalBudget: number;
  totalSpent: number;
  dailySafeToSpend: number;
  dashboardInsight: DashboardInsight | null;
  isLoading: boolean;
  loadDashboard: () => Promise<void>;
}

/********** Utilitas Cache Sesi **********/

/*
 * dashboardInsight disimpan dalam cache di sessionStorage per bulan kalender agar navigasi
 * keluar dan kembali tidak menyebabkan kedipan (flicker) atau perubahan akibat race condition saat
 * pemuatan asinkron. Cache akan dibersihkan (invalidated) setiap kali terjadi mutasi data
 * (seperti transaksi baru atau perubahan anggaran).
 */

function getCacheKey(period: string) {
  return `moneta-dash-insight-${period}`;
}

function readInsightCache(period: string): DashboardInsight | null {
  try {
    const raw = sessionStorage.getItem(getCacheKey(period));
    if (!raw) return null;
    return JSON.parse(raw) as DashboardInsight;
  } catch {
    return null;
  }
}

function writeInsightCache(period: string, insight: DashboardInsight | null) {
  try {
    if (insight === null) {
      sessionStorage.removeItem(getCacheKey(period));
    } else {
      sessionStorage.setItem(getCacheKey(period), JSON.stringify(insight));
    }
  } catch {
    /* sessionStorage mungkin tidak tersedia di beberapa lingkungan — abaikan tanpa error */
  }
}

function clearInsightCache(period: string) {
  try {
    sessionStorage.removeItem(getCacheKey(period));
  } catch {
    /* Abaikan tanpa error */
  }
}

/********** Hook Utama (useDashboard) **********/

/**
 * Hook kustom untuk memuat data dasbor, memantau progres anggaran yang mendesak, mengalkulasi batas aman pengeluaran harian, dan menghasilkan wawasan keuangan cerdas.
 *
 * @param props - Properti yang berisi daftar transaksi dan semua kategori.
 * @returns Objek yang berisi informasi username, progres anggaran, total pengeluaran dan anggaran, serta insight dasbor.
 */
export function useDashboard({ transactions, allCategories }: UseDashboardProps): UseDashboardReturn {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [username, setUsername] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  /* Lacak apakah data sudah sepenuhnya dimuat agar cache hanya ditulis setelah anggaran dan transaksi siap */
  const dataReadyRef = useRef(false);

  const currentPeriod = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const user = await getCurrentUser();
      if (!user) return;
      setUsername(user.username || '');
      const loadedBudgets = await getBudgetsByPeriod(user.id, currentPeriod);
      setBudgets(loadedBudgets);
    } finally {
      setIsLoading(false);
    }
  }, [currentPeriod]);

  useEffect(() => {
    load();

    /* Ketika terjadi mutasi data, bersihkan cache agar render berikutnya mengalkulasi ulang wawasan terbaru */
    const invalidateAndReload = () => {
      clearInsightCache(currentPeriod);
      dataReadyRef.current = false;
      load();
    };

    window.addEventListener('moneta-transaction-updated', invalidateAndReload);
    window.addEventListener('moneta-budget-updated', invalidateAndReload);
    return () => {
      window.removeEventListener('moneta-transaction-updated', invalidateAndReload);
      window.removeEventListener('moneta-budget-updated', invalidateAndReload);
    };
  }, [load, currentPeriod]);

  const { totalBudget, totalSpent } = useMemo(() => {
    const totalBudget = budgets.reduce((sum, b) => sum + Number(b.amount), 0);
    const totalSpent = transactions
      .filter((t) => t.type === 'EXPENSE' && t.date.startsWith(currentPeriod))
      .reduce((sum, t) => sum + Number(t.amount), 0);
    return { totalBudget, totalSpent };
  }, [budgets, transactions, currentPeriod]);

  const budgetProgress = useMemo((): BudgetProgressItem[] => {
    return budgets
      .map((budget) => {
        const category = allCategories.find((c) => c.clientId === budget.categoryId || c.id === budget.categoryId);

        const spentAmount = transactions.reduce((acc, txn) => {
          if (txn.type === 'EXPENSE' && txn.categoryId === budget.categoryId && txn.date.startsWith(currentPeriod)) {
            return acc + Math.abs(Number(txn.amount));
          }
          return acc;
        }, 0);

        const budgetAmount = Number(budget.amount);
        const remainingAmount = Math.max(0, budgetAmount - spentAmount);
        const percentage = budgetAmount > 0 ? Math.round((spentAmount / budgetAmount) * 100) : 0;
        const clampedPercentage = Math.min(100, percentage);

        const urgencyLevel: BudgetProgressItem['urgencyLevel'] = percentage >= 100 ? 'critical' : percentage >= 75 ? 'warning' : 'safe';

        return {
          categoryId: budget.categoryId,
          categoryName: category?.name || 'Tak dikenal',
          categoryColor: category?.color ?? null,
          spentAmount,
          budgetAmount,
          remainingAmount,
          percentage,
          clampedPercentage,
          urgencyLevel,
        };
      })
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 4);
  }, [budgets, transactions, allCategories, currentPeriod]);

  const dailySafeToSpend = useMemo(() => {
    const now = new Date();
    const currentDay = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysLeft = Math.max(1, daysInMonth - currentDay + 1);

    const totalRemaining = Math.max(0, totalBudget - totalSpent);
    return totalRemaining / daysLeft;
  }, [totalBudget, totalSpent]);

  const dashboardInsight = useMemo((): DashboardInsight | null => {
    // ── Guard: if data is still loading, return the cached insight if one exists,
    // so the UI does not flicker to a fallback state between page navigations.
    if (isLoading || transactions.length === 0 && budgets.length === 0) {
      return readInsightCache(currentPeriod);
    }

    // ── Compute the fresh insight ──────────────────────────────────────────

    let fresh: DashboardInsight | null = null;

    /********** [START: Langkah 1 — Deteksi Realokasi Anggaran (Kritis)] **********/
    if (budgets.length > 0 && transactions.length > 0) {
      const allBudgetsInfo = budgets.map((b) => {
        const bCat = allCategories.find((c) => c.clientId === b.categoryId);
        const bSpent = transactions
          .filter((t) => t.categoryId === b.categoryId && t.type === 'EXPENSE' && t.date.startsWith(currentPeriod))
          .reduce((sum, t) => sum + Number(t.amount), 0);
        return {
          id: b.clientId!,
          categoryId: b.categoryId,
          limit: Number(b.amount),
          spent: bSpent,
          name: bCat?.name || 'Kategori',
        };
      });
      const overspentTargets = allBudgetsInfo.filter((b) => b.spent > b.limit);
      overspentTargets.sort((a, b) => b.spent - b.limit - (a.spent - a.limit));

      let recommendation = null;
      for (const target of overspentTargets) {
        recommendation = findBudgetReallocationRecommendation(target, allBudgetsInfo);
        if (recommendation) break;
      }

      if (recommendation) {
        fresh = {
          type: 'critical',
          title: 'Rekomendasi Subsidi Silang',
          message: `Anggaran ${recommendation.targetCategoryName} jebol. Pindahkan Rp${recommendation.recommendedAmount.toLocaleString('id-ID')} dari ${recommendation.sourceCategoryName}?`,
          action: {
            label: 'Subsidi Silang',
            route: `/budgets?action=reallocate&sourceBudgetId=${recommendation.sourceBudgetId}&targetBudgetId=${recommendation.targetBudgetId}&amount=${recommendation.recommendedAmount}`,
          },
        };
        writeInsightCache(currentPeriod, fresh);
        return fresh;
      }
    }
    /********** [END: Langkah 1 — Deteksi Realokasi Anggaran (Kritis)] **********/

    const thirtyDaysAgo = dayjs().subtract(30, 'day');
    const allIncomes = transactions.filter((t) => t.type === 'INCOME' && dayjs(t.date).isAfter(thirtyDaysAgo));
    const currentExpTxns = transactions.filter((t) => t.type === 'EXPENSE' && t.date.startsWith(currentPeriod));

    /********** [START: Langkah 2 — Deteksi Kebocoran Awal Bulan (Payday Leak)] **********/
    if (allIncomes.length > 0) {
      let maxIncome = allIncomes[0];
      for (const inc of allIncomes) {
        if (Number(inc.amount) > Number(maxIncome.amount)) maxIncome = inc;
      }
      const daysSincePayday = dayjs().diff(dayjs(maxIncome.date), 'day');
      if (daysSincePayday >= 0 && daysSincePayday <= 3) {
        const totalIncomeThisMonth = transactions
          .filter((t) => t.type === 'INCOME' && t.date.startsWith(currentPeriod))
          .reduce((sum, t) => sum + Number(t.amount), 0);
        const limit = totalBudget > 0 ? totalBudget : totalIncomeThisMonth;
        if (limit > 0 && totalSpent > limit * 0.4) {
          fresh = {
            type: 'warning',
            title: 'Pengeluaran Awal Bulan',
            message: `${Math.round((totalSpent / limit) * 100)}% dari batas aman telah terpakai hanya dalam ${Math.max(1, daysSincePayday)} hari (setelah gajian).`,
          };
          writeInsightCache(currentPeriod, fresh);
          return fresh;
        }
      }
    }
    /********** [END: Langkah 2 — Deteksi Kebocoran Awal Bulan (Payday Leak)] **********/

    /********** [START: Langkah 3 — Deteksi Kecepatan Pengeluaran (Burn Rate)] **********/
    const now = new Date();
    const currentDay = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const timePassedPct = (currentDay / daysInMonth) * 100;
    const spentPct = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

    if (totalBudget > 0 && spentPct - timePassedPct > 10) {
      fresh = {
        type: 'warning',
        title: 'Kecepatan Pengeluaran Meningkat',
        message:
          'Laju pengeluaranmu lebih cepat dari kalender bulan ini. Pertimbangkan untuk mengatur ulang pengeluaran beberapa hari ke depan.',
      };
      writeInsightCache(currentPeriod, fresh);
      return fresh;
    }
    /********** [END: Langkah 3 — Deteksi Kecepatan Pengeluaran (Burn Rate)] **********/

    /********** [START: Langkah 4 — Deteksi Jebakan Akhir Pekan (Weekend Trap)] **********/
    const thisWeekExpenses = currentExpTxns.filter((t) => dayjs(t.date).isSame(dayjs(), 'week'));
    let weekTotal = 0,
      weekendTotal = 0;
    for (const tx of thisWeekExpenses) {
      const amt = Number(tx.amount);
      weekTotal += amt;
      const d = dayjs(tx.date).day();
      if (d === 0 || d === 6) weekendTotal += amt;
    }
    if (weekTotal > 0 && (weekendTotal / weekTotal) > 0.7) {
      fresh = {
        type: 'warning',
        title: 'Pola Pengeluaran Akhir Pekan',
        message: `Sekitar ${Math.round((weekendTotal / weekTotal) * 100)}% pengeluaran minggumu terjadi di akhir pekan. Pastikan tetap sesuai dengan rencana anggaranmu, ya.`,
      };
      writeInsightCache(currentPeriod, fresh);
      return fresh;
    }
    /********** [END: Langkah 4 — Deteksi Jebakan Akhir Pekan (Weekend Trap)] **********/

    /********** [START: Langkah 5 — Deteksi Pengeluaran Larut Malam (Night Owl)] **********/
    const wantsRegex = /(hiburan|jajan|pribadi|gaya hidup|hobi)/i;
    let nightTotal = 0;
    for (const tx of currentExpTxns) {
      const cat = allCategories.find((c) => c.clientId === tx.categoryId);
      if (cat && wantsRegex.test(cat.name)) {
        const h = dayjs(tx.createdAt).hour();
        if (h >= 22 || h <= 4) nightTotal += Number(tx.amount);
      }
    }
    if (nightTotal >= 150_000) {
      fresh = {
        type: 'warning',
        title: 'Pengeluaran Larut Malam',
        message: `Tercatat Rp${nightTotal.toLocaleString('id-ID')} pengeluaran gaya hidup di larut malam. Kurangi kebiasaan checkout di jam tidur.`,
      };
      writeInsightCache(currentPeriod, fresh);
      return fresh;
    }
    /********** [END: Langkah 5 — Deteksi Pengeluaran Larut Malam (Night Owl)] **********/

    /********** [START: Langkah 6 — Fallback Status Positif atau Info] **********/
    if (totalBudget > 0) {
      if (totalSpent === 0) {
        fresh = {
          type: 'info',
          title: 'Mulai Mencatat',
          message: 'Anggaran bulan ini sudah siap. Catat setiap transaksi agar kamu bisa terus memantau keuanganmu.',
        };
      } else if (spentPct <= timePassedPct) {
        fresh = {
          type: 'positive',
          title: 'Keuangan Terkendali',
          message: 'Bagus! Laju pengeluaranmu masih sesuai dengan jadwal kalender bulan ini. Pertahankan!',
        };
      }
    } else {
      fresh = {
        type: 'info',
        title: 'Belum Ada Anggaran',
        message: 'Atur anggaran pertamamu untuk mendapatkan lebih banyak peringatan dan perlindungan pengeluaran.',
      };
    }
    /********** [END: Langkah 6 — Fallback Status Positif atau Info] **********/

    writeInsightCache(currentPeriod, fresh);
    return fresh;
  }, [transactions, budgets, allCategories, totalBudget, totalSpent, currentPeriod, isLoading]);

  /********** Pengembalian Data Hook **********/

  return {
    username,
    budgetProgress,
    totalBudget,
    totalSpent,
    dailySafeToSpend,
    dashboardInsight,
    isLoading,
    loadDashboard: load,
  };
}
