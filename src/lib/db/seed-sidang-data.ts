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
  const catFreelance = getCatId("Freelance");

  // ─── 2. Bersihkan data lama agar proses seeding idempotent (bisa diulang berkali-kali) ───
  console.log("  → Membersihkan transaksi, notifikasi, anggaran, target, dan dompet lama...");
  await db.transaction.deleteMany({ where: { userId } });
  await db.notificationLog.deleteMany({ where: { userId } });
  await db.budget.deleteMany({ where: { userId } });
  await db.financialTarget.deleteMany({ where: { userId } });
  await db.wallet.deleteMany({ where: { userId } });

  // ─── 3. Buat Dompet Utama & Dompet Tabungan Investasi ──────────────────
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

  const walletTabungan = await db.wallet.create({
    data: {
      clientId: randomUUID(),
      name: "Tabungan Investasi (Bibit / Rekening Jago)",
      type: "INVESTASI",
      initialBalance: 2_500_000,
      userId,
      syncStatus: "SYNCED",
    },
  });
  const walletTabunganId = walletTabungan.id;

  // ─── 4. Buat Anggaran Bulan Ini (Choice Architecture & Spatial Ordering) ──
  // Gradasi anggaran untuk mendemonstrasikan Spatial Ordering & Ambient Priming:
  //   1. Belanja Harian (Rp 4.000.000, terpakai Rp 500.000 = 12.5%) → Sisa Rp 3.500.000 (Top #1 Spatial)
  //   2. Transportasi   (Rp 1.000.000, terpakai Rp 150.000 = 15%)   → Sisa Rp 850.000 (Top #2 Spatial)
  //   3. Hiburan        (Rp 600.000, terpakai Rp 350.000 = 58.3%)   → Sisa Rp 250.000 (Mid)
  //   4. Jajan          (Rp 200.000, terpakai Rp 190.000 = 95%)     → Sisa Rp 10.000 (≥85% → Ambient Priming amber tint)
  //   5. Makanan        (Rp 300.000, terpakai Rp 380.000 = 126.7%)  → Defisit Rp 80.000 (BG-00c Subsidi Silang)
  const currentPeriod = dayjs().format("YYYY-MM");
  console.log("  → Membuat anggaran bulan ini...");

  let budgetMakanan: any = null;
  let budgetBelanja: any = null;
  let budgetTransp: any = null;
  let budgetHiburan: any = null;
  let budgetJajan: any = null;

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
        amount: 4_000_000,
        period: currentPeriod,
        categoryId: catBelanja,
        userId,
        syncStatus: "SYNCED",
      },
    });
  }

  if (catTransp) {
    budgetTransp = await db.budget.create({
      data: {
        clientId: randomUUID(),
        amount: 1_000_000,
        period: currentPeriod,
        categoryId: catTransp,
        userId,
        syncStatus: "SYNCED",
      },
    });
  }

  if (catHiburan) {
    budgetHiburan = await db.budget.create({
      data: {
        clientId: randomUUID(),
        amount: 600_000,
        period: currentPeriod,
        categoryId: catHiburan,
        userId,
        syncStatus: "SYNCED",
      },
    });
  }

  if (catJajan) {
    budgetJajan = await db.budget.create({
      data: {
        clientId: randomUUID(),
        amount: 200_000,
        period: currentPeriod,
        categoryId: catJajan,
        userId,
        syncStatus: "SYNCED",
      },
    });
  }

  // ─── 5. Buat Target Finansial (Revisi Sidang: 1:N Category & Direct Link) ──
  console.log("  → Membuat target finansial...");

  // Target 1: FT-01 (Target Belum Ada Progres - Stagnan >67% waktu berjalan, Rp 0 kontribusi)
  const targetStagnan = await db.financialTarget.create({
    data: {
      clientId: randomUUID(),
      name: "Dana Darurat & Liburan Akhir Tahun",
      type: "SAVING_TARGET",
      targetAmount: 15_000_000,
      period: "CUSTOM",
      startDate: dayjs().subtract(20, "day").startOf("day").toDate(),
      endDate: dayjs().add(10, "day").startOf("day").toDate(),
      categoryId: catInvestasi, // Terhubung ke kategori Investasi
      walletId,
      isActive: true,
      note: "Target menabung untuk keperluan darurat dan liburan (Demo Sidang - FT-01 Stagnan)",
      userId,
      syncStatus: "SYNCED",
    },
  });

  // Target 2: Target Baru dengan Progres Aktif 50% via Direct Transaction Allocation (financialTargetId)
  // Menunjukkan relasi 1:N Category-to-Target (keduanya berbagi kategori 'Investasi')
  const targetAktif = await db.financialTarget.create({
    data: {
      clientId: randomUUID(),
      name: "Tabungan Investasi Masa Depan",
      type: "SAVING_TARGET",
      targetAmount: 5_000_000,
      period: "CUSTOM",
      startDate: dayjs().startOf("month").toDate(),
      endDate: dayjs().add(2, "month").endOf("month").toDate(),
      categoryId: catInvestasi, // ⭐️ 1:N Category-to-Target: Sama-sama kategori Investasi dengan Target 1
      walletId: walletTabunganId,
      isActive: true,
      note: "Target portofolio investasi dengan alokasi transaksi langsung (Fitur Revisi Sidang)",
      userId,
      syncStatus: "SYNCED",
    },
  });

  // Target 3: Target ke-3 di Kategori Investasi (Progres 100% - Status Tercapai)
  // ⭐️ Membuktikan 3 target dalam 1 kategori yang sama dengan progres 0%, 50%, 100%
  const targetReksadana = await db.financialTarget.create({
    data: {
      clientId: randomUUID(),
      name: "Portofolio Reksadana Pasar Uang",
      type: "SAVING_TARGET",
      targetAmount: 2_000_000,
      period: "CUSTOM",
      startDate: dayjs().subtract(10, "day").startOf("day").toDate(),
      endDate: dayjs().add(20, "day").startOf("day").toDate(),
      categoryId: catInvestasi, // ⭐️ Kategori Investasi (Target ke-3)
      walletId: walletTabunganId,
      isActive: true,
      note: "Target investasi reksadana pasar uang (Revisi Sidang: 100% Tercapai dalam Kategori Investasi)",
      userId,
      syncStatus: "SYNCED",
    },
  });

  // Target 4: Target Freelance 1 (Progres 75% - Status Hampir Tercapai)
  // ⭐️ Menunjukkan relasi 1:N Category-to-Target di Kategori Lain ('Freelance')
  let targetFreelanceLaptop: any = null;
  let targetFreelanceCert: any = null;

  if (catFreelance) {
    targetFreelanceLaptop = await db.financialTarget.create({
      data: {
        clientId: randomUUID(),
        name: "Upgrade Laptop Kerja",
        type: "SAVING_TARGET",
        targetAmount: 8_000_000,
        period: "CUSTOM",
        startDate: dayjs().startOf("month").toDate(),
        endDate: dayjs().add(1, "month").endOf("month").toDate(),
        categoryId: catFreelance, // ⭐️ Kategori Freelance
        walletId,
        isActive: true,
        note: "Target pengadaan laptop baru dari hasil proyek freelance (Revisi Sidang: Progres 75% Hampir Tercapai)",
        userId,
        syncStatus: "SYNCED",
      },
    });

    // Target 4: Target Freelance 2 (Progres 100% - Status Tercapai Penuh)
    // ⭐️ Berbagi kategori 'Freelance' dengan Target 3
    targetFreelanceCert = await db.financialTarget.create({
      data: {
        clientId: randomUUID(),
        name: "Sertifikasi Cloud Professional",
        type: "SAVING_TARGET",
        targetAmount: 3_000_000,
        period: "CUSTOM",
        startDate: dayjs().subtract(15, "day").startOf("day").toDate(),
        endDate: dayjs().add(15, "day").startOf("day").toDate(),
        categoryId: catFreelance, // ⭐️ Kategori Freelance
        walletId,
        isActive: true,
        note: "Target tabungan sertifikasi IT profesional (Revisi Sidang: Progres 100% Tercapai)",
        userId,
        syncStatus: "SYNCED",
      },
    });
  }

  // ─── 6. Bangun array transaksi ───────────────────────────────────────────
  console.log("  → Menyuntikkan transaksi historis...");
  const txns: any[] = [];

  // ══════════════════════════════════════════════════════════════════════════
  // BLOK A: GAJI HARI INI — KUNCI PEMICU SP-01 SAAT DEMO
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
  // BLOK B: PEMASUKAN DENGAN ALOKASI LANGSUNG KE TARGET 2 (Revisi Sidang)
  //   Total = 1.500.000 + 1.000.000 = Rp 2.500.000 (Tepat 50% dari target Rp 5.000.000)
  //   Membuktikan Direct Transaction-to-Target link (financialTargetId)
  // ══════════════════════════════════════════════════════════════════════════
  txns.push({
    clientId: randomUUID(),
    amount: 1_500_000,
    type: "INCOME",
    description: "Alokasi Bonus Project ke Tabungan Investasi",
    date: dayjs().subtract(5, "day").toDate(),
    createdAt: dayjs().subtract(5, "day").set("hour", 10).toDate(),
    walletId: walletTabunganId,
    categoryId: catInvestasi,
    financialTargetId: targetAktif.id, // ⭐️ FK relasi langsung ke FinancialTarget
    userId,
    syncStatus: "SYNCED",
  });

  txns.push({
    clientId: randomUUID(),
    amount: 1_000_000,
    type: "INCOME",
    description: "Penyisihan Gaji untuk Investasi Berkala",
    date: dayjs().subtract(1, "day").toDate(),
    createdAt: dayjs().subtract(1, "day").set("hour", 14).toDate(),
    walletId: walletTabunganId,
    categoryId: catInvestasi,
    financialTargetId: targetAktif.id, // ⭐️ FK relasi langsung ke FinancialTarget
    userId,
    syncStatus: "SYNCED",
  });

  txns.push({
    clientId: randomUUID(),
    amount: 2_000_000,
    type: "INCOME",
    description: "Alokasi Keuntungan Dividen ke Reksadana",
    date: dayjs().subtract(2, "day").toDate(),
    createdAt: dayjs().subtract(2, "day").set("hour", 9).toDate(),
    walletId: walletTabunganId,
    categoryId: catInvestasi,
    financialTargetId: targetReksadana.id, // ⭐️ FK relasi langsung ke Target Reksadana (100% Tercapai)
    userId,
    syncStatus: "SYNCED",
  });

  // ══════════════════════════════════════════════════════════════════════════
  // BLOK B2: PEMASUKAN DENGAN ALOKASI LANGSUNG KE TARGET FREELANCE (Revisi Sidang)
  //   - Target 3 (Upgrade Laptop): Terisi Rp 6.000.000 (75% - Status Hampir Tercapai)
  //   - Target 4 (Sertifikasi Cloud): Terisi Rp 3.000.000 (100% - Status Tercapai)
  // ══════════════════════════════════════════════════════════════════════════
  if (catFreelance && targetFreelanceLaptop) {
    txns.push({
      clientId: randomUUID(),
      amount: 6_000_000,
      type: "INCOME",
      description: "Pembayaran Termin 1 Proyek Web Redesign",
      date: dayjs().subtract(7, "day").toDate(),
      createdAt: dayjs().subtract(7, "day").set("hour", 11).toDate(),
      walletId,
      categoryId: catFreelance,
      financialTargetId: targetFreelanceLaptop.id, // ⭐️ FK relasi langsung ke Target Laptop
      userId,
      syncStatus: "SYNCED",
    });
  }

  if (catFreelance && targetFreelanceCert) {
    txns.push({
      clientId: randomUUID(),
      amount: 3_000_000,
      type: "INCOME",
      description: "Honor Konsultasi Arsitektur Cloud",
      date: dayjs().subtract(3, "day").toDate(),
      createdAt: dayjs().subtract(3, "day").set("hour", 15).toDate(),
      walletId,
      categoryId: catFreelance,
      financialTargetId: targetFreelanceCert.id, // ⭐️ FK relasi langsung ke Target Sertifikasi
      userId,
      syncStatus: "SYNCED",
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // BLOK C: PENGELUARAN MAKANAN BULAN INI — melampaui anggaran Rp 300.000
  //   Total = 200.000 + 150.000 + 30.000 = 380.000 > 300.000
  //   Defisit = Rp 80.000 → BG-00c (Rekomendasi Subsidi Silang Rp 80.000)
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
  // BLOK D: BELANJA HARIAN BULAN INI (Donor Subsidi Silang & Spatial Rank #1)
  //   Rp 500.000 terpakai dari anggaran Rp 4.000.000 → Sisa Rp 3.500.000 (87.5% sisa)
  // ══════════════════════════════════════════════════════════════════════════
  if (catBelanja) {
    txns.push({
      clientId: randomUUID(),
      amount: 500_000,
      type: "EXPENSE",
      description: "Belanja Bulanan Supermarket",
      date: dayjs().subtract(4, "day").toDate(),
      createdAt: dayjs().subtract(4, "day").set("hour", 16).toDate(),
      walletId,
      categoryId: catBelanja,
      userId,
      syncStatus: "SYNCED",
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // BLOK E: HIBURAN BULAN INI
  //   Rp 350.000 terpakai dari anggaran Rp 600.000 → Sisa Rp 250.000
  // ══════════════════════════════════════════════════════════════════════════
  if (catHiburan) {
    txns.push({
      clientId: randomUUID(),
      amount: 350_000,
      type: "EXPENSE",
      description: "Aktivitas Hiburan & Rekreasi Akhir Pekan",
      date: dayjs().subtract(3, "day").toDate(),
      createdAt: dayjs().subtract(3, "day").set("hour", 15).toDate(),
      walletId,
      categoryId: catHiburan,
      userId,
      syncStatus: "SYNCED",
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // BLOK F: HISTORI 3 BULAN — membangun profil perilaku untuk WL-04 & AN-09
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

  // ══════════════════════════════════════════════════════════════════════════
  // BLOK G: JAJAN BULAN INI (Memicu Ambient Visual Priming ≥85% & AN-09)
  //   7 transaksi @ Rp 25.000 = Rp 175.000 + Rp 15.000 di Blok H = Rp 190.000
  //   Anggaran Jajan = Rp 200.000 → Terpakai 95% (≥85% → Warm Amber Tint)
  // ══════════════════════════════════════════════════════════════════════════
  for (let i = 1; i <= 7; i++) {
    const d = dayjs().startOf("month").add(i * 2, "day");
    if (d.isAfter(dayjs())) break;
    if (catJajan) {
      txns.push({
        clientId: randomUUID(),
        amount: 25_000,
        type: "EXPENSE",
        description: "Es Kopi Susu & Snack",
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
  // BLOK H: PENGELUARAN KECIL 7 HARI TERAKHIR (Transportasi, Makan, Jajan)
  //   Transportasi total = 25k + 50k + 75k = Rp 150.000 / Anggaran Rp 1.000.000 (Sisa 85% → Spatial Rank #2)
  //   Net 7 hari terakhir tetap positif → PR-01 valid
  // ══════════════════════════════════════════════════════════════════════════
  const pengeluaranKecil = [
    { desc: "Transportasi Grab", amount: 25_000, cat: catTransp, mundur: 6 },
    { desc: "Makan Siang",       amount: 30_000, cat: catMakanan, mundur: 5 },
    { desc: "Parkir & Bensin",   amount: 50_000, cat: catTransp, mundur: 4 },
    { desc: "Jajan Kantor",      amount: 15_000, cat: catJajan,  mundur: 3 },
    { desc: "Tiket KRL Commuter", amount: 75_000, cat: catTransp, mundur: 2 },
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
  console.log("  → Menyuntikkan log notifikasi pre-seeded sesuai standar sistem (Calm Nudge)...");
  const now = new Date();
  const currentMonthStr = dayjs().format("YYYY-MM");
  const currentWeekStr = dayjs().format("YYYY-ww");

  const notifLogs = [
    // ① FT-01 — Target Belum Ada Progres (Priority 2.3, warning/reflective)
    {
      clientId: randomUUID(),
      dedupeKey: `GENERIC_NUDGE:${userId}:TargetBelumAdaProgres:${currentMonthStr}`,
      userId,
      title: "Target Belum Ada Progres",
      body: "Target 'Dana Darurat & Liburan Akhir Tahun' sudah berjalan 67% dari periodenya, namun belum ada pemasukan yang tercatat. Pastikan target sudah sesuai rencanamu.",
      type: "2.3",
      eventType: "SPENDING_INSIGHT",
      status: "delivered",
      severity: "neutral",
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

    // ③ AN-09 — Proyeksi Kebiasaan / wantsProjection (Priority 2.5, neutral)
    {
      clientId: randomUUID(),
      dedupeKey: `WANTS_PROJECTION:${userId}:${currentMonthStr}`,
      userId,
      title: "Proyeksi Kebiasaan",
      body: "Bulan ini kategori Jajan menjadi salah satu pengeluaran terbesar dengan total Rp 190.000. Kamu sudah melakukan transaksi ini sebanyak 8 kali secara berulang. Jika pola ini berlanjut, estimasi tahunannya dapat mencapai Rp 2.280.000. Pertimbangkan memantau pola pengeluaran ini agar tetap terkendali.",
      type: "2.5",
      eventType: "SPENDING_INSIGHT",
      status: "delivered",
      severity: "neutral",
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
      body: "Hebat! Kamu berhasil menyisakan saldo positif pada 7 hari terakhir. Pertahankan kebiasaan baik ini.",
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

    // ⑤ BG-00c — Batas Anggaran Terlampaui & Rekomendasi Subsidi Silang (Calm UI)
    {
      clientId: randomUUID(),
      dedupeKey: budgetMakanan
        ? `BUDGET_USAGE:${userId}:${budgetMakanan.clientId}:${currentMonthStr}:101:${new Date(budgetMakanan.updatedAt).getTime()}`
        : `BUDGET_USAGE:${userId}:makanan:${currentMonthStr}:101:none`,
      userId,
      title: "Rekomendasi Subsidi Silang",
      body: "Tersedia sisa Rp 80.000 di kategori Belanja Harian untuk mendukung kategori Makanan.",
      type: "0.1",
      eventType: "BUDGET_CRITICAL",
      actionType: "REALLOCATE_BUDGET",
      status: "delivered",
      severity: "neutral",
      source: "local-engine",
      relatedBudgetId: budgetMakanan?.clientId,
      relatedCategoryId: catMakanan ?? undefined,
      sourceBudgetId: budgetBelanja?.clientId,
      targetBudgetId: budgetMakanan?.clientId,
      recommendedAmount: 80_000,
      sourceCategoryName: "Belanja Harian",
      targetCategoryName: "Makanan",
      ctaRoute: budgetBelanja && budgetMakanan
        ? `/budgets?action=reallocate&sourceBudgetId=${budgetBelanja.clientId}&targetBudgetId=${budgetMakanan.clientId}&amount=80000`
        : "/budgets",
      ctaLabel: "Subsidi Silang",
      categoryName: "Makanan",
      usageRatio: 1.27,
      budgetLimit: 300_000,
      budgetSpent: 380_000,
      deficitAmount: 80_000,
      createdAt: dayjs().subtract(1, "day").toDate(),
      updatedAt: now,
    },
  ];

  await db.notificationLog.createMany({ data: notifLogs });
  console.log(`  ✅ ${notifLogs.length} log notifikasi berhasil disuntikkan.`);

  console.log(`
╔══════════════════════════════════════════════════════════════════════════════════╗
║               ✅  SEED DATA REVISI SIDANG MONETA FINANCE SELESAI                ║
╠══════════════════════════════════════════════════════════════════════════════════╣
║  🎯 FITUR BARU 1: MULTI-TARGET & DIRECT ALLOCATION (REVISI SIDANG)              ║
║    • 1:N Category-to-Target: 'Investasi' terhubung ke 2 Target sekaligus!        ║
║      ① "Dana Darurat & Liburan Akhir Tahun" (0% - FT-01 Stagnan)                 ║
║      ② "Tabungan Investasi Masa Depan"      (50% - Terisi Rp 2.500.000 via        ║
║                                              2 transaksi alokasi langsung)       ║
║    • Uji Coba: Tambah transaksi PEMASUKAN di UI → Pilih salah satu target       ║
║      di chip alokasi → Progres target langsung bertambah real-time!              ║
║                                                                                  ║
║  🧘 FITUR BARU 2: CHOICE ARCHITECTURE & CALM NUDGE                              ║
║    • Spatial Ordering: Buka Tambah Transaksi (Pengeluaran) → Belanja Harian     ║
║      (sisa Rp 3.5jt) & Transportasi (sisa Rp 850rb) di posisi paling atas;       ║
║      Makanan (defisit) terdorong ke bawah.                                       ║
║    • Ambient Visual Priming: Pilih kategori 'Jajan' (95%) atau 'Makanan' (126%) ║
║      → Kotak input nominal bertransisi halus ke aksen hangat (Warm Amber Tint).  ║
║    • In-Situ Budget Cues: Garis indikator 1px di bawah tiap kategori.           ║
║                                                                                  ║
║  ⚡ FITUR BARU 3: LIVE DEMO SP-01 (PENGELUARAN AWAL BULAN)                       ║
║    1. Login (user_sidang / sidang123) lalu klik 'Tarik Data' (Sinkronisasi).     ║
║    2. Tambah Transaksi Pengeluaran: Nominal ≥ Rp 1.000.000 (misal Transportasi). ║
║    3. Simpan → Kartu reflektif SP-01 langsung muncul di Dashboard & Notifikasi!  ║
╚══════════════════════════════════════════════════════════════════════════════════╝
`);
}
