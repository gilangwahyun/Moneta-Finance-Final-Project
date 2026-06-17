/********** Imports **********/
"use client";

import { HelpCircle } from "lucide-react";
import { AVAILABLE_ICONS } from "@/lib/available-icons";

/********** Types **********/
export interface DynamicIconProps {
  iconName?: string | null;
  color?: string | null;
  className?: string;
}

/********** Component **********/
/**
 * Renders a dynamic Lucide icon by its string name stored in IndexedDB.
 *
 * It maps the string directly to the `name` field in AVAILABLE_ICONS.
 * If an exact match is not found, it falls back to a HelpCircle icon.
 *
 * @param props - Properties specifying the icon name, color, and classes.
 * @returns React node representing the icon.
 */
export function DynamicIcon({ iconName, color, className = "h-4 w-4" }: DynamicIconProps) {
  const style = color ? { color } : undefined;

  if (!iconName) {
    return <HelpCircle className={className} style={style} />;
  }

  /********** Find exact match against AVAILABLE_ICONS. */
  const entry = AVAILABLE_ICONS.find((i) => i.name === iconName);
  if (entry) {
    return <entry.Icon className={className} style={style} />;
  }

  /********** Fallback when icon is not found. */
  return <HelpCircle className={className} style={style} />;
}
