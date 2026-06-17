import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getAuthUser } from "@/lib/auth/middleware";

export async function GET(request: NextRequest) {
  try {
    const tokenPayload = await getAuthUser(request);
    if (!tokenPayload?.sub) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Tidak terautentikasi." } },
        { status: 401 }
      );
    }

    const userId = tokenPayload.sub;

    let settings = await prisma.notificationSettings.findUnique({
      where: { userId },
    });

    if (!settings) {
      // Buat pengaturan default (dinonaktifkan untuk baseline UCD)
      settings = await prisma.notificationSettings.create({
        data: {
          userId,
          isEnabled: false,
          deliveryMode: "BATCH",
          instantAlerts: false,
          dailyDigest: false,
          digestTime: "20:00",
        },
      });
    }

    return NextResponse.json({ success: true, data: { settings } });
  } catch (error) {
    console.error("GET /api/settings/notifications error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Gagal mengambil pengaturan." } },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const tokenPayload = await getAuthUser(request);
    if (!tokenPayload?.sub) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Tidak terautentikasi." } },
        { status: 401 }
      );
    }

    const userId = tokenPayload.sub;
    const body = await request.json();
    const { isEnabled, deliveryMode, instantAlerts, dailyDigest, digestTime } = body;

    // Derive isEnabled: true when at least one channel is active
    const resolvedEnabled =
      typeof isEnabled === "boolean"
        ? isEnabled
        : !!(instantAlerts || dailyDigest);

    const settings = await prisma.notificationSettings.upsert({
      where: { userId },
      update: {
        ...(typeof resolvedEnabled === "boolean" && { isEnabled: resolvedEnabled }),
        ...(typeof deliveryMode === "string" && { deliveryMode }),
        ...(typeof instantAlerts === "boolean" && { instantAlerts }),
        ...(typeof dailyDigest === "boolean" && { dailyDigest }),
        ...(typeof digestTime === "string" && { digestTime }),
      },
      create: {
        userId,
        isEnabled: resolvedEnabled,
        deliveryMode: typeof deliveryMode === "string" ? deliveryMode : "BATCH",
        instantAlerts: typeof instantAlerts === "boolean" ? instantAlerts : false,
        dailyDigest: typeof dailyDigest === "boolean" ? dailyDigest : false,
        digestTime: typeof digestTime === "string" ? digestTime : "20:00",
      },
    });

    return NextResponse.json({ success: true, data: { settings } });
  } catch (error) {
    console.error("PATCH /api/settings/notifications error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Gagal menyimpan pengaturan." } },
      { status: 500 }
    );
  }
}
