// ─── Moneta Finance — Service Worker ────────────────────
// Handles:
//   1. Install / Activate lifecycle (pre-cache app shell)
//   2. Fetch — Network-First for navigations (enables PWA install prompt)
//   3. Background Sync ('moneta-sync' tag) — relays to app
//   4. Push Notifications — from server payload
//   5. Local Notifications — INSTANT_NUDGE, DEFICIT_ALERT & DAILY_DIGEST
//   6. Notification Click — deep-link via focus/openWindow + postMessage
//
// Architecture (v4):
//   - fetch handler added: Chrome REQUIRES a fetch handler to show the
//     native PWA install prompt in the address bar.
//   - Network-First navigation strategy: always tries network, falls back
//     to cached shell (/offline) when offline.
//   - API routes are always network-only (no caching of auth/data calls).
//   - Client-First Log Persistence: writes to BOTH notification_inbox
//     AND notification_logs IDB stores BEFORE showNotification()
//   - Global User-Level Daily Cap: queries notification_logs for
//     today's delivered count per userId (from moneta-sw-prefs IDB)
//   - Suppressed notifications logged with status 'suppressed'
//
// ⚠️  Plain JavaScript only — Next.js does NOT transpile /public files.

const CACHE_NAME = "moneta-shell-v1";

const SHELL_URLS = [
  "/",
  "/manifest.json",
  "/wallets",
  "/categories",
  "/transactions",
  "/analytics",
  "/budgets",
  "/notifications",
  "/profile",
  "/profile/notifications"
];

// ─── 1. Install — pre-cache app shell ───────────────────

self.addEventListener("install", (event) => {
  console.log("[SW] Install");
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_URLS))
  );
  self.skipWaiting();
});

// ─── 2. Activate — purge old caches ──────────────────────

self.addEventListener("activate", (event) => {
  console.log("[SW] Activate — mengklaim klien");
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      ),
    ])
  );
});

// ─── 3. Fetch — Network-First (required for PWA install) ─
//
// Chrome will NOT show the install prompt unless the service worker
// has a fetch event handler. This handler uses a network-first strategy:
//   • Navigation requests (HTML pages): try network → cache fallback
//   • /api/* requests: network only (never cache auth/data calls)
//   • Static assets: try network → cache fallback

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET, cross-origin, and browser-extension requests
  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith("/_next/webpack-hmr")
  ) {
    return;
  }

  // API routes — always network only, never cache
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(fetch(request));
    return;
  }

  // Navigation & static assets — Network First, cache fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache a copy of successful responses
        if (response.ok) {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned));
        }
        return response;
      })
      .catch(() =>
        // Network failed — serve from cache if available
        caches.match(request).then(
          (cached) => cached || caches.match("/")
        )
      )
  );
});


// ─── 3. Message (dari aplikasi) ──────────────────────────

