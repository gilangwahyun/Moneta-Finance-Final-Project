/********** Utilitas sisi klien untuk mendaftarkan service worker,
 *  menyiapkan Background Sync, dan menangani lifecycle events SW.
 *
 *  Penggunaan:
 *    import { registerServiceWorker } from "@/lib/sw/register";
 *    registerServiceWorker({ onSyncTriggered: () => performSync() });
 */

/********** Imports **********/

import { csrfFetch } from '@/lib/utils/csrf-fetch';

/********** Types **********/

export interface SWRegistrationOptions {
  /** Called when the SW sends a SYNC_TRIGGERED message */
  onSyncTriggered?: () => void;
  /** Called when a new SW version is available */
  onUpdateAvailable?: (registration: ServiceWorkerRegistration) => void;
  /** Called when the SW is successfully registered */
  onRegistered?: (registration: ServiceWorkerRegistration) => void;
  /** Called on registration error */
  onError?: (error: Error) => void;
}

let swRegistration: ServiceWorkerRegistration | null = null;

/********** Core Functions **********/

/**
 * Mendaftarkan service worker dan menyiapkan event listener-nya.
 * Aman dipanggil berkali-kali — hanya mendaftar sekali.
 *
 * @param options - Opsi callback untuk berbagai event lifecycle SW.
 * @returns ServiceWorkerRegistration jika berhasil, atau null.
 */
export async function registerServiceWorker(options: SWRegistrationOptions = {}): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    console.warn('[SW Register] Service workers not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    swRegistration = registration;
    console.log('[SW Register] Service worker registered:', registration.scope);

    options.onRegistered?.(registration);

    /********** Listen untuk versi service worker yang baru tersedia. */
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          /********** Versi baru tersedia — beritahu aplikasi. */
          console.log('[SW Register] New version available');
          options.onUpdateAvailable?.(registration);
        }
      });
    });

    /********** Listen untuk pesan yang dikirim dari service worker. */
    navigator.serviceWorker.addEventListener('message', async (event) => {
      const { type, payload } = event.data || {};

      if (type === 'SYNC_TRIGGERED') {
        console.log('[SW Register] Sync triggered by service worker');
        options.onSyncTriggered?.();
      }

      /********** Simpan notifikasi ke IndexedDB inbox lokal. */
      if (type === 'ADD_TO_INBOX' && payload) {
        try {
          const { addToInbox } = await import('@/lib/local-db/repositories/notification-inbox');
          await addToInbox({
            title: payload.title,
            body: payload.body,
            type: payload.type,
            logId: payload.logId ?? null,
            createdAt: payload.createdAt || new Date().toISOString(),
            isRead: false,
          });
        } catch (err) {
          console.warn('[SW Register] Failed to add notification to inbox:', err);
        }
      }

      if (type === 'SW_NAVIGATE' && event.data.path) {
        console.log('[SW Register] Navigating to:', event.data.path);
        /********** Fallback navigasi minimal — bisa di-intercept oleh App router di level context. */
        window.location.href = event.data.path;
      }

      if (type === 'NOTIFICATION_CLICKED' && event.data.notificationClientId) {
        console.log('[SW Register] Marking notification as read from SW click:', event.data.notificationClientId);
        try {
          const { markLogRead } = await import('@/lib/local-db/repositories/notification-logs');
          await markLogRead(event.data.notificationClientId);
          /********** Trigger event agar UI langsung refresh. */
          window.dispatchEvent(new Event('moneta-notification-updated'));
        } catch (err) {
          console.warn('[SW Register] Failed to mark log read:', err);
        }
      }
    });

    return registration;
  } catch (error) {
    console.error('[SW Register] Registration failed:', error);
    options.onError?.(error as Error);
    return null;
  }
}

/**
 * Meminta one-shot Background Sync.
 * Saat browser mendapatkan koneksi kembali, SW akan menembak event
 * "sync" dengan tag "moneta-sync".
 *
 * @returns `true` jika berhasil mendaftar background sync.
 */
