/********** Imports **********/
"use client";

import React from "react";

/********** Types **********/
export interface SegmentOption<T extends string = string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
  count?: number;
}

interface SegmentedControlProps<T extends string = string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  fullWidth?: boolean;
  className?: string;
}

/********** Component **********/
/**
 * Renders a pill-style segmented control for filtering by type.
 *
 * Typically used on Categories, Transactions, and Analytics pages for 
 * top-level filtering (e.g., Expense vs Income).
 *
 * @param props - Configuration options for the segmented control.
 * @returns A segmented control component.
 */
export function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  fullWidth = false,
  className = "",
}: SegmentedControlProps<T>) {
  /********** Render **********/
  return (
    <div className={`overflow-x-auto scrollbar-hide max-w-full pb-2 pt-1 -mx-1 px-1 ${fullWidth ? "w-full" : ""}`}>
      <div
        role="group"
        aria-label="Pilih tipe"
        className={`inline-flex items-center gap-1.5 rounded-2xl bg-white/60 p-1.5 shadow-sm backdrop-blur-xl ring-1 ring-slate-200/60 dark:bg-slate-900/60 dark:ring-slate-800/60 ${fullWidth ? "w-full" : ""} ${className}`}
      >
      {options.map((opt) => {
        const isActive = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(opt.value)}
            className={`
              ${fullWidth ? "flex-1 min-w-[100px]" : ""}
              inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2
              text-sm font-semibold transition-all duration-300 ease-out active:scale-95 whitespace-nowrap shrink-0
              ${
                isActive
                  ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/20 dark:from-indigo-500 dark:to-purple-500"
                  : "text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-sm dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
              }
            `}
          >
            {opt.icon && (
              <span className="shrink-0 [&_svg]:h-4 [&_svg]:w-4">{opt.icon}</span>
            )}
            <span>{opt.label}</span>
            {opt.count !== undefined && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold transition-colors ${
                  isActive
                    ? "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400"
                    : "bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
                }`}
              >
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
      </div>
    </div>
  );
}
