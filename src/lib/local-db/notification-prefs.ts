/*
 * File: src/lib/local-db/notification-prefs.ts
 * Description: Modul pengelola preferensi notifikasi pengguna secara lokal,
 * menangani resolusi mode pengiriman, batas harian (daily cap), penyimpanan ke IndexedDB, dan sinkronisasi server.
 */

import { saveNotificationSettings, getNotificationSettings, NotificationSettingsRecord } from './repositories/notification-settings';

/********** Tipe Data & Antarmuka **********/

export type DeliveryMode = 'INSTANT' | 'BATCH' | 'NONE';

export interface LocalNotificationPrefs {
  instantAlerts: boolean;
  dailyDigest: boolean;
  dailyReminder: boolean;
  deliveryMode: DeliveryMode;
  digestTime: string; /* Format jam "HH:MM" */
  dailyCap: number; /* Batas notifikasi harian (misal: 1–5) */
  userId?: string;
  updatedAt: string; /* Format timestamp ISO */
}

export interface DailyNotifCount {
  date: string;
  count: number;
}

/********** Resolusi Mode Pengiriman (Delivery Mode) **********/

/**
 * Resolusi kanonik untuk menentukan mode pengiriman dari berbagai sumber pengaturan (IDB, localStorage, atau null).
 * Aturan konversi:
 * - "INSTANT" -> "INSTANT"
 * - "BATCH" atau "DIGEST" -> "DIGEST"
 * - "NONE" -> "NONE"
 * - Data lama tanpa deliveryMode diputuskan berdasarkan boolean instantAlerts / dailyDigest.
 *
 * @param settings - Objek pengaturan notifikasi lokal.
 * @returns Mode pengiriman kanonik ('NONE' | 'INSTANT' | 'DIGEST').
 */
export function resolveDeliveryMode(
  settings: {
    deliveryMode?: string;
    instantAlerts?: boolean;
    dailyDigest?: boolean;
  } | null,
): 'NONE' | 'INSTANT' | 'DIGEST' {
  if (!settings) return 'NONE';

  const dm = settings.deliveryMode;
  if (dm === 'INSTANT') return 'INSTANT';
  if (dm === 'BATCH' || dm === 'DIGEST') return 'DIGEST';

  /********** Fallback data lama: untuk rekod yang dibuat sebelum adanya deliveryMode. */
  /* Gunakan kombinasi boolean sebagai acuan */
  if (settings.instantAlerts === true && settings.dailyDigest !== true) return 'INSTANT';
  if (settings.dailyDigest === true) return 'DIGEST';

  return 'NONE';
}

const LS_COUNT_KEY = 'moneta-notification-daily-count';

export const DEFAULT_DAILY_CAP = 5;

export const DEFAULT_NOTIF_PREFS: LocalNotificationPrefs = {
  instantAlerts: false,
  dailyDigest: false,
  dailyReminder: true,
  deliveryMode: 'NONE',
  digestTime: '20:00',
  dailyCap: DEFAULT_DAILY_CAP,
  updatedAt: new Date().toISOString(),
};

/********** Helper Batas Harian (Daily Cap) **********/

/**
 * Menormalisasi nilai batas notifikasi harian.
 *
 * @param value - Nilai batas harian input.
 * @returns Angka batas harian atau null jika tidak terbatas.
 */
export function normalizeDailyCap(value: number | undefined | null): number | null {
  if (value === -1 || value === null) return null; /* Tidak terbatas */
  if (typeof value === 'number' && value > 0) return value;
  return DEFAULT_DAILY_CAP;
}

/**
 * Mengecek apakah batas notifikasi harian sudah tercapai.
 *
 * @param currentPushCount - Jumlah notifikasi terkirim hari ini.
 * @param normalizedDailyCap - Batas harian ternormalisasi.
 * @returns Boolean true jika batas sudah tercapai.
 */
export function isDailyCapReached(currentPushCount: number, normalizedDailyCap: number | null): boolean {
  if (normalizedDailyCap === null) return false;
  return currentPushCount >= normalizedDailyCap;
}

/********** Operasi localStorage (Penghitung Harian) **********/

/**
 * Membaca jumlah notifikasi terkirim hari ini dari localStorage.
 *
 * @returns Objek DailyNotifCount untuk hari ini.
 */
export function readTodayCountFromLS(): DailyNotifCount {
  const today = new Date().toISOString().split('T')[0];
  if (typeof window === 'undefined') return { date: today, count: 0 };
  try {
    const raw = localStorage.getItem(LS_COUNT_KEY);
    if (!raw) return { date: today, count: 0 };
    const parsed = JSON.parse(raw) as DailyNotifCount;
    return parsed.date === today ? parsed : { date: today, count: 0 };
  } catch {
    return { date: today, count: 0 };
  }
}

