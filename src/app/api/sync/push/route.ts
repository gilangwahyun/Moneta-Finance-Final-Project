/********** API endpoint (POST /api/sync/push) yang menerima bulk upsert dari IndexedDB klien.
 *  Menggunakan resolusi konflik "last write wins" berbasis timestamp.
 *  Membungkus seluruh operasi mutasi dalam satu transaksi Prisma demi atomicity.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getAuthUser } from "@/lib/auth/middleware";
import { validateCsrfToken } from "@/lib/auth/csrf";
import { SyncPushPayload, SyncPushResponse, SyncConflict } from "@/types/sync.types";

export async function POST(request: NextRequest) {
  try {
    /********** Pengecekan Autentikasi. */
    const tokenPayload = await getAuthUser(request);
    if (!tokenPayload || !tokenPayload.sub) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated." } },
        { status: 401 }
      );
    }

    /********** Pengecekan Token CSRF. */
    const csrfError = validateCsrfToken(request);
    if (csrfError) return csrfError;

    const userId = tokenPayload.sub;
    const payload: SyncPushPayload = await request.json();
    const conflicts: SyncConflict[] = [];
    let processedCount = 0;
    const synced = {
      wallets: [] as string[],
      categories: [] as string[],
      transactions: [] as string[],
      budgets: [] as string[],
      financial_targets: [] as string[],
      notification_logs: [] as string[],
      notification_settings: [] as string[],
    };

    /********** Validasi Eksistensi User di DB (pencegahan JWT stale setelah reset DB). */
    const userExists = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!userExists) {
      console.warn("[Sync Push] JWT references a non-existent user:", userId);
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Session expired. Please log out and log back in." } },
        { status: 401 }
      );
    }

    /********** Validasi Preflight untuk Log Notifikasi. */
    if (payload.notification_logs) {
      for (const log of payload.notification_logs) {
        if (!log.clientId) {
          return NextResponse.json({ success: false, error: { code: "VALIDATION_ERROR", message: "Missing clientId in notification_log.", meta: { entity: "notification_log", field: "clientId" } } }, { status: 400 });
        }
        if (!log.dedupeKey) {
          return NextResponse.json({ success: false, error: { code: "VALIDATION_ERROR", message: "Missing dedupeKey in notification_log.", meta: { entity: "notification_log", clientId: log.clientId, field: "dedupeKey" } } }, { status: 400 });
        }
        if (log.createdAt && isNaN(new Date(log.createdAt).getTime())) {
          return NextResponse.json({ success: false, error: { code: "VALIDATION_ERROR", message: "Invalid createdAt in notification_log.", meta: { entity: "notification_log", clientId: log.clientId, field: "createdAt" } } }, { status: 400 });
        }
        if (log.updatedAt && isNaN(new Date(log.updatedAt).getTime())) {
          return NextResponse.json({ success: false, error: { code: "VALIDATION_ERROR", message: "Invalid updatedAt in notification_log.", meta: { entity: "notification_log", clientId: log.clientId, field: "updatedAt" } } }, { status: 400 });
        }
      }
    }

    /********** Bulk Prefetching **********/
    /********** Mengambil semua entitas terkait secara paralel untuk meminimalkan query DB. */
    const prefetchStart = performance.now();
    const payloadWallets = payload.wallets || [];
    const payloadCategories = payload.categories || [];
    const payloadTransactions = payload.transactions || [];
    const payloadBudgets = payload.budgets || [];
    const payloadTargets = payload.financial_targets || [];
    const payloadLogs = payload.notification_logs || [];
    const payloadSettings = payload.notification_settings || [];

    const categoryIds = [...new Set([
      ...payloadCategories.map(c => c.clientId),
      ...payloadBudgets.map(b => b.categoryId),
      ...payloadTargets.map(t => t.categoryId).filter(Boolean),
      ...payloadTransactions.map(t => t.categoryId).filter(Boolean)
    ])];

    const walletIds = [...new Set([
      ...payloadWallets.map(w => w.clientId),
      ...payloadTargets.map(t => t.walletId).filter(Boolean),
      ...payloadTransactions.map(t => t.walletId).filter(Boolean),
      ...payloadTransactions.map(t => t.targetWalletId).filter(Boolean)
    ])];

    const transactionIds = [...new Set([
      ...payloadTransactions.map(t => t.clientId),
      ...payloadLogs.map(l => l.relatedTransactionClientId).filter(Boolean)
    ])];

    const budgetIds = payloadBudgets.map(b => b.clientId);
    const budgetPeriods = [...new Set(payloadBudgets.map(b => b.period))];

    const targetIds = payloadTargets.map(t => t.clientId);

    const logIds = payloadLogs.map(l => l.clientId);
    const logDedupeKeys = payloadLogs.map(l => l.dedupeKey).filter(Boolean);

    /********** Jalankan semua query pembacaan massal secara bersamaan. */
    const [
      fetchedWallets,
      fetchedCategories,
      fetchedTransactions,
      fetchedBudgetsById,
      fetchedBudgetsByPeriod,
      fetchedTargets,
      fetchedLogsById,
      fetchedLogsByDedupe,
      fetchedSettings,
    ] = await Promise.all([
      walletIds.length > 0 ? prisma.wallet.findMany({ where: { userId, clientId: { in: walletIds as string[] } } }) : Promise.resolve([]),
      categoryIds.length > 0 ? prisma.category.findMany({ where: { userId, clientId: { in: categoryIds as string[] } } }) : Promise.resolve([]),
      transactionIds.length > 0 ? prisma.transaction.findMany({ where: { userId, clientId: { in: transactionIds as string[] } } }) : Promise.resolve([]),
      budgetIds.length > 0 ? prisma.budget.findMany({ where: { userId, clientId: { in: budgetIds } } }) : Promise.resolve([]),
      budgetPeriods.length > 0 ? prisma.budget.findMany({ where: { userId, period: { in: budgetPeriods } } }) : Promise.resolve([]),
      targetIds.length > 0 ? prisma.financialTarget.findMany({ where: { userId, clientId: { in: targetIds } } }) : Promise.resolve([]),
      logIds.length > 0 ? prisma.notificationLog.findMany({ where: { userId, clientId: { in: logIds } } }) : Promise.resolve([]),
      logDedupeKeys.length > 0 ? prisma.notificationLog.findMany({ where: { userId, dedupeKey: { in: logDedupeKeys as string[] } } }) : Promise.resolve([]),
      payloadSettings.length > 0 ? prisma.notificationSettings.findMany({ where: { userId } }) : Promise.resolve([]),
    ]);

    /********** Bangun in-memory map untuk pencarian cepat O(1). */
    const walletByClientId = new Map(fetchedWallets.map(w => [w.clientId, w]));
    const categoryByClientId = new Map(fetchedCategories.map(c => [c.clientId, c]));
    const transactionByClientId = new Map(fetchedTransactions.map(t => [t.clientId, t]));
    
    const budgetByClientId = new Map(fetchedBudgetsById.map(b => [b.clientId, b]));
    const budgetByPeriodAndCategory = new Map(fetchedBudgetsByPeriod.map(b => [`${b.period}_${b.categoryId}`, b]));
    
    const targetByClientId = new Map(fetchedTargets.map(t => [t.clientId, t]));

    const logByClientId = new Map(fetchedLogsById.map(l => [l.clientId, l]));
    const logByDedupe = new Map(fetchedLogsByDedupe.map(l => [l.dedupeKey, l]));
    const settingsByUserId = new Map(fetchedSettings.map(s => [s.userId, s]));

    const prefetchDuration = performance.now() - prefetchStart;
    // console.log(`[Sync Diagnostics] push prefetch duration: ${prefetchDuration.toFixed(2)}ms`);

    /********** [START: Transaksi Prisma] **********/
    /********** Proses semua upsert dalam satu transaksi atomik Prisma. */
    // console.log("[Sync Push] Payload summary:", {
    //   wallets: payload.wallets?.length ?? 0,
    //   categories: payload.categories?.length ?? 0,
    //   transactions: payload.transactions?.length ?? 0,
    //   budgets: payload.budgets?.length ?? 0,
    //   notification_settings: payload.notification_settings?.length ?? 0,
    //   notification_logs: payload.notification_logs?.length ?? 0,
    //   txnSample: payload.transactions?.[0]
    //     ? { clientId: payload.transactions[0].clientId, walletId: payload.transactions[0].walletId, type: payload.transactions[0].type }
    //     : null,
    // });
    await prisma.$transaction(async (tx: any) => {
      const mutationStart = performance.now();

      /********** 1. Proses Kategori **********/
      if (payload.categories) {
        for (const cat of payload.categories) {
          const existing = categoryByClientId.get(cat.clientId);

          if (existing) {
            /********** Resolusi konflik: last write wins. */
            const clientTime = new Date(cat.updatedAt);
            const serverTime = existing.updatedAt;

            if (clientTime.getTime() + 60000 >= serverTime.getTime()) {
              /********** Client menang — terapkan pembaruan ke DB. */
              const updated = await tx.category.update({
                where: { id: existing.id },
                data: {
                  name: cat.name,
                  type: cat.type,
                  icon: cat.icon,
                  color: cat.color,
                  deletedAt: cat.deletedAt ? new Date(cat.deletedAt) : null,
                  syncStatus: "SYNCED",
                },
              });
              categoryByClientId.set(cat.clientId, updated); /* Perbarui map. */
              processedCount++;
              synced.categories.push(cat.clientId);
            } else {
              /********** Server menang — kembalikan versi server ke client. */
              conflicts.push({
                clientId: cat.clientId,
                entity: "category",
                serverVersion: {
                  id: existing.id,
                  clientId: existing.clientId,
                  name: existing.name,
                  type: existing.type,
                  icon: existing.icon,
                  color: existing.color,
                  isDefault: existing.isDefault,
                  userId: existing.userId,
                  syncStatus: existing.syncStatus,
                  createdAt: existing.createdAt.toISOString(),
                  updatedAt: existing.updatedAt.toISOString(),
                  deletedAt: existing.deletedAt?.toISOString() ?? null,
                },
                resolution: "server_wins",
              });
            }
          } else {
            /********** Rekod baru — buat di DB. */
            const newCat = await tx.category.create({
              data: {
                clientId: cat.clientId,
                name: cat.name,
                type: cat.type,
                icon: cat.icon,
                color: cat.color,
                isDefault: false, /* Default ke false untuk kategori buatan user. */
                userId,
                syncStatus: "SYNCED",
                deletedAt: cat.deletedAt ? new Date(cat.deletedAt) : null,
              },
            });
            categoryByClientId.set(cat.clientId, newCat); /* Simpan ke map untuk relasi berikutnya. */
            processedCount++;
            synced.categories.push(cat.clientId);
          }
        }
      }

      /********** 2. Proses Dompet (Wallets) **********/
      if (payload.wallets) {
        for (const wlt of payload.wallets) {
          const existing = walletByClientId.get(wlt.clientId);

          if (existing) {
            const clientTime = new Date(wlt.updatedAt);
            const serverTime = existing.updatedAt;

            if (clientTime.getTime() + 60000 >= serverTime.getTime()) {
              const updated = await tx.wallet.update({
                where: { id: existing.id },
                data: {
                  name: wlt.name,
                  type: wlt.type,
                  initialBalance: wlt.initialBalance,
                  deletedAt: wlt.deletedAt ? new Date(wlt.deletedAt) : null,
                  syncStatus: "SYNCED",
                },
              });
              walletByClientId.set(wlt.clientId, updated);
              processedCount++;
              synced.wallets.push(wlt.clientId);
            } else {
              conflicts.push({
                clientId: wlt.clientId,
                entity: "wallet",
                serverVersion: {
                  id: existing.id,
                  clientId: existing.clientId,
                  name: existing.name,
                  type: existing.type,
                  initialBalance: Number(existing.initialBalance),
                  userId: existing.userId,
                  syncStatus: existing.syncStatus,
                  createdAt: existing.createdAt.toISOString(),
                  updatedAt: existing.updatedAt.toISOString(),
                  deletedAt: existing.deletedAt?.toISOString() ?? null,
                },
                resolution: "server_wins",
              });
            }
          } else {
            const newWlt = await tx.wallet.create({
              data: {
                clientId: wlt.clientId,
                name: wlt.name,
                type: wlt.type,
                initialBalance: wlt.initialBalance,
                userId,
                syncStatus: "SYNCED",
                deletedAt: wlt.deletedAt ? new Date(wlt.deletedAt) : null,
              },
            });
            walletByClientId.set(wlt.clientId, newWlt);
            processedCount++;
            synced.wallets.push(wlt.clientId);
          }
        }
      }

      /********** 3. Proses Anggaran (Budgets) **********/
      if (payload.budgets) {
        for (const bdg of payload.budgets) {
          /********** Cari server ID kategori dari clientId. */
          const category = categoryByClientId.get(bdg.categoryId);

          if (!category) {
            /********** Kategori belum tersinkronisasi — laporkan sebagai konflik. */
            conflicts.push({
              clientId: bdg.clientId,
              entity: "budget",
              serverVersion: {} as never,
              resolution: "server_wins",
            });
            continue;
          }

          /********** Cek apakah budget sudah ada berdasarkan clientId ATAU kombinasi period+categoryId. */
          let existing = budgetByClientId.get(bdg.clientId);
          if (!existing) {
            existing = budgetByPeriodAndCategory.get(`${bdg.period}_${category.id}`);
          }

          if (existing) {
            const clientTime = new Date(bdg.updatedAt);
            const serverTime = existing.updatedAt;

            if (existing.clientId !== bdg.clientId) {
              /********** Client membuat budget yang sudah ada dengan clientId berbeda. */
              const updatedExisting = await tx.budget.update({
                where: { id: existing.id },
                data: {
                  amount: bdg.amount ?? 0,
                  deletedAt: bdg.deletedAt ? new Date(bdg.deletedAt) : null,
                  syncStatus: "SYNCED",
                },
              });
              budgetByClientId.set(existing.clientId, updatedExisting);
              budgetByPeriodAndCategory.set(`${updatedExisting.period}_${updatedExisting.categoryId}`, updatedExisting);
              processedCount++;

              conflicts.push({
                clientId: bdg.clientId,
                entity: "budget",
                serverVersion: {
                  id: updatedExisting.id,
                  clientId: updatedExisting.clientId,
                  amount: Number(updatedExisting.amount),
                  period: updatedExisting.period,
                  categoryId: category.clientId,
                  userId: updatedExisting.userId,
                  syncStatus: updatedExisting.syncStatus,
                  createdAt: updatedExisting.createdAt.toISOString(),
                  updatedAt: updatedExisting.updatedAt.toISOString(),
                  deletedAt: updatedExisting.deletedAt?.toISOString() ?? null,
                },
                resolution: "server_wins",
              });
            } else if (clientTime.getTime() + 60000 >= serverTime.getTime()) {
              const updated = await tx.budget.update({
                where: { id: existing.id },
                data: {
                  amount: bdg.amount ?? 0,
                  period: bdg.period,
                  categoryId: category.id,
                  deletedAt: bdg.deletedAt ? new Date(bdg.deletedAt) : null,
                  syncStatus: "SYNCED",
                },
              });
              budgetByClientId.set(bdg.clientId, updated);
              budgetByPeriodAndCategory.set(`${updated.period}_${updated.categoryId}`, updated);
              processedCount++;
              synced.budgets.push(bdg.clientId);
            } else {
              conflicts.push({
                clientId: bdg.clientId,
                entity: "budget",
                serverVersion: {
                  id: existing.id,
                  clientId: existing.clientId,
                  amount: Number(existing.amount),
                  period: existing.period,
                  categoryId: category.clientId, /* Ubah FK server kembali ke clientId. */
                  userId: existing.userId,
                  syncStatus: existing.syncStatus,
                  createdAt: existing.createdAt.toISOString(),
                  updatedAt: existing.updatedAt.toISOString(),
                  deletedAt: existing.deletedAt?.toISOString() ?? null,
                },
                resolution: "server_wins",
              });
            }
          } else {
            const newBdg = await tx.budget.create({
              data: {
                clientId: bdg.clientId,
                amount: bdg.amount ?? 0,
                period: bdg.period,
                categoryId: category.id,
                userId,
                syncStatus: "SYNCED",
                deletedAt: bdg.deletedAt ? new Date(bdg.deletedAt) : null,
              },
            });
            budgetByClientId.set(bdg.clientId, newBdg);
            budgetByPeriodAndCategory.set(`${newBdg.period}_${newBdg.categoryId}`, newBdg);
            processedCount++;
            synced.budgets.push(bdg.clientId);
          }
        }
      }

      /********** 3.5. Proses Target Keuangan (Financial Targets) **********/
      if (payload.financial_targets) {
        for (const tgt of payload.financial_targets) {
          let category = null;
          if (tgt.categoryId) {
            category = categoryByClientId.get(tgt.categoryId);
            if (!category) {
              conflicts.push({
                clientId: tgt.clientId,
                entity: "financial_target",
                serverVersion: { clientId: undefined } as never,
                resolution: "server_wins",
              });
              continue;
            }
          }

          let wallet = null;
          if (tgt.walletId) {
            wallet = walletByClientId.get(tgt.walletId);
            if (!wallet) {
              conflicts.push({
                clientId: tgt.clientId,
                entity: "financial_target",
                serverVersion: { clientId: undefined } as never,
                resolution: "server_wins",
              });
              continue;
            }
          }

          const existing = targetByClientId.get(tgt.clientId);

          if (existing) {
            const clientTime = new Date(tgt.updatedAt);
            const serverTime = existing.updatedAt;

            if (clientTime.getTime() + 60000 >= serverTime.getTime()) {
              const updated = await tx.financialTarget.update({
                where: { id: existing.id },
                data: {
                  name: tgt.name,
                  type: tgt.type,
                  targetAmount: tgt.targetAmount ?? 0,
                  period: tgt.period,
                  startDate: new Date(tgt.startDate),
                  endDate: tgt.endDate ? new Date(tgt.endDate) : null,
                  categoryId: category?.id,
                  walletId: wallet?.id,
                  isActive: tgt.isActive ?? true,
                  note: tgt.note,
                  deletedAt: tgt.deletedAt ? new Date(tgt.deletedAt) : null,
                  syncStatus: "SYNCED",
                },
              });
              targetByClientId.set(tgt.clientId, updated);
              processedCount++;
              synced.financial_targets.push(tgt.clientId);
            } else {
              let existingCatClientId: string | undefined = undefined;
              if (existing.categoryId) {
                for (const c of categoryByClientId.values()) {
                  if (c.id === existing.categoryId) existingCatClientId = c.clientId;
                }
              }
              let existingWalletClientId: string | undefined = undefined;
              if (existing.walletId) {
                for (const w of walletByClientId.values()) {
                  if (w.id === existing.walletId) existingWalletClientId = w.clientId;
                }
              }

              conflicts.push({
                clientId: tgt.clientId,
                entity: "financial_target",
                serverVersion: {
                  id: existing.id,
                  clientId: existing.clientId,
                  name: existing.name,
                  type: existing.type,
                  targetAmount: Number(existing.targetAmount),
                  period: existing.period,
                  startDate: existing.startDate.toISOString(),
                  endDate: existing.endDate?.toISOString() ?? null,
                  categoryId: existingCatClientId || undefined,
                  walletId: existingWalletClientId || undefined,
                  isActive: existing.isActive,
                  note: existing.note,
                  userId: existing.userId,
                  syncStatus: existing.syncStatus,
                  createdAt: existing.createdAt.toISOString(),
                  updatedAt: existing.updatedAt.toISOString(),
                  deletedAt: existing.deletedAt?.toISOString() ?? null,
                },
                resolution: "server_wins",
              });
            }
          } else {
            const newTgt = await tx.financialTarget.create({
              data: {
                clientId: tgt.clientId,
                name: tgt.name,
                type: tgt.type,
                targetAmount: tgt.targetAmount ?? 0,
                period: tgt.period,
                startDate: new Date(tgt.startDate),
                endDate: tgt.endDate ? new Date(tgt.endDate) : null,
                categoryId: category?.id,
                walletId: wallet?.id,
                isActive: tgt.isActive ?? true,
                note: tgt.note,
                userId,
                syncStatus: "SYNCED",
                deletedAt: tgt.deletedAt ? new Date(tgt.deletedAt) : null,
              },
            });
            targetByClientId.set(tgt.clientId, newTgt);
            processedCount++;
            synced.financial_targets.push(tgt.clientId);
          }
        }
      }

      /********** 4. Proses Transaksi (Transactions) **********/
      if (payload.transactions) {
        for (const txn of payload.transactions) {
          if (!txn.walletId) {
            console.warn("[Sync Push] Skipping transaction missing walletId:", txn.clientId);
            conflicts.push({
              clientId: txn.clientId,
              entity: "transaction",
              serverVersion: { clientId: undefined } as never,
              resolution: "server_wins",
            });
            continue;
          }

          const wallet = walletByClientId.get(txn.walletId);
          if (!wallet) {
            console.warn("[Sync Push] Wallet not found for clientId:", txn.walletId, "transaction:", txn.clientId);
            conflicts.push({
              clientId: txn.clientId,
              entity: "transaction",
              serverVersion: { clientId: undefined } as never,
              resolution: "server_wins",
            });
            continue;
          }

          let targetWallet = null;
          if (txn.targetWalletId) {
            targetWallet = walletByClientId.get(txn.targetWalletId);
            if (!targetWallet) {
              conflicts.push({
                clientId: txn.clientId,
                entity: "transaction",
                serverVersion: { clientId: undefined } as never,
                resolution: "server_wins",
              });
              continue;
            }
          }

          let category = null;
          if (txn.categoryId) {
            category = categoryByClientId.get(txn.categoryId);
            if (!category) {
              conflicts.push({
                clientId: txn.clientId,
                entity: "transaction",
                serverVersion: { clientId: undefined } as never,
                resolution: "server_wins",
              });
              continue;
            }
          } else if (txn.type !== "TRANSFER") {
            conflicts.push({
              clientId: txn.clientId,
              entity: "transaction",
              serverVersion: { clientId: undefined } as never,
              resolution: "server_wins",
            });
            continue;
          }

          const existing = transactionByClientId.get(txn.clientId);

          if (existing) {
            const clientTime = new Date(txn.updatedAt);
            const serverTime = existing.updatedAt;

            if (clientTime.getTime() + 60000 >= serverTime.getTime()) {
              const updated = await tx.transaction.update({
                where: { id: existing.id },
                data: {
                  amount: txn.amount ?? 0,
                  type: txn.type,
                  description: txn.description,
                  note: txn.note,
                  date: new Date(txn.date),
                  categoryId: category?.id,
                  walletId: wallet.id,
                  targetWalletId: targetWallet?.id,
                  deletedAt: txn.deletedAt ? new Date(txn.deletedAt) : null,
                  syncStatus: "SYNCED",
                },
              });
              transactionByClientId.set(txn.clientId, updated);
              processedCount++;
              synced.transactions.push(txn.clientId);
            } else {
              /********** Cari item terkait dengan iterasi map in-memory (tanpa query ulang). */
              let existingCatClientId: string | undefined = undefined;
              if (existing.categoryId) {
                for (const c of categoryByClientId.values()) {
                  if (c.id === existing.categoryId) existingCatClientId = c.clientId;
                }
              }
              let existingWalletClientId: string | undefined = undefined;
              for (const w of walletByClientId.values()) {
                if (w.id === existing.walletId) existingWalletClientId = w.clientId;
              }
              let existingTargetWalletClientId: string | undefined = undefined;
              if (existing.targetWalletId) {
                for (const w of walletByClientId.values()) {
                  if (w.id === existing.targetWalletId) existingTargetWalletClientId = w.clientId;
                }
              }

              conflicts.push({
                clientId: txn.clientId,
                entity: "transaction",
                serverVersion: {
                  id: existing.id,
                  clientId: existing.clientId,
                  amount: Number(existing.amount),
                  type: existing.type,
                  description: existing.description,
                  note: existing.note,
                  date: existing.date.toISOString(),
                  categoryId: existingCatClientId || undefined,
                  walletId: existingWalletClientId || "",
                  targetWalletId: existingTargetWalletClientId || undefined,
                  userId: existing.userId,
                  syncStatus: existing.syncStatus,
                  createdAt: existing.createdAt.toISOString(),
                  updatedAt: existing.updatedAt.toISOString(),
                  deletedAt: existing.deletedAt?.toISOString() ?? null,
                },
                resolution: "server_wins",
              });
            }
          } else {
            const newTxn = await tx.transaction.create({
              data: {
                clientId: txn.clientId,
                amount: txn.amount ?? 0,
                type: txn.type,
                description: txn.description,
                note: txn.note,
                date: new Date(txn.date),
                categoryId: category?.id,
                walletId: wallet.id,
                targetWalletId: targetWallet?.id,
                userId,
                syncStatus: "SYNCED",
                deletedAt: txn.deletedAt ? new Date(txn.deletedAt) : null,
              },
            });
            transactionByClientId.set(txn.clientId, newTxn);
            processedCount++;
            synced.transactions.push(txn.clientId);
          }
        }
      }

      /********** 5. Proses Pengaturan Notifikasi **********/
      if (payload.notification_settings) {
        for (const set of payload.notification_settings) {
          const existing = settingsByUserId.get(userId);
          
          console.log('[DailyCapSyncPushDebug]', {
            incomingDailyCap: set.dailyCap,
            normalizedForStorage: set.dailyCap === -1 ? -1 : (typeof set.dailyCap === "number" && set.dailyCap > 0 ? set.dailyCap : 5),
            existingDailyCap: existing?.dailyCap
          });

          if (existing) {
            const clientTime = new Date(set.updatedAt);
            const serverTime = existing.updatedAt;
            
            if (clientTime.getTime() + 60000 >= serverTime.getTime()) {
              const updated = await tx.notificationSettings.update({
                where: { id: existing.id },
                data: {
                  isEnabled: set.isEnabled,
                  deliveryMode: set.deliveryMode,
                  instantAlerts: set.instantAlerts,
                  dailyDigest: set.dailyDigest,
                  digestTime: set.digestTime,
                  dailyCap: set.dailyCap === -1 ? -1 : (typeof set.dailyCap === "number" && set.dailyCap > 0 ? set.dailyCap : 5),
                  updatedAt: new Date(set.updatedAt),
                },
              });
              settingsByUserId.set(userId, updated);
              processedCount++;
              synced.notification_settings.push(set.clientId);
            } else {
              conflicts.push({
                clientId: set.clientId,
                entity: "notification_settings",
                serverVersion: {
                  clientId: set.clientId,
                  userId: existing.userId,
                  isEnabled: existing.isEnabled,
                  deliveryMode: existing.deliveryMode,
                  instantAlerts: existing.instantAlerts,
                  dailyDigest: existing.dailyDigest,
                  digestTime: existing.digestTime,
                  dailyCap: existing.dailyCap,
                  updatedAt: existing.updatedAt.toISOString(),
                },
                resolution: "server_wins"
              });
            }
          } else {
            const newSet = await tx.notificationSettings.create({
              data: {
                userId,
                isEnabled: set.isEnabled,
                deliveryMode: set.deliveryMode,
                instantAlerts: set.instantAlerts,
                dailyDigest: set.dailyDigest,
                digestTime: set.digestTime,
                dailyCap: set.dailyCap === -1 ? -1 : (typeof set.dailyCap === "number" && set.dailyCap > 0 ? set.dailyCap : 5),
                updatedAt: new Date(set.updatedAt),
              }
            });
            settingsByUserId.set(userId, newSet);
            processedCount++;
            synced.notification_settings.push(set.clientId);
          }
        }
      }

      /********** 6. Proses Log Notifikasi **********/
      if (payload.notification_logs) {
        for (const log of payload.notification_logs) {
          const existingLog = logByClientId.get(log.clientId);

          if (existingLog) {
            const clientTime = new Date(log.updatedAt);
            const serverTime = existingLog.updatedAt;

            if (clientTime.getTime() + 60000 >= serverTime.getTime()) {
              const updated = await tx.notificationLog.update({
                where: { id: existingLog.id },
                data: {
                  readAt: log.readAt ? new Date(log.readAt) : existingLog.readAt,
                  dismissedAt: log.dismissedAt ? new Date(log.dismissedAt) : existingLog.dismissedAt,
                  pushedAt: log.pushedAt ? new Date(log.pushedAt) : existingLog.pushedAt,
                  digestSentAt: log.digestSentAt ? new Date(log.digestSentAt) : existingLog.digestSentAt,
                  eventType: log.eventType ?? existingLog.eventType,
                  ctaRoute: log.ctaRoute ?? existingLog.ctaRoute,
                  actionType: log.actionType ?? existingLog.actionType,
                  ctaLabel: log.ctaLabel ?? existingLog.ctaLabel,
                  sourceBudgetId: log.sourceBudgetId ?? existingLog.sourceBudgetId,
                  targetBudgetId: log.targetBudgetId ?? existingLog.targetBudgetId,
                  recommendedAmount: log.recommendedAmount ?? existingLog.recommendedAmount,
                  deliveryModeAtCreation: log.deliveryModeAtCreation ?? existingLog.deliveryModeAtCreation,
                  categoryName: log.categoryName ?? existingLog.categoryName,
                  usageRatio: log.usageRatio ?? existingLog.usageRatio,
                  budgetLimit: log.budgetLimit ?? existingLog.budgetLimit,
                  budgetSpent: log.budgetSpent ?? existingLog.budgetSpent,
                  deficitAmount: log.deficitAmount ?? existingLog.deficitAmount,
                  todayAmount: log.todayAmount ?? existingLog.todayAmount,
                  comparisonAmount: log.comparisonAmount ?? existingLog.comparisonAmount,
                  comparisonLabel: log.comparisonLabel ?? existingLog.comparisonLabel,
                  sourceCategoryName: log.sourceCategoryName ?? existingLog.sourceCategoryName,
                  targetCategoryName: log.targetCategoryName ?? existingLog.targetCategoryName,
                  updatedAt: log.updatedAt ? new Date(log.updatedAt) : new Date(),
                },
              });
              logByClientId.set(log.clientId, updated);
              if (log.dedupeKey) logByDedupe.set(log.dedupeKey, updated);
              processedCount++;
              synced.notification_logs.push(log.clientId);
            } else {
              conflicts.push({
                clientId: log.clientId,
                entity: "notification_log",
                serverVersion: {
                  clientId: existingLog.clientId,
                  dedupeKey: existingLog.dedupeKey,
                  type: existingLog.type,
                  title: existingLog.title,
                  body: existingLog.body,
                  severity: existingLog.severity,
                  source: existingLog.source,
                  relatedTransactionClientId: log.relatedTransactionClientId,
                  relatedCategoryId: existingLog.relatedCategoryId,
                  relatedBudgetId: existingLog.relatedBudgetId,
                  readAt: existingLog.readAt?.toISOString() || null,
                  dismissedAt: existingLog.dismissedAt?.toISOString() || null,
                  pushedAt: existingLog.pushedAt?.toISOString() || null,
                  digestSentAt: existingLog.digestSentAt?.toISOString() || null,
                  eventType: existingLog.eventType,
                  ctaRoute: existingLog.ctaRoute,
                  actionType: existingLog.actionType,
                  ctaLabel: existingLog.ctaLabel,
                  sourceBudgetId: existingLog.sourceBudgetId,
                  targetBudgetId: existingLog.targetBudgetId,
                  recommendedAmount: existingLog.recommendedAmount,
                  deliveryModeAtCreation: existingLog.deliveryModeAtCreation,
                  categoryName: existingLog.categoryName,
                  usageRatio: existingLog.usageRatio,
                  budgetLimit: existingLog.budgetLimit,
                  budgetSpent: existingLog.budgetSpent,
                  deficitAmount: existingLog.deficitAmount,
                  todayAmount: existingLog.todayAmount,
                  comparisonAmount: existingLog.comparisonAmount,
                  comparisonLabel: existingLog.comparisonLabel,
                  sourceCategoryName: existingLog.sourceCategoryName,
                  targetCategoryName: existingLog.targetCategoryName,
                  updatedAt: existingLog.updatedAt.toISOString(),
                  createdAt: existingLog.createdAt.toISOString()
                },
                resolution: "server_wins"
              });
            }
          } else {
            /********** Cek berdasarkan dedupeKey untuk mencegah error duplikat jika client menghapus DB lokal. */
            const existingDedupe = log.dedupeKey ? logByDedupe.get(log.dedupeKey) : undefined;

            if (existingDedupe) {
               const clientTime = new Date(log.updatedAt);
               const serverTime = existingDedupe.updatedAt;
               
               if (clientTime.getTime() + 60000 >= serverTime.getTime()) {
                 const updated = await tx.notificationLog.update({
                   where: { id: existingDedupe.id },
                   data: {
                     readAt: log.readAt ? new Date(log.readAt) : existingDedupe.readAt,
                     dismissedAt: log.dismissedAt ? new Date(log.dismissedAt) : existingDedupe.dismissedAt,
                     pushedAt: log.pushedAt ? new Date(log.pushedAt) : existingDedupe.pushedAt,
                     digestSentAt: log.digestSentAt ? new Date(log.digestSentAt) : existingDedupe.digestSentAt,
                     eventType: log.eventType ?? existingDedupe.eventType,
                     ctaRoute: log.ctaRoute ?? existingDedupe.ctaRoute,
                     actionType: log.actionType ?? existingDedupe.actionType,
                     ctaLabel: log.ctaLabel ?? existingDedupe.ctaLabel,
                     sourceBudgetId: log.sourceBudgetId ?? existingDedupe.sourceBudgetId,
                     targetBudgetId: log.targetBudgetId ?? existingDedupe.targetBudgetId,
                     recommendedAmount: log.recommendedAmount ?? existingDedupe.recommendedAmount,
                     deliveryModeAtCreation: log.deliveryModeAtCreation ?? existingDedupe.deliveryModeAtCreation,
                     categoryName: log.categoryName ?? existingDedupe.categoryName,
                     usageRatio: log.usageRatio ?? existingDedupe.usageRatio,
                     budgetLimit: log.budgetLimit ?? existingDedupe.budgetLimit,
                     budgetSpent: log.budgetSpent ?? existingDedupe.budgetSpent,
                     deficitAmount: log.deficitAmount ?? existingDedupe.deficitAmount,
                     todayAmount: log.todayAmount ?? existingDedupe.todayAmount,
                     comparisonAmount: log.comparisonAmount ?? existingDedupe.comparisonAmount,
                     comparisonLabel: log.comparisonLabel ?? existingDedupe.comparisonLabel,
                     sourceCategoryName: log.sourceCategoryName ?? existingDedupe.sourceCategoryName,
                     targetCategoryName: log.targetCategoryName ?? existingDedupe.targetCategoryName,
                     updatedAt: log.updatedAt ? new Date(log.updatedAt) : new Date(),
                   }
                 });
                 logByClientId.set(updated.clientId, updated);
                 processedCount++;
                 /********** Kita memperbarui existingDedupe namun mendorong konflik agar client mengadopsi clientId existingDedupe.
                  * Kita tidak menambahkannya ke synced.notification_logs agar logika konflik yang menanganinya.
                  */
               }
               
               conflicts.push({
                 clientId: log.clientId,
                 entity: "notification_log",
                 serverVersion: {
                   clientId: existingDedupe.clientId,
                   dedupeKey: existingDedupe.dedupeKey,
                   type: existingDedupe.type,
                   title: existingDedupe.title,
                   body: existingDedupe.body,
                   severity: existingDedupe.severity,
                   source: existingDedupe.source,
                   relatedTransactionClientId: log.relatedTransactionClientId,
                   relatedCategoryId: existingDedupe.relatedCategoryId,
                   relatedBudgetId: existingDedupe.relatedBudgetId,
                   readAt: existingDedupe.readAt?.toISOString() || null,
                   dismissedAt: existingDedupe.dismissedAt?.toISOString() || null,
                   pushedAt: existingDedupe.pushedAt?.toISOString() || null,
                   digestSentAt: existingDedupe.digestSentAt?.toISOString() || null,
                   eventType: existingDedupe.eventType,
                   ctaRoute: existingDedupe.ctaRoute,
                   actionType: existingDedupe.actionType,
                   ctaLabel: existingDedupe.ctaLabel,
                   sourceBudgetId: existingDedupe.sourceBudgetId,
                   targetBudgetId: existingDedupe.targetBudgetId,
                   recommendedAmount: existingDedupe.recommendedAmount,
                   deliveryModeAtCreation: existingDedupe.deliveryModeAtCreation,
                   categoryName: existingDedupe.categoryName,
                   usageRatio: existingDedupe.usageRatio,
                   budgetLimit: existingDedupe.budgetLimit,
                   budgetSpent: existingDedupe.budgetSpent,
                   deficitAmount: existingDedupe.deficitAmount,
                   todayAmount: existingDedupe.todayAmount,
                   comparisonAmount: existingDedupe.comparisonAmount,
                   comparisonLabel: existingDedupe.comparisonLabel,
                   sourceCategoryName: existingDedupe.sourceCategoryName,
                   targetCategoryName: existingDedupe.targetCategoryName,
                   updatedAt: existingDedupe.updatedAt.toISOString(),
                   createdAt: existingDedupe.createdAt.toISOString()
                 },
                 resolution: "server_wins"
               });
            } else {
              /********** Cari ID transaksi terkait dari map HANYA untuk log baru. */
              let relatedTxnId = null;
              if (log.relatedTransactionClientId) {
                const txn = transactionByClientId.get(log.relatedTransactionClientId);
                if (txn) {
                  relatedTxnId = txn.id;
                } else {
                  console.warn("[Sync Push] related transaction not found for notification log:", log.clientId);
                }
              }

              const newLog = await tx.notificationLog.create({
                data: {
                  clientId: log.clientId,
                  dedupeKey: log.dedupeKey,
                  userId,
                  type: log.type,
                  eventType: log.eventType,
                  deliveryModeAtCreation: log.deliveryModeAtCreation,
                  title: log.title,
                  body: log.body,
                  status: "delivered", /* Status dari client lokal. */
                  severity: log.severity,
                  source: log.source,
                  relatedTransactionId: relatedTxnId,
                  relatedCategoryId: log.relatedCategoryId,
                  relatedBudgetId: log.relatedBudgetId,
                  ctaRoute: log.ctaRoute,
                  actionType: log.actionType,
                  ctaLabel: log.ctaLabel,
                  sourceBudgetId: log.sourceBudgetId,
                  targetBudgetId: log.targetBudgetId,
                  recommendedAmount: log.recommendedAmount,
                  categoryName: log.categoryName,
                  usageRatio: log.usageRatio,
                  budgetLimit: log.budgetLimit,
                  budgetSpent: log.budgetSpent,
                  deficitAmount: log.deficitAmount,
                  todayAmount: log.todayAmount,
                  comparisonAmount: log.comparisonAmount,
                  comparisonLabel: log.comparisonLabel,
                  sourceCategoryName: log.sourceCategoryName,
                  targetCategoryName: log.targetCategoryName,
                  readAt: log.readAt ? new Date(log.readAt) : null,
                  dismissedAt: log.dismissedAt ? new Date(log.dismissedAt) : null,
                  pushedAt: log.pushedAt ? new Date(log.pushedAt) : null,
                  digestSentAt: log.digestSentAt ? new Date(log.digestSentAt) : null,
                  createdAt: log.createdAt ? new Date(log.createdAt) : new Date(),
                  updatedAt: log.updatedAt ? new Date(log.updatedAt) : (log.createdAt ? new Date(log.createdAt) : new Date()),
                },
              });
              logByClientId.set(log.clientId, newLog);
              if (log.dedupeKey) logByDedupe.set(log.dedupeKey, newLog);
              processedCount++;
              synced.notification_logs.push(log.clientId);
            }
          }
        }
      }
      
      const mutationDuration = performance.now() - mutationStart;
      // console.log(`[Sync Diagnostics] push mutation duration: ${mutationDuration.toFixed(2)}ms`);

    },
    {
      maxWait: 10000, /* Maksimal 10 detik untuk mendapatkan lock. */
      timeout: 60000, /* Maksimal 60 detik untuk memproses batch sinkronisasi offline yang besar. */
    }); /* [END: Transaksi Prisma] */

    const response: SyncPushResponse = {
      success: true,
      processedCount,
      synced,
      conflicts,
      serverTime: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error: any) {
    /********** Catat error Prisma lengkap untuk debugging sisi server. */
    console.error("[Sync Push] Fatal error:", {
      message: error?.message,
      code: error?.code,
      meta: error?.meta,
      stack: error?.stack?.split("\n").slice(0, 5),
    });
    return NextResponse.json(
      {
        success: false,
        error: {
          code: error?.code || "INTERNAL_ERROR",
          message: error instanceof Error ? error.message : "Sync push failed.",
          meta: error?.meta || null,
        },
      },
      { status: 500 }
    );
  }
}
