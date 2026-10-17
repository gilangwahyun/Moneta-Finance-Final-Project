// ─── Seed Data Demo Sidang Skripsi ───────────────────────────────────────────
// Menyuntikkan data yang merepresentasikan 6 kelompok aturan Behavioral Nudge
// Engine untuk keperluan demo sidang skripsi.
//
// Strategi per rule:
//   ① FT-01  (Target Stagnan)      → Di-seed sebagai notif log
//   ② WL-04  (Pola Dompet)         → Di-seed sebagai notif log
//   ③ AN-09  (Proyeksi Kebiasaan)  → Di-seed sebagai notif log
//   ④ PR-01  (Berhasil Berhemat)   → Di-seed sebagai notif log
//   ⑤ BG-00c (Batas Anggaran)     → Di-seed sebagai notif log + transaksi mendukung
//   ⑥ SP-01  (Payday Leak)         → DIPICU LANGSUNG saat demo (1 transaksi pengeluaran)
//
// Cara pakai dari seed.ts:
//   await seedSidangDataForUser(user.id, prisma);

import { randomUUID } from "crypto";
import dayjs from "dayjs";
import { DEFAULT_CATEGORIES } from "./default-categories";

/**
 * Menyuntikkan data demo sidang untuk user yang diberikan.
 *
 * Hasilnya:
 * - 1 dompet "Dompet Utama (BCA)"
 * - 2 anggaran: Makanan (Rp 300.000, sudah 100% terlampaui) & Belanja Harian (Rp 5.000.000)
 * - 1 target finansial aktif tanpa kontribusi (FT-01)
 * - ~50 transaksi historis (3 bulan) yang membangun profil perilaku
 * - Gaji bulan ini hari ini sehingga SP-01 aktif saat 1 pengeluaran ditambahkan
 * - 5 log notifikasi pre-seeded: FT-01, WL-04, AN-09, PR-01, BG-00c
 *
 * @param userId - ID User yang akan di-seed.
 * @param db     - Instance PrismaClient atau PrismaTransaction.
 */
