// @ts-nocheck
/// <reference lib="webworker" />

// ─── Service Worker — Modul 3: Daily Cap Engine ───────────
// Upgrade dari push handler dasar menjadi sistem yang cerdas:
//
//   Sebelum menampilkan notifikasi, SW melakukan:
//   1. Baca preferensi dari 'moneta-sw-prefs' IDB
//   2. Hitung notifikasi hari ini dari daily_count store
//   3. Jika count >= dailyCap:
//      → Catat 'suppressed' ke notification_inbox (audit trail penelitian Q3)
//      → TIDAK tampilkan notifikasi ke pengguna
//   4. Jika count < dailyCap:
//      → Tampilkan notifikasi
//      → Increment daily counter
//      → Catat 'received' ke notification_inbox
//
// Keputusan Arsitektur Q2:
//   SW membaca IDB dedicated 'moneta-sw-prefs' (bukan localStorage —
//   SW tidak memiliki akses localStorage secara langsung)
//
// Keputusan Arsitektur Q3:
//   Status 'suppressed' dicatat ke notification_inbox di 'moneta-finance'
//   IDB. Log ini menjadi bukti matematis efektivitas Daily Cap Engine
//   untuk keperluan audit dan analisis data penelitian.

declare let self: ServiceWorkerGlobalScope;

// ─── IDB Constants ───────────────────────────────────────

const SW_DB_NAME = "moneta-sw-prefs";
const SW_DB_VERSION = 1;
const PREFS_STORE = "prefs";
const COUNT_STORE = "daily_count";
const PREFS_RECORD_KEY = "notification_prefs";
const COUNT_RECORD_KEY = "daily_count";

const MAIN_DB_NAME = "moneta-finance";
const INBOX_STORE = "notification_inbox";

// ─── IDB Helpers (digunakan di push handler) ─────────────

