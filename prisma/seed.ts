// 🚀 Prisma Seed Script (Behavioral Mock Data Injection)
// Seeds the database with a test user and calls seedDemoDataForUser()
// to purposefully trigger the Behavioral Economics Nudge Engine for UCD Testing.
//
// Run: npx prisma db seed

import { PrismaClient } from "../src/generated/client";
import * as bcrypt from "bcryptjs";
import { seedDemoDataForUser } from "../src/lib/db/seed-demo-data";

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

  // 2. Inject behavioral demo data (categories, wallets, budgets, targets, transactions)
  console.log(`Seeding engineered demo data for user ID: ${user.id}...`);
  await seedDemoDataForUser(user.id, prisma);

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
