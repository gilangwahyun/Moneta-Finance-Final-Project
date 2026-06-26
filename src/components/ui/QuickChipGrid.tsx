/********** Imports **********/
"use client";

import {
  Coffee,
  ShoppingBag,
  Car,
  Utensils,
  Zap,
  HeartPulse,
} from "lucide-react";
import { Category } from "@/types/models.types";

/********** Types **********/
interface ChipDefinition {
  id: string;
  label: string;
  description: string;
  /** Normalized lowercase hint — matches category.name case-insensitively */
  categoryNameHint: string;
  Icon: React.FC<{ className?: string }>;
}

interface QuickChipGridProps {
  availableCategories: Category[];
  onSelect: (payload: { description: string; categoryId: string }) => void;
  selectedCategoryId: string;
}

/********** Constants **********/
export const EXPENSE_CHIPS: ChipDefinition[] = [
  {
    id: "makan",
    label: "Makan",
    description: "Makan siang",
    categoryNameHint: "makanan",
    Icon: Utensils,
  },
  {
    id: "nongkrong",
    label: "Nongkrong",
    description: "Nongkrong",
    categoryNameHint: "jajan",
    Icon: Coffee,
  },
  {
    id: "transportasi",
    label: "Transportasi",
    description: "Transportasi",
    categoryNameHint: "transportasi",
    Icon: Car,
  },
  {
    id: "belanja",
    label: "Belanja",
    description: "Belanja",
    categoryNameHint: "belanja",
    Icon: ShoppingBag,
  },
  {
    id: "tagihan",
    label: "Tagihan",
    description: "Bayar tagihan",
    categoryNameHint: "tagihan",
    Icon: Zap,
  },
  {
    id: "kesehatan",
    label: "Kesehatan",
    description: "Biaya kesehatan",
    categoryNameHint: "kesehatan",
    Icon: HeartPulse,
  },
];

/********** Helpers **********/
/**
 * Resolves a predefined chip category hint to an actual Category ID.
 *
 * Both hint and category name are normalized with toLowerCase().trim()
 * before comparison to prevent case/whitespace mismatches between chip
 * definitions and IndexedDB records.
 *
 * @param hint - The predefined category name hint.
 * @param categories - The list of available categories to search within.
 * @returns The matched category clientId or null if not found.
 */
export function resolveChipCategory(
  hint: string,
  categories: Category[]
): string | null {
  const normalizedHint = hint.toLowerCase().trim();

  const match = categories.find((c) => {
    const normalizedName = c.name.toLowerCase().trim();
    return (
      normalizedName.includes(normalizedHint) ||
      normalizedHint.includes(normalizedName)
    );
  });

  return match?.clientId ?? null;
}

/********** Component **********/
/**
 * Renders a horizontal scrollable row of quick selection chips for transaction entry.
 *
 * Disabled chips remain dimmed to signal the category hasn't been created yet.
 * 
 * @param props - Configuration and data for the grid.
 * @returns A UI component displaying quick-select chips.
 */
export function QuickChipGrid({
  availableCategories,
  onSelect,
  selectedCategoryId,
}: QuickChipGridProps) {
  /********** Render **********/
  return (
    <div>
      <p className="mb-2 text-xs font-medium text-slate-600 dark:text-slate-400">
        Pilihan cepat
      </p>
      {/* Single-line horizontal scroll on mobile; wraps on desktop — hide-scrollbar in globals.css */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 hide-scrollbar md:flex-wrap md:overflow-visible md:pb-0">
        {EXPENSE_CHIPS.map((chip) => {
          const categoryId = resolveChipCategory(
            chip.categoryNameHint,
            availableCategories
          );
          const isDisabled = !categoryId;
          const isActive = !isDisabled && categoryId === selectedCategoryId;

          return (
            <button
              key={chip.id}
              type="button"
              disabled={isDisabled}
              onClick={() => {
                if (!categoryId) return;
                onSelect({ description: chip.description, categoryId });
              }}
              aria-pressed={isActive}
              aria-label={
                isDisabled
                  ? `${chip.label} (kategori belum dibuat)`
                  : chip.label
              }
              className={[
                "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap",
                "rounded-full border px-3 py-1.5 text-xs font-medium",
                "transition-all duration-150 active:scale-95",
                isDisabled
                  ? "cursor-not-allowed border-slate-200/60 bg-slate-100 text-slate-600 dark:border-slate-800/40 dark:bg-slate-900 dark:text-slate-600"
                  : isActive
                  ? "border-indigo-200 bg-indigo-50 text-indigo-700 shadow-sm dark:border-indigo-800/60 dark:bg-indigo-950/40 dark:text-indigo-300"
                  : "border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-indigo-800/60 dark:hover:bg-indigo-950/40 dark:hover:text-indigo-300",
              ].join(" ")}
            >
              <chip.Icon className="h-3.5 w-3.5 shrink-0" />
              {chip.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
