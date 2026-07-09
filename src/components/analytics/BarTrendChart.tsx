/*
 * File: src/components/analytics/BarTrendChart.tsx
 * Description: Grafik tren batang harian dengan pendekatan behavioral nudging (membedakan warna batang yang melebihi batas rata-rata harian aman).
 */

"use client";

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
      <p className="mb-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
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

/********** Token Warna Batang Grafik **********/
/*
 * EXPENSE_SAFE: Warna slate-400 meredam secara visual hari-hari yang aman (dorongan tenang)
 * EXPENSE_OVER: Warna red-500 tegas untuk pengeluaran yang melewati rata-rata harian (peringatan)
 */
const EXPENSE_SAFE = "#94a3b8";
const EXPENSE_OVER = "#ef4444";
const INCOME_COLOR = "#10b981";

/**
 * Merender grafik batang tren pengeluaran atau pemasukan harian dengan indikator rata-rata harian.
 *
 * @param props - Properti konfigurasi grafik tren batang
 * @returns Elemen JSX grafik Recharts responsif
 */
export function BarTrendChart({ data, dailyAvg, mode = "expense" }: BarTrendChartProps) {
  const isExpense = mode === "expense";

  /********** [START: Perenderan Grafik Tren Batang Recharts] **********/
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

        {/* Garis referensi putus-putus batas rata-rata aman harian */}
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

        {/* Batang bersyarat berdasarkan mode pengeluaran atau pemasukan */}
        {isExpense ? (
          <Bar dataKey="expense" name="expense" radius={[4, 4, 0, 0]}>
            {data.map((entry, i) => {
              const isOver =
                dailyAvg !== undefined && entry.expense > dailyAvg;
              return (
                <Cell
                  key={i}
                  fill={isOver ? EXPENSE_OVER : EXPENSE_SAFE}
                  /* Opasitas penuh jika melebihi batas, sedikit diredam jika aman */
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
  /********** [END: Perenderan Grafik Tren Batang Recharts] **********/
}
