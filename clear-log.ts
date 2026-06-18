import { prisma } from "./src/lib/db/prisma";

async function main() {
  const userId = "fd497829-503b-4bbc-8ea3-8acf71af23f4";
  
  const deleted = await prisma.notificationLog.deleteMany({
    where: {
      userId: userId,
      type: "REMINDER"
    }
  });

  console.log(`Deleted ${deleted.count} reminder logs for user ${userId}. They can now receive another reminder today.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
