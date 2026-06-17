// ─── Daily Digest Aggregation Helper ────────────────────
// Two separate concepts live in this file:
//
// 1. buildLogDigest(userId)
//    The correct implementation of the DIGEST delivery mode.
//    Reads today's notification_logs and produces ONE summary notification
//    that the user receives as their "daily digest."
//    Called by startDigestTimer() when deliveryMode === "DIGEST".
//
// 2. buildDailyExpenseSummary(userId)  [formerly buildDailyDigest]
//    Produces a financial expense summary based on today's transactions.
//    This is a DAILY_EXPENSE_SUMMARY notification event type — useful as a
//    scheduled financial insight — but it is NOT the DIGEST delivery mechanism.
//    Kept for reference; do not call from startDigestTimer().
//
// This runs entirely client-side from IndexedDB — no server call needed.

import { getDB } from "../local-db/index";
import { STORES } from "../local-db/schema";
import { getAllLogs } from "../local-db/repositories/notification-logs";

// ─── 1. Log-Based Digest (DIGEST delivery mode) ─────────────────────────────

export interface LogDigestResult {
  title: string;
  body: string;
  logCount: number;
  hasEligibleLogs: boolean;
  clientIds: string[];
}

/**
 * Build one digest notification that summarizes today's notification logs.
 *
 * This is the correct implementation of the DIGEST delivery mode:
 *   - Reads notification_logs for today (filtered by createdAt date).
 *   - Counts logs by severity to build a meaningful summary.
 *   - Returns hasEligibleLogs=false if there are no logs to summarize.
 *     The caller (startDigestTimer) must NOT send a digest if hasEligibleLogs is false.
 *
 * Short-term: uses createdAt date filter to identify today's logs.
 * Long-term (Phase 4): use digestSentAt to avoid including logs in multiple digests.
 *
 * @param userId  The current user's ID
 */
export function getWIBDateParts(date: Date) {
  // Use Intl.DateTimeFormat to reliably extract parts in WIB
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).formatToParts(date);
  
  const map: Record<string, string> = {};
  for (const part of parts) map[part.type] = part.value;
  
  // Fix "24" hour edge case with hour12: false
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

/**
 * Build a summary string/object containing the important insights for the day.
 * Includes user context (which insights triggered).
 */
export async function buildLogDigest(userId: string): Promise<LogDigestResult> {
  const allLogs = await getAllLogs(userId);
  const now = new Date();
  const todayWIBStr = getWIBDateParts(now).dateStr;

  // Filter: logs created today (WIB time) with status='delivered', DIGEST mode, not a digest itself
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

  // Digest ranking logic based on metadata
  // 1. Highest deficitAmount
  // 2. Reallocation recommendation
  // 3. Highest usageRatio
  // 4. Largest comparisonAmount
  
  let topLog = todayLogs[0];
  let highestDeficit = -1;
  let hasReallocation = false;
  let highestUsage = -1;
  let largestComparison = -1;
  let rankingScore = -1; // 4: Deficit, 3: Reallocation, 2: Usage, 1: Comparison, 0: Other

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

  return { title, body, logCount: todayLogs.length, hasEligibleLogs: true, clientIds: todayLogs.map(l => l.clientId) };
}

// ─── 2. Transaction Expense Summary (DAILY_EXPENSE_SUMMARY event type) ──────
//
// NOTE: This is NOT the DIGEST delivery mechanism.
// It is a separate notification event type that summarizes today's transactions.
// If the product wants to keep this feature, it should be treated as an event
// (eventType = DAILY_EXPENSE_SUMMARY) that is then delivered via the active mode:
//   - INSTANT: push at scheduled time
//   - DIGEST:  include in the digest as one of the summarized events
//   - OFF:     no push, log only

interface DailyExpenseSummaryResult {
  title: string;
  body: string;
  todayTotal: number;
  transactionCount: number;
  weeklyAverage: number;
}

/**
 * Format a number as Rupiah (e.g. 50000 → "Rp 50.000")
 */
function fmtRupiah(amount: number): string {
  return "Rp " + Math.round(amount).toLocaleString("id-ID");
}

/**
 * Aggregate today's transactions from IndexedDB and compute an expense summary.
 *
 * @deprecated for use as DIGEST delivery — use buildLogDigest() for that.
 * This function produces a DAILY_EXPENSE_SUMMARY event type content.
 * @param userId  The current user's ID
 */
export async function buildDailyExpenseSummary(
  userId: string
): Promise<DailyExpenseSummaryResult> {
  const db = await getDB();

  // ── Fetch all non-deleted expense transactions for this user ──────────────
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

  // ── Today's expenses ──────────────────────────────────────────────────────
  const todayTxns = allTxns.filter(
    (t) => (t.date || "").substring(0, 10) === today
  );
  const todayTotal = todayTxns.reduce((s, t) => s + Number(t.amount), 0);
  const transactionCount = todayTxns.length;

  // ── 7-day rolling average (excluding today) ───────────────────────────────
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

  // ── Generate copy ─────────────────────────────────────────────────────────
  const title = "Ringkasan Keuangan Hari Ini";
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

// ─── Backward-compat alias ───────────────────────────────────────────────────
// Existing callers of buildDailyDigest() continue to work.
// Migrate to buildDailyExpenseSummary() in a future cleanup.
/** @deprecated Use buildDailyExpenseSummary() or buildLogDigest() instead. */
export const buildDailyDigest = buildDailyExpenseSummary;

// ─── Digest timing check ─────────────────────────────────────────────────────

/**
 * Check whether the daily digest should fire right now.
 * Returns true if the current local time matches the user's digestTime
 * or is up to 5 minutes late, and today's digest has not yet been sent.
 * It will NEVER fire early.
 *
 * @param digestTime  "HH:MM" string from user preferences
 * @param lastFiredAt ISO string of the last time the digest was fired (or null)
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

  // Has this EXACT digest already fired today in WIB?
  if (lastFired) {
    if (lastFired.digestDateKey === todayStr && lastFired.digestTime === digestTime) {
      return { shouldFire: false, reason: "already_fired_for_this_time_today" };
    }
  }

  // Calculate minutes since midnight
  const nowMinutes = wibNow.hour * 60 + wibNow.minute;
  const digestMinutes = targetH * 60 + targetM;
  
  // Tolerance is 5 minutes (late-only)
  const toleranceMinutes = 5;
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
      return { shouldFire: false, reason: "too_early" };
    }
    return { shouldFire: false, reason: "outside_time_window" };
  }

  return { shouldFire: true, reason: "no_existing_fired_key" };
}
