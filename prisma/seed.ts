// 🚀 Prisma Seed Script (Behavioral Mock Data Injection)
// Seeds the database with a test user, default categories, and ~50-70 engineered transactions
// to purposefully trigger the Behavioral Economics Nudge Engine for UCD Testing.
//
// Run: npx prisma db seed

import { PrismaClient } from "../src/generated/client";
import * as bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
const dayjs = require("dayjs");

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting Behavioral Mock Data Seeding...");

  // 1. Create a Test User
  const testUsername = "user_test";
  const testPassword = "password123";
  const hashedPassword = await bcrypt.hash(testPassword, 12);
  const testEmail = "user_test@moneta.app";

  console.log(`Checking for existing user: ${testUsername}...`);
  const user = await prisma.user.upsert({
    where: { username: testUsername },
    update: {},
    create: {
      email: testEmail,
      username: testUsername,
      passwordHash: hashedPassword,
    },
  });
  console.log(`User "${testUsername}" is ready.`);

  // 2. Define Default Categories
  const categories = [
    { name: "Makanan",          type: "EXPENSE", icon: "utensils",       color: "#EF4444" },
    { name: "Transportasi",     type: "EXPENSE", icon: "bus",             color: "#F59E0B" },
    { name: "Tempat Tinggal",   type: "EXPENSE", icon: "home",            color: "#6366F1" },
    { name: "Tagihan",          type: "EXPENSE", icon: "zap",             color: "#8B5CF6" },
    { name: "Belanja Harian",   type: "EXPENSE", icon: "shopping-cart",   color: "#10B981" },
    { name: "Hiburan",          type: "EXPENSE", icon: "film",            color: "#EC4899" },
    { name: "Kesehatan",        type: "EXPENSE", icon: "heart-pulse",     color: "#14B8A6" },
    { name: "Pendidikan",       type: "EXPENSE", icon: "book-open",       color: "#3B82F6" },
    { name: "Belanja",          type: "EXPENSE", icon: "shopping-bag",    color: "#F97316" },
    { name: "Jajan",            type: "EXPENSE", icon: "coffee",          color: "#A855F7" },
    { name: "Langganan",        type: "EXPENSE", icon: "smartphone",      color: "#64748B" },
    { name: "Pengeluaran Lain", type: "EXPENSE", icon: "credit-card",     color: "#94A3B8" },
    { name: "Gaji",             type: "INCOME",  icon: "wallet",          color: "#22C55E" },
    { name: "Freelance",        type: "INCOME",  icon: "briefcase",       color: "#06B6D4" },
    { name: "Investasi",        type: "INCOME",  icon: "trending-up",     color: "#8B5CF6" },
    { name: "Hadiah",           type: "INCOME",  icon: "gift",            color: "#F43F5E" },
    { name: "Pemasukan Lain",   type: "INCOME",  icon: "piggy-bank",      color: "#84CC16" },
  ];

  console.log(`Seeding categories for user ID: ${user.id}...`);
  for (const cat of categories) {
    const defaultClientId = `default-${cat.name.toLowerCase().replace(/\s+/g, "-")}`;
    await prisma.category.upsert({
      where: { clientId: defaultClientId },
      update: { name: cat.name, type: cat.type as any, icon: cat.icon, color: cat.color },
      create: {
        clientId: defaultClientId,
        name: cat.name,
        type: cat.type as any,
        icon: cat.icon,
        color: cat.color,
        isDefault: true,
        userId: user.id,
        syncStatus: "SYNCED",
      },
    });
  }

  // Helper to map category names to DB IDs
  const categoriesDb = await prisma.category.findMany({ where: { userId: user.id } });
  const getCatId = (name: string) => categoriesDb.find(c => c.name === name)?.id || "";

  // 3. Create a Dummy Wallet
  const walletDb = await prisma.wallet.upsert({
    where: { clientId: "default-wallet-test" },
    update: {},
    create: {
      clientId: "default-wallet-test",
      name: "Dompet Utama",
      type: "BANK",
      initialBalance: 0,
      userId: user.id,
      syncStatus: "SYNCED",
    },
  });
  const walletId = walletDb.id;

  // 4. Clean old transactions to ensure pure testing environment
  await prisma.transaction.deleteMany({ where: { userId: user.id } });

  const txns: any[] = [];

  // 🎯 Pattern 1: The Payday Leak (Sindrom Awal Bulan)
  // Gaji 5jt exactly 2 days ago, and 2.2jt spent yesterday/today
  const twoDaysAgo = dayjs().subtract(2, "day");
  txns.push({
    clientId: uuidv4(), amount: 5000000, type: "INCOME", description: "Gaji Bulanan",
    date: twoDaysAgo.toDate(), createdAt: twoDaysAgo.toDate(),
    walletId, categoryId: getCatId("Gaji"), userId: user.id, syncStatus: "SYNCED",
  });
  const yesterday = dayjs().subtract(1, "day");
  txns.push({
    clientId: uuidv4(), amount: 1500000, type: "EXPENSE", description: "Belanja Bulanan",
    date: yesterday.toDate(), createdAt: yesterday.toDate(),
    walletId, categoryId: getCatId("Belanja Harian"), userId: user.id, syncStatus: "SYNCED",
  });
  txns.push({
    clientId: uuidv4(), amount: 700000, type: "EXPENSE", description: "Makan Malam Mewah",
    date: dayjs().toDate(), createdAt: dayjs().toDate(),
    walletId, categoryId: getCatId("Makanan"), userId: user.id, syncStatus: "SYNCED",
  });

  // 🎯 Pattern 2: The Latte Factor
  // 14x "Es Kopi" ~Rp 15k over the month
  for (let i = 1; i <= 14; i++) {
    const d = dayjs().subtract(i * 2, "day");
    txns.push({
      clientId: uuidv4(), amount: 15000 + Math.floor(Math.random() * 3000), type: "EXPENSE", description: "Es Kopi",
      date: d.toDate(), createdAt: d.set("hour", 14).toDate(),
      walletId, categoryId: getCatId("Jajan"), userId: user.id, syncStatus: "SYNCED",
    });
  }

  // 🎯 Pattern 3: Night-Owl Spending
  // 3x "Steam Game" / "Midnight Snack" late at night
  const nightDates = [dayjs().subtract(5, "day"), dayjs().subtract(12, "day"), dayjs().subtract(15, "day")];
  nightDates.forEach((d, idx) => {
    txns.push({
      clientId: uuidv4(), amount: idx === 0 ? 120000 : 80000, type: "EXPENSE", description: idx === 0 ? "Steam Game" : "Midnight Snack",
      date: d.toDate(), createdAt: d.set("hour", idx === 0 ? 23 : 1).set("minute", 30).toDate(),
      walletId, categoryId: idx === 0 ? getCatId("Hiburan") : getCatId("Jajan"), userId: user.id, syncStatus: "SYNCED",
    });
  });

  // 🎯 Pattern 4: Weekend Trap
  // Massive expense on this week's Saturday/Sunday (guarantees >75% weekly spend)
  const thisSaturday = dayjs().startOf("week").add(6, "day");
  const thisSunday = dayjs().startOf("week");
  txns.push({
    clientId: uuidv4(), amount: 950000, type: "EXPENSE", description: "Weekend Getaway",
    date: thisSaturday.toDate(), createdAt: thisSaturday.toDate(),
    walletId, categoryId: getCatId("Hiburan"), userId: user.id, syncStatus: "SYNCED",
  });
  txns.push({
    clientId: uuidv4(), amount: 650000, type: "EXPENSE", description: "Makan Keluarga Akhir Pekan",
    date: thisSunday.toDate(), createdAt: thisSunday.toDate(),
    walletId, categoryId: getCatId("Makanan"), userId: user.id, syncStatus: "SYNCED",
  });

  // 🎯 Pattern 5: Subscription Cannibalization
  // 3 identical subscriptions in both prev and curr month
  const subs = [
    { name: "Spotify", amount: 49000, cat: "Langganan", day: 5 },
    { name: "Netflix", amount: 153000, cat: "Langganan", day: 15 },
    { name: "Internet Fiber", amount: 350000, cat: "Tagihan", day: 20 },
  ];
  for (const sub of subs) {
    const dCurr = dayjs().date(sub.day);
    const dPrev = dayjs().subtract(1, "month").date(sub.day);
    [dCurr, dPrev].forEach((d) => {
      txns.push({
        clientId: uuidv4(), amount: sub.amount, type: "EXPENSE", description: sub.name,
        date: d.toDate(), createdAt: d.toDate(),
        walletId, categoryId: getCatId(sub.cat), userId: user.id, syncStatus: "SYNCED",
      });
    });
  }

  // Generate Normal Background Noise to pad out the charts
  for (let i = 1; i <= 20; i++) {
    const d = dayjs().subtract(1, "month").add(i, "day"); // Past month to protect Weekend Trap %
    txns.push({
      clientId: uuidv4(), amount: 25000 + Math.floor(Math.random() * 50000), type: "EXPENSE", description: "Makan Siang",
      date: d.toDate(), createdAt: d.set("hour", 12).toDate(),
      walletId, categoryId: getCatId("Makanan"), userId: user.id, syncStatus: "SYNCED",
    });
  }

  console.log(`Injecting ${txns.length} engineered mock transactions...`);
  await prisma.transaction.createMany({ data: txns });

  console.log("\n✅ Behavioral Seed Complete!");
  console.log("Note: If you are already logged in, you may need to 'Tarik Data' or relogin to sync IndexedDB.");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
