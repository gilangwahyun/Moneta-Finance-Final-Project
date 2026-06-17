# Moneta Data Flows

This document details the step-by-step operational data flows within Moneta's offline-first architecture.

**Frontend UI Note:**
Moneta's frontend UI must always reflect the local-first state:

- Data changes must be immediately visible in the UI after local storage.
- Sync status informs the user whether changes are pending, syncing, synced, or failed.
- Frontend components must never force the user to wait for a server response before displaying local changes.

For detailed UI visual and interaction standards, including action menus, bottom sheets, delete confirmations, and sync status, see `docs/FRONTEND_UI_GUIDELINES.md`.

---

## 1. App Startup and Hydration

_Triggered on initial login or when forcing a full data reset._

1. **Server API**: The UI triggers `/api/sync/pull?mode=hydrate`.
2. **Server API**: The server fetches core domain data (which may use bounded history windows or pagination for long-term scalability) and all notification settings/logs.
3. **Local DB**: The `sync-manager` receives the payload and writes it directly to the IndexedDB repositories.
4. **sync_queue**: Data is inserted with `syncStatus = "SYNCED"` and explicitly skips the `sync_queue` to avoid loops.
5. **PWA Shell Cache**: The Service Worker actively caches core offline routes (e.g., `/wallets`, `/categories`, `/transactions`) to ensure navigation works without network access.
6. **Notification Behavior**: Pulled logs bypass the Service Worker trigger and strictly do not fire `showNotification()`.
7. **UI Update**: `useLiveQuery` hooks detect IDB changes and instantly render the populated UI (Sinkronisasi Pull Progresif), allowing components to update independently as their specific entities finish hydrating.

## 2. Create Transaction

1. **UI Update**: User submits form.
2. **Local DB**: `createTransaction` inserts the record into IDB with `syncStatus = "PENDING"`.
3. **sync_queue**: A mutation record (`CREATE`, `transaction`, `clientId`) is immediately enqueued.
4. **Notification Behavior**: Local notification engine evaluates budget usage. If a threshold is crossed, a local `notification_log` is created.
5. **Server API**: Background sync eventually reads `sync_queue` and POSTs to `/api/sync/push`.
6. **Local DB**: Upon successful push, local `syncStatus` updates to `"SYNCED"` and the queue is cleared.

## 3. Update Transaction

1. **UI Update**: User edits form.
2. **Local DB**: `updateTransaction` updates IDB record, changes `updatedAt`, and sets `syncStatus = "PENDING"`.
3. **sync_queue**: An `UPDATE` mutation is enqueued.
4. **Notification Behavior**: Local engine re-evaluates budgets and updates logs if necessary.
5. **Server API**: Pushed to `/api/sync/push`. If server `updatedAt` is newer, last-write-wins resolves the conflict.

## 4. Delete Transaction (and other Entities)

1. **UI Update**: User clicks delete.
2. **Local DB**: Instead of hard-deleting, IDB record is marked `deletedAt = now()` and `syncStatus = "PENDING"`. UI hooks filter out deleted records instantly.
3. **sync_queue**: A `DELETE` mutation is enqueued.
4. **Tombstone Fallback**: If the local IndexedDB record is unexpectedly cleared or missing during push sync, `buildPushPayload` recovers the essential entity data directly from the `sync_queue` JSON payload to prevent deadlocks.
5. **Server API**: Pushed to server, which applies the soft-delete to PostgreSQL.

## 5. Create / Update Budget & Financial Target

1. **UI Update**: User sets a budget limit (Anggaran) for an expense category, or creates a Financial Target (Target Pemasukan).
2. **Local DB**: Budget/Target IDB record created/updated (`syncStatus = "PENDING"`, `updatedAt` bumped).
3. **sync_queue**: `CREATE`/`UPDATE` budget or target mutation enqueued.
4. **Notification Behavior**: Re-evaluating the budget or target against current status may trigger immediate local warnings or positive target updates.
5. **Server API**: Pushed to server. Budget and Target mutations are pushed _before_ transactions to satisfy foreign key constraints.

**Note on Budget Reallocation (Subsidi Silang)**: Budget reallocation is implemented as two local budget updates:

- source budget amount decreases
- destination budget amount increases
  Both updates are stored locally and synchronized through the normal budget update sync path. No separate reallocation entity is used in the current version.

## 6. Local Notification Trigger

The notification system follows a strict four-layer pipeline. Each layer is independent:

```
Event Evaluation  →  Log Creation (always)  →  Delivery Decision (mode-gated)  →  Delivery Execution
```

### Layer 1: Event Evaluation
- A transaction creation/update causes spending to cross a budget threshold (20%, 50%, or 100%).
- `local-engine.ts` is called via `evaluateAndTriggerNudges()` from `transactions.ts`.
- Nudge insights are sorted by priority. The first valid, non-duplicate insight is selected.

