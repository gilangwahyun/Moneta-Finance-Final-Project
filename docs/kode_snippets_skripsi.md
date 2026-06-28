# Potongan Kode Skripsi — Moneta Finance

> Semua snippet diambil langsung dari codebase. Nama file aktual dikonfirmasi.

---

## Kode 4.1 — Autentikasi: Signing JWT + Cookie HttpOnly
**File:** `src/app/api/auth/login.ts` (baris 88–116) + `src/lib/auth/jwt.ts` (baris 22–32)

### jwt.ts — fungsi `signToken()`
```typescript
// src/lib/auth/jwt.ts
export async function signToken(payload: {
  userId: string;
  username: string;
}): Promise<string> {
  return new SignJWT({ username: payload.username })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer(JWT_ISSUER)
    .setSubject(payload.userId)
    /********** "7d" expiration ensures tokens last one week. */
    .setExpirationTime(JWT_EXPIRATION)
    .sign(JWT_SECRET);
}
```

### login.ts — generate token + set cookie HttpOnly
```typescript
// src/app/api/auth/login.ts  (baris 88–119)
/********** [START: Sign JWT and Set Cookie] **********/
const token = await signToken({ userId: user.id, username: user.username });

const response = NextResponse.json({ success: true, data: { user: { ... } } });

const isSecure =
  request.headers.get("x-forwarded-proto") === "https" ||
  request.url.startsWith("https://");

response.cookies.set(AUTH_COOKIE_NAME, token, {
  httpOnly: true,
  secure: isSecure,
  sameSite: "lax",
  /********** 7 days expiration for consistent sessions. */
  maxAge: 60 * 60 * 24 * 7,
  path: "/",
});

/********** Double-submit defense to prevent CSRF attacks. */
setCsrfCookie(response, generateCsrfToken(), isSecure);
return response;
/********** [END: Sign JWT and Set Cookie] **********/
```

> **Catatan caption:** File auth tidak memiliki fungsi `verifyAuth()` / `createSession()` tunggal; proses autentikasi terbagi di `jwt.ts` (sign/verify) dan `login.ts` (cookie HttpOnly). Sesuaikan caption di naskah.

---

## Kode 4.2 — IndexedDB: Definisi Object Store + Index
**File:** `src/lib/local-db/schema.ts` (baris 32–92 — store inti yang mengandung `clientId` dan `syncStatus`)

```typescript
// src/lib/local-db/schema.ts
export const STORE_SCHEMAS: StoreSchema[] = [
  {
    name: STORES.TRANSACTIONS,
    /********** Local primary key for syncing. */
    keyPath: "clientId",
    indexes: [
      { name: "by_userId",    keyPath: "userId" },
      { name: "by_walletId",  keyPath: "walletId" },
      /********** Enables sync queue filtering. */
      { name: "by_syncStatus", keyPath: "syncStatus" },
      { name: "by_updatedAt", keyPath: "updatedAt" },
    ],
  },
  {
    name: STORES.SYNC_QUEUE,
    keyPath: "id",
    autoIncrement: true,
    indexes: [
      { name: "by_entity",           keyPath: "entity" },
      { name: "by_entity_clientId",  keyPath: ["entity", "clientId"] },
      { name: "by_createdAt",        keyPath: "createdAt" },
    ],
  },
  {
    name: STORES.NOTIFICATION_LOGS,
    keyPath: "clientId",
    indexes: [
      { name: "by_syncStatus",  keyPath: "syncStatus" },
      { name: "by_dedupeKey",   keyPath: "dedupeKey", options: { unique: true } },
    ],
  },
];
```

> **Catatan:** `DB_NAME = "moneta-finance"`, `DB_VERSION = 12`. Total ada 10 object store; snippet di atas menampilkan 3 store representatif.

---

## Kode 4.3 — Service Worker: Event `push` + `notificationclick`
**File:** `worker/index.ts` (baris 243–287)

```typescript
// worker/index.ts

/********** Push Event Handler **********/
self.addEventListener("push", (event) => {
  if (!event.data) return;

  try {
    const payload = event.data.json();
    /********** Delegate to Daily Cap Engine. */
    event.waitUntil(checkCapAndShowNotification(payload));
  } catch (err) {
    /********** Fallback: Show generic notification without cap check. */
    event.waitUntil(
      self.registration.showNotification("Moneta Finance", {
        body: event.data.text() || "Kamu memiliki pembaruan baru.",
        icon: "/icons/icon-192x192.png",
      })
    );
  }
});

/********** Notification Click Handler **********/
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
          if (client.url === urlToOpen && "focus" in client)
            /********** Focus existing tab if available. */
            return client.focus();
        }
        if (self.clients.openWindow)
          /********** Open new tab if none exist. */
          return self.clients.openWindow(urlToOpen);
      })
  );
});
```

---

## Kode 4.4 — Sinkronisasi: `MAX_DRAIN_CYCLES`, `isSyncing`, `syncRequestedAgain`
**File:** `src/lib/sync/queue.ts` (baris 9–131)

