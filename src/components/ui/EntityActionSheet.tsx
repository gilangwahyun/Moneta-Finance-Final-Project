/********** Imports **********/
import React, { useEffect } from "react";
import { X, Pencil, Trash2 } from "lucide-react";

/********** Types **********/
interface EntityActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  title: string;
  subtitle?: string | React.ReactNode;
}

/********** Component **********/
/**
 * Renders a bottom sheet specifically formatted for entity actions (Edit/Delete).
 *
 * It is primarily used on mobile devices as an alternative to a popover menu.
 * Locks the body scroll while open.
 *
 * @param props - Configuration properties for the action sheet.
 * @returns A portal-based bottom sheet component or null if closed.
 */
export function EntityActionSheet({
  isOpen,
  onClose,
  onEdit,
  onDelete,
  title,
  subtitle
}: EntityActionSheetProps) {
  
  /********** Effects **********/
  useEffect(() => {
    /********** Prevent body scroll when open. */
    if (isOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  if (!isOpen) return null;

  /********** Render **********/
  return (
    <div className="fixed inset-0 z-[150] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity dark:bg-black/60" onClick={onClose} />
      
      <div className="relative z-10 w-full rounded-t-2xl border border-slate-200 bg-white shadow-2xl animate-in slide-in-from-bottom-10 duration-200 dark:border-slate-800 dark:bg-slate-900 sm:max-w-sm sm:rounded-2xl sm:slide-in-from-bottom-0 sm:fade-in flex flex-col">
        {/* Mobile drag handle indicator */}
        <div className="mx-auto mt-4 h-1.5 w-12 rounded-full bg-slate-200 dark:bg-slate-700 sm:hidden" />
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <div className="min-w-0 flex-1 pr-4">
            <h3 className="truncate text-base font-bold text-slate-900 dark:text-slate-50">{title}</h3>
            {subtitle && <div className="mt-0.5 truncate text-xs text-slate-600 dark:text-slate-400">{subtitle}</div>}
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300 transition-colors"
            aria-label="Tutup"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Actions */}
        <div className="p-3 space-y-1">
          <button
            onClick={() => { onClose(); onEdit(); }}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-left text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 active:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 dark:active:bg-slate-700"
          >
            <Pencil className="h-4 w-4 text-slate-600" />
            Ubah
          </button>
          
          <button
            onClick={() => { onClose(); onDelete(); }}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-left text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-50 active:bg-rose-100 dark:text-rose-500 dark:hover:bg-rose-500/10 dark:active:bg-rose-500/20"
          >
            <Trash2 className="h-4 w-4 text-rose-500" />
            Hapus
          </button>
          
          <button
            onClick={onClose}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-left text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 active:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 dark:active:bg-slate-700 sm:hidden"
          >
            <X className="h-4 w-4 text-slate-600" />
            Batal
          </button>
        </div>
      </div>
    </div>
  );
}
