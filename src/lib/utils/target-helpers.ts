/*
 * File: src/lib/utils/target-helpers.ts
 * Description: Kumpulan fungsi pembantu (utility helpers) untuk mengevaluasi status aktif
 * dan menghitung rentang waktu efektif dari suatu target finansial berdasarkan periode yang dipilih.
 */

import dayjs from "dayjs";
import { FinancialTarget } from "@/types/models.types";

/********** Evaluasi Status Aktif Target **********/

/**
 * Memeriksa apakah suatu target finansial sedang aktif pada tanggal yang dipilih.
 *
 * @param target - Objek FinancialTarget yang akan diperiksa.
 * @param selectedDate - Tanggal referensi pemeriksaan.
 * @returns True jika target aktif dan tanggal berada dalam rentang masa berlaku target.
 */
export function isTargetActiveForDate(target: FinancialTarget, selectedDate: Date): boolean {
  if (!target || !target.isActive) return false;
  if (!target.categoryId) return false;

  const date = dayjs(selectedDate).startOf("day");
  const start = dayjs(target.startDate).startOf("day");

  if (date.isBefore(start)) return false;

  if (target.period === "CUSTOM" && target.endDate) {
    const end = dayjs(target.endDate).endOf("day");
    if (date.isAfter(end)) return false;
  }

  return true;
}

/********** Perhitungan Rentang Waktu Efektif **********/

/**
 * Menghitung rentang tanggal efektif (awal dan akhir periode) untuk suatu target berdasarkan tanggal referensi.
 *
 * @param target - Objek FinancialTarget yang dihitung perhitungannya.
 * @param selectedDate - Tanggal referensi evaluasi periode.
 * @returns Objek berisi periodStart dan periodEnd dalam format Date, atau null jika target tidak aktif.
 */
export function getTargetEffectiveDateRange(target: FinancialTarget, selectedDate: Date): { periodStart: Date, periodEnd: Date } | null {
  if (!isTargetActiveForDate(target, selectedDate)) return null;

  const date = dayjs(selectedDate);
  const targetStart = dayjs(target.startDate).startOf("day");

  let periodStart = date;
  let periodEnd = date;

  if (target.period === "DAILY") {
    periodStart = date.startOf("day");
    periodEnd = date.endOf("day");
  } else if (target.period === "WEEKLY") {
    periodStart = date.startOf("week");
    periodEnd = date.endOf("week");
  } else if (target.period === "MONTHLY") {
    periodStart = date.startOf("month");
    periodEnd = date.endOf("month");
  } else if (target.period === "CUSTOM") {
    periodStart = targetStart;
    periodEnd = target.endDate ? dayjs(target.endDate).endOf("day") : periodStart.endOf("day");
  }

  /********** Pastikan waktu mulai periode tidak lebih awal dari tanggal mulai target itu sendiri. */
  if (target.period !== "CUSTOM" && periodStart.isBefore(targetStart)) {
    periodStart = targetStart;
  }

  return {
    periodStart: periodStart.toDate(),
    periodEnd: periodEnd.toDate()
  };
}
