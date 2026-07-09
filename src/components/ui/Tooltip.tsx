/*
 * File: src/components/ui/Tooltip.tsx
 * Description: Komponen keterangan tambahan (tooltip) dengan dukungan hover pada desktop dan tap pada perangkat seluler.
 */

"use client";

import { ReactNode, useState } from "react";

interface TooltipProps {
  content: string;
  children: ReactNode;
  /** Posisi tooltip terhadap elemen pemicu. Default: "top" */
  position?: "top" | "bottom";
}

/**
 * Merender keterangan tambahan bergaya gelembung yang muncul saat elemen pemicu dihover atau disentuh.
 *
 * @param props - Properti konfigurasi tooltip
 * @returns Elemen JSX pembungkus tooltip
 */
export function Tooltip({ content, children, position = "top" }: TooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isTop = position === "top";

  /********** [START: Perenderan Komponen Tooltip Interaktif] **********/
  return (
    <span className="relative inline-flex items-center">
      {/* Pemicu Tooltip */}
      <span
        tabIndex={0}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        onBlur={() => setIsOpen(false)}
        className="group/tooltip cursor-help outline-none"
        role="tooltip"
        aria-label={content}
      >
        {children}

        {/* Gelembung Tooltip */}
        <span
          className={[
            /* Penataan tata letak */
            "pointer-events-none absolute z-50 w-56 rounded-lg px-3 py-2 text-xs leading-snug shadow-lg",
            /* Penempatan posisi relatif */
            "left-1/2 -translate-x-1/2",
            isTop ? "bottom-full mb-2" : "top-full mt-2",
            /* Tampilan visual */
            "border border-slate-200 bg-white text-slate-600",
            "dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
            /* Panah penunjuk */
            isTop
              ? "after:absolute after:left-1/2 after:top-full after:-translate-x-1/2 after:border-4 after:border-transparent after:border-t-white dark:after:border-t-slate-800 after:content-['']"
              : "after:absolute after:bottom-full after:left-1/2 after:-translate-x-1/2 after:border-4 after:border-transparent after:border-b-white dark:after:border-b-slate-800 after:content-['']",
            /* Visibilitas - tersembunyi hingga dihover, fokus, atau disentuh pada seluler */
            isOpen
              ? "opacity-100 transition-opacity duration-150"
              : "opacity-0 transition-opacity duration-150 group-hover/tooltip:opacity-100 group-focus/tooltip:opacity-100",
          ].join(" ")}
        >
          {content}
        </span>
      </span>
    </span>
  );
  /********** [END: Perenderan Komponen Tooltip Interaktif] **********/
}
