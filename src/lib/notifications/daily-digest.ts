/********** Dua konsep berbeda ada di file ini:
 *
 *  1. buildLogDigest(userId)
 *     Implementasi benar dari delivery mode DIGEST.
 *     Membaca notification_logs hari ini dan menghasilkan SATU notifikasi ringkasan.
 *     Dipanggil oleh startDigestTimer() saat deliveryMode === "DIGEST".
 *
 *  2. buildDailyExpenseSummary(userId)  [dulu bernama buildDailyDigest]
 *     Menghasilkan ringkasan pengeluaran harian berdasarkan transaksi hari ini.
 *     Ini adalah event type DAILY_EXPENSE_SUMMARY — BUKAN mekanisme delivery DIGEST.
 *     Dipertahankan untuk referensi; jangan panggil dari startDigestTimer().
 *
 *  Seluruh proses berjalan di sisi klien dari IndexedDB — tidak perlu server call.
 */

/********** Imports **********/

import { getDB } from '../local-db/index';
import { STORES } from '../local-db/schema';
import { getAllLogs } from '../local-db/repositories/notification-logs';

/********** Types **********/

export interface LogDigestResult {
  title: string;
  body: string;
  logCount: number;
  hasEligibleLogs: boolean;
  clientIds: string[];
}

/********** Helpers **********/

/**
 * Mengekstrak bagian-bagian tanggal dalam zona waktu WIB (Asia/Jakarta)
 * secara andal menggunakan Intl.DateTimeFormat.
 *
 * @param date - Objek Date yang akan dikonversi ke WIB.
 * @returns Object berisi `year`, `month`, `day`, `hour`, `minute`, `dateStr`.
 */
export function getWIBDateParts(date: Date) {
  /********** Pakai Intl.DateTimeFormat untuk ekstrak bagian tanggal secara andal di WIB. */
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  
  const map: Record<string, string> = {};
  for (const part of parts) map[part.type] = part.value;
  
  /********** Tangani edge case jam "24" yang muncul pada hour12: false. */
  const hour = parseInt(map.hour, 10);
  const normalizedHour = hour === 24 ? 0 : hour;
  
  return {
    year: parseInt(map.year, 10),
    month: parseInt(map.month, 10),
    day: parseInt(map.day, 10),
    hour: normalizedHour,
    minute: parseInt(map.minute, 10),
    dateStr: `${map.year}-${map.month}-${map.day}`
  };
}

/********** Main Logic **********/

/**
 * Membangun satu notifikasi digest yang merangkum log notifikasi hari ini.
 *
 * Ini adalah implementasi benar dari delivery mode DIGEST:
 * - Membaca notification_logs hari ini (difilter berdasarkan tanggal createdAt).
 * - Menghitung log berdasarkan severity untuk membuat ringkasan yang bermakna.
 * - Mengembalikan `hasEligibleLogs=false` jika tidak ada log untuk diringkas.
 *   Pemanggil (startDigestTimer) tidak boleh mengirim digest jika `hasEligibleLogs` false.
 *
 * @param userId - ID user saat ini.
 * @returns Objek LogDigestResult yang siap dikirim sebagai notifikasi.
 */
