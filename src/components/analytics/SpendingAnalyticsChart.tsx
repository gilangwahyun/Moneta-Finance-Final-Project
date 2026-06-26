"use client";

import { useMemo, useState } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useTransactions } from "@/hooks/use-transactions";
import { useCategories } from "@/hooks/use-categories";
import { formatCurrency } from "@/lib/utils/helpers";
import { getStartOfDay, getEndOfDay } from "@/lib/utils/date-utils";

type ChartView = "CATEGORY" | "TREND";

const COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#f59e0b", "#10b981", "#14b8a6", "#0ea5e9"];

export function SpendingAnalyticsChart() {
  const { transactions } = useTransactions();
  const { allCategories } = useCategories();
  const [view, setView] = useState<ChartView>("CATEGORY");

  // Shared: Current Month boundaries for Category view
  const currentMonthData = useMemo(() => {
    const now = new Date();
    const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    
    const expenses = transactions.filter(t => t.type === "EXPENSE" && t.date.startsWith(currentPeriod));
    
    // Group by Category
    const grouped = expenses.reduce((acc, t) => {
      const catId = t.categoryId || "unknown";
      acc[catId] = (acc[catId] || 0) + Number(t.amount);
      return acc;
    }, {} as Record<string, number>);

    let total = 0;
    const data = Object.entries(grouped)
      .map(([catId, amount], idx) => {
        const cat = allCategories.find(c => c.clientId === catId || c.id === catId);
        total += amount;
        return {
          name: cat?.name || "Lainnya",
          value: amount,
          fill: COLORS[idx % COLORS.length]
        };
      })
      .sort((a, b) => b.value - a.value);

    return { data, total };
  }, [transactions, allCategories]);

  // Last 7 Days for Trend View
  const trendData = useMemo(() => {
    const now = new Date();
    const data = [];
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const start = getStartOfDay(d).getTime();
      const end = getEndOfDay(d).getTime();
      
      const dayName = new Intl.DateTimeFormat("id-ID", { weekday: "short" }).format(d);
      
      const dayTotal = transactions.reduce((sum, t) => {
        const tTime = new Date(t.date).getTime();
        if (t.type === "EXPENSE" && tTime >= start && tTime <= end) {
          return sum + Number(t.amount);
        }
        return sum;
      }, 0);

      data.push({
        name: dayName,
        value: dayTotal
      });
    }
    
    return data;
  }, [transactions]);

  // Custom Tooltip for Recharts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">{label || payload[0].name}</p>
          <p className="text-sm font-bold text-slate-900 dark:text-white">
            {formatCurrency(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800/50 dark:bg-slate-900">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
          Analisis Pengeluaran
        </h2>
        
        <div className="flex rounded-lg border border-slate-200 p-1 dark:border-slate-700">
          <button 
            onClick={() => setView("CATEGORY")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${view === "CATEGORY" ? "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white" : "text-slate-600 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"}`}
          >
            Kategori
          </button>
          <button 
            onClick={() => setView("TREND")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${view === "TREND" ? "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white" : "text-slate-600 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"}`}
          >
            Tren
          </button>
        </div>
      </div>

      <div className="h-64 w-full relative">
        {view === "CATEGORY" ? (
          currentMonthData.data.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <PieChart>
                  <Pie
                    data={currentMonthData.data}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {currentMonthData.data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Total Pengeluaran</span>
                <span className="text-lg font-bold text-slate-900 dark:text-white">
                  {formatCurrency(currentMonthData.total)}
                </span>
              </div>
            </>
          ) : (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-slate-600">Belum ada pengeluaran bulan ini</p>
            </div>
          )
        ) : (
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <BarChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} tickFormatter={(val) => `Rp${val/1000}k`} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
              <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
