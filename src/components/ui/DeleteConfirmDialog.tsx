/********** Imports **********/
import React, { useEffect } from "react";
import { AlertTriangle, X } from "lucide-react";

/********** Types **********/
interface DeleteConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  body: string;
  isDeleting?: boolean;
}

/********** Component **********/
/**
 * Modal dialog to confirm destructive actions like deletion.
 *
 * Locks body scroll while open and displays a warning visual.
 * Provides "Batal" and "Hapus" actions, disabling them and showing a loader
 * when the deletion is in progress.
 *
 * @param props - Configuration properties for the dialog.
 * @returns A modal dialog component or null if not open.
 */
export function DeleteConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  body,
  isDeleting = false
}: DeleteConfirmDialogProps) {
  
  /********** Effects **********/
  useEffect(() => {
    /********** Lock body scroll when the dialog is open. */
    if (isOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  if (!isOpen) return null;

  /********** Render **********/
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity dark:bg-black/60" onClick={!isDeleting ? onClose : undefined} />
      
      <div className="relative z-10 w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl animate-in zoom-in-95 duration-200 dark:bg-slate-900 flex flex-col">
        <div className="p-6">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-500/20">
            <AlertTriangle className="h-6 w-6 text-rose-600 dark:text-rose-500" />
          </div>
          
          <h3 className="text-center text-lg font-bold text-slate-900 dark:text-slate-50">
            {title}
          </h3>
          
          <p className="mt-2 text-center text-sm text-slate-600 dark:text-slate-400">
            {body}
          </p>
        </div>
        
        <div className="flex flex-col-reverse gap-2 bg-slate-50 p-4 dark:bg-slate-800/50 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="inline-flex w-full justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 active:scale-95 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 sm:w-auto"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-rose-500 active:scale-95 disabled:opacity-50 sm:w-auto"
          >
            {isDeleting && <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
            Hapus
          </button>
        </div>
      </div>
    </div>
  );
}
