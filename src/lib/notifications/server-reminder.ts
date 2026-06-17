import { prisma } from "../db/prisma";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

// Initialize dayjs plugins
dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * Query Prisma for users who are due for a reminder today.
 * Criteria:
 *   - settings.dailyReminder = true
 *   - user has at least one active web push subscription
 *   - user has NO transactions created today (WIB time boundary)
 * 
 * @param targetTimeWIB ISO timestamp string of the "current" time to evaluate against, or undefined to use now.
 * @returns Array of user IDs.
 */
export async function getUsersDueForReminder(targetTimeWIB?: string): Promise<string[]> {
  const now = targetTimeWIB ? dayjs(targetTimeWIB).tz("Asia/Jakarta") : dayjs().tz("Asia/Jakarta");
  
  // 1. Fetch eligible user settings
  const eligibleSettings = await prisma.notificationSettings.findMany({
    where: {
      dailyReminder: true,
      user: {
        notificationSubscriptions: {
          some: {} // Must have at least one active subscription
        }
      }
    },
    select: {
      userId: true
    }
  });

  if (eligibleSettings.length === 0) {
    return [];
  }

  const userIds = eligibleSettings.map(s => s.userId);

  // 2. Filter out users who HAVE created transactions today.
  const startOfDayWIB = now.startOf("day").toDate();
  const endOfDayWIB = now.endOf("day").toDate();

  const transactionsToday = await prisma.transaction.findMany({
    where: {
      userId: { in: userIds },
      date: {
        gte: startOfDayWIB,
        lte: endOfDayWIB
      }
    },
    select: {
      userId: true
    }
  });

  const usersWithTransactionsToday = new Set(transactionsToday.map(tx => tx.userId));
  
  // 3. Return candidates who have NO transactions
  return userIds.filter(id => !usersWithTransactionsToday.has(id));
}
