/********** [START: Server Digest] **********/
/********** Logika sisi server untuk menentukan user mana yang perlu menerima
 *  digest harian, dan membangun isi ringkasan notifikasi dari notification_logs
 *  yang belum dirangkum (digestSentAt = null).
 */
/********** [END: Server Digest] **********/

/********** Imports **********/

import { prisma } from '../db/prisma';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

/********** Inisialisasi plugin dayjs untuk timezone support. */
dayjs.extend(utc);
dayjs.extend(timezone);

/********** Types **********/

export interface DigestCandidate {
  userId: string;
  digestTime: string;
}

export interface ServerDigestResult {
  title: string;
  body: string;
  logCount: number;
  hasEligibleLogs: boolean;
  logIds: string[];
}

/********** Helpers **********/

/**
 * Memformat angka sebagai string Rupiah (contoh: 50000 → "Rp 50.000").
 *
 * @param amount - Nominal dalam bentuk angka.
 * @returns String Rupiah yang sudah diformat.
 */
function fmtRupiah(amount: number): string {
  return 'Rp ' + Math.round(amount).toLocaleString('id-ID');
}

/********** Main Logic **********/

/**
 * Mencari user yang sudah waktunya menerima digest hari ini dari Prisma.
 * Kriteria:
 *   - settings.isEnabled = true
 *   - settings.dailyDigest = true
 *   - digestTime cocok dengan jam:menit WIB saat ini (dengan toleransi jendela kecil)
 *   - user memiliki minimal satu push subscription aktif
 *
 * @param targetTimeWIB - ISO timestamp string waktu yang digunakan sebagai referensi, atau undefined untuk menggunakan waktu sekarang.
 * @returns Array candidate object berisi userId dan digestTime yang dikonfigurasi.
 */
export async function getUsersDueForDigest(targetTimeWIB?: string): Promise<DigestCandidate[]> {
  const now = targetTimeWIB ? dayjs(targetTimeWIB).tz('Asia/Jakarta') : dayjs().tz('Asia/Jakarta');
  
  /********** Hitung jendela waktu: waktu saat ini dikurangi hingga 14 menit.
   *  Karena GitHub Actions cron berjalan setiap 15 menit.
   */
  const timeWindow: string[] = [];
  for (let i = 0; i < 15; i++) {
    timeWindow.push(now.subtract(i, 'minute').format('HH:mm'));
  }

  /********** Langkah 1: Ambil pengaturan user yang memenuhi syarat. */
  const eligibleSettings = await prisma.notificationSettings.findMany({
    where: {
      isEnabled: true,
      dailyDigest: true,
      digestTime: {
        in: timeWindow /********** Cocokkan HH:mm manapun dalam jendela 15 menit cron. */
      },
      user: {
        notificationSubscriptions: {
          some: {} /********** Harus punya minimal satu subscription aktif. */
        }
      }
    },
    select: {
      userId: true,
      digestTime: true
    }
  });

  if (eligibleSettings.length === 0) {
    return [];
  }

  const userIds = eligibleSettings.map(s => s.userId);

  /********** Langkah 2: Filter user yang SUDAH menerima digest DIGEST hari ini.
   *  Cek dengan mencari NotificationLog bertipe "DIGEST" yang dibuat hari ini (batas WIB).
   */
  const startOfDayWIB = now.startOf("day").toDate();
  const endOfDayWIB = now.endOf("day").toDate();

  const sentDigestsToday = await prisma.notificationLog.findMany({
    where: {
      userId: { in: userIds },
      eventType: 'DIGEST', /********** Server menetapkan ini saat mengirim digest. */
      createdAt: {
        gte: startOfDayWIB,
        lte: endOfDayWIB
      }
    },
    select: {
      userId: true
    }
  });

  const alreadySentUserIds = new Set(sentDigestsToday.map(log => log.userId));
  
  /********** Langkah 3: Kembalikan candidate yang belum menerima digest hari ini. */
  return eligibleSettings.filter(s => !alreadySentUserIds.has(s.userId));
}

/**
 * Membangun konten digest untuk user tertentu.
 * Mengambil semua log yang belum dirangkum dari Prisma untuk hari yang ditentukan,
 * lalu memformatnya menjadi satu LogDigestResult mengikuti logika ranking:
 * (deficit kritis > reallocation > usage warning > comparison spike).
 *
 * @param userId - ID user.
 * @param dateWIB - Hari referensi untuk membangun digest.
 * @returns Konten digest siap pakai.
 */
export async function buildServerDigestContent(
  userId: string,
  dateWIB: string = new Date().toISOString()
): Promise<ServerDigestResult> {
  const targetDay = dayjs(dateWIB).tz('Asia/Jakarta');
  const startOfDay = targetDay.startOf('day').toDate();
  const endOfDay = targetDay.endOf('day').toDate();

  /********** Ambil log yang memenuhi syarat:
   *  - Mode DIGEST saat pembuatan log
   *  - Bukan log digest itu sendiri
   *  - Belum dimasukkan ke digest manapun (digestSentAt = null)
   *  - Dibuat dalam hari target
   */
  const eligibleLogs = await prisma.notificationLog.findMany({
    where: {
      userId: userId,
      deliveryModeAtCreation: "DIGEST",
      eventType: { not: "DIGEST" },
      type: { not: "DIGEST" },
      digestSentAt: null,
      createdAt: {
        gte: startOfDay,
        lte: endOfDay
      }
    }
  });

  if (eligibleLogs.length === 0) {
    return { title: "", body: "", logCount: 0, hasEligibleLogs: false, logIds: [] };
  }

  /********** Tentukan log utama sebagai fokus utama ringkasan berdasarkan ranking. */
  let topLog = eligibleLogs[0];
  let highestDeficit = -1;
  let hasReallocation = false;
  let highestUsage = -1;
  let largestComparison = -1;
  let rankingScore = -1; 
  /********** Skor: 4=Deficit, 3=Reallocation, 2=Usage, 1=Comparison, 0=Other. */

  for (const log of eligibleLogs) {
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

  const otherCount = eligibleLogs.length - 1;
  const title = "Ringkasan Moneta Hari Ini";
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
    body = `Ada ${eligibleLogs.length} pembaruan keuangan hari ini yang perlu kamu tinjau.`;
  }

  return { 
    title, 
    body, 
    logCount: eligibleLogs.length, 
    hasEligibleLogs: true, 
    logIds: eligibleLogs.map(l => l.id) 
  };
}

/**
 * Menandai batch notification logs sebagai "sudah dirangkum" dengan mengatur timestamp digestSentAt.
 * Mencegah log yang sama masuk ke ringkasan digest berikutnya.
 *
 * @param logIds - Array ID database Prisma.
 * @param sentAt - Objek Date yang merepresentasikan waktu pengiriman digest.
 */
export async function markLogsAsDigested(logIds: string[], sentAt: Date = new Date()): Promise<void> {
  if (logIds.length === 0) return;

  await prisma.notificationLog.updateMany({
    where: {
      id: { in: logIds }
    },
    data: {
      digestSentAt: sentAt,
      /********** Touch updatedAt agar klien mobile menarik update sync ini. */
      updatedAt: sentAt 
    }
  });
}