export async function requestBackgroundSync(): Promise<boolean> {
  if (!swRegistration) {
    console.warn('[SW Register] No registration — cannot request sync');
    return false;
  }

  try {
    /********** Cek apakah Background Sync API didukung. */
    if ('sync' in swRegistration) {
      await (swRegistration as unknown as { sync: { register: (tag: string) => Promise<void> } }).sync.register('moneta-sync');
      console.log('[SW Register] Background sync registered');
      return true;
    } else {
      console.warn('[SW Register] Background Sync API not supported');
      return false;
    }
  } catch (error) {
    console.error('[SW Register] Background sync registration failed:', error);
    return false;
  }
}

/**
 * Meminta Periodic Background Sync (jika didukung).
 * Mengizinkan app untuk sync secara berkala meskipun tidak sedang dibuka.
 *
 * @param intervalMs - Interval minimum dalam milidetik (default: 1 jam).
 * @returns `true` jika berhasil mendaftar periodic sync.
 */
export async function requestPeriodicSync(
  intervalMs: number = 60 * 60 * 1000, /********** Default: 1 jam. */
): Promise<boolean> {
  if (!swRegistration) return false;

  try {
    const periodicSync = (
      swRegistration as unknown as {
        periodicSync?: { register: (tag: string, options: { minInterval: number }) => Promise<void> };
      }
    ).periodicSync;

    if (periodicSync) {
      await periodicSync.register('moneta-periodic-sync', {
        minInterval: intervalMs,
      });
      console.log('[SW Register] Periodic sync registered');
      return true;
    }

    return false;
  } catch (error) {
    console.warn('[SW Register] Periodic sync not available:', error);
    return false;
  }
}

/**
 * Mengirim pesan ke service worker yang aktif.
 *
 * @param message - Object pesan yang akan dikirim.
 */
export function sendMessageToSW(message: Record<string, unknown>): void {
  if (navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage(message);
  }
}

/**
 * Memberitahu SW yang sedang menunggu untuk skip waiting dan mengambil kendali.
 */
export function skipWaiting(): void {
  sendMessageToSW({ type: 'SKIP_WAITING' });
}

/**
 * Memicu sync secara manual melalui service worker.
 */
export function triggerSWSync(): void {
  sendMessageToSW({ type: 'TRIGGER_SYNC' });
}

/**
 * Send an instant nudge notification via the service worker.
 * Called by evaluateAndFireBudgetGateway — do not call directly.
 *
 * @param title  Judul notifikasi
 * @param body   Isi pesan notifikasi
 * @param tier   'T1' atau 'T2' untuk penentuan tag notifikasi
 */
function sendInstantNudge(title: string, body: string, tier: 'T1' | 'T2'): void {
  sendMessageToSW({
    type: 'INSTANT_NUDGE',
    title,
    body,
    tier,
  });
}

/**
 * Gateway 2: Kirim notifikasi Defisit Mutlak (100% limit terlampaui).
 * Notifikasi ini adalah actionable — berisi tombol [Sesuaikan Budget] dan [Abaikan].
 * Clicking [Sesuaikan Budget] di OS akan membuka /budgets (Budget Reallocator).
 *
 * @param title  Judul notifikasi
 * @param body   Isi pesan notifikasi
 */
function sendDeficitAlert(title: string, body: string): void {
  sendMessageToSW({
    type: 'DEFICIT_ALERT',
    title,
    body,
  });
}

/**
 * Increment counter notifikasi harian di localStorage.
 * Dipanggil setelah setiap notifikasi OS berhasil dikirim.
 */
function incrementDailyNotifCount(): void {
  if (typeof window === 'undefined') return;
  const today = new Date().toISOString().substring(0, 10);
  const key = 'moneta-notification-daily-count';
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : { date: today, count: 0 };
    const current = parsed.date === today ? parsed.count : 0;
    localStorage.setItem(key, JSON.stringify({ date: today, count: current + 1 }));
  } catch {}
}