export async function buildLogDigest(userId: string): Promise<LogDigestResult> {
  const allLogs = await getAllLogs(userId);
  const now = new Date();
  const todayWIBStr = getWIBDateParts(now).dateStr;

  /********** Filter: log hari ini (WIB), mode DIGEST, status 'delivered', bukan digest itu sendiri. */
  const todayLogs = allLogs.filter((log) => {
    if (log.deliveryModeAtCreation !== "DIGEST") return false;
    if (log.eventType === "DIGEST" || log.type === "DIGEST") return false;
    if (log.digestSentAt) return false;
    
    const logDate = new Date(log.createdAt);
    if (isNaN(logDate.getTime())) return false;
    return getWIBDateParts(logDate).dateStr === todayWIBStr && log.status === "delivered";
  });

  if (todayLogs.length === 0) {
    return { title: "", body: "", logCount: 0, hasEligibleLogs: false, clientIds: [] };
  }

  /********** [START: Ranking digest] **********/
  /********** Urutan prioritas:
   *  4. Deficit tertinggi
   *  3. Rekomendasi reallocation
   *  2. Usage ratio tertinggi
   *  1. Perbandingan jumlah terbesar
   */
  let topLog = todayLogs[0];
  let highestDeficit = -1;
  let hasReallocation = false;
  let highestUsage = -1;
  let largestComparison = -1;
  let rankingScore = -1; /********** Skor: 4=Deficit, 3=Reallocation, 2=Usage, 1=Comparison, 0=Other. */

  for (const log of todayLogs) {
    const deficitAmount = log.deficitAmount ?? 0;
    const usageRatio = log.usageRatio ?? 0;
    const comparisonAmount = log.comparisonAmount ?? 0;
    const isReallocation = log.actionType === "REALLOCATE_BUDGET";

    if (deficitAmount > 0 && deficitAmount > highestDeficit) {
      highestDeficit = deficitAmount;
      if (rankingScore <= 4) {
        rankingScore = 4;
        topLog = log;
      }
    } else if (isReallocation && rankingScore < 4) {
      hasReallocation = true;
      rankingScore = 3;
      topLog = log;
    } else if (usageRatio > 0 && usageRatio > highestUsage && rankingScore < 3) {
      highestUsage = usageRatio;
      rankingScore = 2;
      topLog = log;
    } else if (comparisonAmount > 0 && comparisonAmount > largestComparison && rankingScore < 2) {
      largestComparison = comparisonAmount;
      rankingScore = 1;
      topLog = log;
    }
  }

  const otherCount = todayLogs.length - 1;
  let title = "Ringkasan Moneta Hari Ini";
  let body = "";

  const otherUpdatesText = otherCount > 0 
    ? ` Ada ${otherCount} pembaruan lain yang perlu kamu tinjau.` 
    : "";

  if (rankingScore === 4) {
    const catName = topLog.categoryName || 'Kategori';
    body = `Anggaran ${catName} telah terlampaui sebesar ${fmtRupiah(highestDeficit)}.${otherUpdatesText}`;
  } else if (rankingScore === 3) {
    const catName = topLog.categoryName || 'Kategori';
    const recAmount = topLog.recommendedAmount || 0;
    const sourceCatName = topLog.sourceCategoryName || 'kategori lain';
    body = `Kamu memiliki rekomendasi subsidi silang sebesar ${fmtRupiah(recAmount)} dari ${sourceCatName} ke ${catName}.${otherUpdatesText}`;
  } else if (rankingScore === 2) {
    const catName = topLog.categoryName || 'Kategori';
    const pct = Math.round(highestUsage * 100);
    body = `Penggunaan anggaran ${catName} sudah mencapai ${pct}%.${otherUpdatesText}`;
  } else if (rankingScore === 1) {
    const catName = topLog.categoryName || 'Kategori';
    body = `Pengeluaran ${catName} hari ini lebih tinggi ${fmtRupiah(largestComparison)} dari sebelumnya.${otherUpdatesText}`;
  } else {
    body = `Ada ${todayLogs.length} pembaruan keuangan hari ini yang perlu kamu tinjau.`;
  }

  /********** [END: Ranking digest] **********/

  return { title, body, logCount: todayLogs.length, hasEligibleLogs: true, clientIds: todayLogs.map(l => l.clientId) };
}

/********** [START: Transaction Expense Summary] **********/
/********** Ini BUKAN mekanisme delivery DIGEST.
 *  Ini adalah event type terpisah (DAILY_EXPENSE_SUMMARY) yang merangkum transaksi hari ini.
 *  Jika fitur ini dipertahankan, kirimkan sebagai event biasa berdasarkan delivery mode aktif:
 *  - INSTANT: push pada waktu terjadwal
 *  - DIGEST:  masukkan dalam digest sebagai salah satu event yang dirangkum
 *  - OFF:     tidak ada push, hanya log
 */
