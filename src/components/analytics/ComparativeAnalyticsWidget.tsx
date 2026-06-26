"use client";

import { useMemo, useState } from "react";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { useTransactions } from "@/hooks/use-transactions";
import { Transaction } from "@/types/models.types";
import { getStartOfDay, getEndOfDay } from "@/lib/utils/date-utils";
import { formatCurrency } from "@/lib/utils/helpers";

type ViewMode = "DAILY" | "WEEKLY";

export function ComparativeAnalyticsWidget() {
  const { transactions } = useTransactions();
  const [viewMode, setViewMode] = useState<ViewMode>("DAILY");

  const stats = useMemo(() => {
    const now = new Date();
    
    // Daily Boundaries
    const startOfToday = getStartOfDay(now);
    const endOfToday = getEndOfDay(now);

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const startOfYesterday = getStartOfDay(yesterday);
    const endOfYesterday = getEndOfDay(yesterday);

    // Weekly Boundaries (Rolling 7 days)
    const endOfRolling = getEndOfDay(now);
    const rollingStart = new Date(now);
    rollingStart.setDate(now.getDate() - 6);
    const startOfRolling = getStartOfDay(rollingStart);

    const prevRollingEnd = new Date(now);
    prevRollingEnd.setDate(now.getDate() - 7);
    const endOfPrevRolling = getEndOfDay(prevRollingEnd);

    const prevRollingStart = new Date(now);
    prevRollingStart.setDate(now.getDate() - 13);
    const startOfPrevRolling = getStartOfDay(prevRollingStart);

    // Accumulators
    let todayInc = 0, todayExp = 0;
    let yestInc = 0, yestExp = 0;
    let currWeekInc = 0, currWeekExp = 0;
    let prevWeekInc = 0, prevWeekExp = 0;

    for (const t of transactions) {
      const amt = Number(t.amount);
      const tDate = new Date(t.date).getTime();
      
      // Daily
      if (tDate >= startOfToday.getTime() && tDate <= endOfToday.getTime()) {
        if (t.type === "INCOME") todayInc += amt;
        else todayExp += amt;
      } else if (tDate >= startOfYesterday.getTime() && tDate <= endOfYesterday.getTime()) {
        if (t.type === "INCOME") yestInc += amt;
        else yestExp += amt;
      }

      // Weekly
      if (tDate >= startOfRolling.getTime() && tDate <= endOfRolling.getTime()) {
        if (t.type === "INCOME") currWeekInc += amt;
        else currWeekExp += amt;
      } else if (tDate >= startOfPrevRolling.getTime() && tDate <= endOfPrevRolling.getTime()) {
        if (t.type === "INCOME") prevWeekInc += amt;
        else prevWeekExp += amt;
      }
    }

    return {
      daily: { currentInc: todayInc, currentExp: todayExp, prevInc: yestInc, prevExp: yestExp },
      weekly: { currentInc: currWeekInc, currentExp: currWeekExp, prevInc: prevWeekInc, prevExp: prevWeekExp }
    };
  }, [transactions]);

  const currentStats = viewMode === "DAILY" ? stats.daily : stats.weekly;
  
  const compareSuffix = viewMode === "DAILY" ? "dari kemarin" : "dari minggu lalu";

  const calculateChange = (current: number, prev: number, type: "INCOME" | "EXPENSE") => {
    const diff = current - prev;
    const absDiff = Math.abs(diff);
    const nominalText = formatCurrency(absDiff);

    if (prev === 0 && current > 0) return { text: `Naik ${nominalText} dari 0`, color: type === "INCOME" ? "text-emerald-500" : "text-rose-500", Icon: TrendingUp };
    if (prev > 0 && current === 0) return { text: "Turun jadi 0", color: type === "INCOME" ? "text-amber-500" : "text-emerald-500", Icon: TrendingDown };
    if (prev === 0 && current === 0) return { text: "Tetap 0", color: "text-slate-600 dark:text-slate-400", Icon: Minus };

    const percent = Math.round((diff / prev) * 100);
    const absPercent = Math.abs(percent);

    if (percent === 0) return { text: "Tidak berubah", color: "text-slate-600 dark:text-slate-400", Icon: Minus };

    if (percent > 0) {
      // Increase
      return {
        text: type === "EXPENSE" 
          ? `⬆ ${nominalText} (${absPercent}%) lebih tinggi ${compareSuffix}` 
          : `⬆ ${nominalText} (${absPercent}%) naik ${compareSuffix}`,
        color: type === "INCOME" ? "text-emerald-500" : "text-rose-500",
        Icon: TrendingUp
      };
    } else {
      // Decrease
      return {
        text: type === "EXPENSE" 
          ? `⬇ ${nominalText} (${absPercent}%) lebih hemat ${compareSuffix}` 
          : `⬇ ${nominalText} (${absPercent}%) turun ${compareSuffix}`,
        color: type === "INCOME" ? "text-amber-500" : "text-emerald-500",
        Icon: TrendingDown
      };
    }
  };

  const expenseChange = calculateChange(currentStats.currentExp, currentStats.prevExp, "EXPENSE");
  const incomeChange = calculateChange(currentStats.currentInc, currentStats.prevInc, "INCOME");

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800/50 dark:bg-slate-900 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Analisis Perbandingan</h2>
        
        {/* Toggle */}
        <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800/50">
          <button
            onClick={() => setViewMode("DAILY")}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${
              viewMode === "DAILY"
                ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white"
                : "text-slate-600 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            Harian
          </button>
          <button
            onClick={() => setViewMode("WEEKLY")}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${
              viewMode === "WEEKLY"
                ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white"
                : "text-slate-600 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            7 Hari
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 divide-x divide-slate-100 dark:divide-slate-800">
        
        {/* Expense Section */}
        <div className="pr-2">
          <p className="text-xs text-slate-600 dark:text-slate-400">Pengeluaran</p>
          <div className="mt-1 flex items-start gap-2">
            <expenseChange.Icon className={`mt-0.5 h-4 w-4 shrink-0 ${expenseChange.color}`} />
            <span className={`text-xs font-medium leading-snug ${expenseChange.color}`}>
              {expenseChange.text}
            </span>
          </div>
        </div>

        {/* Income Section */}
        <div className="pl-4">
          <p className="text-xs text-slate-600 dark:text-slate-400">Pemasukan</p>
          <div className="mt-1 flex items-start gap-2">
            <incomeChange.Icon className={`mt-0.5 h-4 w-4 shrink-0 ${incomeChange.color}`} />
            <span className={`text-xs font-medium leading-snug ${incomeChange.color}`}>
              {incomeChange.text}
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
