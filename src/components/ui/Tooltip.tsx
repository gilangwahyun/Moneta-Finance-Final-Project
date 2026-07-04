/********** Imports **********/
"use client";

import { ReactNode } from "react";

/********** Types **********/
interface TooltipProps {
  content: string;
  children: ReactNode;
  /** Positioning relative to trigger. Default: "top" */
  position?: "top" | "bottom";
}

/********** Component **********/
/**
 * A pure CSS/Tailwind tooltip component.
 *
 * Renders `children` as the trigger and shows `content` on hover and focus.
 * Works on both mouse and touch (tap to toggle via focus).
 * Keyboard accessible via tab focus.
 *
 * @param props - Tooltip configuration.
 * @returns A tooltip wrapper element.
 */
export function Tooltip({ content, children, position = "top" }: TooltipProps) {
  const isTop = position === "top";

  /********** Render **********/
  return (
    <span className="relative inline-flex items-center">
      {/* Trigger */}
      <span
        tabIndex={0}
        className="group/tooltip cursor-help outline-none"
        role="tooltip"
        aria-label={content}
      >
        {children}

        {/* Tooltip bubble */}
        <span
          className={[
            // Layout
            "pointer-events-none absolute z-50 w-56 rounded-lg px-3 py-2 text-xs leading-snug shadow-lg",
            // Positioning
            "left-1/2 -translate-x-1/2",
            isTop ? "bottom-full mb-2" : "top-full mt-2",
            // Visual
            "border border-slate-200 bg-white text-slate-600",
            "dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
            // Arrow
            isTop
              ? "after:absolute after:left-1/2 after:top-full after:-translate-x-1/2 after:border-4 after:border-transparent after:border-t-white dark:after:border-t-slate-800 after:content-['']"
              : "after:absolute after:bottom-full after:left-1/2 after:-translate-x-1/2 after:border-4 after:border-transparent after:border-b-white dark:after:border-b-slate-800 after:content-['']",
            // Visibility — hidden until parent group/tooltip is hovered/focused
            "opacity-0 transition-opacity duration-150 group-hover/tooltip:opacity-100 group-focus/tooltip:opacity-100",
          ].join(" ")}
        >
          {content}
        </span>
      </span>
    </span>
  );
}