/**
 * @deprecated This function is a dead export — no app code calls it.
 *
 * Budget threshold events (20%, 50%, 100%) are fully handled by
 * evaluateAndTriggerNudges() in local-engine.ts, which is called from
 * transactions.ts on every new transaction.
 *
 * This function used budget-gateways.ts (localStorage-based prefs) and
 * would call showNotification() without creating notification_logs IDB entries,
 * making OS alerts invisible in the in-app Notifications page.
 *
 * Do not add new callers. This will be removed in a future cleanup phase.
 *
 * @deprecated Use evaluateAndTriggerNudges() via local-engine.ts instead.
 */
export async function evaluateAndFireBudgetGateway(
  categoryId: string,
  categoryName: string,
  spentAmount: number,
  budgetAmount: number,
): Promise<void> {
  if (!navigator.serviceWorker?.controller) {
    /********** SW belum aktif — tidak bisa kirim notifikasi OS. */
    return;
  }

  /********** Guard: izin notifikasi OS belum diberikan pengguna.
   *  showNotification() akan throw jika dipanggil tanpa izin 'granted'.
   */
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
    console.log('[Gateway] Izin notifikasi belum diberikan — dilewati.');
    return;
  }

  try {
    const { evaluateBudgetGateways } = await import('@/lib/notifications/budget-gateways');

    const result = evaluateBudgetGateways(categoryId, categoryName, spentAmount, budgetAmount);

    if (!result.shouldNotify) {
      if (result.suppressed) {
        console.log(`[Gateway] Notifikasi disupresi (${result.suppressReason}) untuk ${categoryName}`);
      }
      return;
    }

    console.log(`[Gateway] Mengirim notifikasi tier ${result.tier} untuk ${categoryName}`);

    if (result.tier === 'DEFICIT') {
      sendDeficitAlert(result.title, result.body);
    } else if (result.tier === 'T1' || result.tier === 'T2') {
      sendInstantNudge(result.title, result.body, result.tier);
    }

    /********** Increment counter harian setelah notifikasi terkirim. */
    incrementDailyNotifCount();
  } catch (err) {
    console.warn('[Gateway] evaluateAndFireBudgetGateway gagal:', err);
  }
}

/********** Digest Timer State **********/
let _digestTimerId: ReturnType<typeof setInterval> | null = null;

/**
 * Memulai timer pemeriksaan daily digest.
 * Memeriksa setiap 5 menit apakah sudah waktunya mengirim digest.
 * Aman dipanggil berkali-kali — membersihkan timer sebelumnya.
 *
 * @param userId - ID user saat ini (untuk agregasi IDB).
 */
