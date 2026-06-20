"use client";

/********** Imports **********/
import { useState, useMemo } from "react";
import {
  TrendingDown, TrendingUp, Minus,
  AlertTriangle, CheckCircle2, Info,
  ArrowRight, BarChart2, Lightbulb,
  ChevronRight, ShieldCheck, PieChart,
  ArrowUpRight, ArrowDownRight, Activity
} from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import "dayjs/locale/id";

dayjs.locale("id");

import { formatCurrency, formatCurrencyCompact } from "@/lib/utils/helpers";
import { AnalyticsTimeFilter } from "@/components/analytics/AnalyticsTimeFilter";
import { useTimeFilter } from "@/providers/TimeFilterProvider";
import { useAnalytics } from "@/hooks/use-analytics";
import { NudgeInsight, NudgeSeverity } from "@/lib/nudging";
import { CategoryDrilldownDrawer } from "@/components/analytics/CategoryDrilldownDrawer";
import { filterByDateRange } from "@/lib/utils/time-filter";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { CompactSummaryRow } from "@/components/ui/CompactSummaryRow";

/********** Lazy Chart Imports **********/
const DonutChart = dynamic(
  () => import("@/components/ui/DonutChart").then((m) => ({ default: m.DonutChart })),
  { ssr: false, loading: () => <ChartSkeleton h={240} /> }
);
const BarTrendChart = dynamic(
  () => import("@/components/analytics/BarTrendChart").then((m) => ({ default: m.BarTrendChart })),
  { ssr: false, loading: () => <ChartSkeleton h={220} /> }
);

/********** Render Helpers **********/

/**
 * Renders a loading skeleton for charts.
 */
function ChartSkeleton({ h = 200 }: { h?: number }) {
  return (
    <div
      className="flex w-full animate-pulse items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800"
      style={{ height: h }}
    >
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-300 border-t-transparent" />
    </div>
  );
}

/**
 * Renders an individual insight or recommendation card.
 */
