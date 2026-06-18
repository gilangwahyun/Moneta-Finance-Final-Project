import { sendAndLogPushNotification } from "./src/lib/notifications";
import { prisma } from "./src/lib/db/prisma";

async function main() {
  const userId = "fd497829-503b-4bbc-8ea3-8acf71af23f4";
  console.log(`Sending test push to ${userId}...`);
  try {
    await sendAndLogPushNotification(
      userId,
      "Test Push",
      "This is a debug push notification.",
      "REMINDER"
    );
    console.log("Push sent successfully!");
  } catch (err) {
    console.error("Failed to send push:", err);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