export async function startDigestTimer(userId: string): Promise<void> {
  if (_digestTimerId !== null) clearInterval(_digestTimerId);

  console.log(`[DigestTimer] initialized userId=${userId}`);

  async function checkAndFire() {
    try {
      /********** Pakai IDB sebagai sumber kebenaran untuk pengaturan notifikasi.
       *  Menghindari network round-trip dan berfungsi offline.
       */
      const { getNotificationSettings } = await import('@/lib/local-db/repositories/notification-settings');
      const { resolveDeliveryMode } = await import('@/lib/local-db/notification-prefs');
      const settings = await getNotificationSettings(userId);

      const mode = resolveDeliveryMode(settings);
      
      const now = new Date();
      const digestTime = settings?.digestTime || '20:00';
      const rawMode = settings?.deliveryMode || 'NONE';
      const rawDailyCap = settings?.dailyCap;
      const { normalizeDailyCap, isDailyCapReached } = await import('@/lib/local-db/notification-prefs');
      const dailyCap = normalizeDailyCap(rawDailyCap);

      console.log(`[DigestTimer] now=${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')} digestTime=${digestTime} mode=${rawMode} resolved=${mode}`);

      if (mode !== 'DIGEST') {
        /********** Hanya kirim digest dalam mode DIGEST. Skip diam-diam di INSTANT atau NONE. */
        return;
      }

      const { shouldFireDigest, buildLogDigest, getWIBDateParts } = await import('@/lib/notifications/daily-digest');
      const wibNow = getWIBDateParts(now);
      const wibDateStr = wibNow.dateStr;
      const DIGEST_FIRED_KEY = `DIGEST_FIRED:${userId}`;

      /********** Baca timestamp last-fired dari localStorage. */
      const lastFiredRaw = localStorage.getItem(DIGEST_FIRED_KEY);
      let lastFired = null;
      try {
        if (lastFiredRaw) {
          lastFired = JSON.parse(lastFiredRaw);
        }
      } catch(e) {
        /********** Fallback untuk format string ISO lama atau data yang rusak. */
        if (lastFiredRaw && lastFiredRaw.includes('T')) {
           const oldDate = new Date(lastFiredRaw);
           if (!isNaN(oldDate.getTime())) {
             lastFired = { digestDateKey: getWIBDateParts(oldDate).dateStr, digestTime: "20:00" }; // fallback
           }
        }
      }
      
      const { shouldFire, reason } = shouldFireDigest(digestTime, lastFired);

      const digestFiredKey = `DIGEST:${userId}:${wibDateStr}:${digestTime}`;

      /********** Logging debug eksplisit yang diminta. */
      console.log(`[DigestTimer] wibDate=${wibDateStr} digestTime=${digestTime} firedKey=${digestFiredKey}`);
      console.log(`[DigestTimer] shouldFire=${shouldFire} reason=${reason}`);
      
      if (!shouldFire) {
        return;
      }

      /********** Bangun digest dari log notifikasi hari ini (bukan data transaksi). */
      const digest = await buildLogDigest(userId);

      console.log(`[DigestTimer] shouldFireDigest=${shouldFire} eligibleLogs=${digest.logCount} lastFiredRaw=${lastFiredRaw}`);

      if (!digest.hasEligibleLogs) {
        /********** Tidak ada log hari ini — jangan kirim digest kosong.
         *  Jangan set lastFiredAt di sini: jika log baru masuk sebelum jam digest,
         *  timer berikutnya masih bisa mengirim.
         */
        console.log('[SW Register] Digest dilewati — tidak ada log notifikasi hari ini.');
        return;
      }

      const { readTodayCountFromLS, incrementTodayCountInLS } = await import('@/lib/local-db/notification-prefs');
      const { count: todayPushCount } = readTodayCountFromLS();

      const capReached = isDailyCapReached(todayPushCount, dailyCap);
      const isUnlimited = dailyCap === null;

      console.log('[DailyCapDebug]', {
        context: "digest-scheduler",
        rawDailyCap,
        normalizedDailyCap: dailyCap,
        currentPushCount: todayPushCount,
        isUnlimited,
        capReached,
        settingsSource: "indexedDB"
      });

      if (capReached) {
        console.log(`[SW Register] Digest skipped — reason: daily_push_cap_reached (${todayPushCount}/${dailyCap})`);
        return;
      }

      if (!('serviceWorker' in navigator)) {
        console.warn('[SW Register] Digest skipped — reason: service_worker_unavailable');
        return;
      }

      try {
        console.log(`[DigestTimer] digest title/body: "${digest.title}" / "${digest.body}"`);
        console.log(`[DigestTimer] showNotification will be called`);
        const { upsertNotificationLog, markLogPushed, markLogsDigestSent } = await import('@/lib/local-db/repositories/notification-logs');
        const { getWIBDateParts } = await import('@/lib/notifications/daily-digest');
        const digestLogId = crypto.randomUUID();
        const nowStr = new Date().toISOString();
        const wibDateStr = getWIBDateParts(new Date()).dateStr;

        await upsertNotificationLog({
          clientId: digestLogId,
          dedupeKey: `DIGEST:${userId}:${wibDateStr}`,
          userId,
          title: digest.title,
          body: digest.body,
          type: 'DIGEST',
          eventType: 'DIGEST',
          status: 'delivered',
          createdAt: nowStr,
          updatedAt: nowStr,
          syncStatus: 'PENDING',
        });

        const reg = await navigator.serviceWorker.ready;
        await reg.showNotification(digest.title, {
          body: digest.body,
          icon: '/icons/icon-192x192.png',
          tag: 'moneta-daily-digest',
          renotify: true,
          data: {
            url: '/notifications',
            type: 'DIGEST',
          },
        } as any);

        console.log(`[DigestTimer] showNotification success`);
        const pushTime = new Date().toISOString();
        await markLogPushed(digestLogId, pushTime);
        await markLogsDigestSent(digest.clientIds, pushTime);

        incrementTodayCountInLS();
        
        /********** Simpan timestamp last-fired HANYA setelah showNotification berhasil. */
        const newFiredRecord = {
          digestDateKey: wibDateStr,
          digestTime: digestTime,
          firedAt: pushTime
        };
        localStorage.setItem(DIGEST_FIRED_KEY, JSON.stringify(newFiredRecord));
        
        const { count: updatedPushCount } = readTodayCountFromLS();
        console.log(`[DigestTimer] pushCount incremented to ${updatedPushCount}/${dailyCap}`);
        console.log(`[SW Register] Daily digest fired successfully — ${digest.logCount} logs summarized.`);
      } catch (swErr) {
        console.error('[SW Register] Digest skipped — reason: show_notification_error', swErr);
        console.log(`[DigestTimer] showNotification error:`, swErr);
      }
    } catch (err) {
      console.warn('[SW Register] Digest check failed:', err);
    }
  }

  // Check immediately on startup, then every 60 seconds
  // Changed from 5 minutes to 60 seconds so it can fire exactly at the HH:mm digestTime without being late by up to 5 minutes
  checkAndFire();
  _digestTimerId = setInterval(checkAndFire, 60 * 1000);
}

