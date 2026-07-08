/********** API endpoint (GET /api/sync/pull) yang mengembalikan semua rekod yang diperbarui setelah timestamp `lastSyncedAt`.
 *  Mendukung parameter `limit` opsional untuk paginasi.
 *  Klien akan menyimpan `serverTime` yang dikembalikan untuk sinkronisasi (pull) berikutnya.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getAuthUser } from "@/lib/auth/middleware";
import { SyncPullResponse } from "@/types/sync.types";

const DEFAULT_LIMIT = 500; /* Batas maksimal rekod per entitas pada setiap pull biasa. */
const HYDRATE_LIMIT = 5000; /* Batas lebih tinggi saat hidrasi data awal. */

export async function GET(request: NextRequest) {
  try {
    /********** 1. Pengecekan Autentikasi. */
    const tokenPayload = await getAuthUser(request);
    if (!tokenPayload || !tokenPayload.sub) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated." } },
        { status: 401 }
      );
    }

    const userId = tokenPayload.sub;

    /********** 2. Validasi Eksistensi User di DB (pencegahan JWT stale setelah reset DB). */
    const userExists = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!userExists) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Session expired. Please log out and log back in." } },
        { status: 401 }
      );
    }

    /********** 3. Parsing Parameter Query. */
    const { searchParams } = new URL(request.url);
    const lastSyncedAt = searchParams.get("lastSyncedAt");
    const limitParam = searchParams.get("limit");
    const mode = searchParams.get("mode"); /* "hydrate" untuk tarikan data awal. */
    const maxLimit = mode === "hydrate" ? HYDRATE_LIMIT : DEFAULT_LIMIT;
    const limit = limitParam ? Math.min(parseInt(limitParam, 10), maxLimit) : maxLimit;

    const sinceDate = lastSyncedAt ? new Date(lastSyncedAt) : new Date(0);
    const isHydrate = mode === "hydrate";

    /********** 4. Hitung Batas Waktu 3 Bulan untuk Mode Hidrasi. */
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    threeMonthsAgo.setHours(0, 0, 0, 0);

    const pullPerfStart = performance.now();
    // console.log(`[PullPerf] since=${sinceDate.toISOString()} mode=${mode}`);

    /********** Fetch Entitas Secara Paralel **********/
    /********** Mengambil semua entitas independen secara bersamaan dari DB. */
    const queriesStart = performance.now();
    const [wallets, categories, transactions, budgets, financialTargets, notificationLogs, notificationSettings] = await Promise.all([
      prisma.wallet.findMany({
        where: {
          userId,
          ...(isHydrate ? {} : { updatedAt: { gt: sinceDate } }),
        },
        orderBy: { updatedAt: "asc" },
        take: limit + 1,
      }),
      prisma.category.findMany({
        where: {
          userId,
          ...(isHydrate ? {} : { updatedAt: { gt: sinceDate } }),
        },
        orderBy: { updatedAt: "asc" },
        take: limit + 1,
      }),
      prisma.transaction.findMany({
        where: {
          userId,
          ...(isHydrate
            ? { date: { gte: threeMonthsAgo } }
            : { updatedAt: { gt: sinceDate } }),
        },
        orderBy: isHydrate ? { date: "desc" } : { updatedAt: "asc" },
        take: limit + 1,
      }),
      prisma.budget.findMany({
        where: {
          userId,
          ...(isHydrate ? {} : { updatedAt: { gt: sinceDate } }),
        },
        orderBy: { updatedAt: "asc" },
        take: limit + 1,
      }),
      prisma.financialTarget.findMany({
        where: {
          userId,
          ...(isHydrate ? {} : { updatedAt: { gt: sinceDate } }),
        },
        orderBy: { updatedAt: "asc" },
        take: limit + 1,
      }),
      prisma.notificationLog.findMany({
        where: {
          userId,
          ...(isHydrate ? {} : { updatedAt: { gt: sinceDate } }),
        },
        orderBy: { updatedAt: "asc" },
        take: limit + 1,
      }),
      prisma.notificationSettings.findMany({
        where: {
          userId,
          ...(isHydrate ? {} : { updatedAt: { gt: sinceDate } }),
        },
        orderBy: { updatedAt: "asc" },
        take: 2, /* User maksimal memiliki 1 pengaturan. */
      })
    ]);
    const queriesTime = performance.now() - queriesStart;
    // console.log(`[PullPerf] Parallel queries: ${queriesTime.toFixed(0)}ms (wallets: ${wallets.length}, categories: ${categories.length}, transactions: ${transactions.length}, budgets: ${budgets.length}, notification_logs: ${notificationLogs.length})`);

    /********** Tentukan apakah masih ada rekod tersisa di server. */
    const hasMoreWallets = wallets.length > limit;
    const hasMoreCategories = categories.length > limit;
    const hasMoreTransactions = transactions.length > limit;
    const hasMoreBudgets = budgets.length > limit;
    const hasMoreTargets = financialTargets.length > limit;
    const hasMoreLogs = notificationLogs.length > limit;
    const hasMoreSettings = notificationSettings.length > 1; /* Seharusnya tidak lebih dari 1, namun untuk konsistensi pengecekan. */
    const hasMore = hasMoreWallets || hasMoreCategories || hasMoreTransactions || hasMoreBudgets || hasMoreTargets || hasMoreLogs || hasMoreSettings;

    /********** Potong array sesuai batas limit aktual. */
    const trimmedWallets = hasMoreWallets ? wallets.slice(0, limit) : wallets;
    const trimmedCategories = hasMoreCategories ? categories.slice(0, limit) : categories;
    const trimmedTransactions = hasMoreTransactions ? transactions.slice(0, limit) : transactions;
    const trimmedBudgets = hasMoreBudgets ? budgets.slice(0, limit) : budgets;
    const trimmedTargets = hasMoreTargets ? financialTargets.slice(0, limit) : financialTargets;
    const trimmedLogs = hasMoreLogs ? notificationLogs.slice(0, limit) : notificationLogs;
    const trimmedSettings = hasMoreSettings ? notificationSettings.slice(0, 1) : notificationSettings;

    /********** Pemetaan Server ID ke Client ID **********/
    const categoryServerIdToClientId = new Map<string, string>();
    const walletServerIdToClientId = new Map<string, string>();

    /********** Masukkan semua item yang sudah dipotong ke dalam map. */
    for (const c of trimmedCategories) categoryServerIdToClientId.set(c.id, c.clientId);
    for (const w of trimmedWallets) walletServerIdToClientId.set(w.id, w.clientId);

    /********** Kumpulkan ID server kategori dan dompet yang direferensikan oleh transaksi dan budget yang mungkin TIDAK ada dalam delta saat ini. */
    const missingCatIds = [
      ...trimmedTransactions.map((t) => t.categoryId).filter(Boolean),
      ...trimmedBudgets.map((b) => b.categoryId),
      ...trimmedTargets.map((t) => t.categoryId).filter(Boolean),
    ].filter((id) => id && !categoryServerIdToClientId.has(id));

    const missingWalletIds = [
      ...trimmedTransactions.map((t) => t.walletId),
      ...trimmedTransactions.map((t) => t.targetWalletId).filter(Boolean),
      ...trimmedTargets.map((t) => t.walletId).filter(Boolean),
    ].filter((id) => id && !walletServerIdToClientId.has(id));

    const relationPromises: Promise<void>[] = [];

    if (missingCatIds.length > 0) {
      relationPromises.push(
        prisma.category.findMany({
          where: { id: { in: [...new Set(missingCatIds as string[])] } },
          select: { id: true, clientId: true },
        }).then((missingCats) => {
          for (const mc of missingCats) categoryServerIdToClientId.set(mc.id, mc.clientId);
        })
      );
    }

    if (missingWalletIds.length > 0) {
      relationPromises.push(
        prisma.wallet.findMany({
          where: { id: { in: [...new Set(missingWalletIds as string[])] } },
          select: { id: true, clientId: true },
        }).then((missingWallets) => {
          for (const mw of missingWallets) walletServerIdToClientId.set(mw.id, mw.clientId);
        })
      );
    }

    if (relationPromises.length > 0) {
      await Promise.all(relationPromises);
    }

    const response: SyncPullResponse = {
      wallets: trimmedWallets.map((w: any) => ({
        id: w.id,
        clientId: w.clientId,
        name: w.name,
        type: w.type,
        initialBalance: Number(w.initialBalance),
        userId: w.userId,
        syncStatus: w.syncStatus,
        createdAt: w.createdAt.toISOString(),
        updatedAt: w.updatedAt.toISOString(),
        deletedAt: w.deletedAt?.toISOString() ?? null,
      })),
      categories: trimmedCategories.map((c: any) => ({
        id: c.id,
        clientId: c.clientId,
        name: c.name,
        type: c.type,
        icon: c.icon,
        color: c.color,
        isDefault: false,
        userId: c.userId,
        syncStatus: c.syncStatus,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
        deletedAt: c.deletedAt?.toISOString() ?? null,
      })),
      transactions: trimmedTransactions.map((t: any) => ({
        id: t.id,
        clientId: t.clientId,
        amount: Number(t.amount),
        type: t.type,
        description: t.description,
        note: t.note,
        date: t.date.toISOString(),
        /********** Ubah FK server ke clientId agar client dapat mencarinya di IndexedDB lokal. */
        categoryId: (t.categoryId ? categoryServerIdToClientId.get(t.categoryId) : null) || t.categoryId,
        walletId: walletServerIdToClientId.get(t.walletId) || t.walletId,
        targetWalletId: (t.targetWalletId ? walletServerIdToClientId.get(t.targetWalletId) : null) || t.targetWalletId,
        userId: t.userId,
        syncStatus: t.syncStatus,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
        deletedAt: t.deletedAt?.toISOString() ?? null,
      })),
      budgets: trimmedBudgets.map((b: any) => ({
        id: b.id,
        clientId: b.clientId,
        amount: Number(b.amount),
        period: b.period,
        categoryId: categoryServerIdToClientId.get(b.categoryId) || b.categoryId,
        userId: b.userId,
        syncStatus: b.syncStatus,
        createdAt: b.createdAt.toISOString(),
        updatedAt: b.updatedAt.toISOString(),
        deletedAt: b.deletedAt?.toISOString() ?? null,
      })),
      financial_targets: trimmedTargets.map((t: any) => ({
        id: t.id,
        clientId: t.clientId,
        name: t.name,
        type: t.type,
        targetAmount: Number(t.targetAmount),
        period: t.period,
        startDate: t.startDate.toISOString(),
        endDate: t.endDate?.toISOString() ?? null,
        categoryId: (t.categoryId ? categoryServerIdToClientId.get(t.categoryId) : null) || t.categoryId,
        walletId: (t.walletId ? walletServerIdToClientId.get(t.walletId) : null) || t.walletId,
        isActive: t.isActive,
        note: t.note,
        userId: t.userId,
        syncStatus: t.syncStatus,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
        deletedAt: t.deletedAt?.toISOString() ?? null,
      })),
      notification_logs: trimmedLogs.map((l: any) => ({
        clientId: l.clientId,
        userId: l.userId,
        dedupeKey: l.dedupeKey,
        type: l.type,
        eventType: l.eventType,
        deliveryModeAtCreation: l.deliveryModeAtCreation,
        title: l.title,
        body: l.body,
        status: l.status,
        severity: l.severity,
        source: l.source,
        /********** Server menyimpan relatedTransactionId sebagai ID server, sedangkan client membutuhkan clientId. Karena pusat notifikasi client tidak secara ketat membutuhkannya, kita langsung kembalikan apa yang ada ke relatedTransactionClientId untuk saat ini. */
        relatedTransactionClientId: l.relatedTransactionId,
        relatedCategoryId: l.relatedCategoryId,
        relatedBudgetId: l.relatedBudgetId,
        ctaRoute: l.ctaRoute,
        actionType: l.actionType,
        ctaLabel: l.ctaLabel,
        sourceBudgetId: l.sourceBudgetId,
        targetBudgetId: l.targetBudgetId,
        recommendedAmount: l.recommendedAmount,
        categoryName: l.categoryName,
        usageRatio: l.usageRatio,
        budgetLimit: l.budgetLimit,
        budgetSpent: l.budgetSpent,
        deficitAmount: l.deficitAmount,
        todayAmount: l.todayAmount,
        comparisonAmount: l.comparisonAmount,
        comparisonLabel: l.comparisonLabel,
        sourceCategoryName: l.sourceCategoryName,
        targetCategoryName: l.targetCategoryName,
        readAt: l.readAt?.toISOString() ?? null,
        dismissedAt: l.dismissedAt?.toISOString() ?? null,
        pushedAt: l.pushedAt?.toISOString() ?? null,
        digestSentAt: l.digestSentAt?.toISOString() ?? null,
        createdAt: l.createdAt.toISOString(),
        updatedAt: l.updatedAt.toISOString(),
      })),
      notification_settings: trimmedSettings.map((s: any) => {
        console.log('[DailyCapPullDebug]', {
          serverDailyCap: s.dailyCap,
          appliedLocalDailyCap: s.dailyCap === -1 ? -1 : (typeof s.dailyCap === "number" && s.dailyCap > 0 ? s.dailyCap : 5)
        });
        return {
          clientId: `notification-settings:${s.userId}`,
          isEnabled: s.isEnabled,
          deliveryMode: s.deliveryMode,
          instantAlerts: s.instantAlerts,
          dailyDigest: s.dailyDigest,
          digestTime: s.digestTime,
          dailyCap: s.dailyCap,
          updatedAt: s.updatedAt.toISOString(),
        };
      }),
      serverTime: new Date().toISOString(),
      hasMore,
    };

    const payloadString = JSON.stringify({ success: true, data: response });
    const payloadSize = (new TextEncoder().encode(payloadString).length / 1024).toFixed(2);
    const totalTime = performance.now() - pullPerfStart;
    // console.log(`[PullPerf] total: ${totalTime.toFixed(0)}ms`);
    // console.log(`[PullPerf] payloadSize: ${payloadSize}KB`);

    return NextResponse.json({ success: true, data: response });
  } catch (error) {
    console.error("Sync pull error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Sync pull failed." } },
      { status: 500 }
    );
  }
}
