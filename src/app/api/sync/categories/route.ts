// ─── POST /api/sync/categories ──────────────────────────
// Dedicated endpoint for bulk category sync.
// Receives an array of category mutations from the client's
// sync engine and processes them with conflict resolution.
//
// Conflict strategy: "last write wins" — only update the
// server record if the client's updatedAt is newer.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getAuthUser } from "@/lib/auth/middleware";
import { validateCsrfToken } from "@/lib/auth/csrf";

interface CategoryMutation {
  clientId: string;
  name: string;
  type: "INCOME" | "EXPENSE";
  icon?: string | null;
  color?: string | null;
  isDefault?: boolean;
  updatedAt: string;
  deletedAt?: string | null;
}

interface SyncCategoryResponse {
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
    const { categories }: { categories: CategoryMutation[] } = await request.json();

    if (!Array.isArray(categories) || categories.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "No categories provided." } },
        { status: 400 }
      );
    }

    let processed = 0;
    const conflicts: SyncCategoryResponse["conflicts"] = [];

    // ── Process in a single Prisma transaction ────────
    await prisma.$transaction(async (tx) => {
      for (const cat of categories) {
        // Look up existing record by clientId for this user
        const existing = await tx.category.findFirst({
          where: { clientId: cat.clientId, userId },
        });

        if (existing) {
          // ── Conflict resolution: last write wins ────
          const clientTime = new Date(cat.updatedAt).getTime();
          const serverTime = existing.updatedAt.getTime();

          if (clientTime >= serverTime) {
            // Client wins — apply the mutation
            await tx.category.update({
              where: { id: existing.id },
              data: {
                name: cat.name,
                type: cat.type,
                icon: cat.icon ?? existing.icon,
                color: cat.color ?? existing.color,
                deletedAt: cat.deletedAt ? new Date(cat.deletedAt) : null,
                updatedAt: new Date(cat.updatedAt),
                syncStatus: "SYNCED",
              },
            });
            processed++;
          } else {
            // Server wins — return server version to client
            conflicts.push({
              clientId: cat.clientId,
              resolution: "server_wins",
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
            });
          }
        } else {
          // ── New record — insert ─────────────────────
          await tx.category.create({
            data: {
              clientId: cat.clientId,
              name: cat.name,
              type: cat.type,
              icon: cat.icon,
              color: cat.color,
              isDefault: cat.isDefault ?? false,
              userId,
              deletedAt: cat.deletedAt ? new Date(cat.deletedAt) : null,
              updatedAt: new Date(cat.updatedAt),
              syncStatus: "SYNCED",
            },
          });
          processed++;
        }
      }
    });

    const response: SyncCategoryResponse = {
      success: true,
      processed,
      conflicts,
      serverTime: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Sync categories error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Category sync failed." } },
      { status: 500 }
    );
  }
}
