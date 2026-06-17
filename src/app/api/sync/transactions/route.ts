// ─── POST /api/sync/transactions ────────────────────────
// Dedicated endpoint for bulk transaction sync.
// Receives an array of transaction mutations from the client's
// sync engine and processes them with conflict resolution.
//
// Conflict strategy: "last write wins" — only update the
// server record if the client's updatedAt is newer.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getAuthUser } from "@/lib/auth/middleware";
import { validateCsrfToken } from "@/lib/auth/csrf";

interface TransactionMutation {
  clientId: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
  description?: string | null;
  note?: string | null;
  date: string;
  categoryId: string; // This is the category's clientId
  walletId: string;   // Added missing field
  updatedAt: string;
  deletedAt?: string | null;
}

interface SyncTransactionResponse {
  success: boolean;
  processed: number;
  conflicts: {
    clientId: string;
    resolution: "server_wins";
    serverVersion: Record<string, unknown>;
  }[];
  serverTime: string;
}

export async function POST(request: NextRequest) {
  try {
    // ── Auth check ────────────────────────────────────
    const tokenPayload = await getAuthUser(request);
    if (!tokenPayload || !tokenPayload.sub) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated." } },
        { status: 401 }
      );
    }

    // ── CSRF check ─────────────────────────────────────
    const csrfError = validateCsrfToken(request);
    if (csrfError) return csrfError;

    const userId = tokenPayload.sub;
    const { transactions }: { transactions: TransactionMutation[] } =
      await request.json();

    if (!Array.isArray(transactions) || transactions.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "No transactions provided." } },
        { status: 400 }
      );
    }

    let processed = 0;
    const conflicts: SyncTransactionResponse["conflicts"] = [];

    // ── Process in a single Prisma transaction ────────
    await prisma.$transaction(async (tx) => {
      for (const txn of transactions) {
        // Resolve category server ID from the category clientId
        const category = await tx.category.findFirst({
          where: { clientId: txn.categoryId, userId },
        });

        if (!category) {
          // Category doesn't exist on server yet — skip this transaction
          // It will be retried after the category syncs
          conflicts.push({
            clientId: txn.clientId,
            resolution: "server_wins",
            serverVersion: {
              error: "CATEGORY_NOT_FOUND",
              message: `Category ${txn.categoryId} not yet synced`,
            },
          });
          continue;
        }

        // Resolve wallet server ID from the wallet clientId
        const wallet = await tx.wallet.findFirst({
          where: { clientId: txn.walletId, userId },
        });

        if (!wallet) {
          conflicts.push({
            clientId: txn.clientId,
            resolution: "server_wins",
            serverVersion: {
              error: "WALLET_NOT_FOUND",
              message: `Wallet ${txn.walletId} not yet synced`,
            },
          });
          continue;
        }

        const existing = await tx.transaction.findFirst({
          where: { clientId: txn.clientId, userId },
        });

        if (existing) {
          // ── Conflict resolution: last write wins ────
          const clientTime = new Date(txn.updatedAt).getTime();
          const serverTime = existing.updatedAt.getTime();

          if (clientTime >= serverTime) {
            // Client wins
            await tx.transaction.update({
              where: { id: existing.id },
              data: {
                amount: txn.amount,
                type: txn.type,
                description: txn.description,
                note: txn.note,
                date: new Date(txn.date),
                categoryId: category.id,
                walletId: wallet.id,
                deletedAt: txn.deletedAt ? new Date(txn.deletedAt) : null,
                updatedAt: new Date(txn.updatedAt),
                syncStatus: "SYNCED",
              },
            });
            processed++;
          } else {
            // Server wins
            conflicts.push({
              clientId: txn.clientId,
              resolution: "server_wins",
              serverVersion: {
                id: existing.id,
                clientId: existing.clientId,
                amount: Number(existing.amount),
                type: existing.type,
                description: existing.description,
                note: existing.note,
                date: existing.date.toISOString(),
                categoryId: existing.categoryId,
                userId: existing.userId,
                syncStatus: existing.syncStatus,
                createdAt: existing.createdAt.toISOString(),
                updatedAt: existing.updatedAt.toISOString(),
                deletedAt: existing.deletedAt?.toISOString() ?? null,
              },
            });
          }
        } else {
          // ── New record — insert ─────────────────────
          await tx.transaction.create({
            data: {
              clientId: txn.clientId,
              amount: txn.amount,
              type: txn.type,
              description: txn.description,
              note: txn.note,
              date: new Date(txn.date),
              categoryId: category.id,
              walletId: wallet.id,
              userId,
              deletedAt: txn.deletedAt ? new Date(txn.deletedAt) : null,
              updatedAt: new Date(txn.updatedAt),
              syncStatus: "SYNCED",
            },
          });
          processed++;
        }
      }
    });

    const response: SyncTransactionResponse = {
      success: true,
      processed,
      conflicts,
      serverTime: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Sync transactions error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Transaction sync failed." } },
      { status: 500 }
    );
  }
}
