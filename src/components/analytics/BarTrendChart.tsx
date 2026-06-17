"use client";

// ─── BarTrendChart ───────────────────────────────────────
// Behavioral Nudging — Isolated Mode Chart (UX Fix v3):
//   - Mode Toggle: Renders only expense OR income to isolate Y-axis scaling
//   - barSize=32 for Fitts's Law mobile touch compliance
//   - Gridlines near-invisible (opacity 0.06)
//   - Per-bar Cell (Expense): rose-500 normal, red-500 when over avg

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell,
} from "recharts";

export interface BarDay {
  label: string;
  income: number;
  expense: number;
}

interface BarTrendChartProps {
  data: BarDay[];
  /** Daily safe average — drawn as dashed reference line */
  dailyAvg?: number;
  /** Active rendering mode */
  mode?: "expense" | "income";
}

// ── Y-axis compact formatter ─────────────────────────────
function formatY(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}jt`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}rb`;
  return String(value);
}

// ── Rp compact formatter ─────────────────────────────────
function fmtRp(v: number): string {
  if (v >= 1_000_000) return `Rp ${(v / 1_000_000).toFixed(2)}jt`;
  if (v >= 1_000) return `Rp ${(v / 1_000).toFixed(0)}rb`;
  return `Rp ${v}`;
}

// ── Custom tooltip (high-contrast, mobile-safe) ──────────
function CustomTooltip({
  active,
  payload,
  label,
  dailyAvg,
  mode,
}: {
  active?: boolean;
  payload?: { name: string; value: number; fill: string }[];
  label?: string;
  dailyAvg?: number;
  mode?: "expense" | "income";
}) {
  if (!active || !payload?.length) return null;
  const isExpense = mode === undefined || mode === "expense";
  const entry = payload[0];
  const isOverAvg =
    isExpense && dailyAvg !== undefined && (entry?.value ?? 0) > dailyAvg;

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-xl dark:border-slate-700 dark:bg-slate-800">
      <p className="mb-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
        {label}
      </p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 text-xs mb-1">
          <span
            className="h-2 w-2 flex-shrink-0 rounded-full"
            style={{ background: p.fill }}
          />
          <span className="text-slate-600 dark:text-slate-400">
            {p.name === "income" ? "Pemasukan" : "Pengeluaran"}:
          </span>
          <span className="font-bold text-slate-900 dark:text-slate-50">
            {fmtRp(p.value)}
          </span>
        </div>
      ))}
      {isOverAvg && (
        <p className="mt-1.5 text-[10px] font-medium text-rose-500 dark:text-rose-400">
          Melewati rata-rata harian
        </p>
      )}
    </div>
  );
}

// ── Bar color tokens ─────────────────────────────────────
// EXPENSE_SAFE: Muted slate-400 — safe days recede visually (calm nudge)
// EXPENSE_OVER: Solid red-500  — over daily avg, demands attention (loss-aversion)
const EXPENSE_SAFE = "#94a3b8"; // slate-400 — calm, under-limit days
const EXPENSE_OVER = "#ef4444"; // red-500   — over daily avg (bright warning)
const INCOME_COLOR = "#10b981"; // emerald-500

export function BarTrendChart({ data, dailyAvg, mode = "expense" }: BarTrendChartProps) {
  const isExpense = mode === "expense";

  return (
    <ResponsiveContainer width="100%" height={220} minWidth={0} minHeight={0}>
      <BarChart
        data={data}
        barSize={32}
        margin={{ top: 8, right: 4, bottom: 0, left: 0 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          vertical={false}
          stroke="#e2e8f0"
          strokeOpacity={0.06}
        />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          tickLine={false}
          axisLine={false}
          height={28}
        />
        <YAxis
          tickFormatter={formatY}
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          tickLine={false}
          axisLine={false}
          width={40}
        />
        <Tooltip
          content={<CustomTooltip dailyAvg={dailyAvg} mode={mode} />}
          cursor={{ fill: "rgba(99,102,241,0.06)" }}
        />

        {/* ── Visual Anchor: dashed daily-average reference line ── */}
        {isExpense && dailyAvg !== undefined && dailyAvg > 0 && (
          <ReferenceLine
            y={dailyAvg}
            stroke="#f59e0b"
            strokeDasharray="5 4"
            strokeWidth={1.5}
            label={{
              value: "Rata-rata Aman Harian",
              position: "insideTopRight",
              fontSize: 10,
              fill: "#f59e0b",
              fontWeight: 600,
              dy: -4,
            }}
          />
        )}

        {/* ── Conditional Bars ─────────────────────────────────── */}
        {isExpense ? (
          <Bar dataKey="expense" name="expense" radius={[4, 4, 0, 0]}>
            {data.map((entry, i) => {
              const isOver =
                dailyAvg !== undefined && entry.expense > dailyAvg;
              return (
                <Cell
                  key={i}
                  fill={isOver ? EXPENSE_OVER : EXPENSE_SAFE}
                  // Over-limit: full opacity for high attention; safe: slightly muted
                  opacity={isOver ? 1 : 0.75}
                />
              );
            })}
          </Bar>
        ) : (
          <Bar dataKey="income" name="income" radius={[4, 4, 0, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={INCOME_COLOR} />
            ))}
          </Bar>
        )}
      </BarChart>
    </ResponsiveContainer>
  );
}
