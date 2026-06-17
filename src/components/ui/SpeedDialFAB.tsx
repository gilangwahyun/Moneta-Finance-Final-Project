/********** Imports **********/
"use client";

import { useState } from "react";
import { Plus, ArrowDownRight, ArrowUpRight } from "lucide-react";
import { useTransactionForm } from "@/providers/TransactionFormProvider";

/********** Component **********/
/**
 * A floating action button (FAB) for mobile layouts with a speed dial menu.
 *
 * Opens sub-actions (Income/Expense) which trigger the global transaction form.
 * Hidden on desktop breakpoints.
 *
 * @returns A FAB component.
 */
export function SpeedDialFAB() {
  /********** State **********/
  const [isOpen, setIsOpen] = useState(false);
  const { openForm } = useTransactionForm();

  /********** Event Handlers **********/
  const toggleOpen = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

  const handleAction = (type: "EXPENSE" | "INCOME") => {
    openForm(type);
    closeMenu();
  };

  /********** Render **********/
  return (
    <div className="md:hidden">
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={closeMenu}
        aria-hidden="true"
      />

      {/* FAB Container */}
      <div className="fixed bottom-24 right-6 z-50 flex flex-col items-end gap-4">
        
        {/* Speed Dial Menu Items */}
        <div 
          className={`flex flex-col items-end gap-3 transition-all duration-300 origin-bottom ${
            isOpen ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-90 translate-y-8 pointer-events-none"
          }`}
        >
          {/* Income Action */}
          <div className="flex items-center gap-3">
            <span className="rounded-lg bg-white/90 px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm backdrop-blur-md dark:bg-slate-800/90 dark:text-slate-200">
              Catat Pemasukan
            </span>
            <button
              onClick={() => handleAction("INCOME")}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg transition-transform active:scale-90"
              aria-label="Catat Pemasukan"
            >
              <ArrowUpRight className="h-5 w-5" />
            </button>
          </div>

          {/* Expense Action */}
          <div className="flex items-center gap-3">
            <span className="rounded-lg bg-white/90 px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm backdrop-blur-md dark:bg-slate-800/90 dark:text-slate-200">
              Catat Pengeluaran
            </span>
            <button
              onClick={() => handleAction("EXPENSE")}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-500 text-white shadow-lg transition-transform active:scale-90 dark:bg-rose-600"
              aria-label="Catat Pengeluaran"
            >
              <ArrowDownRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Base Toggle Button */}
        <button
          onClick={toggleOpen}
          className={`flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-white shadow-md shadow-indigo-500/20 transition-all duration-300 hover:bg-indigo-500 active:scale-90 dark:bg-indigo-500 dark:hover:bg-indigo-400 ${
            isOpen ? "rotate-45" : "rotate-0"
          }`}
          aria-label={isOpen ? "Close menu" : "Open add transaction menu"}
        >
          <Plus className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
}
