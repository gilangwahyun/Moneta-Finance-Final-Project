import { NextRequest, NextResponse } from "next/server";
import { getUsersDueForReminder } from "@/lib/notifications/server-reminder";
import { sendAndLogPushNotification } from "@/lib/notifications";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

export const dynamic = "force-dynamic";

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * Endpoint for triggering daily reminder via a cron job (e.g. GitHub Actions).
 * Schedule: Expected to be called exactly once a day (e.g. 20:00 WIB).
 */
export async function GET(req: NextRequest) {
  try {
    // 1. Authenticate Request
    const authHeader = req.headers.get("authorization");
    
    const url = new URL(req.url);
    const querySecret = url.searchParams.get("secret");
    
    const providedSecret = authHeader 
      ? authHeader.replace("Bearer ", "").trim() 
      : querySecret;
      
    const expectedSecret = process.env.CRON_SECRET;

    if (!expectedSecret || expectedSecret.trim() === "") {
      console.error("[CronReminder] Missing CRON_SECRET environment variable");
      return NextResponse.json({ error: "Server Configuration Error" }, { status: 500 });
    }

    if (providedSecret !== expectedSecret) {
      console.warn("[CronReminder] Unauthorized attempt to trigger cron");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const nowWIB = dayjs().tz("Asia/Jakarta");
    const todayWIBStr = nowWIB.format("YYYY-MM-DD");

    // 2. Fetch Eligible Users (0 transactions today)
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

    // 3. Process each user independently
    let sentCount = 0;
    let failedCount = 0;
    const details: any[] = [];

    await Promise.allSettled(
      candidateIds.map(async (userId) => {
        try {
          const title = "Catatan Keuangan";
          const body = "Belum ada transaksi yang dicatat hari ini. Ketuk untuk memperbarui.";
          
          // sendAndLogPushNotification will naturally dedupe if called twice
          // However, we want a daily dedupe key specific to REMINDER
          // sendAndLogPushNotification auto-generates dedupeKey based on date/type if omitted
          // But to be explicit, we pass "REMINDER" type.
          
          await sendAndLogPushNotification(
            userId,
            title,
            body,
            "REMINDER"
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

  } catch (error: any) {
    console.error("[CronReminder] Unhandled error during cron execution:", error);
    return NextResponse.json(
      { 
        error: "Failed to execute cron job", 
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
