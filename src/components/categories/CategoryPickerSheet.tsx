// ─── CategoryPickerSheet ──────────────────────────────────
// A bottom-sheet drawer for selecting a transaction category.
//
// Design decisions:
//   • Zero new dependencies — uses the same native bottom-sheet
//     pattern (fixed inset-0 → items-end → slide-in-from-bottom)
//     already established in TransactionModal and the mobile filter.
//   • Categories are rendered in a 3-column icon grid matching the
//     QuickChipGrid aesthetic (icon above label, rounded-xl).
//   • Uses getCategoryIcon() for consistent icon mapping across all views.
//   • Escape key + backdrop tap both close the sheet.
//   • Keyboard-friendly: focus trap via autoFocus on the search input.

"use client";

import { useEffect, useState, useMemo } from "react";
import { X, Search } from "lucide-react";
import { Category } from "@/types/models.types";
import { getCategoryIcon } from "@/lib/utils/icons";

interface CategoryPickerSheetProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  selectedCategoryId: string;
  onSelect: (categoryId: string) => void;
}

export function CategoryPickerSheet({
  isOpen,
  onClose,
  categories,
  selectedCategoryId,
  onSelect,
}: CategoryPickerSheetProps) {
  const [query, setQuery] = useState("");

  // Reset search when sheet opens
  useEffect(() => {
    if (isOpen) setQuery("");
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  const filtered = useMemo(() => {
    if (!query.trim()) return categories;
    const q = query.toLowerCase().trim();
    return categories.filter((c) => c.name.toLowerCase().includes(q));
  }, [categories, query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Pilih Kategori"
        className="relative z-10 w-full max-h-[75vh] flex flex-col animate-in slide-in-from-bottom-8 duration-300 rounded-t-2xl border-t border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="h-1 w-10 rounded-full bg-slate-200 dark:bg-slate-700" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-3 pt-1 shrink-0">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            Pilih Kategori
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300 transition-colors"
            aria-label="Tutup"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 pb-3 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600 pointer-events-none" />
            <input
              type="text"
              autoFocus
              placeholder="Cari kategori..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-600"
            />
          </div>
        </div>

        {/* Category grid — scrollable */}
        <div className="overflow-y-auto px-5 pb-8">
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-600 dark:text-slate-400">
              Tidak ada kategori yang cocok.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {filtered.map((cat) => {
                const isActive = cat.clientId === selectedCategoryId;
                return (
                  <button
                    key={cat.clientId}
                    type="button"
                    onClick={() => {
                      onSelect(cat.clientId);
                      onClose();
                    }}
                    aria-pressed={isActive}
                    aria-label={cat.name}
                    className={[
                      "flex min-h-[64px] flex-col items-center justify-center gap-1.5",
                      "rounded-xl border px-2 py-3 text-[11px] font-medium",
                      "transition-all duration-150 active:scale-95",
                      isActive
                        ? "border-indigo-300 bg-indigo-50 text-indigo-700 shadow-sm dark:border-indigo-700/60 dark:bg-indigo-950/40 dark:text-indigo-300"
                        : "border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-indigo-800/60 dark:hover:bg-indigo-950/30 dark:hover:text-indigo-300",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "flex h-8 w-8 items-center justify-center rounded-full",
                        isActive
                          ? "bg-indigo-100 dark:bg-indigo-900/50"
                          : "bg-slate-100 dark:bg-slate-800",
                      ].join(" ")}
                    >
                      {getCategoryIcon(
                        cat.name,
                        "h-4 w-4",
                        isActive ? (cat.color ?? "#6366f1") : (cat.color ?? undefined)
                      )}
                    </span>
                    <span className="leading-tight text-center line-clamp-2">
                      {cat.name}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
