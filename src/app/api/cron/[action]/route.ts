import { NextRequest, NextResponse } from "next/server";
import { getUsersDueForDigest, buildServerDigestContent, markLogsAsDigested } from "@/lib/notifications/server-digest";
import { getUsersDueForReminder } from "@/lib/notifications/server-reminder";
import { sendAndLogPushNotification } from "@/lib/notifications";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

// Ensure the endpoint is treated as dynamic and not cached
export const dynamic = "force-dynamic";

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * Endpoint for triggering daily digests OR daily reminders via cron jobs.
 * This is combined into a single dynamic route to save Vercel Serverless Function limits.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ action: string }> }
) {
  try {
    const { action } = await params;

    if (action !== "digest" && action !== "reminder") {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    // 1. Authenticate Request
    const authHeader = req.headers.get("authorization");
    
    // Fallback support for query params if headers cannot be set
    const url = new URL(req.url);
    const querySecret = url.searchParams.get("secret");
    
    const providedSecret = authHeader 
      ? authHeader.replace("Bearer ", "").trim() 
      : querySecret;
      
    const expectedSecret = process.env.CRON_SECRET;

    if (!expectedSecret || expectedSecret.trim() === "") {
      console.error(`[Cron${action}] Missing CRON_SECRET environment variable`);
      return NextResponse.json({ error: "Server Configuration Error" }, { status: 500 });
    }

    if (providedSecret !== expectedSecret) {
      console.warn(`[Cron${action}] Unauthorized attempt to trigger cron`);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Route to the correct logic
    if (action === "digest") {
      return await handleDigest();
    } else if (action === "reminder") {
      return await handleReminder();
    }

  } catch (error: any) {
    console.error("[CronController] Unhandled error during cron execution:", error);
    return NextResponse.json(
      { 
        error: "Failed to execute cron job", 
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

// ─── DIGEST LOGIC ────────────────────────────────────────────────────────────
async function handleDigest() {
  const candidates = await getUsersDueForDigest();
    
  if (candidates.length === 0) {
    return NextResponse.json({
      success: true,
      message: "No users due for digest at this time",
      processed: 0,
      sent: 0,
      skipped: 0,
      failed: 0,
      details: []
    });
  }

  let sentCount = 0;
  let skippedCount = 0;
  let failedCount = 0;
  const details: any[] = [];

  await Promise.allSettled(
    candidates.map(async (user) => {
      try {
        const digest = await buildServerDigestContent(user.userId);
        
        if (!digest.hasEligibleLogs) {
          skippedCount++;
          details.push({ userId: user.userId, status: "skipped", reason: "no_eligible_logs" });
          return;
        }

        await sendAndLogPushNotification(
          user.userId,
          digest.title,
          digest.body,
          "DIGEST"
        );

        await markLogsAsDigested(digest.logIds, new Date());

        sentCount++;
        details.push({ userId: user.userId, status: "sent", logsAggregated: digest.logCount });

      } catch (err: any) {
        failedCount++;
        details.push({ userId: user.userId, status: "error", error: err.message });
        console.error(`[CronDigest] Error processing user ${user.userId}:`, err);
        throw err;
      }
    })
  );

  return NextResponse.json({
    success: true,
    message: "Cron execution completed",
    processed: candidates.length,
    sent: sentCount,
    skipped: skippedCount,
    failed: failedCount,
    details
  });
}

// ─── REMINDER LOGIC ──────────────────────────────────────────────────────────
async function handleReminder() {
  const candidateIds = await getUsersDueForReminder();
    
  if (candidateIds.length === 0) {
    return NextResponse.json({
      success: true,
      message: "No users due for reminder at this time",
      processed: 0,
      sent: 0,
      skipped: 0,
      failed: 0,
      details: []
    });
  }

  let sentCount = 0;
  let failedCount = 0;
  const details: any[] = [];

  await Promise.allSettled(
    candidateIds.map(async (userId) => {
      try {
        const title = "Catatan Keuangan";
        const body = "Belum ada transaksi yang dicatat hari ini. Ketuk untuk memperbarui.";
        
        const dedupeKey = `reminder_${userId}_${dayjs().tz("Asia/Jakarta").format("YYYYMMDD")}`;
        await sendAndLogPushNotification(
          userId,
          title,
          body,
          "REMINDER",
          dedupeKey
        );

        sentCount++;
        details.push({ userId, status: "sent" });

      } catch (err: any) {
        failedCount++;
        details.push({ userId, status: "error", error: err.message });
        console.error(`[CronReminder] Error processing user ${userId}:`, err);
        throw err;
      }
    })
  );

  return NextResponse.json({
    success: true,
    message: "Cron execution completed",
    processed: candidateIds.length,
    sent: sentCount,
    skipped: 0,
    failed: failedCount,
    details
  });
}
