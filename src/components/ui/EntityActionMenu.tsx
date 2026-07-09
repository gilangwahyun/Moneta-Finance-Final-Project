/*
 * File: src/components/ui/EntityActionMenu.tsx
 * Description: Komponen menu aksi entitas yang adaptif (menu dropdown pada desktop dan bottom sheet pada perangkat seluler) dengan posisi portal yang disesuaikan agar tidak terpotong layar.
 */

/********** Impor Modul **********/
import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal, Pencil, Trash2, X } from "lucide-react";

/********** Definisi Tipe Properti **********/
export interface ExtraAction {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: "default" | "destructive";
}

interface EntityActionMenuProps {
  onEdit: () => void;
  onDelete: () => void;
  title?: string;
  subtitle?: string | React.ReactNode;
  extraActions?: ExtraAction[];
}

/********** Komponen Menu Aksi Entitas (EntityActionMenu) **********/
/**
 * Merender menu aksi responsif (dropdown pada desktop, bottom sheet pada seluler).
 * Menyediakan aksi standar seperti Ubah dan Hapus, serta mendukung aksi tambahan kustom.
 *
 * @param props - Properti konfigurasi menu aksi
 * @returns Elemen JSX menu aksi berbasis portal
 */
export function EntityActionMenu({ onEdit, onDelete, title, subtitle, extraActions }: EntityActionMenuProps) {
  /********** State Lokal **********/
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, transformOrigin: 'top right' });
  const containerRef = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);

  /********** Efek Pemantauan Kesiapan Portal **********/
  useEffect(() => {
    setMounted(true);
  }, []);

  /********** [START: Perhitungan Posisi Popover Menu Aksi] **********/
  const calculatePosition = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    
    /* Perhitungan posisi koordinat tidak diperlukan untuk tampilan bottom sheet seluler */
    if (isMobile) return;

    const menuWidth = 160;
    const menuHeight = 100 + (extraActions?.length || 0) * 36;
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    let top = rect.bottom + 8;
    let left = rect.right - menuWidth;
    let transformOrigin = 'top right';

    if (left < 8) left = 8;
    if (left + menuWidth > viewportWidth - 8) left = viewportWidth - menuWidth - 8;

    if (top + menuHeight > viewportHeight && rect.top - menuHeight > 0) {
      top = rect.top - menuHeight - 8;
      transformOrigin = 'bottom right';
    }

    setMenuPosition({ top, left, transformOrigin });
  };
  /********** [END: Perhitungan Posisi Popover Menu Aksi] **********/

  /********** [START: Pengaturan Event Listener & Overflow Responsif] **********/
  useEffect(() => {
    if (!isOpen) return;

    calculatePosition();

    function handleOutsideClick(e: MouseEvent) {
      if (
        containerRef.current && !containerRef.current.contains(e.target as Node) &&
        portalRef.current && !portalRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }

    const handleScrollOrResize = () => {
      /* Menutup menu saat terjadi pengguliran atau perubahan ukuran layar agar popover tidak terlepas */
      setIsOpen(false);
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    if (isMobile) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [isOpen]);
  /********** [END: Pengaturan Event Listener & Overflow Responsif] **********/

  const toggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOpen) {
      calculatePosition();
    }
    setIsOpen(!isOpen);
  };

  /********** Perenderan Komponen **********/
  return (
    <div className="relative inline-flex items-center" ref={containerRef}>
      {/* Tombol Pemicu Menu Aksi */}
      <button
        onClick={toggleMenu}
        aria-label="Buka menu aksi"
        aria-expanded={isOpen}
        className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
          isOpen
            ? "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200"
            : "text-slate-600 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
        }`}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {mounted && isOpen && createPortal(
        <div className="moneta-action-portal" ref={portalRef}>
          {/* Tampilan Bottom Sheet pada Perangkat Seluler */}
          <div className="md:hidden fixed inset-0 z-[9999] flex items-end justify-center">
            <div 
              className="absolute inset-0 bg-slate-950/70 transition-opacity dark:bg-black/80" 
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
              }} 
            />
            
            <div 
              className="relative z-10 w-full rounded-t-2xl border border-slate-200 bg-white shadow-2xl animate-in slide-in-from-bottom-10 duration-200 dark:border-slate-800 dark:bg-slate-900 flex flex-col pb-safe pb-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mx-auto mt-4 h-1.5 w-12 rounded-full bg-slate-200 dark:bg-slate-700" />
              
              {title && (
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                  <div className="min-w-0 flex-1 pr-4">
                    <h3 className="truncate text-base font-bold text-slate-900 dark:text-slate-50">{title}</h3>
                    {subtitle && <div className="mt-0.5 truncate text-xs text-slate-600 dark:text-slate-400">{subtitle}</div>}
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="rounded-full p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300 transition-colors"
                    aria-label="Tutup"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              )}

              <div className="p-3 space-y-1">
                <button
                  onClick={() => { setIsOpen(false); onEdit(); }}
                  className="flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-left text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 active:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 dark:active:bg-slate-700"
                >
                  <Pencil className="h-4 w-4 text-slate-600" />
                  Ubah
                </button>
                
                {extraActions?.map((action, i) => (
                  <button
                    key={i}
                    onClick={() => { setIsOpen(false); action.onClick(); }}
                    className={`flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-left text-sm font-semibold transition-colors ${
                      action.variant === "destructive"
                        ? "text-rose-600 hover:bg-rose-50 active:bg-rose-100 dark:text-rose-500 dark:hover:bg-rose-500/10 dark:active:bg-rose-500/20"
                        : "text-slate-700 hover:bg-slate-50 active:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 dark:active:bg-slate-700"
                    }`}
                  >
                    {action.icon && (
                      <span className={`flex items-center justify-center [&>svg]:h-4 [&>svg]:w-4 ${action.variant === "destructive" ? "text-rose-500" : "text-slate-600"}`}>
                        {action.icon}
                      </span>
                    )}
                    {action.label}
                  </button>
                ))}
                
                <button
                  onClick={() => { setIsOpen(false); onDelete(); }}
                  className="flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-left text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-50 active:bg-rose-100 dark:text-rose-500 dark:hover:bg-rose-500/10 dark:active:bg-rose-500/20"
                >
                  <Trash2 className="h-4 w-4 text-rose-500" />
                  Hapus
                </button>
                
                <button
                  onClick={() => setIsOpen(false)}
                  className="flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-left text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 active:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 dark:active:bg-slate-700"
                >
                  <X className="h-4 w-4 text-slate-600" />
                  Batal
                </button>
              </div>
            </div>
          </div>

          {/* Tampilan Menu Popover pada Desktop */}
          <div 
            className="hidden md:block fixed w-40 z-[9999] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl animate-in fade-in duration-150 dark:border-slate-800 dark:bg-slate-900"
            style={{
               top: `${menuPosition.top}px`,
               left: `${menuPosition.left}px`,
               transformOrigin: menuPosition.transformOrigin
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-1">
              <button
                onClick={() => { setIsOpen(false); onEdit(); }}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <Pencil className="h-3.5 w-3.5 text-slate-600" />
                Ubah
              </button>
              
              {extraActions?.map((action, i) => (
                <button
                  key={i}
                  onClick={() => { setIsOpen(false); action.onClick(); }}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
                    action.variant === "destructive"
                      ? "text-rose-600 hover:bg-rose-50 dark:text-rose-500 dark:hover:bg-rose-500/10"
                      : "text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                  }`}
                >
                  {action.icon && (
                    <span className={`flex items-center justify-center [&>svg]:h-3.5 [&>svg]:w-3.5 ${action.variant === "destructive" ? "text-rose-500" : "text-slate-600"}`}>
                      {action.icon}
                    </span>
                  )}
                  {action.label}
                </button>
              ))}
              
              <button
                onClick={() => { setIsOpen(false); onDelete(); }}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50 dark:text-rose-500 dark:hover:bg-rose-500/10"
              >
                <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                Hapus
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
