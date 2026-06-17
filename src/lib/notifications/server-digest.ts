import { prisma } from "../db/prisma";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

// Initialize dayjs plugins
dayjs.extend(utc);
dayjs.extend(timezone);

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

/**
 * Format currency to Rupiah string
 */
function fmtRupiah(amount: number): string {
  return "Rp " + Math.round(amount).toLocaleString("id-ID");
}

/**
 * Query Prisma for users who are due for a digest.
 * Criteria:
 *   - settings.isEnabled = true
 *   - settings.dailyDigest = true
 *   - digestTime matches current hour:minute in WIB (with a small buffer tolerance)
 *   - user has at least one push subscription
 *
 * @param targetTimeWIB ISO timestamp string of the "current" time to evaluate against, or undefined to use now.
 * @returns Array of candidate objects with userId and their configured digest time.
 */
export async function getUsersDueForDigest(targetTimeWIB?: string): Promise<DigestCandidate[]> {
  const now = targetTimeWIB ? dayjs(targetTimeWIB).tz("Asia/Jakarta") : dayjs().tz("Asia/Jakarta");
  
  // Calculate window matching: current time minus up to 14 minutes.
  // Because github actions cron runs every 15 mins.
  const timeWindow: string[] = [];
  for (let i = 0; i < 15; i++) {
    timeWindow.push(now.subtract(i, 'minute').format("HH:mm"));
  }

  // 1. Fetch eligible user settings
  const eligibleSettings = await prisma.notificationSettings.findMany({
    where: {
      isEnabled: true,
      dailyDigest: true,
      digestTime: {
        in: timeWindow // matches any HH:mm inside the 15-minute cron window
      },
      user: {
        notificationSubscriptions: {
          some: {} // Must have at least one active subscription
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

  // 2. Filter out users who have ALREADY received a DIGEST push today.
  // We check this by looking for an existing NotificationLog of type "DIGEST" 
  // created today (WIB time boundary).
  
  const startOfDayWIB = now.startOf("day").toDate();
  const endOfDayWIB = now.endOf("day").toDate();

  const sentDigestsToday = await prisma.notificationLog.findMany({
    where: {
      userId: { in: userIds },
      eventType: "DIGEST", // The server sets this when sending
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
  
  // 3. Return the remaining candidates
  return eligibleSettings.filter(s => !alreadySentUserIds.has(s.userId));
}

/**
 * Build the digest content for a specific user.
 * Fetches all un-digested logs from Prisma for the given day,
 * and formats them into a single LogDigestResult following the 
 * ranking logic (critical deficit -> reallocation -> usage warning -> comparison spike).
 *
 * @param userId The User ID
 * @param dateWIB The reference day to build the digest for
 */
export async function buildServerDigestContent(
  userId: string,
  dateWIB: string = new Date().toISOString()
): Promise<ServerDigestResult> {
  const targetDay = dayjs(dateWIB).tz("Asia/Jakarta");
  const startOfDay = targetDay.startOf("day").toDate();
  const endOfDay = targetDay.endOf("day").toDate();

  // Find eligible logs:
  // - Mode was 'DIGEST'
  // - Not a digest itself
  // - Has not been included in a digest yet (digestSentAt = null)
  // - Created within the target day
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

  // Rank the logs to pick the primary focus for the summary body
  let topLog = eligibleLogs[0];
  let highestDeficit = -1;
  let hasReallocation = false;
  let highestUsage = -1;
  let largestComparison = -1;
  let rankingScore = -1; 
  // Scores: 4=Deficit, 3=Reallocation, 2=Usage, 1=Comparison, 0=Other

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
 * Mark a batch of notification logs as "digested" by setting the digestSentAt timestamp.
 * This prevents them from being summarized again in future digests.
 * 
 * @param logIds Array of Prisma database IDs
 * @param sentAt Date object representing when the digest was sent
 */
export async function markLogsAsDigested(logIds: string[], sentAt: Date = new Date()): Promise<void> {
  if (logIds.length === 0) return;

  await prisma.notificationLog.updateMany({
    where: {
      id: { in: logIds }
    },
    data: {
      digestSentAt: sentAt,
      // Touch updatedAt to ensure mobile clients pull this sync down
      updatedAt: sentAt 
    }
  });
}
