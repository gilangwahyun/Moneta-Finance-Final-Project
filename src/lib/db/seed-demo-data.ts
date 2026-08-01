// ─── Behavioral Mock Data Seeding (Untuk Evaluasi Usability / Skripsi) ───
// Menyediakan fungsi seedDemoDataForUser() untuk menyuntikkan data transaksi,
// dompet, anggaran, dan target keuangan sintetis yang dirancang khusus untuk
// memicu insight behavioral engine (Nudging) & keperluan pengujian UCD.

import { randomUUID } from "crypto";
import dayjs from "dayjs";
import { prisma } from "@/lib/db/prisma";
import { DEFAULT_CATEGORIES } from "@/lib/db/default-categories";

/**
 * Menyuntikkan data simulasi keuangan (Dompet, Anggaran, Target Finansial,
 * dan ±60 Transaksi ter-skenario) untuk pengguna tertentu.
 *
 * Dirancang memicu aturan instrumen evaluasi:
 * 1. BG-00b (Anggaran Mulai Menipis - kategori Makanan 84% terpakai)
 * 2. SP-02  (Weekend Trap - pengeluaran terkonsentrasi Sabtu-Minggu)
 * 3. AN-02  (Category Creep - kenaikan kategori Hiburan/Langganan)
 * 4. WL-02  (Saldo Dompet Menipis)
 * 5. FT-01  (Target Belum Ada Progres - target aktif >30% periode, kontribusi Rp0)
 * 6. PR-01  (Berhasil Berhemat - net 7 hari terakhir positif)
 *
 * @param userId - ID Pengguna (UUID) yang akan di-seed.
 * @param db - Instance PrismaClient atau PrismaTransaction.
 */