```typescript
// src/lib/sync/queue.ts
let isSyncing = false;
let syncRequestedAgain = false;
const MAX_DRAIN_CYCLES = 3;
const SYNC_DEBOUNCE_MS = 500;
const PERIODIC_SYNC_MS = 30000;

export function scheduleSyncCycle(onStateChange?, onResult?): void {
  if (isSyncing) {
    /********** Mark so drain cycle continues if syncing is already in progress. */
    syncRequestedAgain = true;
    return;
  }
  syncTimer = setTimeout(() => executeSyncWithRetry(...), SYNC_DEBOUNCE_MS);
}

async function executeSyncWithRetry(onStateChange?, onResult?): Promise<SyncResult> {
  if (isSyncing) return { state: "syncing", pushed: 0, pulled: 0, conflicts: 0 };

  isSyncing = true;

  for (let drainCycle = 0; drainCycle < MAX_DRAIN_CYCLES; drainCycle++) {
    syncRequestedAgain = false;
    onStateChange?.("syncing");

    const currentResult = await performFullSync();

    /********** Retry with exponential backoff on error. */
    if (currentResult.state === "error" && retryCount < MAX_RETRIES) { /* ... */ }

    const pendingCount = await getPendingCount();
    const hasActivePending = pendingCount > 0;

    if (currentResult.state !== "error" && (syncRequestedAgain || hasActivePending)) {
      /********** Continue to the next drain cycle. */
    } else {
      break;
    }
  }

  isSyncing = false;
  onStateChange?.(currentResult.state);
  return currentResult;
}
```

---

## Kode 4.5 — Sinkronisasi: Conflict Resolution (perbandingan `updatedAt`)
**File:** `src/lib/sync/conflict-resolver.ts` (baris 28–47)

```typescript
// src/lib/sync/conflict-resolver.ts

/**
 * Resolve a conflict antara client dan server version
 * menggunakan strategi "last write wins" berbasis updatedAt.
 */
export function resolveConflict<T extends { updatedAt: string }>(
  pair: ConflictPair<T>
): ConflictResult<T> {
  const clientTime = new Date(pair.clientVersion.updatedAt).getTime();
  const serverTime = new Date(pair.serverVersion.updatedAt).getTime();

  if (clientTime >= serverTime) {
    return {
      winner: pair.clientVersion,
      loser:  pair.serverVersion,
      resolution: "client_wins",
    };
  } else {
    return {
      winner: pair.serverVersion,
      loser:  pair.clientVersion,
      resolution: "server_wins",
    };
  }
}
```

---

## Kode 4.6 — Analitik/Nudging: Definisi Rule + Evaluasi Threshold 50%/80%/100%
**File:** `src/lib/nudging.ts` (baris 3–20) + `src/lib/notifications/local-engine.ts` (baris 261–393)

### Definisi rule di nudging.ts
```typescript
// src/lib/nudging.ts
export type NudgeSeverity = 'warning' | 'positive' | 'neutral' | 'critical' | 'info';

export interface NudgeInsight {
  priority: number;
  severity: NudgeSeverity;
  title: string;
  body: string;
  ctaLabel: string;
  ctaRoute: string;
  relatedBudgetId?: string;
  /********** Threshold indicators: 50 | 80 | 100 | 101. */
  threshold?: number;
  /********** Actual ratio used for analytics tracking. */
  usageRatio?: number;
}
```

### Evaluasi threshold di local-engine.ts
```typescript
// src/lib/notifications/local-engine.ts  (baris 261–393)
const ratio = spent / budgetLimit;

if (ratio > 1.0) {
  /********** Budget limit exceeded (> 100%). */
  nudgeInsights.push({
    priority: BUDGET_CRITICAL_PRIORITY,
    severity: 'critical',
    title: 'Batas Anggaran Terlampaui',
    body: `Anggaran ${catName} telah melewati batas sebesar ${formatCurrency(deficitAmount)}.`,
    threshold: 101,
  });
} else if (ratio >= 0.8) {
  /********** Approaching budget limit (>= 80%). */
  nudgeInsights.push({
    priority: BUDGET_WARNING_PRIORITY,
    severity: 'warning',
    title: 'Anggaran Mulai Menipis',
    body: `Anggaran ${catName} sudah terpakai 80%.`,
    threshold: 80,
  });
} else if (ratio >= 0.5) {
  /********** Budget usage information (>= 50%). */
  nudgeInsights.push({
    priority: BUDGET_INFO_PRIORITY,
    severity: 'info',
    title: 'Penggunaan Anggaran Berjalan',
    body: `Anggaran ${catName} sudah terpakai 50%.`,
    threshold: 50,
  });
}
```

---

## Kode 4.7 — Analitik: Pipeline 4 Layer Local Notification Engine
**File:** `src/lib/notifications/local-engine.ts` (baris 421–565)

