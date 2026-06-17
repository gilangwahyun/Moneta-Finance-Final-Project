/********** Imports **********/
"use client";

import { ReactNode, useEffect, useId } from "react";
import { Check } from "lucide-react";

/********** Types **********/
export interface FilterOption<T extends string = string> {
  value: T;
  label: string;
  rightIcon?: ReactNode;
}

export interface FilterBottomSheetProps<T extends string = string> {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  headerRight?: ReactNode;
  options: FilterOption<T>[];
  value: T;
  onChange: (value: T) => void;
  desktopModal?: boolean;
  children?: ReactNode;
}

/********** Component **********/
/**
 * Renders a bottom sheet used for selecting filter options.
 *
 * On desktop, it can optionally render as a modal dialog instead of a bottom sheet.
 * Supports locking body scroll and closing on Escape key.
 *
 * @param props - Configuration properties for the filter sheet.
 * @returns A portal-based selection component.
 */
export function FilterBottomSheet<T extends string = string>({
  isOpen,
  onClose,
  title,
  headerRight,
  options,
  value,
  onChange,
  desktopModal = false,
  children,
}: FilterBottomSheetProps<T>) {
  
  /********** State **********/
  const titleId = useId();

  /********** Effects **********/
  useEffect(() => {
    if (!isOpen) return;

    /********** Lock body scroll while open. */
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = "hidden";

    /********** Close on Escape key press. */
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = originalStyle;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  /********** Render **********/
  return (
    <div
      className={`fixed inset-0 z-[150] flex items-end justify-center ${
        desktopModal ? "md:items-start md:pt-32" : ""
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`relative z-10 w-full max-w-sm animate-in slide-in-from-bottom-full duration-200 bg-white px-5 pb-8 pt-4 dark:bg-slate-900 shadow-2xl ${
          desktopModal ? "md:slide-in-from-top-4 rounded-t-2xl md:rounded-2xl" : "rounded-t-2xl"
        }`}
      >
        <div className={`mx-auto mb-5 h-1.5 w-12 rounded-full bg-slate-200 dark:bg-slate-700 ${desktopModal ? "md:hidden" : ""}`} />
        
        <div className="flex items-center justify-between mb-4">
          <h3 id={titleId} className="text-sm font-bold text-slate-800 dark:text-slate-100">
            {title}
          </h3>
          {headerRight}
        </div>

        <div className="flex flex-col gap-2">
          {options.map((opt) => {
            const isActive = value === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => onChange(opt.value)}
                aria-pressed={isActive}
                className={`flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
                  isActive
                    ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400"
                    : "bg-slate-50 text-slate-700 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                }`}
              >
                <span className="flex items-center gap-2">{opt.label}</span>
                {isActive ? (
                  <Check className="h-4 w-4" />
                ) : (
                  opt.rightIcon
                )}
              </button>
            );
          })}
          {children}
        </div>
      </div>
    </div>
  );
}
