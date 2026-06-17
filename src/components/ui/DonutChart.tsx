/********** Imports **********/
"use client";

import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
} from "recharts";

/********** Types **********/
export interface DonutSlice {
  name: string;
  value: number;
  percentage: number;
  fill: string;
  /** Optional: spending as % of the category's monthly budget (0-100+) */
  budgetSpentPct?: number;
}

interface DonutChartProps {
  data: DonutSlice[];
  onSliceClick?: (slice: DonutSlice) => void;
  showLegend?: boolean;
}

/********** Helpers **********/
/**
 * Formats a numeric amount into a compact Indonesian Rupiah string.
 *
 * @param v - The numeric value to format.
 * @returns A compact string representation (e.g., "Rp 1.5jt").
 */
function fmtAmt(v: number): string {
  if (v >= 1_000_000) return `Rp ${(v / 1_000_000).toFixed(1)}jt`;
  if (v >= 1_000) return `Rp ${(v / 1_000).toFixed(0)}rb`;
  return `Rp ${v}`;
}

/********** Component **********/
/**
 * Renders a custom tooltip for the donut chart.
 */
function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { name: string; value: number; payload: DonutSlice }[];
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-xl dark:border-slate-700 dark:bg-slate-800">
      <div className="mb-1.5 flex items-center gap-2">
        <span
          className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
          style={{ background: d.fill }}
        />
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          {d.name}
        </p>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        {fmtAmt(d.value)}&nbsp;&middot;&nbsp;{d.percentage}%
      </p>
      {d.budgetSpentPct !== undefined && (
        <p
          className={`mt-1 text-[10px] font-medium ${
            d.budgetSpentPct >= 100
              ? "text-rose-500 dark:text-rose-400"
              : d.budgetSpentPct >= 80
              ? "text-amber-500 dark:text-amber-400"
              : "text-emerald-500 dark:text-emerald-400"
          }`}
        >
          {d.budgetSpentPct.toFixed(0)}% dari anggaran
        </p>
      )}
    </div>
  );
}

/**
 * Renders a mini progress bar for budget utilization in the chart legend.
 */
function BudgetMiniBar({ pct }: { pct: number }) {
  const capped = Math.min(pct, 100);
  /********** Warning: amber-500 when spending > 80% of budget. Critical: rose-500 when >= 100% */
  let barColor = "bg-indigo-500";
  if (pct >= 100) barColor = "bg-rose-500";
  else if (pct >= 80) barColor = "bg-amber-500";

  return (
    <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
      <div
        className={`h-full rounded-full transition-all duration-500 ${barColor}`}
        style={{ width: `${capped}%` }}
      />
    </div>
  );
}

/**
 * Renders a responsive donut chart with an optional interactive legend.
 *
 * Provides a side-by-side layout on desktop and stacks vertically on mobile.
 * Includes mini budget progress bars in the legend when budget data is provided.
 *
 * @param props - Configuration and data for the donut chart.
 * @returns A Recharts-based donut chart component.
 */
export function DonutChart({ data, onSliceClick, showLegend = true }: DonutChartProps) {
  const total = data.reduce((s, d) => s + d.value, 0);

  /********** Render **********/
  return (
    <div className="flex w-full flex-col gap-5 md:flex-row md:items-start md:gap-6">

      {/* Chart Section */}
      <div className="relative h-56 w-full shrink-0 md:h-64 md:w-[220px]">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius="56%"
              outerRadius="80%"
              paddingAngle={2}
              dataKey="value"
              strokeWidth={0}
            >
              {data.map((entry, i) => (
                <Cell 
                  key={i} 
                  fill={entry.fill} 
                  onClick={() => onSliceClick?.(entry)}
                  className={onSliceClick ? "cursor-pointer" : ""}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        {/* Center label */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Total
          </p>
          <p className="text-base font-bold text-slate-800 dark:text-slate-100">
            {fmtAmt(total)}
          </p>
        </div>
      </div>

      {/* Legend Section */}
      {showLegend && (
        <div className="flex flex-1 flex-col gap-2.5 md:gap-3">
          {data.map((d, i) => {
            const hasBudget =
              d.budgetSpentPct !== undefined && d.budgetSpentPct > 0;
            const isWarning =
              d.budgetSpentPct !== undefined && d.budgetSpentPct >= 80;
            const isOver =
              d.budgetSpentPct !== undefined && d.budgetSpentPct >= 100;

            return (
              <div 
                key={i} 
                className={`group ${onSliceClick ? "cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg p-1 -m-1" : ""}`}
                onClick={() => onSliceClick?.(d)}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                    style={{ background: d.fill }}
                  />
                  <div className="flex min-w-0 flex-1 items-baseline justify-between gap-1">
                    <p className="truncate text-xs font-medium text-slate-700 dark:text-slate-300">
                      {d.name}
                    </p>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                        {d.percentage}%
                      </span>
                      {isOver && (
                        <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-[9px] font-bold text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
                          Melebihi
                        </span>
                      )}
                      {!isOver && isWarning && (
                        <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
                          Mendekati
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {hasBudget && <BudgetMiniBar pct={d.budgetSpentPct!} />}
                <p className="mt-0.5 pl-5 text-[10px] text-slate-500 dark:text-slate-400">
                  {fmtAmt(d.value)}
                  {hasBudget &&
                    ` · ${d.budgetSpentPct!.toFixed(0)}% dari anggaran`}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
