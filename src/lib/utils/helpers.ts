//********** START: General Helpers **********
//********** END: General Helpers **********

import { v4 as uuidv4 } from "uuid";
import { DEFAULT_CURRENCY, DEFAULT_LOCALE } from "./constants";

/**
 * Generate a new UUID v4 (used as clientId for new records).
 */
export function generateClientId(): string {
  return uuidv4();
}

/**
 * Format a number as currency.
 */
export function formatCurrency(
  amount: number,
  currency: string = DEFAULT_CURRENCY,
  locale: string = DEFAULT_LOCALE
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format a number as compact currency (e.g. 1,2 jt).
 */
export function formatCurrencyCompact(
  amount: number,
  currency: string = DEFAULT_CURRENCY,
  locale: string = DEFAULT_LOCALE
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    notation: "compact",
    compactDisplay: "short",
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(amount);
}

/**
 * Format a date string to a human-readable format.
 * Optionally includes 24-hour time if timeString is provided.
 */
export function formatDate(
  dateString: string,
  timeString?: string,
  locale: string = DEFAULT_LOCALE
): string {
  const datePart = new Date(dateString).toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  if (timeString) {
    const timePart = new Date(timeString).toLocaleTimeString(locale, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).replace('.', ':');
    return `${datePart} • ${timePart}`;
  }

  return datePart;
}

/**
 * Get the current timestamp in ISO 8601 format.
 */
export function now(): string {
  return new Date().toISOString();
}

/**
 * Delay execution for the specified number of milliseconds.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Returns today's date formatted as YYYY-MM-DD in the local timezone.
 */
export function getTodayDateInputValue(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
