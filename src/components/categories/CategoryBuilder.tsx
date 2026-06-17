// ─── CategoryBuilder ─────────────────────────────────────
// A full in-modal "Buat Kategori Baru" view.
//
// Design decisions:
//   • Completely self-contained — owns its own local state for
//     name, icon selection, and color selection only.
//   • Calls parent's createCategory() on save — the parent
//     (TransactionModal) then sets formCategoryId and switches
//     the view back. All transaction form state is preserved.
//   • Icon picker: 5-column scrollable grid of AVAILABLE_ICONS.
//   • Color picker: 8 predefined swatches — no color input needed.
//   • Accessible: aria-pressed on each icon/color tile.

"use client";

import { useState } from "react";
import { ArrowLeft, Check } from "lucide-react";
import { Category, CategoryType } from "@/types/models.types";
import { AddCategoryInput } from "@/hooks/use-categories";
import { AVAILABLE_ICONS } from "@/lib/available-icons";

// ─── Color swatches ──────────────────────────────────────
// Stored as hex strings in IndexedDB (category.color).

export const CATEGORY_COLORS = [
  { label: "Merah",    hex: "#ef4444" },
  { label: "Oranye",   hex: "#f97316" },
  { label: "Kuning",   hex: "#eab308" },
  { label: "Hijau",    hex: "#22c55e" },
  { label: "Toska",    hex: "#14b8a6" },
  { label: "Biru",     hex: "#3b82f6" },
  { label: "Ungu",     hex: "#8b5cf6" },
  { label: "Pink",     hex: "#ec4899" },
];

// ─── Props ───────────────────────────────────────────────

interface CategoryBuilderProps {
  /** Inherited from the transaction type — determines category.type */
  type: CategoryType;
  /** Called with the new category's clientId after successful save */
  onSave: (clientId: string) => void;
  /** Called when user cancels — switches view back to form */
  onCancel: () => void;
  /** Function to create category (passed from parent to maintain shared state) */
  onCreateCategory: (input: Omit<AddCategoryInput, "userId">) => Promise<Category | null>;
}

// ─── Component ───────────────────────────────────────────

export function CategoryBuilder({ type, onSave, onCancel, onCreateCategory }: CategoryBuilderProps) {

  const [name, setName]           = useState("");
  const [iconName, setIconName]   = useState(AVAILABLE_ICONS[0].name);
  const [color, setColor]         = useState(CATEGORY_COLORS[5].hex); // indigo blue default
  const [isSaving, setIsSaving]   = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const canSave = name.trim().length > 0 && !isSaving;

  // Find the currently-selected icon component for the live preview
  const selectedIconEntry = AVAILABLE_ICONS.find((i) => i.name === iconName) ?? AVAILABLE_ICONS[0];
  const PreviewIcon = selectedIconEntry.Icon;

  async function handleSave() {
    if (!canSave) return;
    setError(null);
    setIsSaving(true);

    try {
      // Use the parent's mutate function so state is shared
      const created = await onCreateCategory({
        name: name.trim(),
        type,
        icon: iconName,
        color,
      });

      if (created) {
        onSave(created.clientId);
      } else {
        setError("Gagal menyimpan kategori. Coba lagi.");
      }
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-5 px-5 py-4 animate-in fade-in slide-in-from-right-4 duration-200">

      {/* ── Header ───────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onCancel}
          aria-label="Kembali ke form transaksi"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            Buat Kategori Baru
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Tipe: {type === "INCOME" ? "Pemasukan" : "Pengeluaran"}
          </p>
        </div>

        {/* Live preview */}
        <div className="ml-auto flex flex-col items-center gap-1">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full shadow-sm"
            style={{ backgroundColor: color + "22", border: `2px solid ${color}` }}
          >
            <PreviewIcon className="h-5 w-5" style={{ color }} />
          </div>
          <span className="max-w-[48px] truncate text-center text-[9px] text-slate-400">
            {name || "Preview"}
          </span>
        </div>
      </div>

      {/* ── Name input ───────────────────────────────── */}
      <div>
        <label
          htmlFor="cat-builder-name"
          className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
        >
          Nama Kategori
        </label>
        <input
          id="cat-builder-name"
          type="text"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSave(); } }}
          placeholder="Contoh: Makan Siang"
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
        />
      </div>

      {/* ── Color picker ─────────────────────────────── */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Warna
        </p>
        <div className="flex flex-wrap gap-2">
          {CATEGORY_COLORS.map((c) => {
            const isSelected = c.hex === color;
            return (
              <button
                key={c.hex}
                type="button"
                aria-pressed={isSelected}
                aria-label={c.label}
                onClick={() => setColor(c.hex)}
                className={[
                  "relative h-8 w-8 rounded-full transition-transform duration-150 active:scale-90",
                  isSelected ? "ring-2 ring-offset-2 ring-slate-400 dark:ring-slate-500 scale-110" : "hover:scale-110",
                ].join(" ")}
                style={{ backgroundColor: c.hex }}
              >
                {isSelected && (
                  <Check
                    className="absolute inset-0 m-auto h-4 w-4 text-white drop-shadow"
                    strokeWidth={3}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Icon picker ──────────────────────────────── */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Ikon
        </p>
        {/* 5-column grid, max-height + scroll so it doesn't push CTA off-screen */}
        <div className="grid grid-cols-5 gap-2 max-h-[180px] overflow-y-auto pr-0.5">
          {AVAILABLE_ICONS.map((entry) => {
            const isSelected = entry.name === iconName;
            return (
              <button
                key={entry.name}
                type="button"
                aria-pressed={isSelected}
                aria-label={entry.label}
                onClick={() => setIconName(entry.name)}
                className={[
                  "flex flex-col items-center justify-center gap-1 rounded-xl border py-2.5 text-[9px] font-medium transition-all duration-150 active:scale-95",
                  isSelected
                    ? "border-transparent text-white shadow-sm"
                    : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:bg-slate-800",
                ].join(" ")}
                style={isSelected ? { backgroundColor: color, borderColor: color } : {}}
              >
                <entry.Icon className="h-4 w-4 shrink-0" />
                <span className="leading-tight truncate w-full text-center px-0.5">
                  {entry.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Error ────────────────────────────────────── */}
      {error && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600 dark:bg-rose-900/20 dark:text-rose-400">
          {error}
        </p>
      )}

      {/* ── Actions ──────────────────────────────────── */}
      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="min-h-[44px] rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition-all hover:bg-slate-50 active:scale-95 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          Batal
        </button>
        <button
          type="button"
          disabled={!canSave}
          onClick={handleSave}
          className="inline-flex flex-1 min-h-[44px] items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          style={{ backgroundColor: color }}
        >
          {isSaving ? (
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <>
              <Check className="h-4 w-4" strokeWidth={2.5} />
              Simpan Kategori
            </>
          )}
        </button>
      </div>
    </div>
  );
}
