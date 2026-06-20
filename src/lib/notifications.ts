//********** START: Push Notification Utility (Research Instrument) **********
//********** This is the core sending function for the digital nudge study.
//**********
//********** Every call to sendAndLogPushNotification() does three things atomically:
//**********   1. Creates a NotificationLog row (optimistic - status = 'sent')
//**********   2. Embeds the log's UUID in the push payload so the SW can call
//**********      /api/notifications/mark-read when the user clicks
//**********   3. Patches the log to status = 'failed' if ALL sends fail
//**********
//********** The logId strategy (UUID-in-payload) is the best-practice approach
//********** for click-tracking in Service Workers. It avoids storing credentials
//********** in the SW context while remaining cryptographically unguessable.
//********** END: Push Notification Utility (Research Instrument) **********

import webpush from "web-push";
import { prisma } from "./db/prisma";

//********** VAPID configuration **********
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || "";
const vapidSubject =
  process.env.VAPID_SUBJECT || "mailto:admin@monetafinance.com";

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
} else {
  console.warn(
    "[Notifications] VAPID keys are missing. Push notifications will not work."
  );
}

//********** Types **********

/**
 * The shape of the JSON payload pushed to the browser.
 * The Service Worker parses this in the 'push' event handler.
 */
export interface PushPayload {
  title: string;
  body: string;
  type: string;
  //********** UUID of the NotificationLog row - used by the SW to call mark-read
  logId: string;
}

//********** sendAndLogPushNotification **********

/**
 * Sends a Web Push notification to all active browser subscriptions
 * for the given user, and durably logs the result to the database.
 *
 * This function is the sole entry point for all push sends in the app.
 * It must be used instead of calling webpush.sendNotification() directly
 * so that the research audit trail is never bypassed.
 *
 * @param userId - Target user's ID
 * @param title  - Notification title (shown in the OS notification tray)
 * @param body   - Notification body text
 * @param type   - Nudge classification string, e.g. 'system', 'nudge_neutral'
 *
 * @returns The created NotificationLog record (regardless of send result)
 */
export async function sendAndLogPushNotification(
  userId: string,
  title: string,
  body: string,
  type: string,
  dedupeKey?: string
) {
  const finalDedupeKey = dedupeKey || crypto.randomUUID();
  //********** 1. Fetch the user's push subscriptions **********
  const subscriptions = await prisma.notificationSubscription.findMany({
    where: { userId },
  });

  if (subscriptions.length === 0) {
    console.warn(
      `[Notifications] No push subscriptions found for user: ${userId}`
    );
    //********** Still create a failed log so the researcher knows a nudge was attempted
    //********** but could not be delivered (e.g. user never granted permission).
    if (!prisma.notificationLog) {
      console.error("[Notifications] CRITICAL: prisma.notificationLog is undefined!");
      console.error("[Notifications] Available models:", Object.keys(prisma).filter(k => !k.startsWith('$')));
    }

    return await (prisma as any).notificationLog.create({
      data: {
        userId,
        title,
        body,
        type,
        status: "failed",
        dedupeKey: finalDedupeKey,
      },
    });
  }

  //********** 2. Create the log row BEFORE sending (optimistic) **********
  //********** Creating it first means we always have a record even if the process
  //********** crashes mid-send. We capture the `id` to embed in the push payload.
  if (!prisma.notificationLog) {
     console.error("[Notifications] CRITICAL: prisma.notificationLog is undefined before optimistic create!");
  }

  const log = await (prisma as any).notificationLog.create({
    data: {
      userId,
      title,
      body,
      type,
      status: "sent", //********** Optimistic - patched to 'failed' below if needed
      dedupeKey: finalDedupeKey,
    },
  });

  //********** 3. Build the payload with logId for click tracking **********
  const payload: PushPayload = {
    title,
    body,
    type,
    logId: log.clientId, //********** <- Must use clientId for SyncManager compatibility!
  };
  const payloadString = JSON.stringify(payload);

  //********** 4. Send to all subscriptions **********
  let anySucceeded = false;

  const results = await Promise.allSettled(
    subscriptions.map(async (sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };

      try {
        await webpush.sendNotification(pushSubscription, payloadString, {
          urgency: "high",
          TTL: 86400,
        });
        anySucceeded = true;
        console.log(
          `[Notifications] Sent to subscription ${sub.id} (clientId: ${log.clientId})`
        );
      } catch (error: unknown) {
        const webPushError = error as { statusCode?: number; message?: string };
        console.error(
          `[Notifications] Failed to send to subscription ${sub.id}:`,
          webPushError.message
        );

        //********** 410 Gone / 404 Not Found = the browser subscription has been revoked.
        //********** Remove it from the DB to prevent future failed attempts.
        if (
          webPushError.statusCode === 410 ||
          webPushError.statusCode === 404
        ) {
          console.log(
            `[Notifications] Removing expired subscription: ${sub.id}`
          );
          await prisma.notificationSubscription
            .delete({ where: { id: sub.id } })
            .catch((deleteErr) => {
              //********** Non-fatal - log and continue
              console.error(
                `[Notifications] Could not delete subscription ${sub.id}:`,
                deleteErr
              );
            });
        }

        //********** Re-throw so Promise.allSettled records this as rejected
        throw error;
      }
    })
  );

  //********** 5. Patch log to 'failed' if ALL sends failed **********
  //********** If at least one device received the notification, we keep status = 'sent'.
  //********** Partial delivery is still considered a sent nudge for research purposes.
  if (!anySucceeded) {
    const failureReasons = results
      .filter((r): r is PromiseRejectedResult => r.status === "rejected")
      .map((r) => String(r.reason))
      .join("; ");

    console.error(
      `[Notifications] All sends failed for logId ${log.id}: ${failureReasons}`
    );

    await prisma.notificationLog.update({
      where: { id: log.id },
      data: { status: "failed" },
    });
  }

  return log;
}