/********** [END: Transaction Expense Summary] **********/

interface DailyExpenseSummaryResult {
  title: string;
  body: string;
  todayTotal: number;
  transactionCount: number;
  weeklyAverage: number;
}

/**
 * Memformat angka sebagai string Rupiah (contoh: 50000 → "Rp 50.000").
 *
 * @param amount - Nominal dalam bentuk angka.
 * @returns String Rupiah yang sudah diformat.
 */
function fmtRupiah(amount: number): string {
  return 'Rp ' + Math.round(amount).toLocaleString('id-ID');
}

/**
 * Mengagregasi transaksi hari ini dari IndexedDB dan menghitung ringkasan pengeluaran.
 *
 * @deprecated Jangan gunakan sebagai mekanisme delivery DIGEST — gunakan buildLogDigest() untuk itu.
 * Fungsi ini menghasilkan konten event type DAILY_EXPENSE_SUMMARY.
 * @param userId - ID user saat ini.
 * @returns Ringkasan pengeluaran harian.
 */
export async function buildDailyExpenseSummary(
  userId: string
): Promise<DailyExpenseSummaryResult> {
  const db = await getDB();

  /********** Ambil semua transaksi expense user yang belum dihapus. */
  const allTxns = await new Promise<any[]>((resolve, reject) => {
    const tx = db.transaction(STORES.TRANSACTIONS, "readonly");
    const index = tx.objectStore(STORES.TRANSACTIONS).index("by_userId");
    const req = index.getAll(userId);
    req.onsuccess = () =>
      resolve(
        (req.result as any[]).filter(
          (t) => !t.deletedAt && t.type === "EXPENSE"
        )
      );
    req.onerror = () => reject(req.error);
  });

  const today = new Date().toISOString().substring(0, 10);

  /********** Filter transaksi hari ini. */
  const todayTxns = allTxns.filter(
    (t) => (t.date || '').substring(0, 10) === today
  );
  const todayTotal = todayTxns.reduce((s, t) => s + Number(t.amount), 0);
  const transactionCount = todayTxns.length;

  /********** Rata-rata rolling 7 hari (tidak termasuk hari ini). */
  const dayTotals: Record<string, number> = {};
  for (const t of allTxns) {
    const d = (t.date || "").substring(0, 10);
    if (d === today || d === "") continue;
    dayTotals[d] = (dayTotals[d] ?? 0) + Number(t.amount);
  }

  const past7: number[] = [];
  for (let i = 1; i <= 7; i++) {
    const d = new Date(Date.now() - i * 86400000)
      .toISOString()
      .substring(0, 10);
    past7.push(dayTotals[d] ?? 0);
  }
  const weeklyAverage =
    past7.length > 0 ? past7.reduce((s, v) => s + v, 0) / past7.length : 0;

  /********** Buat teks ringkasan berdasarkan perbandingan dengan rata-rata mingguan. */
  const title = 'Ringkasan Keuangan Hari Ini';
  let body: string;

  if (transactionCount === 0) {
    body =
      "Kamu belum mencatat transaksi hari ini. Yuk, mulai catat pengeluaranmu agar keuanganmu tetap terpantau.";
  } else {
    const diff = Math.abs(todayTotal - weeklyAverage);
    const diffFmt = fmtRupiah(diff);
    const totalFmt = fmtRupiah(todayTotal);
    const countLabel =
      transactionCount === 1 ? "1 transaksi" : `${transactionCount} transaksi`;

    if (weeklyAverage === 0) {
      body = `Hari ini kamu telah mencatat ${countLabel} dengan total pengeluaran ${totalFmt}. Terus catat agar kamu bisa memantau tren keuanganmu.`;
    } else if (todayTotal <= weeklyAverage * 0.9) {
      body = `Hari ini kamu telah mencatat ${countLabel} dengan total ${totalFmt}. Pengeluaranmu hari ini lebih hemat ${diffFmt} dibanding rata-rata harianmu minggu ini. Kerja bagus.`;
    } else if (todayTotal >= weeklyAverage * 1.1) {
      body = `Hari ini kamu telah mencatat ${countLabel} dengan total ${totalFmt}. Pengeluaranmu hari ini lebih tinggi ${diffFmt} dibanding rata-rata harianmu minggu ini. Pertimbangkan kembali rencana pengeluaran besok.`;
    } else {
      body = `Hari ini kamu telah mencatat ${countLabel} dengan total pengeluaran ${totalFmt}. Pengeluaranmu hari ini sesuai dengan rata-rata harianmu minggu ini.`;
    }
  }

  return { title, body, todayTotal, transactionCount, weeklyAverage };
}

