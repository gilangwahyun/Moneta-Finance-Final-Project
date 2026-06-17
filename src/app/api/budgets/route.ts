import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getAuthUser } from "@/lib/auth/middleware";
import { validateCsrfToken } from "@/lib/auth/csrf";

// Outline Next.js API Route for CRUD on Budgets
// In an offline-first app, this acts as the sync endpoint for Budget entries
// from the sync_queue, or as a direct API fallback.

export async function GET(request: NextRequest) {
  try {
    const tokenPayload = await getAuthUser(request);
    if (!tokenPayload || !tokenPayload.sub) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period");

    const budgets = await prisma.budget.findMany({
      where: {
        userId: tokenPayload.sub,
        ...(period && { period }),
        deletedAt: null,
      },
    });

    return NextResponse.json({ success: true, data: budgets });
  } catch (error) {
    console.error("Budget GET error:", error);
    return NextResponse.json({ success: false, message: "Internal Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const tokenPayload = await getAuthUser(request);
    if (!tokenPayload || !tokenPayload.sub) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    // ── CSRF check ─────────────────────────────────────
    const csrfError = validateCsrfToken(request);
    if (csrfError) return csrfError;

    const userId = tokenPayload.sub;
    const body = await request.json();
    
    // Support bulk operations (from sync queue) or single operations
    const entries = Array.isArray(body) ? body : [body];
    const results = [];

    for (const data of entries) {
      const { clientId, amount, period, categoryId, deletedAt, syncStatus } = data;

      // Ensure the category exists for the user
      const category = await prisma.category.findUnique({
        where: { clientId: categoryId },
      });

      if (!category) {
        results.push({ clientId, error: "Category not found on server." });
        continue;
      }

      // Upsert the budget
      const existing = await prisma.budget.findUnique({
        where: { clientId },
      });

      if (existing) {
        const updated = await prisma.budget.update({
          where: { clientId },
          data: {
            amount,
            period,
            categoryId: category.id, // map clientId to server ID
            syncStatus: syncStatus || "SYNCED",
            deletedAt: deletedAt ? new Date(deletedAt) : null,
          }
        });
        results.push(updated);
      } else {
        const created = await prisma.budget.create({
          data: {
            clientId,
            amount,
            period,
            categoryId: category.id,
            userId,
            syncStatus: syncStatus || "SYNCED",
            deletedAt: deletedAt ? new Date(deletedAt) : null,
          }
        });
        results.push(created);
      }
    }

    return NextResponse.json({ success: true, processed: results.length, data: results });
  } catch (error) {
    console.error("Budget POST error:", error);
    return NextResponse.json({ success: false, message: "Internal Error" }, { status: 500 });
  }
}