self.addEventListener("message", (event) => {
  if (!event.data) return;

  switch (event.data.type) {
    case "SKIP_WAITING":
      console.log("[SW] Skip waiting diminta");
      self.skipWaiting();
      break;

    case "TRIGGER_SYNC":
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) =>
          client.postMessage({ type: "SYNC_TRIGGERED" })
        );
      });
      break;

    // ── Gateway 1: Notifikasi Instan Berjenjang ───────────
    case "INSTANT_NUDGE": {
      const { title, body, logId, tier, categoryId } = event.data;
      const gateway = tier === "T1" ? "G1_T1" : "G1_T2";
      const tag = tier === "T1" ? "moneta-budget-tier1" : "moneta-budget-tier2";
      event.waitUntil(
        triggerLocalNotification(
          title || "Peringatan Anggaran",
          body || "Anggaran kategorimu sudah mendekati batas.",
          "INSTANT",
          logId || null,
          tag,
          gateway,
          [
            { action: "open", title: "Lihat Anggaran" },
            { action: "dismiss", title: "Abaikan" },
          ]
        )
      );
      break;
    }

    // ── Gateway 2: Defisit Mutlak ─────────────────────────
    case "DEFICIT_ALERT": {
      const { title, body, logId } = event.data;
      event.waitUntil(
        triggerLocalNotification(
          title || "Peringatan Batas Anggaran",
          body || "Batas anggaran kategori ini telah terlampaui.",
          "DEFICIT",
          logId || null,
          "moneta-budget-deficit",
          "G2",
          [
            { action: "adjust-budget", title: "Sesuaikan Budget" },
            { action: "dismiss", title: "Abaikan" },
          ]
        )
      );
      break;
    }

    // ── Gateway 3: Ringkasan Harian ───────────────────────
    case "DAILY_DIGEST": {
      const { title, body, logId } = event.data;
      event.waitUntil(
        triggerLocalNotification(
          title || "Ringkasan Keuangan Hari Ini",
          body || "Buka aplikasi untuk melihat ringkasan keuanganmu hari ini.",
          "DIGEST",
          logId || null,
          "moneta-digest",
          "G3",
          [
            { action: "open", title: "Buka Ringkasan" },
            { action: "dismiss", title: "Tutup" },
          ]
        )
      );
      break;
    }

    default:
      break;
  }
});

// ─── 4. Background Sync ──────────────────────────────────

self.addEventListener("sync", (event) => {
  if (event.tag === "moneta-sync") {
    console.log("[SW] Background sync terpicu");
    event.waitUntil(
      self.clients.matchAll({ type: "window" }).then((clients) => {
        clients.forEach((client) =>
          client.postMessage({ type: "SYNC_TRIGGERED" })
        );
      })
    );
  }
});

// ─── 5. Push (dari server) ───────────────────────────────

self.addEventListener("push", (event) => {
  console.log("[SW] Push diterima");
  let title = "Moneta Finance";
  let body = "Kamu memiliki notifikasi baru.";
  let logId = null;
  let type = "system";

  if (event.data) {
    try {
      const data = event.data.json();
      title = data.title || title;
      body = data.body || body;
      logId = data.logId || null;
      type = data.type || type;
    } catch (err) {
      console.error("[SW] Gagal parse payload push:", err);
    }
  }

  event.waitUntil(
    triggerLocalNotification(title, body, type, logId, "moneta-push", "PUSH", [
      { action: "open", title: "Buka Aplikasi" },
      { action: "dismiss", title: "Abaikan" },
    ])
  );
});

// ─── 6. Notification Click ───────────────────────────────