/**
 * Menambah jumlah penghitung notifikasi hari ini di localStorage sebanyak 1.
 */
export function incrementTodayCountInLS(): void {
  if (typeof window === 'undefined') return;
  const current = readTodayCountFromLS();
  try {
    localStorage.setItem(LS_COUNT_KEY, JSON.stringify({ date: current.date, count: current.count + 1 }));
  } catch {}
}

/**
 * Membaca timestamp pengiriman notifikasi terakhir dari localStorage.
 *
 * @returns ISO string timestamp atau null.
 */
export function readLastPushTsFromLS(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('moneta-last-push-ts');
}

/**
 * Menyimpan timestamp pengiriman notifikasi terakhir ke localStorage.
 *
 * @param isoString - Format waktu ISO string.
 */
export function setLastPushTsInLS(isoString: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('moneta-last-push-ts', isoString);
}

/**
 * Membaca jumlah notifikasi info mingguan untuk minggu tertentu dari localStorage.
 *
 * @param weekStr - Identifier minggu (misal: "2026-W28").
 * @returns Jumlah notifikasi info yang sudah dikirim minggu ini.
 */
export function readWeeklyInfoCountFromLS(weekStr: string): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = localStorage.getItem(`moneta-info-push-count-${weekStr}`);
    return raw ? parseInt(raw, 10) : 0;
  } catch {
    return 0;
  }
}

/**
 * Menambah jumlah penghitung notifikasi info mingguan di localStorage.
 *
 * @param weekStr - Identifier minggu.
 */
export function incrementWeeklyInfoCountInLS(weekStr: string): void {
  if (typeof window === 'undefined') return;
  const current = readWeeklyInfoCountFromLS(weekStr);
  try {
    localStorage.setItem(`moneta-info-push-count-${weekStr}`, (current + 1).toString());
  } catch {}
}

/********** Operasi Penyimpanan & Sinkronisasi **********/

/**
 * Menyimpan preferensi notifikasi sebagai kebenaran mutlak (absolute truth) ke IndexedDB utama dan antrean sinkronisasi.
 *
 * @param prefs - Objek preferensi notifikasi yang akan disimpan.
 * @param skipSyncQueue - Jika true, perubahan tidak akan dimasukkan ke antrean sinkronisasi.
 * @returns Promise void setelah preferensi disimpan.
 */
export async function saveNotifPrefs(prefs: LocalNotificationPrefs, skipSyncQueue = false): Promise<void> {

  /********** Simpan ke IndexedDB utama dan masukkan ke antrean sinkronisasi. */
  if (prefs.userId) {
    const record: NotificationSettingsRecord = {
      clientId: `notification-settings:${prefs.userId}`,
      userId: prefs.userId,
      isEnabled: prefs.deliveryMode !== 'NONE',
      deliveryMode: prefs.deliveryMode,
      instantAlerts: prefs.instantAlerts,
      dailyDigest: prefs.dailyDigest,
      dailyReminder: prefs.dailyReminder,
      digestTime: prefs.digestTime,
      dailyCap: prefs.dailyCap,
      syncStatus: 'PENDING',
      updatedAt: prefs.updatedAt,
    };
    await saveNotificationSettings(record, skipSyncQueue);
  }
}

/********** Helper untuk melakukan hidrasi data preferensi dari server. */

/**
 * menyinkronkan dan menggabungkan preferensi notifikasi dari server ke dalam penyimpanan lokal.
 *
 * @param serverPrefs - Data preferensi notifikasi yang diterima dari server.
 * @returns Promise berisi objek LocalNotificationPrefs yang diperbarui.
 */
export async function syncServerPrefsToLocal(serverPrefs: {
  instantAlerts: boolean;
  dailyDigest: boolean;
  dailyReminder: boolean;
  digestTime: string;
  dailyCap?: number;
  userId?: string;
  updatedAt?: string;
}): Promise<LocalNotificationPrefs> {
  const existing = await getNotificationSettings(serverPrefs.userId || '');
  const deliveryMode: DeliveryMode = serverPrefs.dailyDigest ? 'BATCH' : serverPrefs.instantAlerts ? 'INSTANT' : 'NONE';

  const merged: LocalNotificationPrefs = {
    instantAlerts: serverPrefs.instantAlerts,
    dailyDigest: serverPrefs.dailyDigest,
    dailyReminder: serverPrefs.dailyReminder ?? existing?.dailyReminder ?? true,
    deliveryMode,
    digestTime: serverPrefs.digestTime,
    dailyCap: serverPrefs.dailyCap ?? existing?.dailyCap ?? DEFAULT_DAILY_CAP,
    userId: serverPrefs.userId || existing?.userId,
    updatedAt: serverPrefs.updatedAt || new Date().toISOString(),
  };

  /* skipSyncQueue diatur true karena data berasal dari server */
  await saveNotifPrefs(merged, true);
  return merged;
}