### Layer 2: Log Creation (always, independent of delivery mode)
- A `notification_log` record is written to IDB with `status: 'delivered'`.
- A `dedupeKey` prevents duplicate logs for the same unchanged budget state.
- The log is enqueued for sync to the server.
- **Log creation is never blocked by delivery mode or the daily push cap.**
  The in-app Notifications page shows all logs regardless of whether a device push was sent.

### Layer 3: Delivery Decision
- `resolveDeliveryMode(settings)` reads the authoritative mode from IDB notification_settings:
  - **NONE (OFF)**: skip push, reason `mode_off`. Logs still written.
  - **DIGEST**: skip individual push, reason `digest_mode_active`. Logs still written.
  - **INSTANT**: continue to Layer 4.
- In INSTANT mode, push prerequisites are checked in order:
  1. Service worker available → else skip (`service_worker_unavailable`).
  2. OS permission `granted` → else skip (`permission_not_granted`).
  3. Daily push cap not exceeded (localStorage push counter) → else skip (`daily_push_cap_reached`).
  - **The daily push cap limits device push delivery only. It does not block log creation.**

### Layer 4: Delivery Execution
- `reg.showNotification()` is called with `notification.data = { clientId, logId, ctaRoute, type }`.
  - `renotify: true` prevents tag collisions from silently swallowing banners.
  - `requireInteraction: true` only for critical (100%) alerts.
- After successful `showNotification()`, the localStorage push counter is incremented.

### Digest Delivery (DIGEST mode)
- `startDigestTimer()` polls every 5 minutes while the app tab is open.
- At the user's configured `digestTime`, if `deliveryMode === "DIGEST"`:
  - `buildLogDigest(userId)` reads today's `notification_logs` (not raw transaction data).
  - If eligible logs exist, one summary OS notification is sent:
    *"Ada 5 pembaruan penting hari ini: 1 anggaran terlampaui, 2 anggaran mendekati batas, 2 insight baru."*
  - If no eligible logs exist, no digest notification fires.
  - Digest click always opens `/notifications` (the Notifications inbox page).

### UI Update
- Notification badge and inbox are updated via `useLiveQuery` on the `notification_logs` IDB store.



## 7. Notification Log Sync (read_at)

1. **Event**: User reads a notification — either by clicking the OS push notification banner, or by clicking the item in the Notifications page.
2. **Push Notification Click Path**:
   - Service worker `notificationclick` reads `notification.data.clientId`.
   - If an app window is open: SW posts `NOTIFICATION_CLICKED` message to the app client with `notificationClientId`.
   - The dashboard layout's SW message handler calls `markLogRead(clientId)`, which sets `readAt`, `updatedAt`, `syncStatus = "PENDING"` in IDB and enqueues a `notification_log:update` into `sync_queue`.
   - If the app was closed: SW opens a new window with `?notifRead=<clientId>` query param. On mount, the layout reads the param, calls `markLogRead()`, and removes the param from the URL.
3. **Notifications Page Click Path**: Clicking a notification item calls `markLogRead(clientId)` directly — same function, same enqueue behavior.
4. **sync_queue**: `UPDATE` log mutation is enqueued with full record including `readAt`.
5. **Server API**: Pushed to server. `readAt` is persisted to `notification_logs.read_at` column.
4. **Conflict Resolution**: Resolves heavily via `updatedAt` to ensure read states don't regress.

## 8. Notification Settings Sync

1. **UI Update**: User changes toggle in Profile.
2. **Local DB**: `notification_settings` IDB updated (`syncStatus = "PENDING"`).
3. **sync_queue**: Enqueued for push.
4. **Server API**: Pulled settings from other devices bypass `sync_queue` locally but still run through `resolveConflict` to protect local unpushed edits.

## 9. Push Sync

1. **Trigger**: Online status restored or manual trigger.
2. **Local DB**: `sync-manager` reads all `sync_queue` items.
3. **Server API**: POSTs batched payload to `/api/sync/push`.
   _Strict Order_: Categories/Wallets → Targets → Budgets → Transactions → Settings → Logs.
4. **Local DB**: Dequeues successful mutations and marks records `SYNCED`.

## 10. Pull Sync

1. **Trigger**: Completes immediately after Push Sync (bidirectional loop).
2. **Server API**: GET `/api/sync/pull?lastSyncedAt=...` fetches deltas.
3. **Local DB**: `sync-manager` iterates over pulled data.
4. **Conflict Resolution**: If a local record is `PENDING`, `updatedAt` decides the winner.
5. **sync_queue**: Winning server records are written to IDB with `skipSyncQueue = true`.
6. **Progressive Apply**: As entities are written to IDB, the UI updates progressively per entity via `useLiveQuery` without waiting for the entire pull to finish (Sinkronisasi Pull Progresif).

## 11. Export XLSX

1. **UI Update**: User navigates to Profile and clicks Export.
2. **Server API**: _Online Only._ The client directly fetches `/api/export`.
3. **Response**: Server queries PostgreSQL directly and returns the generated spreadsheet buffer.