```typescript
// src/lib/notifications/local-engine.ts
for (const insight of nudgeInsights) {
  const dedupeKey = getDedupeKey(insight, userId, createdTxn);
  const exists = await checkDedupeKeyExists(dedupeKey);

  if (!exists) {
    /********** [START: Layer 1 - Log Creation] **********/
    const logId = crypto.randomUUID();
    await upsertNotificationLog({
      clientId: logId, dedupeKey, userId,
      title: insight.title, body: insight.body,
      status: 'delivered', source: 'local-engine',
      deliveryModeAtCreation: deliveryMode,
      syncStatus: 'PENDING',
      // ... field lainnya
    });
    /********** [END: Layer 1 - Log Creation] **********/

    /********** [START: Layer 2 - In-app UI Update] **********/
    showSyncToast(insight.title, insight.body);
    window.dispatchEvent(new Event('moneta-notification-updated'));
    /********** [END: Layer 2 - In-app UI Update] **********/

    /********** [START: Layer 3 - Delivery Decision] **********/
    if (deliveryMode === 'NONE') { break; }
    if (deliveryMode === 'DIGEST') { break; }
    /********** [END: Layer 3 - Delivery Decision] **********/

    /********** [START: Layer 4 - Push Execution] **********/
    const { count: todayPushCount } = readTodayCountFromLS();
    if (isDailyCapReached(todayPushCount, dailyCap)) { break; }

    const reg = await navigator.serviceWorker.ready;
    await reg.showNotification(insight.title, {
      body: insight.body,
      icon: '/icons/icon-192x192.png',
      tag: dedupeKey,
      requireInteraction: isCritical,
      data: { logId, ctaRoute: insight.ctaRoute, ... },
    });
    incrementTodayCountInLS();
    break;
    /********** [END: Layer 4 - Push Execution] **********/
  }
}
```

---

## Kode 4.8 — Push & Digest: `buildServerDigestContent()` + Kirim via `web-push`
**File:** `src/lib/notifications/server-digest.ts` (baris 113–213) + `src/app/api/cron/[action]/route.ts` (baris 93–111) + `src/lib/notifications.ts` (baris 117–143)

### buildServerDigestContent()
```typescript
// src/lib/notifications/server-digest.ts
export async function buildServerDigestContent(
  userId: string,
  dateWIB: string = new Date().toISOString()
): Promise<ServerDigestResult> {
  /********** Fetch undigested logs from the target day. */
  const eligibleLogs = await prisma.notificationLog.findMany({
    where: {
      userId,
      deliveryModeAtCreation: "DIGEST",
      eventType: { not: "DIGEST" },
      digestSentAt: null,
      createdAt: { gte: startOfDay, lte: endOfDay },
    },
  });

  if (eligibleLogs.length === 0)
    return { title: "", body: "", logCount: 0, hasEligibleLogs: false, logIds: [] };

  /********** Rank insights: Deficit (4) > Reallocation (3) > Usage (2) > Comparison (1) */
  const title = "Ringkasan Moneta Hari Ini";
  const body  = /* ... rangkum berdasarkan topLog teratas ... */ "";

  return { title, body, logCount: eligibleLogs.length, hasEligibleLogs: true,
           logIds: eligibleLogs.map(l => l.id) };
}
```

### Cron handler — kirim digest via web-push
```typescript
// src/app/api/cron/[action]/route.ts  (baris 93–111)
const digest = await buildServerDigestContent(user.userId);

if (digest.hasEligibleLogs) {
  /********** Send aggregated push notification to user. */
  await sendAndLogPushNotification(
    user.userId,
    digest.title,
    digest.body,
    "DIGEST"
  );
  await markLogsAsDigested(digest.logIds, new Date());
}
```

### sendAndLogPushNotification — bagian `web-push`
```typescript
// src/lib/notifications.ts  (baris 117–143)
import webpush from "web-push";
/********** VAPID keys are configured via environment variables. */

const payload: PushPayload = { title, body, type, logId: log.id };

const results = await Promise.allSettled(
  subscriptions.map(async (sub) => {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload),
      { urgency: "high", TTL: 86400 }
    );
  })
);

/********** Mark log as 'failed' if ALL push subscriptions fail. */
if (!anySucceeded) {
  await prisma.notificationLog.update({
    where: { id: log.id },
    data: { status: "failed" },
  });
}
```

---

## Catatan Penting untuk Naskah

| # | File Aktual (Terkonfirmasi) | Nama yang Disebut di Naskah |
|---|---|---|
| 4.1 | `src/lib/auth/jwt.ts` + `src/app/api/auth/login.ts` | Autentikasi JWT & Cookie |
| 4.2 | `src/lib/local-db/schema.ts` | IndexedDB Schema |
| 4.3 | `worker/index.ts` | Service Worker |
| 4.4 | `src/lib/sync/queue.ts` ← **BUKAN sync-manager.ts!** | Sync Queue Controller |
| 4.5 | `src/lib/sync/conflict-resolver.ts` | Conflict Resolver |
| 4.6 | `src/lib/nudging.ts` + `src/lib/notifications/local-engine.ts` | Nudge Rules & Threshold |
| 4.7 | `src/lib/notifications/local-engine.ts` | Local Notification Engine |
| 4.8 | `src/lib/notifications/server-digest.ts` + `src/lib/notifications.ts` | Server Digest & Push |