/** Buka 'moneta-sw-prefs' IDB. Buat store jika belum ada (first install). */
function openSwPrefsDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(SW_DB_NAME, SW_DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(PREFS_STORE)) {
        db.createObjectStore(PREFS_STORE, { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains(COUNT_STORE)) {
        db.createObjectStore(COUNT_STORE, { keyPath: "key" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Baca preferensi notifikasi dari IDB utama. */
async function getPrefsFromIDB() {
  try {
    const db = await new Promise((resolve, reject) => {
      const req = indexedDB.open(MAIN_DB_NAME);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return new Promise((resolve) => {
      const tx = db.transaction("notification_settings", "readonly");
      const req = tx.objectStore("notification_settings").getAll();
      req.onsuccess = () => {
        if (req.result && req.result.length > 0) {
          resolve(req.result[0]); // Ambil setting user yang login
        } else {
          resolve({ dailyCap: 5 });
        }
      };
      req.onerror = () => resolve({ dailyCap: 5 });
    });
  } catch {
    return { dailyCap: 5 };
  }
}

/** Baca jumlah notifikasi hari ini. Auto-reset jika hari sudah berganti. */
async function getTodayCountFromIDB() {
  const today = new Date().toISOString().split("T")[0];
  try {
    const db = await openSwPrefsDB();
    return new Promise((resolve) => {
      const tx = db.transaction(COUNT_STORE, "readonly");
      const req = tx.objectStore(COUNT_STORE).get(COUNT_RECORD_KEY);
      req.onsuccess = () => {
        const record = req.result;
        if (!record || record.date !== today) {
          resolve(0);
        } else {
          resolve(Number(record.count) || 0);
        }
      };
      req.onerror = () => resolve(0);
    });
  } catch {
    return 0;
  }
}

/** Increment counter notifikasi harian di IDB. */
async function incrementTodayCountInIDB(currentCount) {
  const today = new Date().toISOString().split("T")[0];
  try {
    const db = await openSwPrefsDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(COUNT_STORE, "readwrite");
      tx.objectStore(COUNT_STORE).put({
        key: COUNT_RECORD_KEY,
        date: today,
        count: currentCount + 1,
      });
      tx.oncomplete = () => resolve(undefined);
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn("[SW] Failed to increment count:", err);
  }
}

/**
 * Catat notifikasi ke notification_inbox di 'moneta-finance' IDB.
 *
 * status: 'received' | 'suppressed'
 *
 * Log 'suppressed' adalah audit trail utama untuk membuktikan
 * efektivitas Daily Cap Engine dalam penelitian (Keputusan Q3).
 *
 * Membuka main IDB TANPA menentukan versi (buka versi saat ini).
 * Ini aman: tidak memicu onupgradeneeded, tidak ada version conflict.
 */
async function logToNotificationInbox(title, body, notifType, status) {
  try {
    const db = await new Promise((resolve, reject) => {
      // Buka tanpa versi = buka versi tertinggi yang sudah ada
      const req = indexedDB.open(MAIN_DB_NAME);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(INBOX_STORE, "readwrite");
        tx.objectStore(INBOX_STORE).add({
          type: notifType || "INSTANT",
          title: title || "Moneta",
          body: body || "",
          isRead: false,
          status, // 'received' | 'suppressed'
          createdAt: new Date().toISOString(),
        });
        tx.oncomplete = () => resolve(undefined);
        tx.onerror = () => resolve(undefined); // Non-fatal
      } catch {
        resolve(undefined); // Non-fatal — jika IDB belum diinisialisasi
      }
    });
  } catch (err) {
    // Non-fatal — app mungkin belum pernah membuka main IDB
    console.warn("[SW] Could not log to notification_inbox:", err);
  }
}

// ─── Core: Cap Check + Show ───────────────────────────────

/**
 * Logika utama Daily Cap Engine.
 * Dipanggil dari push event handler via event.waitUntil().
 *
 * Flow:
 *   1. Parse payload
 *   2. Baca prefs dari IDB
 *   3. Baca counter harian dari IDB
 *   4. Jika count >= dailyCap → log 'suppressed' → return (tanpa notif)
 *   5. Jika count < dailyCap → tampilkan notif → increment → log 'received'
 */
async function checkCapAndShowNotification(payload) {
  const title = payload.title || "Moneta Finance";
  const body = payload.body || "Kamu memiliki pembaruan baru.";
  const notifType = payload.type || "INSTANT";
  const logId = payload.logId || null;

  // ── 1. Baca preferensi ─────────────────────────────────
  const prefs = await getPrefsFromIDB();
  const rawDailyCap = prefs.dailyCap;
  let dailyCap = 5;
  if (rawDailyCap === -1 || rawDailyCap === null) {
    dailyCap = null; // unlimited
  } else if (typeof rawDailyCap === 'number' && rawDailyCap > 0) {
    dailyCap = rawDailyCap;
  }

  // ── 2. Baca counter hari ini ───────────────────────────
  const todayCount = await getTodayCountFromIDB();

  // ── 3. Daily Cap Gate ─────────────────────────────────
  if (dailyCap !== null && todayCount >= dailyCap) {
    console.log(
      `[SW] Daily cap (${dailyCap}) reached (today: ${todayCount}). Suppressing notification.`
    );

    // Log 'suppressed' ke notification_inbox (Q3: audit trail)
    await logToNotificationInbox(title, body, notifType, "suppressed");

    // TIDAK memanggil showNotification — notifikasi ditahan
    return;
  }

  // ── 4. Tampilkan notifikasi ───────────────────────────
  const options = {
    body,
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-192x192.png",
    data: {
      url: payload.data?.url || "/",
      logId, // Digunakan oleh notificationclick untuk mark-read
    },
    tag: `moneta-${notifType}`, // Mencegah duplikat notif tipe sama
    requireInteraction: false,
  };

  // ── 5. Increment counter + log 'received' ─────────────
  // Dilakukan SETELAH showNotification agar tidak increment jika gagal
  await self.registration.showNotification(title, options);
  await incrementTodayCountInIDB(todayCount);
  await logToNotificationInbox(title, body, notifType, "received");

  console.log(
    `[SW] Notification shown. Today: ${todayCount + 1}/${dailyCap}`
  );
}

// ─── Push Event Handler ───────────────────────────────────

self.addEventListener("push", (event) => {
  if (!event.data) return;

  try {
    const payload = event.data.json();
    // Delegasikan ke Daily Cap Engine
    event.waitUntil(checkCapAndShowNotification(payload));
  } catch (err) {
    console.error("[SW] Failed to parse push payload:", err);
    // Fallback: tampilkan notif generik tanpa cap check
    event.waitUntil(
      self.registration.showNotification("Moneta Finance", {
        body: event.data.text() || "Kamu memiliki pembaruan baru.",
        icon: "/icons/icon-192x192.png",
        badge: "/icons/icon-192x192.png",
      })
    );
  }
});

// ─── Notification Click Handler ───────────────────────────

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const urlToOpen = new URL(
    event.notification.data?.url || "/",
    self.location.origin
  ).href;

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if (client.url === urlToOpen && "focus" in client) {
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(urlToOpen);
        }
      })
  );
});
