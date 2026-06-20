import { useState, useMemo, useEffect, useCallback } from "react";
import dayjs from "dayjs";
import { Transaction, Budget, Wallet, FinancialTarget } from "@/types/models.types";
import { getAllTransactions } from "@/lib/local-db/repositories/transactions";
import { getBudgetsByPeriod } from "@/lib/local-db/repositories/budgets";
import { getCurrentUser } from "@/lib/local-db/repositories/users";
import { getAllWallets } from "@/lib/local-db/repositories/wallets";
import { getActiveTargets } from "@/lib/local-db/repositories/targets";
import { useTimeFilter } from "@/providers/TimeFilterProvider";
import { filterByDateRange } from "@/lib/utils/time-filter";
import { useCategories } from "@/hooks/use-categories";
import { generateNudges, findBudgetReallocationRecommendation, ReallocationRecommendation } from "@/lib/nudging";
import { formatCurrency } from "@/lib/utils/helpers";

export const CHART_PALETTE = [
  "#6366f1", // indigo-500
  "#14b8a6", // teal-500
  "#f59e0b", // amber-500
  "#f43f5e", // rose-500
  "#06b6d4", // cyan-500
  "#8b5cf6", // violet-500
  "#10b981", // emerald-500
  "#fb923c", // orange-400
  "#64748b", // slate-500
  "#ec4899", // pink-500
];

export function sumByType(txns: Transaction[]) {
  let income = 0, expense = 0;
  for (const t of txns) {
    if (t.type === "INCOME") income += Number(t.amount);
    else if (t.type === "EXPENSE") expense += Number(t.amount);
  }
  return { income, expense, net: income - expense };
}