self.addEventListener("notificationclick", (event) => {
  const notifData = event.notification.data || {};
  const { logId, clientId, type, url, ctaRoute } = notifData;
  console.log("[SW] notificationclick — action:", event.action, "| data:", JSON.stringify(notifData));

  event.notification.close();

  if (event.action === "dismiss") return;

  // Determine target path: ctaRoute > url > type-based fallback > /notifications
  let targetPath = ctaRoute || url || "/notifications";
  if (!ctaRoute && !url) {
    if (
      event.action === "adjust-budget" || 
      type === "DEFICIT" || 
      type === "INSTANT" || 
      type === "BUDGET_CRITICAL" || 
      type === "BUDGET_WARNING" || 
      type === "BUDGET_INFO"
    ) {
      targetPath = "/budgets";
    } else if (
      type === "SPENDING_INSIGHT" || 
      type === "WANTS_PROJECTION" || 
      type === "WEEKEND_TRAP" || 
      type === "CATEGORY_SPIKE" || 
      type === "PEAK_DAY" || 
      type === "HIGH_EXPENSE_RATIO" || 
      type === "DAILY_EXPENSE_SUMMARY"
    ) {
      targetPath = "/analytics";
    } else if (type === "REMINDER") {
      targetPath = "/transactions";
    } else if (type === "DIGEST") {
      targetPath = "/notifications";
    }
  }

  const targetUrl = self.location.origin + targetPath;
  const notifClientId = clientId || logId || null;

  console.log("[SW] notificationclick — targetPath:", targetPath, "| notifClientId:", notifClientId);

  event.waitUntil(
    (async () => {
      const windowClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      const appClient = windowClients.find((client) =>
        client.url.startsWith(self.location.origin)
      );

      if (appClient) {
        console.log("[SW] notificationclick — focusing existing client");
        await appClient.focus();
        
        // Send navigation message
        appClient.postMessage({ type: "SW_NAVIGATE", path: targetPath });
        
        // Send mark-read message so the app calls markLogRead() which enqueues sync
        if (notifClientId) {
          console.log("[SW] notificationclick — posting NOTIFICATION_CLICKED clientId:", notifClientId);
          appClient.postMessage({
            type: "NOTIFICATION_CLICKED",
            notificationClientId: notifClientId,
            ctaRoute: targetPath,
          });
        } else {
          console.warn("[SW] notificationclick — no clientId in notification data, cannot enqueue read sync");
          // Still refresh the inbox UI
          appClient.postMessage({ type: "INBOX_UPDATED" });
        }
      } else {
        console.log("[SW] notificationclick — no existing client, opening window:", targetUrl);
        // Encode clientId so the newly opened page can mark it as read on load
        const openUrl = notifClientId
          ? targetUrl + (targetUrl.includes("?") ? "&" : "?") + "notifRead=" + encodeURIComponent(notifClientId)
          : targetUrl;
        await self.clients.openWindow(openUrl);
      }
    })()
  );
});

// Returns { userId, dailyCap, instantAlerts, dailyDigest, deliveryMode }

async function readSwPrefs() {
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open("moneta-finance");
      request.onsuccess = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains("notification_settings")) {
          db.close();
          resolve(null);
          return;
        }
        try {
          const tx = db.transaction("notification_settings", "readonly");
          // Since we don't know the exact clientId if we don't have userId, we can just get all records
          // Since it's 1-to-1 locally, there should only be one record.
          const req2 = tx.objectStore("notification_settings").getAll();
          req2.onsuccess = () => {
            db.close();
            const records = req2.result || [];
            if (records.length > 0) {
              resolve(records[0]);
            } else {
              resolve(null);
            }
          };
          req2.onerror = () => { db.close(); resolve(null); };
        } catch { db.close(); resolve(null); }
      };
      request.onerror = () => resolve(null);
    } catch { resolve(null); }
  });
}

// ─── Helper: Write to main IDB store ─────────────────────
// Opens moneta-finance DB WITHOUT specifying version (uses existing).
// Writes to a store if it exists, silently skips if not.

async function writeToMainIDB(storeName, item) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("moneta-finance");
    request.onsuccess = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.close();
        resolve();
        return;
      }
      try {
        const tx = db.transaction(storeName, "readwrite");
        tx.objectStore(storeName).add(item);
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => { db.close(); reject(tx.error); };
      } catch (err) {
        db.close();
        reject(err);
      }
    };
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
}

// ─── Helper: Count today's delivered logs for a user ────
// Queries notification_logs store in moneta-finance IDB.

async function countTodayDeliveredInIDB(userId) {
  const today = new Date().toISOString().split("T")[0];
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open("moneta-finance");
      request.onsuccess = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains("notification_logs")) {
          db.close();
          resolve(0);
          return;
        }
        try {
          const tx = db.transaction("notification_logs", "readonly");
          const store = tx.objectStore("notification_logs");
          // Use index if available, otherwise scan all
          let req2;
          if (store.indexNames.contains("by_userId")) {
            req2 = store.index("by_userId").getAll(userId);
          } else {
            req2 = store.getAll();
          }
          req2.onsuccess = () => {
            const records = req2.result || [];
            const count = records.filter(
              (r) => r.status === "delivered" && r.userId === userId && (r.createdAt || "").startsWith(today)
            ).length;
            db.close();
            resolve(count);
          };
          req2.onerror = () => { db.close(); resolve(0); };
        } catch { db.close(); resolve(0); }
      };
      request.onerror = () => resolve(0);
    } catch { resolve(0); }
  });
}