/********** Alias backward-compat — pemanggil buildDailyDigest() lama tetap berfungsi.
 *  Migrasi ke buildDailyExpenseSummary() pada cleanup berikutnya.
 */
/** @deprecated Gunakan buildDailyExpenseSummary() atau buildLogDigest() sebagai gantinya. */
export const buildDailyDigest = buildDailyExpenseSummary;

/********** Pemeriksaan Waktu Digest **********/

/**
 * Memeriksa apakah daily digest perlu dikirim sekarang.
 * Mengembalikan `true` jika waktu lokal saat ini cocok dengan digestTime user
 * (atau terlambat hingga 5 menit), dan digest hari ini belum dikirim.
 * Tidak akan pernah terlalu awal.
 *
 * @param digestTime - String "HH:MM" dari preferensi user.
 * @param lastFired - Informasi kapan digest terakhir dikirim, atau null jika belum pernah.
 * @returns Object berisi flag `shouldFire` dan `reason` penjelasan keputusan.
 */
export function shouldFireDigest(
  digestTime: string,
  lastFired: { digestDateKey: string; digestTime: string } | null
): { shouldFire: boolean; reason: string } {
  const now = new Date();
  const [hStr, mStr] = digestTime.split(":");
  const targetH = parseInt(hStr, 10);
  const targetM = parseInt(mStr, 10);

  if (isNaN(targetH) || isNaN(targetM)) {
    return { shouldFire: false, reason: "invalid_digest_time" };
  }

  const wibNow = getWIBDateParts(now);
  const todayStr = wibNow.dateStr;

  /********** Cek apakah digest untuk waktu ini sudah dikirim hari ini di WIB. */
  if (lastFired) {
    if (lastFired.digestDateKey === todayStr && lastFired.digestTime === digestTime) {
      return { shouldFire: false, reason: "already_fired_for_this_time_today" };
    }
  }

  /********** Hitung menit sejak tengah malam. */
  const nowMinutes = wibNow.hour * 60 + wibNow.minute;
  const digestMinutes = targetH * 60 + targetM;
  
  /********** Toleransi diperbesar jadi 15 menit agar menangkap cron GitHub Actions
   *  yang berjalan pada menit ganjil (misal menit ke-7).
   */
  const toleranceMinutes = 15;
  const diffMinutes = nowMinutes - digestMinutes;
  
  const isTimeMatch = diffMinutes >= 0 && diffMinutes <= toleranceMinutes;

  console.log("[DigestTimer] scheduleCheck", {
    nowHHmm: `${wibNow.hour.toString().padStart(2, '0')}:${wibNow.minute.toString().padStart(2, '0')}`,
    digestTime,
    nowMinutes,
    digestMinutes,
    diffMinutes,
    toleranceMinutes,
    shouldFire: isTimeMatch
  });

  if (!isTimeMatch) {
    if (diffMinutes < 0) {
      return { shouldFire: false, reason: 'too_early' };
    }
    return { shouldFire: false, reason: 'outside_time_window' };
  }

  return { shouldFire: true, reason: 'no_existing_fired_key' };
}