export function useAnalytics(donutMode: "EXPENSE" | "INCOME") {
  const { comparison } = useTimeFilter();
  const [allTxns, setAllTxns] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [allWallets, setAllWallets] = useState<Wallet[]>([]);
  const [allTargets, setAllTargets] = useState<FinancialTarget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { allCategories } = useCategories();

  const loadData = useCallback(async () => {
    const user = await getCurrentUser();
    if (!user) return;
    const now = new Date();
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const [txns, bgets, wallets, targets] = await Promise.all([
      getAllTransactions(user.id),
      getBudgetsByPeriod(user.id, period),
      getAllWallets(user.id),
      getActiveTargets(user.id),
    ]);
    setAllTxns(txns);
    setBudgets(bgets);
    setAllWallets(wallets);
    setAllTargets(targets);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    window.addEventListener("moneta-transaction-updated", loadData);
    return () => window.removeEventListener("moneta-transaction-updated", loadData);
  }, [loadData]);

  const currentTxns = useMemo(
    () => filterByDateRange(allTxns, comparison.currentPeriod),
    [allTxns, comparison.currentPeriod]
  );
  
  const prevTxns = useMemo(
    () => filterByDateRange(allTxns, comparison.baselinePeriod),
    [allTxns, comparison.baselinePeriod]
  );

  const current = useMemo(() => sumByType(currentTxns), [currentTxns]);
  const prev = useMemo(() => sumByType(prevTxns), [prevTxns]);

  const donutData = useMemo(() => {
    const relevant = currentTxns.filter((t) => t.type === donutMode && t.categoryId);
    const grouped: Record<string, number> = {};
    for (const t of relevant) {
      grouped[t.categoryId!] = (grouped[t.categoryId!] || 0) + Number(t.amount);
    }
    const total = Object.values(grouped).reduce((s, v) => s + v, 0);

    return Object.entries(grouped)
      .map(([catId, value], i) => {
        const cat = allCategories.find((c) => c.clientId === catId);
        const budget = budgets.find((b) => b.categoryId === catId);
        const budgetSpentPct = budget && budget.amount > 0 ? Math.round((value / budget.amount) * 100) : undefined;
        return {
          categoryId: catId,
          name: cat?.name || "Lainnya",
          icon: cat?.icon,
          color: cat?.color,
          value,
          percentage: total > 0 ? Math.round((value / total) * 100) : 0,
          fill: CHART_PALETTE[i % CHART_PALETTE.length],
          budgetSpentPct,
        };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [currentTxns, donutMode, allCategories, budgets]);

  const { barData, dailyAvg } = useMemo(() => {
    const days: { label: string; income: number; expense: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const label = d.toLocaleDateString("id-ID", { weekday: "short", day: "numeric" });
      const dayTxns = allTxns.filter((t) => t.date.startsWith(dateStr) && !t.deletedAt && t.type !== "TRANSFER");
      const { income, expense } = sumByType(dayTxns);
      days.push({ label, income, expense });
    }
    const totalExpenses = days.reduce((s, d) => s + d.expense, 0);
    const activeDays = days.filter((d) => d.expense > 0).length;
    const avg = activeDays > 0 ? Math.round(totalExpenses / activeDays) : 0;
    return { barData: days, dailyAvg: avg };
  }, [allTxns]);

  const topExpenseCategory = useMemo(() => {
    if (donutData.length === 0) return null;
    const top = donutData[0];
    const prevRelevant = prevTxns.filter(
      (t) => t.type === "EXPENSE" && allCategories.find((c) => c.name === top.name)?.clientId === t.categoryId
    );
    const prevValue = prevRelevant.reduce((s, t) => s + Number(t.amount), 0);
    return { name: top.name, value: top.value, prevValue };
  }, [donutData, prevTxns, allCategories]);

  const weeklySavings = useMemo(() => {
    const net = barData.reduce((s, d) => s + d.income - d.expense, 0);
    return Math.max(0, net);
  }, [barData]);

  // Analytics Nudge Indicators
  const paydayLeak = useMemo(() => {
    const thirtyDaysAgo = dayjs().subtract(30, 'day');
    const incomes = allTxns.filter(t => t.type === 'INCOME' && dayjs(t.date).isAfter(thirtyDaysAgo));
    if (incomes.length === 0) return null;
    let maxIncome = incomes[0];
    for (const inc of incomes) {
      if (Number(inc.amount) > Number(maxIncome.amount)) maxIncome = inc;
    }
    const daysSincePayday = dayjs().diff(dayjs(maxIncome.date), 'day');
    if (daysSincePayday >= 0 && daysSincePayday <= 3) {
      const budgetLimit = budgets.reduce((s, b) => s + b.amount, 0);
      const limit = budgetLimit > 0 ? budgetLimit : current.income;
      if (limit > 0 && current.expense > limit * 0.4) {
        return { percentage: Math.round((current.expense / limit) * 100), days: Math.max(1, daysSincePayday) };
      }
    }
    return null;
  }, [allTxns, current.expense, current.income, budgets]);

  const weekendTrap = useMemo(() => {
    const thisWeekExpenses = currentTxns.filter(t => t.type === 'EXPENSE' && dayjs(t.date).isSame(dayjs(), 'week'));
    let weekTotal = 0, weekendTotal = 0;
    for (const tx of thisWeekExpenses) {
      const amt = Number(tx.amount);
      weekTotal += amt;
      const d = dayjs(tx.date).day();
      if (d === 0 || d === 6) weekendTotal += amt;
    }
    if (weekTotal > 0 && (weekendTotal / weekTotal) > 0.7) return { percentage: Math.round((weekendTotal / weekTotal) * 100) };
    return null;
  }, [currentTxns]);

  const nightOwl = useMemo(() => {
    const wantsRegex = /(hiburan|jajan|pribadi|gaya hidup|hobi)/i;
    let nightTotal = 0;
    const expenses = currentTxns.filter(t => t.type === 'EXPENSE');
    for (const tx of expenses) {
      const cat = allCategories.find(c => c.clientId === tx.categoryId);
      if (cat && wantsRegex.test(cat.name)) {
        const h = dayjs(tx.createdAt).hour();
        if (h >= 22 || h <= 4) nightTotal += Number(tx.amount);
      }
    }
    if (nightTotal >= 150_000) return { totalAmount: nightTotal };
    return null;
  }, [currentTxns, allCategories]);

  const frequentTxn = useMemo(() => {
    const expenses = currentTxns.filter((t) => t.type === "EXPENSE");
    const counts: Record<string, { count: number; totalAmount: number }> = {};
    for (const tx of expenses) {
      if (!tx.description) continue;
      const name = tx.description.trim().toLowerCase();
      if (!counts[name]) counts[name] = { count: 0, totalAmount: 0 };
      counts[name].count += 1;
      counts[name].totalAmount += Number(tx.amount);
    }
    let max = { name: "", count: 0, totalAmount: 0 };
    for (const [name, stats] of Object.entries(counts)) {
      if (stats.count > max.count) max = { name, ...stats };
    }
    if (max.count > 10 && (max.totalAmount / max.count) < 30000 && max.name !== "") {
      const titleCaseName = max.name.replace(/\b\w/g, l => l.toUpperCase());
      return { name: titleCaseName, count: max.count, totalAmount: max.totalAmount };
    }
    return null;
  }, [currentTxns]);

  const subscriptions = useMemo(() => {
    const currExp = currentTxns.filter(t => t.type === "EXPENSE");
    const prevExp = prevTxns.filter(t => t.type === "EXPENSE");
    let matchCount = 0, sumMatched = 0;
    const matchedPrev = new Set<string>();
    
    for (const curr of currExp) {
      const match = prevExp.find(p => 
        p.amount === curr.amount && 
        p.categoryId === curr.categoryId &&
        Math.abs(dayjs(curr.date).date() - dayjs(p.date).date()) <= 3 &&
        !matchedPrev.has(p.clientId)
      );
      if (match) {
        matchedPrev.add(match.clientId);
        matchCount++;
        sumMatched += Number(curr.amount);
      }
    }
    if (matchCount >= 3 && current.income > 0) {
      return { count: matchCount, percentage: Math.round((sumMatched / current.income) * 100) };
    }
    return null;
  }, [currentTxns, prevTxns, current.income]);

  const peakDay = useMemo(() => {
    const expenses = currentTxns.filter((t) => t.type === "EXPENSE");
    if (expenses.length === 0) return null;
    const dayTotals: Record<string, number> = {};
    let totalExpense = 0;
    const dayCategoryTotals: Record<string, Record<string, { total: number; count: number }>> = {};

    for (const tx of expenses) {
      const dayName = dayjs(tx.date).format("dddd");
      const amount = Number(tx.amount);
      dayTotals[dayName] = (dayTotals[dayName] || 0) + amount;
      totalExpense += amount;

      if (tx.categoryId) {
        if (!dayCategoryTotals[dayName]) dayCategoryTotals[dayName] = {};
        if (!dayCategoryTotals[dayName][tx.categoryId]) dayCategoryTotals[dayName][tx.categoryId] = { total: 0, count: 0 };
        dayCategoryTotals[dayName][tx.categoryId].total += amount;
        dayCategoryTotals[dayName][tx.categoryId].count += 1;
      }
    }
    let maxDay = "", maxAmount = 0;
    for (const [dayName, amount] of Object.entries(dayTotals)) {
      if (amount > maxAmount) { maxAmount = amount; maxDay = dayName; }
    }
    if (totalExpense > 0 && maxAmount > 0) {
      let dominantCategoryName: string | undefined;
      let dominantCategoryId: string | undefined;
      let maxCatAmount = 0;
      let transactionCountOnThatDay = 0;
      
      if (dayCategoryTotals[maxDay]) {
        for (const [catId, stats] of Object.entries(dayCategoryTotals[maxDay])) {
          if (stats.total > maxCatAmount) {
            maxCatAmount = stats.total;
            dominantCategoryId = catId;
            transactionCountOnThatDay = stats.count;
          }
        }
        if (dominantCategoryId) {
          const cat = allCategories.find(c => c.clientId === dominantCategoryId);
          if (cat) dominantCategoryName = cat.name;
        }
      }

      return { 
        dayName: maxDay, 
        percentage: Math.round((maxAmount / totalExpense) * 100),
        dominantCategoryName,
        totalAmountOnThatDay: maxAmount,
        transactionCountOnThatDay
      };
    }
    return null;
  }, [currentTxns, allCategories]);

  const wantsProjection = useMemo(() => {
    const wantsRegex = /(hiburan|jajan|pribadi|gaya hidup|hobi)/i;
    const expenses = currentTxns.filter((t) => t.type === "EXPENSE");
    
    let maxCatId = "";
    let maxCatName = "";
    let maxCatTotal = 0;
    let maxCatCount = 0;
    
    const catTotals: Record<string, { total: number; count: number; name: string }> = {};
    
    for (const tx of expenses) {
      if (!tx.categoryId) continue;
      const cat = allCategories.find((c) => c.clientId === tx.categoryId);
      if (cat && wantsRegex.test(cat.name)) {
        if (!catTotals[cat.clientId]) {
          catTotals[cat.clientId] = { total: 0, count: 0, name: cat.name };
        }
        catTotals[cat.clientId].total += Number(tx.amount);
        catTotals[cat.clientId].count += 1;
      }
    }
    
    for (const [catId, stats] of Object.entries(catTotals)) {
      if (stats.total > maxCatTotal) {
        maxCatTotal = stats.total;
        maxCatId = catId;
        maxCatName = stats.name;
        maxCatCount = stats.count;
      }
    }
    
    // Fallback: If no discretionary category is found, just use the absolute highest expense category
    if (maxCatTotal === 0 && topExpenseCategory) {
      const cat = allCategories.find((c) => c.name === topExpenseCategory.name);
      if (cat) {
        maxCatId = cat.clientId;
        maxCatName = cat.name;
        const catTxns = expenses.filter(t => t.categoryId === maxCatId);
        maxCatTotal = catTxns.reduce((sum, t) => sum + Number(t.amount), 0);
        maxCatCount = catTxns.length;
      }
    }
    
    if (maxCatTotal > 0) {
      const annualized = maxCatTotal * 12;
      const avgTxn = maxCatCount > 0 ? maxCatTotal / maxCatCount : 0;
      
      if (annualized >= 1_000_000) {
        return { 
          categoryId: maxCatId,
          categoryName: maxCatName || "kategori pengeluaran utama",
          currentPace: maxCatTotal, 
          annualized,
          monthlyTotal: maxCatTotal,
          transactionCount: maxCatCount,
          averageTransaction: avgTxn,
          basis: maxCatName.match(wantsRegex) ? "TOP_DISCRETIONARY_CATEGORY" : "TOP_SPENDING_CATEGORY"
        };
      }
    }
    return null;
  }, [currentTxns, allCategories, topExpenseCategory]);

  // --- NEW PHASE 1 INDICATORS ---

  const recurringMerchantGrowth = useMemo(() => {
    const currentExp = currentTxns.filter(t => t.type === 'EXPENSE' && t.description);
    const prevExp = prevTxns.filter(t => t.type === 'EXPENSE' && t.description);
    
    const currentCounts = currentExp.reduce((acc, t) => {
      acc[t.description!] = (acc[t.description!] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const prevCounts = prevExp.reduce((acc, t) => {
      acc[t.description!] = (acc[t.description!] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    let topMerchant = null;
    let maxRatio = 0;
    
    for (const [desc, currCount] of Object.entries(currentCounts)) {
      if (currCount >= 3) {
        const pCount = prevCounts[desc] || 0;
        if (pCount >= 2) {
          const ratio = currCount / pCount;
          if (ratio >= 2.0 && ratio > maxRatio) {
            maxRatio = ratio;
            topMerchant = {
              merchantName: desc,
              currentCount: currCount,
              prevCount: pCount,
              amount: currentExp.filter(t => t.description === desc).reduce((sum, t) => sum + Number(t.amount), 0)
            };
          }
        }
      }
    }
    return topMerchant;
  }, [currentTxns, prevTxns]);

  const morningVsEvening = useMemo(() => {
    const expenses = currentTxns.filter(t => t.type === 'EXPENSE');
    if (expenses.length < 10) return null; // T2 minimum data
    
    let morningTotal = 0;
    let eveningTotal = 0;
    
    for (const t of expenses) {
      const hour = dayjs(t.date).hour();
      if (hour >= 5 && hour <= 11) morningTotal += Number(t.amount);
      else if (hour >= 17 && hour <= 21) eveningTotal += Number(t.amount);
    }
    
    const total = morningTotal + eveningTotal;
    if (total >= 200_000) {
      const morningRatio = morningTotal / total;
      const eveningRatio = eveningTotal / total;
      if (morningRatio > 0.6) return { dominantSession: 'pagi' as const, ratio: morningRatio, total: morningTotal };
      if (eveningRatio > 0.6) return { dominantSession: 'malam' as const, ratio: eveningRatio, total: eveningTotal };
    }
    return null;
  }, [currentTxns]);

  const dayOfMonthClustering = useMemo(() => {
    const expenses = currentTxns.filter(t => t.type === 'EXPENSE');
    if (expenses.length < 10) return null; // T2
    
    let totalExpense = 0;
    const dayTotals: Record<number, number> = {};
    
    for (const t of expenses) {
      const amt = Number(t.amount);
      totalExpense += amt;
      const day = dayjs(t.date).date();
      dayTotals[day] = (dayTotals[day] || 0) + amt;
    }
    
    if (totalExpense >= 500_000) {
      const sortedDays = Object.entries(dayTotals).sort((a, b) => b[1] - a[1]);
      const topThreeDays = sortedDays.slice(0, 3);
      const topThreeTotal = topThreeDays.reduce((sum, [, amt]) => sum + amt, 0);
      const ratio = topThreeTotal / totalExpense;
      if (ratio > 0.5) {
        return { ratio, topDays: topThreeDays.map(([day]) => parseInt(day)), totalAmount: topThreeTotal };
      }
    }
    return null;
  }, [currentTxns]);

  const zeroBudgetCategory = useMemo(() => {
    const expenses = currentTxns.filter(t => t.type === 'EXPENSE' && t.categoryId);
    const catTotals: Record<string, number> = {};
    for (const t of expenses) {
      catTotals[t.categoryId!] = (catTotals[t.categoryId!] || 0) + Number(t.amount);
    }
    
    for (const [catId, amount] of Object.entries(catTotals)) {
      if (amount > 200_000 && !budgets.find(b => b.categoryId === catId)) {
        const cat = allCategories.find(c => c.clientId === catId);
        return { categoryName: cat?.name || 'Lainnya', categoryId: catId, amount };
      }
    }
    return null;
  }, [currentTxns, budgets, allCategories]);

  const smartBudgetSuggestion = useMemo(() => {
    const now = dayjs();
    const m1Period = now.subtract(1, 'month').format('YYYY-MM');
    const m2Period = now.subtract(2, 'month').format('YYYY-MM');
    const m3Period = now.subtract(3, 'month').format('YYYY-MM');
    
    const m1Txns = allTxns.filter(t => dayjs(t.date).format('YYYY-MM') === m1Period && t.type === 'EXPENSE');
    const m2Txns = allTxns.filter(t => dayjs(t.date).format('YYYY-MM') === m2Period && t.type === 'EXPENSE');
    const m3Txns = allTxns.filter(t => dayjs(t.date).format('YYYY-MM') === m3Period && t.type === 'EXPENSE');
    
    for (const cat of allCategories) {
      if (budgets.find(b => b.categoryId === cat.clientId)) continue; // already has budget this month
      const m1Amt = m1Txns.filter(t => t.categoryId === cat.clientId).reduce((s, t) => s + Number(t.amount), 0);
      const m2Amt = m2Txns.filter(t => t.categoryId === cat.clientId).reduce((s, t) => s + Number(t.amount), 0);
      const m3Amt = m3Txns.filter(t => t.categoryId === cat.clientId).reduce((s, t) => s + Number(t.amount), 0);
      
      if (m1Amt > 0 && m2Amt > 0 && m3Amt > 0) {
        const avg = (m1Amt + m2Amt + m3Amt) / 3;
        if (avg > 50_000) {
          return { categoryName: cat.name, categoryId: cat.clientId!, averageAmount: avg };
        }
      }
    }
    return null;
  }, [allTxns, allCategories, budgets]);

  const singleWalletUsage = useMemo(() => {
    if (allWallets.length <= 1) return null;
    const totalTxns = currentTxns.length;
    if (totalTxns < 5) return null; // T1
    
    const walletCounts: Record<string, number> = {};
    for (const t of currentTxns) {
      if (t.walletId) walletCounts[t.walletId] = (walletCounts[t.walletId] || 0) + 1;
    }
    
    for (const [wId, count] of Object.entries(walletCounts)) {
      const ratio = count / totalTxns;
      if (ratio > 0.90) {
        const w = allWallets.find(w => w.clientId === wId);
        return { walletName: w?.name || 'Dompet Utama', ratio };
      }
    }
    return null;
  }, [currentTxns, allWallets]);

  const incomeMomentum = useMemo(() => {
    const incomes = currentTxns.filter(t => t.type === 'INCOME');
    const currentIncome = incomes.reduce((s, t) => s + Number(t.amount), 0);
    
    const dayOfMonth = dayjs().date();
    if (dayOfMonth >= 15) {
      const prevIncomes = prevTxns.filter(t => t.type === 'INCOME');
      const avgPrevIncome = prevIncomes.reduce((s, t) => s + Number(t.amount), 0);
      if (avgPrevIncome > 0 && currentIncome < avgPrevIncome * 0.5) {
        return { currentIncome, avgPrevIncome };
      }
    }
    return null;
  }, [currentTxns, prevTxns]);

  const lowCashWarning = useMemo(() => {
    if (allWallets.length === 0) return null;
    
    // Compute total months we have data for
    const uniqueMonths = new Set(allTxns.map(t => dayjs(t.date).format('YYYY-MM'))).size;
    const avgMonthlyExpense = allTxns.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + Number(t.amount), 0) / Math.max(1, uniqueMonths);
      
    const threshold = Math.max(100_000, avgMonthlyExpense * 0.10);
    
    for (const w of allWallets) {
      if (w.type === 'INVESTASI') continue;
      let balance = Number(w.initialBalance || 0);
      for (const t of allTxns) {
        if (t.walletId === w.clientId) {
          if (t.type === 'INCOME') balance += Number(t.amount);
          else if (t.type === 'EXPENSE') balance -= Number(t.amount);
          else if (t.type === 'TRANSFER') balance -= Number(t.amount);
        }
        if (t.type === 'TRANSFER' && t.targetWalletId === w.clientId) {
          balance += Number(t.amount);
        }
      }
      
      if (balance < threshold) {
        return { walletName: w.name, currentBalance: balance, walletId: w.clientId! };
      }
    }
    return null;
  }, [allWallets, allTxns]);

  // --- NEW PHASE 2 INDICATORS ---

  const newCategoryEmergence = useMemo(() => {
    const now = dayjs();
    const m1 = now.subtract(1, 'month').format('YYYY-MM');
    const m2 = now.subtract(2, 'month').format('YYYY-MM');
    const m3 = now.subtract(3, 'month').format('YYYY-MM');

    const prevCatIds = new Set(
      allTxns
        .filter(t => [m1, m2, m3].includes(dayjs(t.date).format('YYYY-MM')) && t.type === 'EXPENSE' && t.categoryId)
        .map(t => t.categoryId!)
    );

    const currentExpenses = currentTxns.filter(t => t.type === 'EXPENSE' && t.categoryId);
    const catTotals: Record<string, number> = {};
    for (const t of currentExpenses) {
      catTotals[t.categoryId!] = (catTotals[t.categoryId!] || 0) + Number(t.amount);
    }

    for (const [catId, amount] of Object.entries(catTotals)) {
      if (!prevCatIds.has(catId) && amount > 100_000) {
        const cat = allCategories.find(c => c.clientId === catId);
        return { categoryName: cat?.name || 'Lainnya', categoryId: catId, amount };
      }
    }
    return null;
  }, [currentTxns, allTxns, allCategories]);

  const categoryDominanceShift = useMemo(() => {
    const currentExpenses = currentTxns.filter(t => t.type === 'EXPENSE' && t.categoryId);
    const prevExpenses = prevTxns.filter(t => t.type === 'EXPENSE' && t.categoryId);
    if (currentExpenses.length === 0 || prevExpenses.length === 0) return null;

    // Top category this month
    const currentGroups: Record<string, number> = {};
    for (const t of currentExpenses) currentGroups[t.categoryId!] = (currentGroups[t.categoryId!] || 0) + Number(t.amount);
    const prevGroups: Record<string, number> = {};
    for (const t of prevExpenses) prevGroups[t.categoryId!] = (prevGroups[t.categoryId!] || 0) + Number(t.amount);

    const sortedCurrent = Object.entries(currentGroups).sort((a, b) => b[1] - a[1]);
    const sortedPrev = Object.entries(prevGroups).sort((a, b) => b[1] - a[1]);
    if (sortedCurrent.length === 0 || sortedPrev.length === 0) return null;

    const [topCurrentId, topCurrentAmt] = sortedCurrent[0];
    const [topPrevId] = sortedPrev[0];

    if (topCurrentId !== topPrevId) {
      const prevAmtSameCategory = prevGroups[topCurrentId] || 0;
      if (prevAmtSameCategory > 0) {
        const growthPct = Math.round(((topCurrentAmt - prevAmtSameCategory) / prevAmtSameCategory) * 100);
        if (growthPct >= 30) {
          const newTopCat = allCategories.find(c => c.clientId === topCurrentId);
          const prevTopCat = allCategories.find(c => c.clientId === topPrevId);
          return {
            newTopName: newTopCat?.name || 'Lainnya',
            newTopAmount: topCurrentAmt,
            prevTopName: prevTopCat?.name || 'Lainnya',
            growthPct,
          };
        }
      }
    }
    return null;
  }, [currentTxns, prevTxns, allCategories]);

  const expenseConsistency = useMemo(() => {
    const now = dayjs();
    const periods = [now.subtract(3, 'month'), now.subtract(2, 'month'), now.subtract(1, 'month')];

    const ratios = periods.map(p => {
      const pStr = p.format('YYYY-MM');
      const pTxns = allTxns.filter(t => dayjs(t.date).format('YYYY-MM') === pStr);
      const { income, expense } = sumByType(pTxns);
      return income > 0 ? expense / income : null;
    });

    if (ratios.some(r => r === null)) return null;
    const validRatios = ratios as number[];

    const min = Math.min(...validRatios);
    const max = Math.max(...validRatios);
    if (max - min > 0.20) {
      return { ratios: validRatios, minRatio: min, maxRatio: max };
    }
    return null;
  }, [allTxns]);

  const discretionaryDrift = useMemo(() => {
    const wantsRegex = /(hiburan|jajan|pribadi|gaya hidup|hobi)/i;
    const now = dayjs();
    const m3Str = now.subtract(3, 'month').format('YYYY-MM');

    const m3Txns = allTxns.filter(t => dayjs(t.date).format('YYYY-MM') === m3Str && t.type === 'EXPENSE');

    const calcRatio = (txns: Transaction[]) => {
      const total = txns.reduce((s, t) => s + Number(t.amount), 0);
      if (total === 0) return null;
      const disc = txns.filter(t => {
        const cat = allCategories.find(c => c.clientId === t.categoryId);
        return cat && wantsRegex.test(cat.name);
      }).reduce((s, t) => s + Number(t.amount), 0);
      return disc / total;
    };

    const ratioNow = calcRatio(currentTxns);
    const ratioThen = calcRatio(m3Txns);

    if (ratioNow !== null && ratioThen !== null && ratioNow - ratioThen > 0.15) {
      return { ratioNow, ratioThen, diffPct: Math.round((ratioNow - ratioThen) * 100) };
    }
    return null;
  }, [currentTxns, allTxns, allCategories]);

  const budgetRunway = useMemo(() => {
    if (budgets.length === 0) return null;
    const today = dayjs();
    const daysElapsed = today.date();
    if (daysElapsed < 7) return null; // Need at least 1 week of data
    const daysInMonth = today.daysInMonth();
    const daysRemaining = daysInMonth - daysElapsed;
    if (daysRemaining <= 0) return null;

    for (const budget of budgets) {
      const spent = currentTxns
        .filter(t => t.categoryId === budget.categoryId && t.type === 'EXPENSE')
        .reduce((s, t) => s + Number(t.amount), 0);
      const ratio = spent / Number(budget.amount);

      // Only trigger if under 80% (not yet caught by budget warning)
      if (ratio >= 0.8) continue;

      const spendingRate = spent / daysElapsed;
      if (spendingRate <= 0) continue;

      const daysUntilExhausted = Math.floor((Number(budget.amount) - spent) / spendingRate);
      if (daysUntilExhausted < daysRemaining) {
        const cat = allCategories.find(c => c.clientId === budget.categoryId);
        return {
          categoryName: cat?.name || 'Kategori',
          budgetId: budget.clientId!,
          daysUntilExhausted,
          daysRemaining,
        };
      }
    }
    return null;
  }, [budgets, currentTxns, allCategories]);

  const targetGapAlert = useMemo(() => {
    if (allTargets.length === 0) return null;
    const today = dayjs();

    for (const target of allTargets) {
      if (!target.isActive) continue;
      const startDate = dayjs(target.startDate);
      const endDate = dayjs(target.endDate);
      const totalDays = endDate.diff(startDate, 'day');
      if (totalDays <= 0) continue;
      const elapsedDays = today.diff(startDate, 'day');
      const elapsedPct = elapsedDays / totalDays;
      if (elapsedPct < 0.30) continue;

      const currentAmount = currentTxns
        .filter(t => t.type === 'INCOME' && t.categoryId === target.categoryId)
        .reduce((s, t) => s + Number(t.amount), 0);

      if (currentAmount === 0) {
        return { targetName: target.name, targetId: target.clientId!, elapsedPct };
      }
    }
    return null;
  }, [allTargets, currentTxns]);

  const targetProgressImpact = useMemo(() => {
    if (allTargets.length === 0) return null;

    for (const target of allTargets) {
      if (!target.isActive) continue;
      const targetAmount = Number(target.targetAmount);
      
      const start = dayjs(target.startDate).startOf('day').valueOf();
      const end = target.endDate ? dayjs(target.endDate).endOf('day').valueOf() : dayjs().endOf('day').valueOf();

      const expenseInTargetPeriod = allTxns
        .filter(t => {
          if (t.type !== 'EXPENSE') return false;
          const tDate = dayjs(t.date).valueOf();
          return tDate >= start && tDate <= end;
        })
        .reduce((s, t) => s + Number(t.amount), 0);

      // Trigger if expense > 80% of target income
      if (expenseInTargetPeriod > targetAmount * 0.80) {
        return {
          targetName: target.name,
          targetId: target.clientId!,
          expenseAmount: expenseInTargetPeriod,
          targetAmount,
          periodType: target.period,
        };
      }
    }
    return null;
  }, [allTargets, allTxns]);

  const walletDrainRate = useMemo(() => {
    if (allWallets.length === 0) return null;
    const today = dayjs();
    const daysElapsed = today.date();
    if (daysElapsed < 7) return null;

    const currentMonthStr = today.format('YYYY-MM');
    const prevMonthStr = today.subtract(1, 'month').format('YYYY-MM');
    const daysInPrevMonth = today.subtract(1, 'month').daysInMonth();

    for (const w of allWallets) {
      if (w.type === 'INVESTASI') continue;

      const currentExpense = allTxns
        .filter(t => t.walletId === w.clientId && t.type === 'EXPENSE' && dayjs(t.date).format('YYYY-MM') === currentMonthStr)
        .reduce((s, t) => s + Number(t.amount), 0);
      const prevExpense = allTxns
        .filter(t => t.walletId === w.clientId && t.type === 'EXPENSE' && dayjs(t.date).format('YYYY-MM') === prevMonthStr)
        .reduce((s, t) => s + Number(t.amount), 0);

      const drainRateNow = currentExpense / daysElapsed;
      const drainRatePrev = prevExpense / daysInPrevMonth;

      if (drainRatePrev > 0 && drainRateNow > drainRatePrev * 1.5) {
        return { walletName: w.name, walletId: w.clientId!, drainRateNow, drainRatePrev };
      }
    }
    return null;
  }, [allWallets, allTxns]);

  const rawNudgeInsights = useMemo(
    () => generateNudges({
      current, prev, topExpenseCategory, weeklySavings, frequentTxn, peakDay, wantsProjection, paydayLeak, weekendTrap, nightOwl, subscriptions,
      recurringMerchantGrowth, morningVsEvening, dayOfMonthClustering, zeroBudgetCategory, smartBudgetSuggestion, singleWalletUsage, incomeMomentum, lowCashWarning,
      newCategoryEmergence, categoryDominanceShift, expenseConsistency, discretionaryDrift, budgetRunway, targetGapAlert, targetProgressImpact, walletDrainRate,
    }),
    [current, prev, topExpenseCategory, weeklySavings, frequentTxn, peakDay, wantsProjection, paydayLeak, weekendTrap, nightOwl, subscriptions,
     recurringMerchantGrowth, morningVsEvening, dayOfMonthClustering, zeroBudgetCategory, smartBudgetSuggestion, singleWalletUsage, incomeMomentum, lowCashWarning,
     newCategoryEmergence, categoryDominanceShift, expenseConsistency, discretionaryDrift, budgetRunway, targetGapAlert, targetProgressImpact, walletDrainRate]
  );

  const nudgeInsights = useMemo(() => {
    let reallocationInsight = null;
    
    if (budgets.length > 0 && currentTxns.length > 0) {
      const allBudgetsInfo = budgets.map(b => {
        const bCat = allCategories.find((c) => c.clientId === b.categoryId);
        const bSpent = currentTxns
          .filter((t) => t.categoryId === b.categoryId && t.type === 'EXPENSE')
          .reduce((sum, t) => sum + Number(t.amount), 0);
        return {
          id: b.clientId!,
          categoryId: b.categoryId,
          limit: Number(b.amount),
          spent: bSpent,
          name: bCat?.name || 'Kategori'
        };
      });

      // Find budgets that are > 100% utilized (strictly overspent)
      const overspentTargets = allBudgetsInfo.filter(b => b.spent > b.limit);
      
      // Sort by highest deficit first
      overspentTargets.sort((a, b) => (b.spent - b.limit) - (a.spent - a.limit));

      let recommendation: ReallocationRecommendation | null = null;
      for (const target of overspentTargets) {
        recommendation = findBudgetReallocationRecommendation(target, allBudgetsInfo);
        if (recommendation) break;
      }

      if (recommendation) {
        reallocationInsight = {
          priority: -1,
          severity: 'critical' as const, // Ensures it sorts to the top
          title: 'Rekomendasi Subsidi Silang',
          body: `Moneta menemukan opsi subsidi silang dari anggaran ${recommendation.sourceCategoryName} ke ${recommendation.targetCategoryName} sebesar ${formatCurrency(recommendation.recommendedAmount)}. Rekomendasi ini dibuat berdasarkan sisa anggaran yang masih cukup besar, tetapi prioritas penggunaan anggaran tetap kamu yang menentukan.`,
          ctaLabel: 'Subsidi Silang',
          ctaRoute: `/budgets?action=reallocate&sourceBudgetId=${recommendation.sourceBudgetId}&targetBudgetId=${recommendation.targetBudgetId}&amount=${recommendation.recommendedAmount}`,
          actionType: 'REALLOCATE_BUDGET',
          sourceBudgetId: recommendation.sourceBudgetId,
          targetBudgetId: recommendation.targetBudgetId,
          recommendedAmount: recommendation.recommendedAmount,
        };
      }
    }

    if (reallocationInsight) {
      return [reallocationInsight, ...rawNudgeInsights];
    }
    return rawNudgeInsights;
  }, [rawNudgeInsights, budgets, currentTxns, allCategories]);

  return {
    allTxns,
    budgets,
    isLoading,
    current,
    prev,
    donutData,
    barData,
    dailyAvg,
    nudgeInsights
  };
}
