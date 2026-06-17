import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getAuthUser } from "@/lib/auth/middleware";
import { validateCsrfToken } from "@/lib/auth/csrf";

/**
 * Expected Payload Shape from the PushManager (client-side):
 * {
 *   endpoint: string,
 *   keys: {
 *     p256dh: string,
 *     auth: string
 *   }
 * }
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate Request
    const payload = await getAuthUser(req);
    const userId = payload?.sub;

    if (!userId) {
       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // CSRF check
    const csrfError = validateCsrfToken(req);
    if (csrfError) return csrfError;

    // 2. Parse Subscription Body
    const body = await req.json();
    const { endpoint, keys } = body;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json(
        { error: "Invalid subscription payload" },
        { status: 400 }
      );
    }

    // 3. Save to Prisma DB
    // Manual find-then-create/update avoids the WhereUniqueInput
    // ambiguity that arises from the named @@unique constraint.
    const existing = await (prisma as any).notificationSubscription.findFirst({
      where: { endpoint },
      select: { id: true },
    });

    let subscription;
    if (existing) {
      // Update existing subscription (e.g. user logged into different account)
      subscription = await (prisma as any).notificationSubscription.update({
        where: { id: existing.id },
        data: {
          userId: userId,
          p256dh: keys.p256dh,
          auth: keys.auth,
        },
      });
    } else {
      // Create new subscription
      subscription = await (prisma as any).notificationSubscription.create({
        data: {
          endpoint: endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
          userId: userId,
        },
      });
    }

    return NextResponse.json(
      { success: true, message: "Subscription saved", id: subscription.id },
      { status: 200 }
    );

  } catch (error: any) {
    console.error("Error saving push subscription:", error);
    return NextResponse.json(
      { 
        error: "Failed to save subscription",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    // 1. Authenticate Request
    const payload = await getAuthUser(req);
    const userId = payload?.sub;

    if (!userId) {
       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // CSRF check
    const csrfErrorDel = validateCsrfToken(req);
    if (csrfErrorDel) return csrfErrorDel;

    // 2. Parse Subscription Body to find the exact endpoint to remove
    const body = await req.json();
    const { endpoint } = body;

    if (!endpoint) {
      return NextResponse.json(
        { error: "Endpoint required for unsubscription" },
        { status: 400 }
      );
    }

    // 3. Delete from Prisma DB
    await prisma.notificationSubscription.deleteMany({
      where: {
        endpoint: endpoint,
        userId: userId, // Ensure users can only delete their own subscriptions
      },
    });

    return NextResponse.json(
      { success: true, message: "Subscription removed" },
      { status: 200 }
    );

  } catch (error: any) {
    console.error("Error removing push subscription:", error);
    return NextResponse.json(
      { 
        error: "Failed to remove subscription",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
