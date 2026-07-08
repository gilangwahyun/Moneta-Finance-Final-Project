/********** [START: Server Reminder] **********/
/********** Logika sisi server untuk menentukan user mana yang belum mencatat
 *  transaksi hari ini dan perlu diingatkan lewat push notification harian.
 */
/********** [END: Server Reminder] **********/

/********** Imports **********/

import { prisma } from '../db/prisma';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

/********** Inisialisasi plugin dayjs untuk timezone support. */
dayjs.extend(utc);
dayjs.extend(timezone);

/********** Main Logic **********/

/**
 * Mencari user yang sudah waktunya menerima pengingat hari ini dari Prisma.
 * Kriteria:
 *   - settings.dailyReminder = true
 *   - user memiliki minimal satu web push subscription aktif
 *   - user TIDAK memiliki transaksi yang dibuat hari ini (batas waktu WIB)
 *
 * @param targetTimeWIB - ISO timestamp string waktu yang digunakan sebagai referensi, atau undefined untuk menggunakan waktu sekarang.
 * @returns Array of user ID.
 */
export async function getUsersDueForReminder(targetTimeWIB?: string): Promise<string[]> {
  const now = targetTimeWIB ? dayjs(targetTimeWIB).tz('Asia/Jakarta') : dayjs().tz('Asia/Jakarta');
  
  /********** Langkah 1: Ambil user yang mengaktifkan daily reminder dan punya subscription. */
  const eligibleSettings = await prisma.notificationSettings.findMany({
    where: {
      dailyReminder: true,
      user: {
        notificationSubscriptions: {
          some: {} /********** Harus punya minimal satu subscription aktif. */
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

  /********** Langkah 2: Filter user yang SUDAH membuat transaksi hari ini.
   *  Karena kolom Transaction.date adalah @db.Date, kita HARUS query dengan objek Date
   *  yang bagian tanggal UTC-nya persis cocok dengan string YYYY-MM-DD lokal.
   *  Menggunakan startOfDayWIB/endOfDayWIB bisa menyebabkan Prisma mengekstrak
   *  tanggal UTC yang meleset ke hari sebelumnya.
   */
  const localDateString = now.format('YYYY-MM-DD');
  const targetDateUTC = new Date(`${localDateString}T00:00:00.000Z`);

  const transactionsToday = await prisma.transaction.findMany({
    where: {
      userId: { in: userIds },
      date: {
        equals: targetDateUTC
      }
    },
    select: {
      userId: true
    }
  });

  const usersWithTransactionsToday = new Set(transactionsToday.map(tx => tx.userId));
  
  /********** Langkah 3: Kembalikan user yang TIDAK memiliki transaksi hari ini. */
  return userIds.filter(id => !usersWithTransactionsToday.has(id));
}