/**
 * Mendapatkan registrasi service worker yang aktif.
 *
 * @returns ServiceWorkerRegistration aktif, atau null jika belum terdaftar.
 */
export function getRegistration(): ServiceWorkerRegistration | null {
  return swRegistration;
}

/********** Push Notification Subscription **********/

/**
 * Mengkonversi string VAPID public key yang diencoding base64url (dari .env)
 * ke format Uint8Array yang dibutuhkan oleh pushManager.subscribe().
 *
 * Sumber: https://web.dev/push-notifications-subscribing-a-user/
 *
 * @param base64String - VAPID public key dalam format base64url.
 * @returns ArrayBuffer yang siap digunakan sebagai applicationServerKey.
 */
export function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer as ArrayBuffer;
}

export interface PushSubscriptionResult {
  success: boolean;
  reason?: string;
  errorName?: string;
  errorMessage?: string;
}

/**
 * Requests push notification permission and subscribes the current
 * browser to the Web Push API using the server's VAPID public key.
 *
 * On success, the resulting PushSubscription is posted to
 * /api/notifications/subscribe where it is saved to the database.
 *
 * Safe to call multiple times — the browser deduplicates subscriptions
 * by endpoint, and the server upserts on the unique endpoint field.
 *
 * @param registration - An active ServiceWorkerRegistration
 * @returns PushSubscriptionResult containing detailed diagnostic info
 */
