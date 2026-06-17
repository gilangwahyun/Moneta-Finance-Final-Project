// ─── POST /api/notifications/test ───────────────────────
// Developer endpoint to fire a real push notification to the
// currently authenticated user and verify the full pipeline:
//
//   PushManager → webpush.sendNotification() → NotificationLog row created
//
// After calling this endpoint, verify in your DB:
//   SELECT * FROM notification_logs ORDER BY sent_at DESC LIMIT 1;
//
// Then click the notification in the OS tray and check:
//   SELECT status FROM notification_logs WHERE id = '<logId>';
//   -- should be 'read' if the Service Worker mark-read call succeeded

import { NextRequest, NextResponse } from "next/server";
import { sendAndLogPushNotification } from "@/lib/notifications";
import { getAuthUser } from "@/lib/auth/middleware";
import { validateCsrfToken } from "@/lib/auth/csrf";

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate Request
    const authPayload = await getAuthUser(req);
    const userId = authPayload?.sub;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // CSRF check
    const csrfError = validateCsrfToken(req);
    if (csrfError) return csrfError;

    // 2. Send & log — uses the research-grade utility
    const log = await sendAndLogPushNotification(
      userId,
      "Moneta Finance",
      "Test notification — your push pipeline is working! 🎉",
      "system"
    );

    return NextResponse.json({
      success: true,
      message: "Test notification sent and logged.",
      logId: log.id,     // Useful for verifying click-tracking in the DB
      status: log.status, // 'sent' or 'failed'
    });
  } catch (error: any) {
    console.error("[test] Error sending test push:", error);
    return NextResponse.json(
      { 
        error: "Failed to send test notification", 
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
