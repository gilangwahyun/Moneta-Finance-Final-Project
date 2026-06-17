import { useState, useMemo, useEffect, useCallback } from "react";
import dayjs from "dayjs";
import { Transaction, Budget } from "@/types/models.types";
import { getAllTransactions } from "@/lib/local-db/repositories/transactions";
import { getBudgetsByPeriod } from "@/lib/local-db/repositories/budgets";
import { getCurrentUser } from "@/lib/local-db/repositories/users";
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
  const [isLoading, setIsLoading] = useState(true);
  const { allCategories } = useCategories();

  const loadData = useCallback(async () => {
    const user = await getCurrentUser();
    if (!user) return;
    const now = new Date();
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const [txns, bgets] = await Promise.all([
      getAllTransactions(user.id),
      getBudgetsByPeriod(user.id, period),
    ]);
    setAllTxns(txns);
    setBudgets(bgets);
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

  const rawNudgeInsights = useMemo(
    () => generateNudges(current, prev, topExpenseCategory, weeklySavings, frequentTxn, peakDay, wantsProjection, paydayLeak, weekendTrap, nightOwl, subscriptions),
    [current, prev, topExpenseCategory, weeklySavings, frequentTxn, peakDay, wantsProjection, paydayLeak, weekendTrap, nightOwl, subscriptions]
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