// ─── Core: triggerLocalNotification ──────────────────────
// Client-First Log Persistence: writes to BOTH notification_logs
// AND notification_inbox BEFORE calling showNotification().
//
// Global User-Level Daily Cap: reads userId + dailyCap from
// moneta-sw-prefs, counts today's delivered notifications from
// notification_logs, and suppresses if cap is reached.

async function triggerLocalNotification(title, body, type, logId, tag, gateway, actions) {
  const now = new Date().toISOString();

  // ── Step 1: Read user prefs for cap enforcement ────────
  const prefs = await readSwPrefs();
  const userId = prefs?.userId || "unknown";
  const dailyCap = prefs?.dailyCap || 3;

  // ── Step 2: Global user-level daily cap check ──────────
  const todayCount = await countTodayDeliveredInIDB(userId);
  const isOverCap = todayCount >= dailyCap;

  // ── Step 3: Build log record ───────────────────────────
  const logRecord = {
    userId,
    title,
    body,
    type: type || "system",
    gateway: gateway || "UNKNOWN",
    status: isOverCap ? "suppressed" : "delivered",
    suppressionReason: isOverCap ? "daily_cap_exceeded" : undefined,
    createdAt: now,
    syncStatus: "PENDING",
  };

  // ── Step 4: Write to notification_logs (audit trail) ───
  try {
    await writeToMainIDB("notification_logs", logRecord);
  } catch (err) {
    console.warn("[SW] Gagal menulis ke notification_logs:", err);
  }

  // ── Step 5: If suppressed, abort the push layout ───────
  if (isOverCap) {
    console.log(
      `[SW] Notifikasi disupresi (cap ${todayCount}/${dailyCap}):`,
      title
    );
    // Notify open tabs about the suppression (for audit UI)
    const clients = await self.clients.matchAll({ type: "window" });
    clients.forEach((client) =>
      client.postMessage({ type: "NOTIFICATION_SUPPRESSED", payload: logRecord })
    );
    return; // Do NOT show OS notification
  }

  // ── Step 6: Write to notification_inbox (for inbox UI) ─
  const inboxRecord = {
    title,
    body,
    type: type === "DIGEST" ? "DIGEST" : "INSTANT",
    createdAt: now,
    isRead: false,
    logId: logId || null,
  };

  try {
    await writeToMainIDB("notification_inbox", inboxRecord);
  } catch (err) {
    console.warn("[SW] Gagal menulis ke inbox IDB:", err);
  }

  // ── Step 7: Show OS notification ───────────────────────
  const notificationOptions = {
    body,
    icon: "/icons/icon-192x192.png",
    tag: tag || "moneta-default",
    renotify: true,
    data: {
      // clientId is the same as logId here — the IDB key for this notification log
      clientId: logId || null,
      logId: logId || null,
      type,
      ctaRoute: type === "DEFICIT" ? "/budgets" : (type === "INSTANT" ? "/budgets" : "/notifications"),
      url: type === "DEFICIT" ? "/budgets" : "/notifications",
    },
    actions: actions || [
      { action: "open", title: "Buka Aplikasi" },
      { action: "dismiss", title: "Abaikan" },
    ],
  };

  console.log("[SW] showNotification — logId:", logId, "| type:", type, "| tag:", tag);

  await self.registration.showNotification(title, notificationOptions);

  // ── Step 8: Notify open tabs to refresh inbox ──────────
  const clients = await self.clients.matchAll({ type: "window" });
  clients.forEach((client) =>
    client.postMessage({ type: "INBOX_UPDATED", payload: inboxRecord })
  );
}