export async function subscribeToPushNotifications(registration: ServiceWorkerRegistration | null): Promise<PushSubscriptionResult> {
  if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { success: false, reason: 'Browser tidak mendukung Web Push Notification.' };
  }
  if (!window.isSecureContext) {
    return { success: false, reason: 'Web Push membutuhkan koneksi HTTPS (Secure Context).' };
  }
  if (!registration || !registration.pushManager) {
    return { success: false, reason: 'PushManager tidak tersedia di service worker registration.' };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { success: false, reason: 'Izin notifikasi tidak diberikan oleh browser.' };
    }

    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidPublicKey || vapidPublicKey.trim().length === 0) {
      return { success: false, reason: 'Konfigurasi Web Push tidak valid. VAPID public key tidak tersedia atau salah.' };
    }

    let applicationServerKey: ArrayBuffer;
    try {
      applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
      if (applicationServerKey.byteLength !== 65) {
        throw new Error('Invalid VAPID key length (must be 65 bytes)');
      }
    } catch (e) {
      return { success: false, reason: 'Konfigurasi Web Push tidak valid. VAPID public key tidak tersedia atau salah.' };
    }

    /********** Selalu panggil getSubscription() terlebih dahulu
     *  untuk mencegah duplikasi atau pemanggilan subscribe() yang tidak perlu.
     */
    let pushSubscription = await registration.pushManager.getSubscription();

    if (!pushSubscription) {
      try {
        pushSubscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        });
      } catch (subErr: any) {
        console.error('[SW Register] subscribe failed:', subErr.name, subErr.message);

        // Controlled recovery for AbortError
        if (subErr.name === 'AbortError') {
          pushSubscription = await registration.pushManager.getSubscription();
          if (!pushSubscription) {
            /********** Satu kali retry yang terkontrol setelah AbortError. */
            await new Promise((res) => setTimeout(res, 500));
            try {
              pushSubscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey,
              });
            } catch (retryErr: any) {
              return {
                success: false,
                reason: 'Registrasi Web Push gagal setelah mencoba ulang.',
                errorName: retryErr.name,
                errorMessage: retryErr.message,
              };
            }
          }
        } else {
          return {
            success: false,
            reason: 'Registrasi Web Push gagal.',
            errorName: subErr.name,
            errorMessage: subErr.message,
          };
        }
      }
    }

    if (!pushSubscription) {
      return { success: false, reason: 'Tidak dapat memperoleh PushSubscription dari browser.' };
    }

    /********** Kirim subscription ke server untuk disimpan. */
    const response = await csrfFetch('/api/notifications/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(pushSubscription.toJSON()),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));

      /********** Perbaiki diagnostik untuk kegagalan CSRF. */
      if (errorData?.error?.code === 'CSRF_VALIDATION_FAILED') {
        return {
          success: false,
          reason: 'Registrasi Web Push gagal karena token keamanan tidak valid. Silakan muat ulang halaman lalu coba lagi.',
          errorName: 'CSRF_VALIDATION_FAILED',
          errorMessage: JSON.stringify(errorData),
        };
      }

      return {
        success: false,
        reason: 'Gagal menyimpan langganan Web Push ke server.',
        errorName: 'ServerSaveFailed',
        errorMessage: JSON.stringify(errorData),
      };
    }

    console.log('[SW Register] Push subscription saved successfully');
    return { success: true };
  } catch (error: any) {
    console.error('[SW Register] subscribeToPushNotifications failed:', error);
    return {
      success: false,
      reason: 'Terjadi kesalahan sistem saat mencoba mendaftar Web Push.',
      errorName: error.name,
      errorMessage: error.message,
    };
  }
}

/**
 * Membatalkan langganan browser dari Web Push dan menghapus subscription
 * dari server.
 *
 * Panggil ini saat user secara eksplisit menonaktifkan notifikasi.
 *
 * @param registration - ServiceWorkerRegistration yang aktif.
 * @returns `true` jika berhasil unsubscribe, `false` jika gagal.
 */
export async function unsubscribeFromPushNotifications(registration: ServiceWorkerRegistration): Promise<boolean> {
  try {
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      console.log('[SW Register] No active push subscription to remove.');
      return true;
    }

    const endpoint = subscription.endpoint;

    /********** Langkah 1: Unsubscribe di level browser/PushManager. */
    const unsubscribed = await subscription.unsubscribe();
    if (!unsubscribed) {
      console.error('[SW Register] browser unsubscribe() returned false');
      return false;
    }

    /********** Langkah 2: Hapus dari server DB. */
    await csrfFetch('/api/notifications/subscribe', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ endpoint }),
    });

    console.log('[SW Register] Push subscription removed.');
    return true;
  } catch (error) {
    console.error('[SW Register] unsubscribeFromPushNotifications failed:', error);
    return false;
  }
}
