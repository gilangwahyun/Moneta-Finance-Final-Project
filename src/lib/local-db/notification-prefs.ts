import { saveNotificationSettings, getNotificationSettings, NotificationSettingsRecord } from './repositories/notification-settings';

export type DeliveryMode = 'INSTANT' | 'BATCH' | 'NONE';

export interface LocalNotificationPrefs {
  instantAlerts: boolean;
  dailyDigest: boolean;
  dailyReminder: boolean;
  deliveryMode: DeliveryMode;
  digestTime: string; // "HH:MM"
  dailyCap: number; // 1–5
  userId?: string;
  updatedAt: string; // ISO timestamp
}

export interface DailyNotifCount {
  date: string;
  count: number;
}

// ─── Canonical Delivery Mode Resolver ────────────────────
// Single source of truth for reading delivery mode from any
// settings object (IDB record, localStorage prefs, or null).
//
// Rules:
//  - deliveryMode "INSTANT"        → "INSTANT"
//  - deliveryMode "BATCH" or "DIGEST" → "DIGEST"  (BATCH is backward-compat alias)
//  - deliveryMode "NONE"           → "NONE"
//  - No deliveryMode (legacy data) → derive from instantAlerts / dailyDigest booleans
//  - null settings                 → "NONE"
//
// All delivery decision code must call this instead of reading
// instantAlerts or dailyDigest directly.

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

  // Legacy fallback: records created before deliveryMode was introduced
  // treat the boolean pair as the source of truth.
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

// ─── Daily Cap Helpers ─────────────────────────────────────

export function normalizeDailyCap(value: number | undefined | null): number | null {
  if (value === -1 || value === null) return null; // unlimited
  if (typeof value === 'number' && value > 0) return value;
  return DEFAULT_DAILY_CAP;
}

export function isDailyCapReached(currentPushCount: number, normalizedDailyCap: number | null): boolean {
  if (normalizedDailyCap === null) return false;
  return currentPushCount >= normalizedDailyCap;
}

// ─── localStorage API (Daily Count Only) ──────────────────



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

export function incrementTodayCountInLS(): void {
  if (typeof window === 'undefined') return;
  const current = readTodayCountFromLS();
  try {
    localStorage.setItem(LS_COUNT_KEY, JSON.stringify({ date: current.date, count: current.count + 1 }));
  } catch {}
}

// ─── Primary Save Method ─────────────────────────────────

export async function saveNotifPrefs(prefs: LocalNotificationPrefs, skipSyncQueue = false): Promise<void> {

  // 2. Save to Main IndexedDB as absolute truth (and enqueue sync)
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

// Helper to hydrate from server push/pull
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

  // skipSyncQueue = true because it came from the server
  await saveNotifPrefs(merged, true);
  return merged;
}
