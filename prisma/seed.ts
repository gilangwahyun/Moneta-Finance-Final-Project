// 🚀 Prisma Seed Script (Behavioral Mock Data Injection)
// Seeds the database with two users:
//   • user_test   → data UCD lama (seedDemoDataForUser)
//   • user_sidang → data khusus demo sidang skripsi (seedSidangDataForUser)
//
// Run: npx prisma db seed

import { PrismaClient } from "../src/generated/client";
import * as bcrypt from "bcryptjs";
import { seedDemoDataForUser } from "../src/lib/db/seed-demo-data";
import { seedSidangDataForUser } from "../src/lib/db/seed-sidang-data";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting Behavioral Mock Data Seeding...");

  // ─── User 1: UCD Testing (user lama) ─────────────────────────────────────
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

  console.log(`Seeding UCD demo data for user ID: ${user.id}...`);
  await seedDemoDataForUser(user.id, prisma);
  console.log("✅ UCD Seed Complete!");

  // ─── User 2: Demo Sidang Skripsi ─────────────────────────────────────────
  const sidangUsername = "user_sidang";
  const sidangPassword = "sidang123";
  const sidangHashedPassword = await bcrypt.hash(sidangPassword, 12);
  const sidangEmail = "user_sidang@moneta.app";

  console.log(`\nChecking for existing user: ${sidangUsername}...`);
  const sidangUser = await prisma.user.upsert({
    where: { username: sidangUsername },
    update: {},
    create: {
      email: sidangEmail,
      username: sidangUsername,
      passwordHash: sidangHashedPassword,
    },
  });
  console.log(`User "${sidangUsername}" is ready.`);

  console.log(`Seeding sidang demo data for user ID: ${sidangUser.id}...`);
  await seedSidangDataForUser(sidangUser.id, prisma);
  console.log("✅ Sidang Seed Complete!");

  console.log("\n📋 Akun tersedia:");
  console.log(`  • ${testUsername}   / ${testPassword}  → Data UCD`);
  console.log(`  • ${sidangUsername} / ${sidangPassword} → Data Demo Sidang`);
  console.log("\nNote: Login lalu klik 'Tarik Data' agar IndexedDB sinkron.");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
