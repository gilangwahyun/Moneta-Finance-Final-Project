import { prisma } from "./src/lib/db/prisma";
import { getUsersDueForReminder } from "./src/lib/notifications/server-reminder";

async function main() {
  console.log("Checking getUsersDueForReminder...");
  
  const eligibleSettings = await prisma.notificationSettings.findMany({
    where: {
      dailyReminder: true,
      user: {
        notificationSubscriptions: {
          some: {}
        }
      }
    },
    select: { userId: true },
  });
  
  console.log("1. Users with dailyReminder=true AND >=1 subscription:", eligibleSettings.map(s => s.userId));

  const allSubscriptions = await prisma.notificationSubscription.findMany();
  console.log(`Total subscriptions in DB: ${allSubscriptions.length}`);
  
  const finalCandidates = await getUsersDueForReminder();
  console.log("2. Final candidates after checking transactions today:", finalCandidates);

}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