export async function seedSidangDataForUser(userId: string, db: any) {
  console.log(`\n🎓 [SIDANG SEED] Mulai seeding data sidang untuk userId: ${userId}`);

  // ─── 1. Pastikan kategori default tersedia ───────────────────────────────
  let categoriesDb = await db.category.findMany({ where: { userId } });

  if (categoriesDb.length === 0) {
    console.log("  → Membuat kategori default...");
    await db.category.createMany({
      data: DEFAULT_CATEGORIES.map((cat) => ({
        clientId: randomUUID(),
        name: cat.name,
        type: cat.type,
        icon: cat.icon,
        color: cat.color,
        isDefault: true,
        userId,
        syncStatus: "SYNCED",
      })),
    });
    categoriesDb = await db.category.findMany({ where: { userId } });
  }

  const getCatId = (name: string): string | null =>
    categoriesDb.find((c: any) => c.name === name)?.id ?? null;

  const catMakanan   = getCatId("Makanan");
  const catBelanja   = getCatId("Belanja Harian");
  const catHiburan   = getCatId("Hiburan");
  const catJajan     = getCatId("Jajan");
  const catLanganan  = getCatId("Langganan");
  const catGaji      = getCatId("Gaji");
  const catTransp    = getCatId("Transportasi");
  const catInvestasi = getCatId("Investasi");

  // ─── 2. Bersihkan data lama agar proses seeding idempotent (bisa diulang berkali-kali) ───
  console.log("  → Membersihkan transaksi, notifikasi, anggaran, target, dan dompet lama...");
  await db.transaction.deleteMany({ where: { userId } });
  await db.notificationLog.deleteMany({ where: { userId } });
  await db.budget.deleteMany({ where: { userId } });
  await db.financialTarget.deleteMany({ where: { userId } });
  await db.wallet.deleteMany({ where: { userId } });

  // ─── 3. Buat Dompet Utama ────────────────────────────────────────────────
  console.log("  → Membuat dompet...");
  const wallet = await db.wallet.create({
    data: {
      clientId: randomUUID(),
      name: "Dompet Utama (BCA)",
      type: "BANK",
      initialBalance: 8_000_000,
      userId,
      syncStatus: "SYNCED",
    },
  });
  const walletId = wallet.id;

  // ─── 4. Buat Anggaran Bulan Ini ──────────────────────────────────────────
  // BG-00c: Anggaran Makanan Rp 300.000 → akan terlampaui oleh transaksi seed (Rp 350.000)
  // Belanja Harian Rp 5.000.000 → sisa banyak (kandidat sumber subsidi silang)
  const currentPeriod = dayjs().format("YYYY-MM");
  console.log("  → Membuat anggaran...");

  let budgetMakanan: any = null;
  let budgetBelanja: any = null;

  if (catMakanan) {
    budgetMakanan = await db.budget.create({
      data: {
        clientId: randomUUID(),
        amount: 300_000,
        period: currentPeriod,
        categoryId: catMakanan,
        userId,
        syncStatus: "SYNCED",
      },
    });
  }

  if (catBelanja) {
    budgetBelanja = await db.budget.create({
      data: {
        clientId: randomUUID(),
        amount: 5_000_000,
        period: currentPeriod,
        categoryId: catBelanja,
        userId,
        syncStatus: "SYNCED",
      },
    });
  }

  // ─── 5. Buat Target Finansial (FT-01: sudah >67% periode, kontribusi Rp 0) ──
  console.log("  → Membuat target finansial...");
  await db.financialTarget.create({
    data: {
      clientId: randomUUID(),
      name: "Dana Darurat & Liburan Akhir Tahun",
      type: "SAVING_TARGET",
      targetAmount: 15_000_000,
      period: "CUSTOM",
      startDate: dayjs().subtract(20, "day").startOf("day").toDate(),
      endDate: dayjs().add(10, "day").startOf("day").toDate(),
      categoryId: catInvestasi, // Terhubung ke kategori Investasi (belum ada transaksi = kontribusi Rp 0)
      isActive: true,
      note: "Target menabung untuk keperluan darurat dan liburan (Demo Sidang)",
      userId,
      syncStatus: "SYNCED",
    },
  });

  // ─── 6. Bangun array transaksi ───────────────────────────────────────────
  console.log("  → Menyuntikkan transaksi historis...");
  const txns: any[] = [];

  // ══════════════════════════════════════════════════════════════════════════
  // BLOK A: GAJI HARI INI — KUNCI PEMICU SP-01 SAAT DEMO
  //
  // Syarat paydayLeak (local-engine.ts baris 157-173):
  //   1. Ada INCOME dalam 30 hari terakhir              ✅ gaji = hari ini
  //   2. daysSincePayday >= 0 && daysSincePayday <= 3   ✅ hari ini = 0 hari
  //   3. current.expense > totalAnggaran * 0.4          ✅ (setelah pengeluaran demo)
  //      Total anggaran = 300.000 + 5.000.000 = 5.300.000
  //      Threshold 40% = 2.120.000
  //      Pengeluaran sudah ada (makanan) = 350.000
  //      → Tambahkan pengeluaran >= 1.800.000 saat demo agar total > 2.120.000
  // ══════════════════════════════════════════════════════════════════════════
  txns.push({
    clientId: randomUUID(),
    amount: 5_000_000,
    type: "INCOME",
    description: "Gaji Bulanan",
    date: dayjs().toDate(),
    createdAt: dayjs().set("hour", 8).set("minute", 0).toDate(),
    walletId,
    categoryId: catGaji,
    userId,
    syncStatus: "SYNCED",
  });

  // ══════════════════════════════════════════════════════════════════════════
  // BLOK B: PENGELUARAN MAKANAN BULAN INI — melampaui anggaran Rp 300.000
  //   Total = 200.000 + 150.000 = 350.000 > 300.000 → BG-00c (di-seed sebagai log)
  // ══════════════════════════════════════════════════════════════════════════
  if (catMakanan) {
    txns.push({
      clientId: randomUUID(),
      amount: 200_000,
      type: "EXPENSE",
      description: "Makan Malam Bersama Teman",
      date: dayjs().subtract(2, "day").toDate(),
      createdAt: dayjs().subtract(2, "day").set("hour", 19).toDate(),
      walletId,
      categoryId: catMakanan,
      userId,
      syncStatus: "SYNCED",
    });
    txns.push({
      clientId: randomUUID(),
      amount: 150_000,
      type: "EXPENSE",
      description: "Makan Siang Kantor",
      date: dayjs().subtract(1, "day").toDate(),
      createdAt: dayjs().subtract(1, "day").set("hour", 12).toDate(),
      walletId,
      categoryId: catMakanan,
      userId,
      syncStatus: "SYNCED",
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // BLOK C: HISTORI 3 BULAN — membangun profil perilaku untuk WL-04 & AN-09
  //   WL-04: 100% transaksi Jajan selalu dari dompet yang sama
  //   AN-09: frekuensi transaksi Jajan >= 5 kali/bulan → proyeksi tahunan muncul
  // ══════════════════════════════════════════════════════════════════════════
  for (let bulanMundur = 3; bulanMundur >= 1; bulanMundur--) {
    const baseBulan = dayjs().subtract(bulanMundur, "month");

    // 8 transaksi Jajan per bulan — semua dari walletId yang sama (→ WL-04)
    for (let i = 1; i <= 8; i++) {
      const d = baseBulan.startOf("month").add(i * 3, "day");
      if (catJajan) {
        txns.push({
          clientId: randomUUID(),
          amount: 18_000 + Math.floor(Math.random() * 5_000),
          type: "EXPENSE",
          description: "Es Kopi Susu",
          date: d.toDate(),
          createdAt: d.set("hour", 14).set("minute", 30).toDate(),
          walletId,
          categoryId: catJajan,
          userId,
          syncStatus: "SYNCED",
        });
      }
    }

    // Gaji per bulan (konteks cashflow)
    const gajiDate = dayjs().subtract(bulanMundur, "month").date(25);
    if (catGaji) {
      txns.push({
        clientId: randomUUID(),
        amount: 5_000_000,
        type: "INCOME",
        description: "Gaji Bulanan",
        date: gajiDate.toDate(),
        createdAt: gajiDate.set("hour", 8).toDate(),
        walletId,
        categoryId: catGaji,
        userId,
        syncStatus: "SYNCED",
      });
    }

    // Hiburan & Langganan per bulan (keragaman histori)
    if (catHiburan) {
      const hiburanDate = dayjs().subtract(bulanMundur, "month").startOf("month").add(10, "day");
      txns.push({
        clientId: randomUUID(),
        amount: 200_000 + bulanMundur * 50_000,
        type: "EXPENSE",
        description: "Aktivitas Hiburan Bulanan",
        date: hiburanDate.toDate(),
        createdAt: hiburanDate.toDate(),
        walletId,
        categoryId: catHiburan,
        userId,
        syncStatus: "SYNCED",
      });
    }

    if (catLanganan) {
      const langgananDate = dayjs().subtract(bulanMundur, "month").date(5);
      txns.push({
        clientId: randomUUID(),
        amount: 49_000,
        type: "EXPENSE",
        description: "Spotify Premium",
        date: langgananDate.toDate(),
        createdAt: langgananDate.toDate(),
        walletId,
        categoryId: catLanganan,
        userId,
        syncStatus: "SYNCED",
      });
    }
  }

  // Jajan bulan ini (≥5 kali → trigger AN-09 proyeksi kebiasaan)
  for (let i = 1; i <= 7; i++) {
    const d = dayjs().startOf("month").add(i * 2, "day");
    if (d.isAfter(dayjs())) break;
    if (catJajan) {
      txns.push({
        clientId: randomUUID(),
        amount: 20_000 + Math.floor(Math.random() * 5_000),
        type: "EXPENSE",
        description: "Es Kopi Susu",
        date: d.toDate(),
        createdAt: d.set("hour", 10).toDate(),
        walletId,
        categoryId: catJajan,
        userId,
        syncStatus: "SYNCED",
      });
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // BLOK D: PENGELUARAN KECIL 7 HARI TERAKHIR
  //   Net 7 hari terakhir positif → PR-01 valid
  //   (gaji Rp 5.000.000 masuk hari ini, pengeluaran 7 hari hanya ~Rp 120.000)
  // ══════════════════════════════════════════════════════════════════════════
  const pengeluaranKecil = [
    { desc: "Transportasi Grab", amount: 25_000, cat: catTransp, mundur: 6 },
    { desc: "Makan Siang",       amount: 30_000, cat: catMakanan, mundur: 5 },
    { desc: "Parkir & Bensin",   amount: 50_000, cat: catTransp, mundur: 4 },
    { desc: "Jajan Kantor",      amount: 15_000, cat: catJajan,  mundur: 3 },
  ];
  for (const p of pengeluaranKecil) {
    if (!p.cat) continue;
    const d = dayjs().subtract(p.mundur, "day");
    txns.push({
      clientId: randomUUID(),
      amount: p.amount,
      type: "EXPENSE",
      description: p.desc,
      date: d.toDate(),
      createdAt: d.set("hour", 11).toDate(),
      walletId,
      categoryId: p.cat,
      userId,
      syncStatus: "SYNCED",
    });
  }

  await db.transaction.createMany({ data: txns });
  console.log(`  ✅ ${txns.length} transaksi berhasil disuntikkan.`);

  // ─── 7. Suntikkan 5 Log Notifikasi Pre-seeded ────────────────────────────
  console.log("  → Menyuntikkan log notifikasi pre-seeded sesuai standar sistem (local-engine)...");
  const now = new Date();
  const currentMonthStr = dayjs().format("YYYY-MM");
  const currentWeekStr = dayjs().format("YYYY-ww");

  const notifLogs = [
    // ① FT-01 — Target Belum Ada Progres (Priority 2.3, warning)
    {
      clientId: randomUUID(),
      dedupeKey: `GENERIC_NUDGE:${userId}:TargetBelumAdaProgres:${currentMonthStr}`,
      userId,
      title: "Target Belum Ada Progres",
      body: "Target 'Dana Darurat & Liburan Akhir Tahun' sudah berjalan 67% dari periodenya, namun belum ada pemasukan yang tercatat. Pastikan target sudah sesuai rencanamu.",
      type: "2.3",
      eventType: "SPENDING_INSIGHT",
      status: "delivered",
      severity: "warning",
      source: "local-engine",
      ctaRoute: "/targets",
      ctaLabel: "Lihat Target",
      createdAt: dayjs().subtract(1, "day").toDate(),
      updatedAt: now,
    },

    // ② WL-04 — Pola Penggunaan Dompet (Priority 3.8, neutral)
    {
      clientId: randomUUID(),
      dedupeKey: `GENERIC_NUDGE:${userId}:PolaPenggunaanDompet:${currentMonthStr}`,
      userId,
      title: "Pola Penggunaan Dompet",
      body: "Sekadar info: 94% pengeluaran 'Jajan'-mu selalu menggunakan dompet 'Dompet Utama (BCA)'.",
      type: "3.8",
      eventType: "SPENDING_INSIGHT",
      status: "delivered",
      severity: "neutral",
      source: "local-engine",
      ctaRoute: "/wallets",
      ctaLabel: "Lihat Dompet",
      createdAt: dayjs().subtract(2, "day").toDate(),
      updatedAt: now,
    },

    // ③ AN-09 — Proyeksi Kebiasaan / wantsProjection (Priority 2.5, warning)
    {
      clientId: randomUUID(),
      dedupeKey: `WANTS_PROJECTION:${userId}:${currentMonthStr}`,
      userId,
      title: "Proyeksi Kebiasaan",
      body: "Bulan ini kategori Jajan menjadi salah satu pengeluaran terbesar dengan total Rp 160.000. Kamu sudah melakukan transaksi ini sebanyak 8 kali secara berulang. Jika pola ini berlanjut, estimasi tahunannya dapat mencapai Rp 1.920.000. Pertimbangkan memantau pola pengeluaran ini agar tetap terkendali.",
      type: "2.5",
      eventType: "SPENDING_INSIGHT",
      status: "delivered",
      severity: "warning",
      source: "local-engine",
      ctaRoute: "/analytics",
      ctaLabel: "Lihat Tren",
      createdAt: dayjs().subtract(3, "day").toDate(),
      updatedAt: now,
    },

    // ④ PR-01 — Berhasil Berhemat / Weekly Savings (Priority 3.5, positive)
    {
      clientId: randomUUID(),
      dedupeKey: `WEEKLY_SAVINGS:${userId}:${currentWeekStr}`,
      userId,
      title: "Kamu Berhasil Berhemat!",
      body: "Hebat! Kamu berhasil menyisakan Rp 4.880.000 pada 7 hari terakhir. Pertahankan kebiasaan baik ini.",
      type: "3.5",
      eventType: "SPENDING_INSIGHT",
      status: "delivered",
      severity: "positive",
      source: "local-engine",
      ctaRoute: "/transactions",
      ctaLabel: "Lihat Rincian",
      createdAt: dayjs().subtract(4, "day").toDate(),
      updatedAt: now,
    },

    // ⑤ BG-00c — Batas Anggaran Terlampaui & Rekomendasi Subsidi Silang (Priority 0.1, critical)
    {
      clientId: randomUUID(),
      dedupeKey: budgetMakanan
        ? `BUDGET_USAGE:${userId}:${budgetMakanan.clientId}:${currentMonthStr}:101:${new Date(budgetMakanan.updatedAt).getTime()}`
        : `BUDGET_USAGE:${userId}:makanan:${currentMonthStr}:101:none`,
      userId,
      title: "Rekomendasi Subsidi Silang",
      body: "Anggaran Makanan telah melewati batas sebesar Rp 50.000. Kamu dapat mempertimbangkan memindahkan Rp 50.000 dari Belanja Harian. Keputusan tetap ada di tanganmu.",
      type: "0.1",
      eventType: "BUDGET_CRITICAL",
      actionType: "REALLOCATE_BUDGET",
      status: "delivered",
      severity: "critical",
      source: "local-engine",
      relatedBudgetId: budgetMakanan?.clientId,
      relatedCategoryId: catMakanan ?? undefined,
      sourceBudgetId: budgetBelanja?.clientId,
      targetBudgetId: budgetMakanan?.clientId,
      recommendedAmount: 50_000,
      sourceCategoryName: "Belanja Harian",
      targetCategoryName: "Makanan",
      ctaRoute: budgetBelanja && budgetMakanan
        ? `/budgets?action=reallocate&sourceBudgetId=${budgetBelanja.clientId}&targetBudgetId=${budgetMakanan.clientId}&amount=50000`
        : "/budgets",
      ctaLabel: "Subsidi Silang",
      categoryName: "Makanan",
      usageRatio: 1.17,
      budgetLimit: 300_000,
      budgetSpent: 350_000,
      deficitAmount: 50_000,
      createdAt: dayjs().subtract(1, "day").toDate(),
      updatedAt: now,
    },
  ];

  await db.notificationLog.createMany({ data: notifLogs });
  console.log(`  ✅ ${notifLogs.length} log notifikasi berhasil disuntikkan.`);

  console.log(`
╔═══════════════════════════════════════════════════════════════════════╗
║          ✅  SEED SIDANG SELESAI — PANDUAN DEMO SP-01                 ║
╠═══════════════════════════════════════════════════════════════════════╣
║  5 rule yang sudah muncul di halaman Notifikasi:                      ║
║    ① FT-01  → "Target Belum Ada Progres"                              ║
║    ② WL-04  → "Pola Penggunaan Dompet"                                ║
║    ③ AN-09  → "Proyeksi Kebiasaan"                                    ║
║    ④ PR-01  → "Kamu Berhasil Berhemat!"                               ║
║    ⑤ BG-00c → "Rekomendasi Subsidi Silang" (Makanan ← Belanja Harian) ║
╠═══════════════════════════════════════════════════════════════════════╣
║  DEMO LIVE — Memicu SP-01 (Pengeluaran Awal Bulan):                   ║
║  1. Login & klik "Tarik Data" agar IndexedDB sinkron                  ║
║  2. Buka halaman Transaksi → Tambah Transaksi Baru                    ║
║  3. Isi:  Kategori   = Transportasi (JANGAN pilih Belanja Harian      ║
║                        agar donor Subsidi Silang tetap sisa >= 70%!)  ║
║           Nominal    = Rp 1.800.000 (atau lebih)                      ║
║           Tanggal    = Hari ini                                        ║
║  4. Simpan → kartu "Pengeluaran Awal Bulan" (SP-01) langsung muncul,  ║
║     DAN "Rekomendasi Subsidi Silang" (BG-00c) tetap aktif!            ║
║                                                                       ║
║  Cara hitung threshold 40%:                                           ║
║    Total anggaran = Rp 300.000 + Rp 5.000.000 = Rp 5.300.000         ║
║    Batas 40%      = Rp 5.300.000 × 0,4 = Rp 2.120.000                ║
║    Sudah ada      = Rp 350.000 (makanan)                              ║
║    Kurang         = Rp 2.120.000 - Rp 350.000 = Rp 1.770.001         ║
║    → Input Rp 1.800.000 untuk margin keamanan demo                   ║
╚═══════════════════════════════════════════════════════════════════════╝
`);
}
