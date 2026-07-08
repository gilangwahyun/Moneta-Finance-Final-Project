import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getAuthUser } from "@/lib/auth/middleware";
import { validateCsrfToken } from "@/lib/auth/csrf";

/********** Next.js API Route untuk operasi CRUD pada Anggaran (Budgets).
 *  Dalam aplikasi offline-first, endpoint ini berfungsi sebagai fallback API langsung
 *  atau endpoint sinkronisasi untuk entri budget dari sync queue.
 */

/********** GET /api/budgets **********/

/**
 * Mengambil daftar anggaran milik user yang sedang aktif.
 *
 * @param request - NextRequest yang memuat token autentikasi dan parameter query `period` (opsional).
 * @returns NextResponse berisi array data anggaran, atau error 401/500 jika gagal.
 */
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

/********** POST /api/budgets **********/

/**
 * Membuat atau memperbarui anggaran (budget) secara tunggal maupun massal.
 *
 * @param request - NextRequest berisi body JSON berupa satu entri budget atau array entri budget.
 * @returns NextResponse berisi hasil pemrosesan (processed count dan array data).
 */
export async function POST(request: NextRequest) {
  try {
    const tokenPayload = await getAuthUser(request);
    if (!tokenPayload || !tokenPayload.sub) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    /********** Pengecekan Token CSRF. */
    const csrfError = validateCsrfToken(request);
    if (csrfError) return csrfError;

    const userId = tokenPayload.sub;
    const body = await request.json();
    
    /********** Mendukung operasi massal (dari sync queue) atau operasi tunggal. */
    const entries = Array.isArray(body) ? body : [body];
    const results = [];

    for (const data of entries) {
      const { clientId, amount, period, categoryId, deletedAt, syncStatus } = data;

      /********** Pastikan kategori ada dan dimiliki oleh user. */
      const category = await prisma.category.findUnique({
        where: { clientId: categoryId },
      });

      if (!category) {
        results.push({ clientId, error: "Category not found on server." });
        continue;
      }

      /********** Lakukan upsert (perbarui jika ada, buat baru jika belum) pada budget. */
      const existing = await prisma.budget.findUnique({
        where: { clientId },
      });

      if (existing) {
        const updated = await prisma.budget.update({
          where: { clientId },
          data: {
            amount,
            period,
            categoryId: category.id, /* Peta clientId ke ID server. */
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