function InsightCard({ insight, isPrimary }: { insight: NudgeInsight; isPrimary?: boolean }) {
  const router = useRouter();

  const styles: Record<NudgeSeverity, {
    wrapper: string; icon: React.ReactNode; titleColor: string; bodyColor: string; ctaBg: string; linkColor: string;
  }> = {
    warning: {
      wrapper: "border-amber-200 bg-white dark:border-amber-500/30 dark:bg-slate-900",
      icon: <AlertTriangle className={`${isPrimary ? 'h-5 w-5' : 'h-4 w-4'} shrink-0 text-amber-500 mt-0.5`} />,
      titleColor: "text-slate-900 dark:text-slate-50",
      bodyColor: "text-slate-600 dark:text-slate-400",
      ctaBg: "bg-indigo-600 text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400",
      linkColor: "text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
    },
    critical: {
      wrapper: "border-rose-200 bg-white dark:border-rose-500/30 dark:bg-slate-900",
      icon: <AlertTriangle className={`${isPrimary ? 'h-5 w-5' : 'h-4 w-4'} shrink-0 text-rose-500 mt-0.5`} />,
      titleColor: "text-slate-900 dark:text-slate-50",
      bodyColor: "text-slate-600 dark:text-slate-400",
      ctaBg: "bg-indigo-600 text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400",
      linkColor: "text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
    },
    positive: {
      wrapper: "border-emerald-200 bg-white dark:border-emerald-500/30 dark:bg-slate-900",
      icon: <CheckCircle2 className={`${isPrimary ? 'h-5 w-5' : 'h-4 w-4'} shrink-0 text-emerald-500 mt-0.5`} />,
      titleColor: "text-slate-900 dark:text-slate-50",
      bodyColor: "text-slate-600 dark:text-slate-400",
      ctaBg: "bg-indigo-600 text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400",
      linkColor: "text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
    },
    neutral: {
      wrapper: "border-slate-200 bg-white dark:border-slate-700/60 dark:bg-slate-900",
      icon: <Info className={`${isPrimary ? 'h-5 w-5' : 'h-4 w-4'} shrink-0 text-cyan-500 mt-0.5`} />,
      titleColor: "text-slate-900 dark:text-slate-50",
      bodyColor: "text-slate-600 dark:text-slate-400",
      ctaBg: "bg-indigo-600 text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400",
      linkColor: "text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
    },
    info: {
      wrapper: "border-blue-200 bg-white dark:border-blue-500/30 dark:bg-slate-900",
      icon: <Info className={`${isPrimary ? 'h-5 w-5' : 'h-4 w-4'} shrink-0 text-blue-500 mt-0.5`} />,
      titleColor: "text-slate-900 dark:text-slate-50",
      bodyColor: "text-slate-600 dark:text-slate-400",
      ctaBg: "bg-indigo-600 text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400",
      linkColor: "text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
    },
  };

  const s = styles[insight.severity];

  if (isPrimary) {
    return (
      <div className={`rounded-xl border p-5 shadow-sm transition-all ${s.wrapper}`}>
        <div className="flex items-start gap-3.5">
          {s.icon}
          <div className="flex-1 min-w-0">
            <p className={`text-base font-bold ${s.titleColor}`}>{insight.title}</p>
            <p className={`mt-1.5 text-sm leading-relaxed ${s.bodyColor}`}>{insight.body}</p>
            <button
              onClick={() => router.push(insight.ctaRoute)}
              className={`mt-4 inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold shadow-sm transition-all active:scale-95 ${s.ctaBg}`}
            >
              {insight.ctaLabel}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-lg border p-3.5 transition-all ${s.wrapper}`}>
      <div className="flex items-start gap-2.5">
        {s.icon}
        <div className="flex-1 min-w-0">
          <p className={`text-sm md:text-base font-bold ${s.titleColor}`}>{insight.title}</p>
          <p className={`mt-1 text-sm leading-relaxed ${s.bodyColor}`}>{insight.body}</p>
          <button
            onClick={() => router.push(insight.ctaRoute)}
            className={`mt-2.5 inline-flex items-center gap-1.5 text-sm font-semibold hover:underline ${s.linkColor}`}
          >
            {insight.ctaLabel}
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Renders the top panel showing AI-driven financial insights and recommendations.
 * Sorts insights by severity before rendering.
 */
function InsightsPanel({ insights, isLoading, hasData }: { insights: NudgeInsight[]; isLoading: boolean; hasData: boolean }) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Sort insights by severity
  const severityScore: Record<NudgeSeverity, number> = { critical: 3, warning: 2, positive: 1, neutral: 0, info: -1 };
  const sortedInsights = [...insights].sort((a, b) => severityScore[b.severity] - severityScore[a.severity]);

  const criticalInsights = sortedInsights.filter(i => i.severity === 'critical');
  const otherInsights = sortedInsights.filter(i => i.severity !== 'critical');
  
  const visibleOtherCount = Math.max(0, 3 - criticalInsights.length);
  const defaultVisible = [...criticalInsights, ...otherInsights.slice(0, visibleOtherCount)];
  const hiddenCount = otherInsights.length - visibleOtherCount;

  const visibleInsights = isExpanded ? sortedInsights : defaultVisible;

  const primary = visibleInsights[0];
  const secondary = visibleInsights.slice(1);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Lightbulb className="h-5 w-5 text-amber-500" />
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">
          Insight & Rekomendasi
        </h2>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <div className="h-32 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="h-20 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800/50" />
            <div className="h-20 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800/50" />
          </div>
        </div>
      ) : sortedInsights.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 py-10 px-4 text-center dark:border-slate-800 dark:bg-slate-900/50">
          {hasData ? (
            <>
              <ShieldCheck className="mb-3 h-10 w-10 text-emerald-500 opacity-80" />
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Keuangan terlihat stabil</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-[280px]">
                Belum ada pola berisiko pada periode ini.
              </p>
            </>
          ) : (
            <>
              <BarChart2 className="mb-3 h-10 w-10 text-slate-300 dark:text-slate-700" />
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Belum ada rekomendasi</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-[280px]">
                Tambahkan lebih banyak transaksi agar Moneta dapat membaca pola keuanganmu.
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <InsightCard insight={primary} isPrimary={true} />
          {secondary.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {secondary.map((insight, i) => (
                <InsightCard key={i} insight={insight} />
              ))}
            </div>
          )}
          {hiddenCount > 0 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-full mt-2 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              {isExpanded ? 'Sembunyikan' : `Lihat ${hiddenCount} insight lainnya...`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/********** Page Component **********/
export default function AnalyticsPage() {
  /********** State **********/
  const { comparison, rangeKey, customDates } = useTimeFilter();
  const [activeSegment, setActiveSegment] = useState<"EXPENSE" | "INCOME">("EXPENSE");
  
  /********** Drawer state. */
  const [selectedCategory, setSelectedCategory] = useState<{
    categoryId: string;
    name: string;
    icon?: string | null;
    color?: string | null;
    totalAmount?: number;
    percentage?: number;
  } | null>(null);

  const {
    isLoading,
    current,
    prev,
    donutData,
    barData,
    dailyAvg,
    nudgeInsights,
    allTxns
  } = useAnalytics(activeSegment);

  /********** Derived State **********/
  
  /********** Derive transactions for the category drilldown drawer. */
  const drawerTransactions = useMemo(() => {
    if (!selectedCategory) return [];
    return filterByDateRange(allTxns, comparison.currentPeriod).filter(
      (t) => t.categoryId === selectedCategory.categoryId && t.type === activeSegment
    );
  }, [allTxns, comparison.currentPeriod, selectedCategory, activeSegment]);

  /********** Generate a readable text summary of the active time filter. */
  const activeSummaryText = useMemo(() => {
    const timeLabels: Record<string, string> = { "7d": "7 Hari Terakhir", "month": "Bulan Ini", "3month": "3 Bulan Terakhir", "year": "Tahun Ini" };
    let timeLabel = rangeKey === 'custom' ? 'Rentang khusus' : timeLabels[rangeKey];
    let dateStr = "";

    if (rangeKey === "custom" && customDates) {
      const start = dayjs(customDates.start).format("D MMM YYYY");
      const end = dayjs(customDates.end).format("D MMM YYYY");
      dateStr = `${start} - ${end}`;
    } else {
      const start = dayjs(comparison.currentPeriod.start).format("D MMM");
      const end = dayjs(comparison.currentPeriod.end).format("D MMM YYYY");
      dateStr = `${start} - ${end}`;
    }
    
    return `${timeLabel} • ${dateStr}`;
  }, [rangeKey, customDates, comparison.currentPeriod]);

  /********** Dynamic titles based on active segment. */
  const trendTitle = activeSegment === "EXPENSE" ? "Tren Pengeluaran" : "Tren Pemasukan";
  const donutTitle = activeSegment === "EXPENSE" ? "Distribusi Pengeluaran" : "Distribusi Pemasukan";

  /********** Rendering **********/
  return (
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-50 sm:text-2xl">
          Analisis Keuangan
        </h1>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
          Ringkasan dan pola keuangan berdasarkan transaksi tersimpan
        </p>
      </div>

      <div>
        <AnalyticsTimeFilter />
        <p className="mt-2.5 text-sm font-medium text-slate-500 dark:text-slate-400">
          {activeSummaryText}
        </p>
      </div>


      {isLoading ? (
        <div className="rounded-xl border border-slate-200 bg-white py-3 shadow-sm sm:border-none sm:bg-transparent sm:py-0 sm:shadow-none dark:border-slate-800 dark:bg-slate-900">
          <div className="grid grid-cols-3 divide-x divide-slate-100 sm:gap-4 sm:divide-none dark:divide-slate-800">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-slate-100 mx-3 sm:mx-0 sm:h-28 sm:rounded-xl dark:bg-slate-800" />
            ))}
          </div>
        </div>
      ) : (
        <CompactSummaryRow 
          metrics={[
            {
              label: "Total Pemasukan",
              compactLabel: "Pemasukan",
              value: current.income,
              previousValue: prev.income,
              isCost: false,
              comparisonLabel: comparison.comparisonLabel,
              icon: <ArrowUpRight className="h-3.5 w-3.5" />
            },
            {
              label: "Total Pengeluaran",
              compactLabel: "Pengeluaran",
              value: current.expense,
              previousValue: prev.expense,
              isCost: true,
              comparisonLabel: comparison.comparisonLabel,
              icon: <ArrowDownRight className="h-3.5 w-3.5" />
            },
            {
              label: "Selisih Bersih",
              compactLabel: "Selisih",
              value: current.net,
              previousValue: prev.net,
              isCost: false,
              isNegative: current.net < 0,
              comparisonLabel: comparison.comparisonLabel,
              icon: <Activity className="h-3.5 w-3.5" />
            }
          ]}
        />
      )}


      <InsightsPanel insights={nudgeInsights} isLoading={isLoading} hasData={allTxns.length > 0} />

      <hr className="border-slate-200 dark:border-slate-800" />


      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <PieChart className="h-5 w-5 text-indigo-500" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">
            Detail Analisis
          </h2>
        </div>

        <SegmentedControl
          options={[
            { value: "EXPENSE", label: "Pengeluaran", icon: <TrendingDown className="h-4 w-4" /> },
            { value: "INCOME", label: "Pemasukan", icon: <TrendingUp className="h-4 w-4" /> },
          ]}
          value={activeSegment}
          onChange={(val) => setActiveSegment(val as "EXPENSE" | "INCOME")}
          fullWidth
        />
      </div>


      <div className="rounded-xl border border-slate-100 bg-white p-5 sm:p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4">
          <p className="text-base font-bold text-slate-800 dark:text-slate-100">
            {trendTitle}
          </p>
        </div>

        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-xs md:text-sm text-slate-400">
            <span className="flex items-center gap-1">
              <span className={`inline-block h-2 w-2 rounded-full ${activeSegment === "EXPENSE" ? "bg-slate-400" : "bg-emerald-500"}`} />
              {activeSegment === "EXPENSE" ? "Di bawah rata-rata" : "Pemasukan harian"}
            </span>
            {activeSegment === "EXPENSE" && (
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
                Melewati rata-rata
              </span>
            )}
          </div>
          {activeSegment === "EXPENSE" && dailyAvg > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="h-px w-5 border-t-2 border-dashed border-amber-500" />
              <span className="text-xs md:text-sm font-semibold text-amber-600 dark:text-amber-400">
                Rata-rata: {formatCurrency(dailyAvg)}/hari
              </span>
            </div>
          )}
        </div>

        {isLoading ? (
          <ChartSkeleton h={280} />
        ) : (
          <BarTrendChart data={barData} dailyAvg={dailyAvg} mode={activeSegment.toLowerCase() as "expense" | "income"} />
        )}
      </div>


      <div className="rounded-xl border border-slate-100 bg-white shadow-sm overflow-hidden dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-100 px-5 sm:px-6 py-4 sm:py-5 dark:border-slate-800">
          <p className="text-base font-bold text-slate-800 dark:text-slate-100">
            {donutTitle}
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
            <ChartSkeleton h={240} />
            <div className="space-y-4">
              {[1, 2, 3, 4].map(i => <div key={i} className="h-12 w-full animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />)}
            </div>
          </div>
        ) : donutData.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-10">
            <PieChart className="mb-3 h-10 w-10 text-slate-300 dark:text-slate-700" />
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Belum ada data distribusi</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-[40%_60%] items-center divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-slate-800">
            {/* Donut Chart Side */}
            <div className="p-6 flex w-full flex-col items-center justify-center min-h-[280px]">
              <DonutChart 
                data={donutData} 
                showLegend={false}
                onSliceClick={(slice) => {
                  if ((slice as any).categoryId) {
                    setSelectedCategory({
                      categoryId: (slice as any).categoryId,
                      name: (slice as any).name,
                      icon: (slice as any).icon,
                      color: (slice as any).color,
                      totalAmount: slice.value,
                      percentage: slice.percentage,
                    });
                  }
                }}
              />
              <div className="text-center mt-4">
                <p className="text-xs md:text-sm uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">TOTAL</p>
                <p className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-50 mt-0.5">
                  {formatCurrency(current[activeSegment.toLowerCase() as "expense" | "income"])}
                </p>
              </div>
            </div>

            {/* Category List Side */}
            <div className="divide-y divide-slate-100 dark:divide-slate-800/60 max-h-[380px] overflow-y-auto">
              {donutData.map((slice, i) => (
                <button
                  key={i}
                  onClick={() => {
                    if (slice.categoryId) {
                      setSelectedCategory({
                        categoryId: slice.categoryId,
                        name: slice.name,
                        icon: slice.icon,
                        color: slice.color,
                        totalAmount: slice.value,
                        percentage: slice.percentage,
                      });
                    }
                  }}
                  className="group flex w-full items-center gap-4 px-5 py-4 text-left cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 active:scale-[0.99]"
                >
                  <span
                    className="h-3.5 w-3.5 shrink-0 rounded-full shadow-sm ring-2 ring-white dark:ring-slate-900"
                    style={{ background: slice.fill }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm md:text-base font-bold text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {slice.name}
                      </p>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="text-sm md:text-base font-bold text-slate-900 dark:text-slate-50">
                          {formatCurrency(slice.value)}
                        </span>
                        <span className="w-10 text-right text-xs md:text-sm font-medium text-slate-400">{slice.percentage}%</span>
                        <ChevronRight className="h-4 w-4 text-slate-300 opacity-0 transition-all -ml-2 group-hover:opacity-100 group-hover:translate-x-1 dark:text-slate-600" />
                      </div>
                    </div>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800/60">
                      <div
                        className="h-full rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${slice.percentage}%`, background: slice.fill }}
                      />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>


      <CategoryDrilldownDrawer
        isOpen={!!selectedCategory}
        onClose={() => setSelectedCategory(null)}
        transactions={drawerTransactions}
        categoryName={selectedCategory?.name || ""}
        categoryIcon={selectedCategory?.icon}
        categoryColor={selectedCategory?.color}
        totalAmount={selectedCategory?.totalAmount}
        percentage={selectedCategory?.percentage}
        activePeriod={activeSummaryText}
        activeSegment={activeSegment === "EXPENSE" ? "Pengeluaran" : "Pemasukan"}
      />
    </div>
  );
}
