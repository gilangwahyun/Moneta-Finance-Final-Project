/*
 * File: src/lib/utils/helpers.ts
 * Description: Kumpulan fungsi pembantu (utility helpers) umum untuk pembuatan ID lokal (UUID v4),
 * pemformatan mata uang, pemformatan tanggal/waktu, serta manipulasi waktu dan penundaan eksekusi.
 */

import { v4 as uuidv4 } from "uuid";
import { DEFAULT_CURRENCY, DEFAULT_LOCALE } from "./constants";

/********** Pembuatan ID & Karakter **********/

/**
 * Menghasilkan UUID v4 baru untuk digunakan sebagai clientId pada rekod lokal baru.
 *
 * @returns UUID string unik.
 */
export function generateClientId(): string {
  return uuidv4();
}

/********** Pemformatan Mata Uang & Angka **********/

/**
 * Memformat angka nominal uang menjadi teks mata uang standar (misal: Rp 100.000).
 *
 * @param amount - Nominal angka yang akan diformat.
 * @param currency - Kode mata uang (default: IDR).
 * @param locale - Kode lokal (default: id-ID).
 * @returns Teks mata uang terformat.
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
 * Memformat angka nominal uang menjadi bentuk ringkas (misal: Rp 1,2 jt).
 *
 * @param amount - Nominal angka yang akan diformat.
 * @param currency - Kode mata uang (default: IDR).
 * @param locale - Kode lokal (default: id-ID).
 * @returns Teks mata uang ringkas terformat.
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

/********** Pemformatan Tanggal & Waktu **********/

/**
 * Memformat string tanggal menjadi format teks yang mudah dibaca.
 * Opsional menyertakan waktu format 24 jam jika timeString diberikan.
 *
 * @param dateString - Tanggal dalam format string.
 * @param timeString - Waktu dalam format string (opsional).
 * @param locale - Kode lokal (default: id-ID).
 * @returns Teks tanggal (dan waktu) terformat.
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
 * Mengambil timestamp waktu saat ini dalam format ISO 8601.
 *
 * @returns String timestamp ISO.
 */
function now(): string {
  return new Date().toISOString();
}

/**
 * Menunda eksekusi kode asinkron selama durasi milidetik tertentu.
 *
 * @param ms - Durasi penundaan dalam milidetik.
 * @returns Promise void setelah durasi berakhir.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Mengambil tanggal hari ini dalam format YYYY-MM-DD sesuai zona waktu lokal.
 * Digunakan sebagai nilai input elemen form bertipe tanggal.
 *
 * @returns String tanggal YYYY-MM-DD.
 */
export function getTodayDateInputValue(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
