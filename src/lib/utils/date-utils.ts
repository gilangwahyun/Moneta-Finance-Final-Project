/*
 * File: src/lib/utils/date-utils.ts
 * Description: Kumpulan fungsi pembantu (utility) untuk memanipulasi dan mengambil batas waktu (awal dan akhir hari)
 * untuk hari tertentu, hari ini, maupun kemarin.
 */

/********** Batas Waktu Hari Pilihan **********/

/**
 * Mengambil waktu awal hari (pukul 00:00:00.000) dari tanggal yang diberikan.
 *
 * @param d - Tanggal referensi (objek Date, string, atau timestamp angka).
 * @returns Objek Date yang diatur ke awal hari.
 */
export function getStartOfDay(d: Date | string | number): Date {
  const newDate = new Date(d);
  newDate.setHours(0, 0, 0, 0);
  return newDate;
}

/**
 * Mengambil waktu akhir hari (pukul 23:59:59.999) dari tanggal yang diberikan.
 *
 * @param d - Tanggal referensi (objek Date, string, atau timestamp angka).
 * @returns Objek Date yang diatur ke akhir hari.
 */
export function getEndOfDay(d: Date | string | number): Date {
  const newDate = new Date(d);
  newDate.setHours(23, 59, 59, 999);
  return newDate;
}

/********** Batas Waktu Hari Ini & Kemarin **********/

/**
 * Mengambil waktu awal hari untuk hari ini.
 *
 * @returns Objek Date awal hari ini.
 */
export function getStartOfToday(): Date {
  return getStartOfDay(new Date());
}

/**
 * Mengambil waktu akhir hari untuk hari ini.
 *
 * @returns Objek Date akhir hari ini.
 */
export function getEndOfToday(): Date {
  return getEndOfDay(new Date());
}

/**
 * Mengambil waktu awal hari untuk kemarin.
 *
 * @returns Objek Date awal hari kemarin.
 */
export function getStartOfYesterday(): Date {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return getStartOfDay(d);
}

/**
 * Mengambil waktu akhir hari untuk kemarin.
 *
 * @returns Objek Date akhir hari kemarin.
 */
export function getEndOfYesterday(): Date {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return getEndOfDay(d);
}
