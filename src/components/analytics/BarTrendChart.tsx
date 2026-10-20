/*
 * File: src/components/analytics/BarTrendChart.tsx
 * Description: Grafik tren batang harian dengan pendekatan behavioral nudging (membedakan warna batang yang melebihi batas rata-rata harian aman).
 */

"use client";

import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell,
} from "recharts";

export interface BarDay {
  label: string;
  income: number;
  expense: number;
  movingAvg?: number;
}

interface BarTrendChartProps {
  data: BarDay[];
  /** Rata-rata aman harian — digambarkan sebagai garis referensi putus-putus */
  dailyAvg?: number;
  /** Mode tampilan data aktif (pengeluaran atau pemasukan) */
  mode?: "expense" | "income";
}

/********** [START: Fungsi Pemformatan Angka Sumbu dan Tooltip] **********/
/* Pemformat ringkas angka sumbu Y */
function formatY(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}jt`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}rb`;
  return String(value);
}

/* Pemformat ringkas mata uang Rupiah */
function fmtRp(v: number): string {
  if (v >= 1_000_000) return `Rp ${(v / 1_000_000).toFixed(2)}jt`;
  if (v >= 1_000) return `Rp ${(v / 1_000).toFixed(0)}rb`;
  return `Rp ${v}`;
}
/********** [END: Fungsi Pemformatan Angka Sumbu dan Tooltip] **********/

/* Komponen tooltip kustom dengan kontras tinggi */
function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color?: string; fill?: string }[];
  label?: string;
  dailyAvg?: number;
  mode?: "expense" | "income";
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-xl dark:border-slate-700 dark:bg-slate-800">
      <p className="mb-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
        {label}
      </p>
      {payload.map((p, i) => {
        let labelName = p.name === "income" ? "Pemasukan" : "Pengeluaran";
        if (p.name === "movingAvg") {
          labelName = "Tren (Moving Avg)";
        }
        return (
          <div key={i} className="flex items-center gap-2 text-xs mb-1">
            <span
              className="h-2 w-2 flex-shrink-0 rounded-full"
              style={{ background: p.color || p.fill }}
            />
            <span className="text-slate-600 dark:text-slate-400">
              {labelName}:
            </span>
            <span className="font-bold text-slate-900 dark:text-slate-50">
              {fmtRp(p.value)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/********** Token Warna Batang & Garis Grafik **********/
const EXPENSE_BAR = "#f43f5e";
const INCOME_BAR = "#10b981";

/**
 * Merender grafik batang tren pengeluaran atau pemasukan harian dengan
 * garis tren rata-rata bergerak (Moving Average).
 *
 * @param props - Properti konfigurasi grafik tren batang
 * @returns Elemen JSX grafik Recharts responsif
 */
export function BarTrendChart({ data, mode = "expense" }: BarTrendChartProps) {
  const isExpense = mode === "expense";

  /********** [START: Perenderan Grafik Tren Batang Recharts] **********/
  return (
    <ResponsiveContainer width="100%" height={220} minWidth={0} minHeight={0}>
      <ComposedChart
        data={data}
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
          content={<CustomTooltip />}
          cursor={{ fill: "rgba(99,102,241,0.06)" }}
        />

        {/* Batang berdasarkan mode pengeluaran atau pemasukan */}
        {isExpense ? (
          <Bar dataKey="expense" name="expense" fill={EXPENSE_BAR} fillOpacity={0.7} radius={[4, 4, 0, 0]} maxBarSize={32} />
        ) : (
          <Bar dataKey="income" name="income" fill={INCOME_BAR} fillOpacity={0.7} radius={[4, 4, 0, 0]} maxBarSize={32} />
        )}

        {/* Garis tren Moving Average dinamis */}
        <Line
          type="monotone"
          dataKey="movingAvg"
          name="movingAvg"
          stroke={isExpense ? "#6366f1" : "#059669"}
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 4, strokeWidth: 1 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
  /********** [END: Perenderan Grafik Tren Batang Recharts] **********/
}
