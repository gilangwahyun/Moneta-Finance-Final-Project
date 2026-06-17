import { NextRequest, NextResponse } from "next/server";
import { 
  getUsersDueForDigest, 
  buildServerDigestContent, 
  markLogsAsDigested 
} from "@/lib/notifications/server-digest";
import { sendAndLogPushNotification } from "@/lib/notifications";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

// Ensure the endpoint is treated as dynamic and not cached
export const dynamic = "force-dynamic";

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * Endpoint for triggering daily digests via a cron job (e.g. GitHub Actions).
 * Schedule: Expected to be called every 15 minutes.
 */
export async function GET(req: NextRequest) {
  try {
    // 1. Authenticate Request
    const authHeader = req.headers.get("authorization");
    
    // Fallback support for query params if headers cannot be set (not recommended but useful for some crons)
    const url = new URL(req.url);
    const querySecret = url.searchParams.get("secret");
    
    const providedSecret = authHeader 
      ? authHeader.replace("Bearer ", "").trim() 
      : querySecret;
      
    const expectedSecret = process.env.CRON_SECRET;

    if (!expectedSecret || expectedSecret.trim() === "") {
      console.error("[CronDigest] Missing CRON_SECRET environment variable");
      return NextResponse.json({ error: "Server Configuration Error" }, { status: 500 });
    }

    if (providedSecret !== expectedSecret) {
      console.warn("[CronDigest] Unauthorized attempt to trigger cron");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const nowWIB = dayjs().tz("Asia/Jakarta");
    const todayWIBStr = nowWIB.format("YYYY-MM-DD");

    // 2. Fetch Eligible Users
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

    // 3. Process each user independently
    let sentCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    const details: any[] = [];

    const results = await Promise.allSettled(
      candidates.map(async (user) => {
        try {
          // Build digest content from Postgres DB
          const digest = await buildServerDigestContent(user.userId);
          
          if (!digest.hasEligibleLogs) {
            skippedCount++;
            details.push({ userId: user.userId, status: "skipped", reason: "no_eligible_logs" });
            return;
          }

          // Send push and create "DIGEST" log in DB
          // This naturally prevents double sends via dedupeKey
          await sendAndLogPushNotification(
            user.userId,
            digest.title,
            digest.body,
            "DIGEST"
          );

          // Mark those raw logs as digested so they aren't processed again
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

  } catch (error: any) {
    console.error("[CronDigest] Unhandled error during cron execution:", error);
    return NextResponse.json(
      { 
        error: "Failed to execute cron job", 
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