export async function seedDemoDataForUser(userId: string, db: any = prisma) {
  // 1. Pastikan kategori default tersedia untuk user
  let categoriesDb = await db.category.findMany({
    where: { userId },
  });

  if (categoriesDb.length === 0) {
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

  const getCatId = (name: string) =>
    categoriesDb.find((c: any) => c.name === name)?.id || null;

  // 2. Buat Dompet Utama (Bank)
  const wallet = await db.wallet.create({
    data: {
      clientId: randomUUID(),
      name: "Dompet Utama (BCA)",
      type: "BANK",
      initialBalance: 2500000, // Disetel Rp 2.500.000 agar akumulasi saldo bersih selalu positif & realistis
      userId,
      syncStatus: "SYNCED",
    },
  });
  const walletId = wallet.id;

  // 3. Buat Anggaran Bulanan (Periode YYYY-MM)
  const currentPeriod = dayjs().format("YYYY-MM");

  // BG-00b: Anggaran Makanan Rp500.000 (akan terisi Rp420.000 = 84%)
  const makananCatId = getCatId("Makanan");
  if (makananCatId) {
    await db.budget.create({
      data: {
        clientId: randomUUID(),
        amount: 500000,
        period: currentPeriod,
        categoryId: makananCatId,
        userId,
        syncStatus: "SYNCED",
      },
    });
  }

  // Anggaran Belanja Harian Rp3.000.000
  const belanjaCatId = getCatId("Belanja Harian");
  if (belanjaCatId) {
    await db.budget.create({
      data: {
        clientId: randomUUID(),
        amount: 3000000,
        period: currentPeriod,
        categoryId: belanjaCatId,
        userId,
        syncStatus: "SYNCED",
      },
    });
  }

  // Anggaran Hiburan Rp1.500.000
  const hiburanCatId = getCatId("Hiburan");
  if (hiburanCatId) {
    await db.budget.create({
      data: {
        clientId: randomUUID(),
        amount: 1500000,
        period: currentPeriod,
        categoryId: hiburanCatId,
        userId,
        syncStatus: "SYNCED",
      },
    });
  }

  // 4. Buat Target Finansial (FT-01: Target Belum Ada Progres)
  await db.financialTarget.create({
    data: {
      clientId: randomUUID(),
      name: "Dana Darurat & Liburan",
      type: "SAVING_TARGET",
      targetAmount: 10000000,
      period: "CUSTOM",
      startDate: dayjs().startOf("day").subtract(12, "day").toDate(), // Memaksa >30% waktu berjalan
      endDate: dayjs().startOf("day").add(18, "day").toDate(),
      isActive: true,
      note: "Target menabung bulanan (Simulasi Pengujian)",
      userId,
      syncStatus: "SYNCED",
    },
  });

  // 5. Bersihkan transaksi & notifikasi lama untuk user (jika ada) sebelum menyuntikkan data
  await db.transaction.deleteMany({ where: { userId } });
  await db.notificationLog.deleteMany({ where: { userId } });

  const txns: any[] = [];

  // 🎯 Gaji Bulan Lalu (25 bulan lalu) agar cashflow historis & akumulasi saldo positif
  const lastMonthPayday = dayjs().subtract(1, "month").date(25);
  txns.push({
    clientId: randomUUID(),
    amount: 5000000,
    type: "INCOME",
    description: "Gaji Bulanan (Bulan Lalu)",
    date: lastMonthPayday.toDate(),
    createdAt: lastMonthPayday.toDate(),
    walletId,
    categoryId: getCatId("Gaji"),
    userId,
    syncStatus: "SYNCED",
  });

  // 🎯 Pola 1: Payday Leak (Gaji Masuk & Langsung Habis)
  // Gaji disetel hari ini agar bulan ini tercatat memiliki pemasukan (mencegah error 'Data Pemasukan Kosong')
  const paydayDate = dayjs().toDate();
  txns.push({
    clientId: randomUUID(),
    amount: 5000000,
    type: "INCOME",
    description: "Gaji Bulanan",
    date: paydayDate,
    createdAt: paydayDate,
    walletId,
    categoryId: getCatId("Gaji"),
    userId,
    syncStatus: "SYNCED",
  });

  // Belanja Bulanan diletakkan di awal bulan (tgl 2) agar tidak mengacaukan analisis hari tertinggi akhir pekan
  const earlyMonthDate = dayjs().startOf("month").add(1, "day");
  txns.push({
    clientId: randomUUID(),
    amount: 1500000,
    type: "EXPENSE",
    description: "Belanja Kebutuhan Bulanan",
    date: earlyMonthDate.toDate(),
    createdAt: earlyMonthDate.toDate(),
    walletId,
    categoryId: getCatId("Belanja Harian"),
    userId,
    syncStatus: "SYNCED",
  });

  // Makanan total = 270.000 + 150.000 = Rp420.000 (persis 84% dari anggaran Rp500.000 -> BG-00b)
  txns.push({
    clientId: randomUUID(),
    amount: 270000,
    type: "EXPENSE",
    description: "Makan Malam Bersama Teman",
    date: dayjs().toDate(),
    createdAt: dayjs().toDate(),
    walletId,
    categoryId: getCatId("Makanan"),
    userId,
    syncStatus: "SYNCED",
  });

  // Digeser ke hari ini (tapi mundur beberapa jam) agar tetap masuk anggaran bulan ini (Agustus)
  // Target: 270k + 150k = 420k (84% dari 500k)
  const makanKeluargaDate = dayjs().startOf("day").add(15, "hour").toDate();
  txns.push({
    clientId: randomUUID(),
    amount: 150000,
    type: "EXPENSE",
    description: "Makan Keluarga (Weekend)",
    date: makanKeluargaDate,
    createdAt: makanKeluargaDate,
    walletId,
    categoryId: getCatId("Makanan"),
    userId,
    syncStatus: "SYNCED",
  });

  // 🎯 Pola 2: The Latte Factor (14x Es Kopi ~Rp 15.000)
  for (let i = 1; i <= 14; i++) {
    const d = dayjs().subtract(i * 2, "day");
    txns.push({
      clientId: randomUUID(),
      amount: 15000 + Math.floor(Math.random() * 3000),
      type: "EXPENSE",
      description: "Es Kopi Susu",
      date: d.toDate(),
      createdAt: d.set("hour", 14).toDate(),
      walletId,
      categoryId: getCatId("Jajan"),
      userId,
      syncStatus: "SYNCED",
    });
  }

  // 🎯 Pola 3: Night-Owl Spending (Pengeluaran larut malam)
  const nightDates = [
    dayjs().subtract(5, "day"),
    dayjs().subtract(12, "day"),
    dayjs().subtract(15, "day"),
  ];
  nightDates.forEach((d, idx) => {
    txns.push({
      clientId: randomUUID(),
      amount: idx === 0 ? 120000 : 80000,
      type: "EXPENSE",
      description: idx === 0 ? "Steam Game" : "Midnight Snack",
      date: d.toDate(),
      createdAt: d
        .set("hour", idx === 0 ? 23 : 1)
        .set("minute", 30)
        .toDate(),
      walletId,
      categoryId: idx === 0 ? getCatId("Hiburan") : getCatId("Jajan"),
      userId,
      syncStatus: "SYNCED",
    });
  });

  // 🎯 Pola 4: Weekend Trap (SP-02: Dominasi akhir pekan hari Sabtu & Minggu minggu ini)
  const saturdayDate = dayjs().day(6);
  const sundayDate = dayjs().day(0);
  txns.push({
    clientId: randomUUID(),
    amount: 950000,
    type: "EXPENSE",
    description: "Weekend Getaway",
    date: saturdayDate.toDate(),
    createdAt: saturdayDate.toDate(),
    walletId,
    categoryId: getCatId("Hiburan"),
    userId,
    syncStatus: "SYNCED",
  });
  txns.push({
    clientId: randomUUID(),
    amount: 450000,
    type: "EXPENSE",
    description: "Makan Keluarga Akhir Pekan",
    date: sundayDate.toDate(),
    createdAt: sundayDate.toDate(),
    walletId,
    categoryId: getCatId("Hiburan"),
    userId,
    syncStatus: "SYNCED",
  });

  // 🎯 Pola 5: Subscription Cannibalization (AN-02 Category Creep)
  const subs = [
    { name: "Spotify Premium", amount: 49000, cat: "Langganan", day: 5 },
    { name: "Netflix Standard", amount: 153000, cat: "Langganan", day: 15 },
    { name: "Internet Rumah Fiber", amount: 350000, cat: "Tagihan", day: 20 },
  ];
  for (const sub of subs) {
    const dCurr = dayjs().date(sub.day);
    const dPrev = dayjs().subtract(1, "month").date(sub.day);
    [dCurr, dPrev].forEach((d) => {
      txns.push({
        clientId: randomUUID(),
        amount: sub.amount,
        type: "EXPENSE",
        description: sub.name,
        date: d.toDate(),
        createdAt: d.toDate(),
        walletId,
        categoryId: getCatId(sub.cat),
        userId,
        syncStatus: "SYNCED",
      });
    });
  }

  // 🎯 Pola 5b: Category Creep untuk Kategori Hiburan (AN-02)
  // Menyuntikkan data 3 bulan ke belakang yang merayap naik (>10%/bulan)
  const hiburanSejarah = [
    { bulanMundur: 3, amount: 600000 },
    { bulanMundur: 2, amount: 700000 },
    { bulanMundur: 1, amount: 800000 },
  ];
  for (const h of hiburanSejarah) {
    const dHist = dayjs().subtract(h.bulanMundur, "month").startOf("month").add(10, "day").toDate();
    txns.push({
      clientId: randomUUID(),
      amount: h.amount,
      type: "EXPENSE",
      description: "Aktivitas Hiburan Bulanan",
      date: dHist,
      createdAt: dHist,
      walletId,
      categoryId: getCatId("Hiburan"),
      userId,
      syncStatus: "SYNCED",
    });
  }

  // 🎯 Pola 6: Pengurasan Saldo (WL-02)
  // Transaksi raksasa di luar jendela 7 hari agar global wallet terkuras tanpa merusak cashflow 7 hari
  const drainingDate = dayjs().startOf("day").subtract(8, "day").toDate();
  txns.push({
    clientId: randomUUID(),
    amount: 3700000,
    type: "EXPENSE",
    description: "Pembayaran Darurat Medis / Cicilan Ekstra",
    date: drainingDate,
    createdAt: drainingDate,
    walletId,
    categoryId: getCatId("Tagihan") || getCatId("Lainnya"),
    userId,
    syncStatus: "SYNCED",
  });

  // Transaksi Historis Bulan Lalu (Sebagai data historis perbandingan grafik)
  for (let i = 1; i <= 20; i++) {
    const d = dayjs().subtract(1, "month").startOf("month").add(i, "day");
    txns.push({
      clientId: randomUUID(),
      amount: 25000 + Math.floor(Math.random() * 50000),
      type: "EXPENSE",
      description: "Makan Siang Harian",
      date: d.toDate(),
      createdAt: d.set("hour", 12).toDate(),
      walletId,
      categoryId: getCatId("Makanan"),
      userId,
      syncStatus: "SYNCED",
    });
  }

  await db.transaction.createMany({ data: txns });

  // 6. 🎯 Suntikkan 6 Log Notifikasi Evaluasi (BG-00b, SP-02, AN-02, WL-02, FT-01, PR-01)
  const now = new Date();
  const notifLogs = [
    {
      clientId: randomUUID(),
      dedupeKey: `eval-bg00b-${userId}`,
      userId,
      title: "Anggaran 'Makanan' Sudah Terpakai 84%",
      body: "Pengeluaran kategori Makanan bulan ini mencapai Rp 420.000 dari batas anggaran Rp 500.000. Tersisa Rp 80.000.",
      type: "BUDGET_WARNING",
      status: "delivered",
      severity: "WARNING",
      source: "engine",
      ctaRoute: "/budgets",
      ctaLabel: "Lihat Anggaran",
      createdAt: now,
      updatedAt: now,
    },
    {
      clientId: randomUUID(),
      dedupeKey: `eval-sp02-${userId}`,
      userId,
      title: "Pola Pengeluaran Akhir Pekan Terdeteksi",
      body: "Lebih dari 75% pengeluaran minggu ini terkonsentrasi pada hari Sabtu dan Minggu (total Rp 1.400.000). Waspadai pengeluaran akhir pekan.",
      type: "BEHAVIORAL_INSIGHT",
      status: "delivered",
      severity: "INFO",
      source: "engine",
      ctaRoute: "/analytics",
      ctaLabel: "Lihat Analitik",
      createdAt: now,
      updatedAt: now,
    },
    {
      clientId: randomUUID(),
      dedupeKey: `eval-an02-${userId}`,
      userId,
      title: "Tren Kenaikan Kategori Hiburan & Langganan",
      body: "Akumulasi pengeluaran hiburan dan layanan berlangganan (Spotify, Netflix, Internet) meningkat signifikan dibandingkan bulan lalu.",
      type: "BEHAVIORAL_INSIGHT",
      status: "delivered",
      severity: "WARNING",
      source: "engine",
      ctaRoute: "/analytics",
      ctaLabel: "Analisis Kategori",
      createdAt: now,
      updatedAt: now,
    },
    {
      clientId: randomUUID(),
      dedupeKey: `eval-wl02-${userId}`,
      userId,
      title: "Perhatian: Pengingat Saldo Dompet",
      body: "Pantau terus pengeluaran harianmu agar saldo operasional Dompet Utama (BCA) tetap sehat hingga akhir bulan.",
      type: "CASHFLOW_ALERT",
      status: "delivered",
      severity: "WARNING",
      source: "engine",
      ctaRoute: "/wallets",
      ctaLabel: "Cek Dompet",
      createdAt: now,
      updatedAt: now,
    },
    {
      clientId: randomUUID(),
      dedupeKey: `eval-ft01-${userId}`,
      userId,
      title: "Target 'Dana Darurat & Liburan' Belum Ada Progres",
      body: "Target Rp 10.000.000 sudah berjalan di bulan ini namun belum ada kontribusi tabungan yang tercatat (Rp 0).",
      type: "TARGET_ALERT",
      status: "delivered",
      severity: "WARNING",
      source: "engine",
      ctaRoute: "/targets",
      ctaLabel: "Isi Target",
      createdAt: now,
      updatedAt: now,
    },
    {
      clientId: randomUUID(),
      dedupeKey: `eval-pr01-${userId}`,
      userId,
      title: "Keren! Kamu Berhasil Berhemat",
      body: "Arus kas bersih 7 hari terakhir positif berkat manajemen pengeluaran yang terkontrol. Pertahankan kebiasaan baik ini!",
      type: "POSITIVE_REINFORCEMENT",
      status: "delivered",
      severity: "SUCCESS",
      source: "engine",
      ctaRoute: "/",
      ctaLabel: "Lihat Dashboard",
      createdAt: now,
      updatedAt: now,
    },
  ];

  await db.notificationLog.createMany({ data: notifLogs });
}
