# QA Verification Checklist

Before deploying major refactors or modifying the offline-first sync architecture, run through this manual verification checklist to ensure no regressions occur.

## Core Offline Mechanics

## Frontend UI Regression Checklist

**General:**
- [ ] Desktop layout checked.
- [ ] Mobile layout checked.
- [ ] Dark theme consistency checked.
- [ ] No visual clipping or overlap.
- [ ] No hover-only critical actions.
- [ ] Buttons use consistent labels.
- [ ] Empty/loading/error states are readable.
- [ ] Accessibility labels exist for icon-only buttons.
- [ ] Verify Notification Preferences page allows zoom and passes contrast/accessibility checks.

**Entity actions:**
- [ ] Transactions edit/delete action works.
- [ ] Budgets edit/delete action works.
- [ ] Wallets edit/delete action works.
- [ ] Categories edit/delete action works.
- [ ] Desktop action popover opens correctly.
- [ ] Mobile bottom sheet opens correctly.
- [ ] Delete confirmation appears before delete.
- [ ] Popover/bottom sheet does not overlap important content.
- [ ] Outside click / close button works.

**Responsive:**
- [ ] Mobile summary metrics use compact layout.
- [ ] Bottom sheet does not collide with bottom navigation.
- [ ] Page remains usable on narrow mobile width.
- [ ] Desktop content width remains readable.
- [ ] Budget page has no horizontal overflow on mobile (status filter).
- [ ] Budget status filter works on mobile bottom sheet and desktop segmented control.
- [ ] Analysis bottom sheet visually matches Transactions bottom sheet.

**Filter Controls:**
- [ ] Transactions period filter works for Today (Hari Ini), This Month, Last 7 Days, custom date, and All Time (Semua Waktu).
- [ ] Reset filter clears search, type, and period filters simultaneously.

**Offline-first UI:**
- [ ] UI updates immediately after local change.
- [ ] Sync status updates correctly.
- [ ] Failed/pending sync states are visible when needed.
- [ ] UI does not wait for server before showing local changes.

## Core Offline Mechanics

- [ ] **Offline Transaction CRUD**: 
  - Disconnect the network (Chrome DevTools -> Offline).
  - Create a new transaction. Ensure it immediately appears in the UI.
  - Edit the transaction. Ensure the edit is reflected.
  - Delete the transaction. Ensure it disappears from the list.
- [ ] **Offline Budget CRUD & Rhythm**:
  - While offline, create a new budget for a category.
  - Edit the budget amount.
  - Ensure the UI reflects the changes instantly.
  - Verify that the Budget Rhythm (Ritme Anggaran) displays the correct daily ideal limit and projection.
  - Add a transaction and verify the rhythm status changes correctly (e.g. "Lebih Cepat", "Sesuai ritme").
- [ ] **Offline Budget Reallocation / Subsidi Silang**:
  - Pengguna dapat membuka aksi Subsidi Silang dari ikon menu titik tiga pada kartu anggaran.
  - Modal Subsidi Silang menampilkan anggaran sumber secara benar.
  - Pengguna dapat memilih anggaran tujuan yang berbeda.
  - Sistem menolak nominal yang melebihi sisa anggaran sumber.
  - Sistem menolak sumber dan tujuan yang sama.
  - Setelah dikonfirmasi, nominal anggaran sumber berkurang.
  - Setelah dikonfirmasi, nominal anggaran tujuan bertambah.
  - Perubahan tampil langsung di UI.
  - Perubahan masuk antrean sinkronisasi.
  - Subsidi silang berhasil saat daring.
  - Subsidi silang berhasil disimpan lokal saat luring.
  - Setelah kembali daring, dua pembaruan anggaran berhasil tersinkron ke server.
  - Tidak ada item sync tertunda/failed setelah proses selesai.
- [ ] **Offline Category CRUD**:
  - While offline, create and edit a category. Ensure instant UI update.
- [ ] **Offline Wallet Transfer**:
  - Transfer option is visible in TransactionModal.
  - User can select source wallet.
  - User can select destination wallet.
  - Source and destination wallet cannot be the same.
  - User can enter transfer amount.
  - Transfer saves locally.
  - Source wallet balance decreases.
  - Destination wallet balance increases.
  - Total income does not increase.
  - Total expense does not increase.
  - Budget usage does not change.
  - Analytics chart does not count transfer as expense/income.
  - Transfer syncs successfully when online.
  - Transfer remains pending and syncs later when created offline.
  - Export still labels transfer as Transfer if export includes it.
- [ ] **Offline Flexible Financial Targets (Target Pemasukan)**:
  - While offline, create a new DAILY target. Verify it correctly bounds transactions to the current day.
  - Create a WEEKLY target. Verify it correctly bounds transactions to the current week.
  - Create a MONTHLY target. Verify it correctly bounds transactions to the current month.
  - Create a CUSTOM target. Verify user can set absolute start and end dates.
  - Add transactions within and outside the target period bounds. Verify progress only counts transactions within bounds.
  - Target without category counts all INCOME transactions.
  - Target with specific category only counts INCOME transactions for that category.
  - Verify EXPENSE or TRANSFER transactions do not affect the target progress.
  - Verify positive target nudges (e.g., "Tercapai") trigger correctly and are saved to local DB.
  - Verify deduplication works for the same target, period bounds, and threshold level.
- [ ] **Offline Wallet CRUD**:
  - While offline, create and edit a wallet. Ensure instant UI update.
- [ ] **Offline Route Access (PWA Shell Cache)**:
  - While offline, navigate to `/wallets` and `/categories` via the sidebar or profile links.
  - Verify the pages load successfully without a network error (testing the Service Worker cache).
- [ ] **Push Sync After Reconnect**:
  - Reconnect the network.
  - Wait for the background sync interval (or manually trigger sync).
  - Verify that the transactions and budgets created while offline now appear in the PostgreSQL database with `syncStatus = "SYNCED"`.
  - Verify sync push/pull still works correctly and efficiently after N+1 batched query optimizations.
- [ ] **Sync Queue Drain Concurrency Safety**:
  - While an active sync is running (e.g. hydrating or pushing a large batch), quickly create a new transaction.
  - Verify that the new transaction does not get permanently stuck in a "Waiting" state and is pushed in an immediate follow-up sync cycle automatically.
- [ ] **Hydration After Clearing IDB**:
  - Log out or clear browser storage (Application tab -> Clear site data).
  - Log back in.
  - Verify that past transactions, budgets, and categories are pulled down from the server and instantly populate the UI.
- [ ] **Pull Sync From Another Device**:
  - Open the app in two different browsers (Device A and Device B).
  - Create a transaction on Device A.
  - Wait for sync. Verify Device B automatically pulls the transaction and updates the UI without a manual page refresh.
- [ ] **Hydration/Pull Queue Safety**:
  - After a pull sync or hydration, inspect the local `sync_queue` in DevTools.
  - Verify that NO pulled remote records were accidentally enqueued back into the `sync_queue`.

## Notifications Subsystem

- [ ] **Notification Settings Offline Edit**:
  - Go offline. Toggle a notification setting in the Profile.
  - Go online. Verify the setting syncs to the server.
- [ ] **Settings Conflict Test**:
  - Go offline on Device A. Change notification settings (becomes `PENDING`).
  - From Device B (online), change the settings on the server to something else.
  - Go online on Device A. The pull sync will fetch Device B's stale (relative to A's edit) settings. Verify that Device A's local `PENDING` settings **are not overwritten**, and are instead preserved and pushed.
- [ ] **Notification Log Local Trigger (Tiered 20/50/100)**:
  - Create a transaction that exceeds a budget limit at the 20% tier. Verify the warning.
  - Exceed the 50% tier. Verify the warning.
  - Exceed the 100% tier. Verify the warning.
  - Verify that an in-app warning log appears in the notification inbox for each distinct threshold crossed.
  - Verify that the logs sync to the server.
- [ ] **OS Notification Banner Visibility**:
  - Trigger a 100% budget limit. Verify the OS-level system banner appears (not just the in-app toast).
  - Ensure the banner stays on screen (requires user interaction to dismiss).
  - Trigger another notification. Verify the banner pops up again and is not silently swallowed by tag collision.
- [ ] **Notification Read/Dismiss Offline Sync**:
  - Go offline. Mark a notification log as read or dismiss it.
  - Verify the UI reflects this immediately.
  - Go online and verify the state updates on the server.
- [ ] **No Duplicate Notification within Same Tier**:
  - Delete the transaction from the previous step and recreate it.
  - Ensure the same tier threshold (e.g., `100`) does not generate a redundant duplicate log entry for the same month and budget.
- [ ] **No Pulled Log System Notification**:
  - Generate a budget warning log on Device A.
  - Allow Device B to pull the new log via Sync.
  - Verify that Device B updates its inbox UI but **does NOT** trigger an OS-level system notification (no `showNotification` popup).

### Notification Delivery Mode Scenarios

- [ ] **Scenario A — OFF mode**:
  - Set delivery mode to OFF (Mati) in Profile > Notifications.
  - Trigger a budget 100% event.
  - Verify: A notification log appears in the Notifications page.
  - Verify: No OS system push notification appears.
  - Verify: No digest fires later.

- [ ] **Scenario B — INSTANT mode**:
  - Set delivery mode to INSTANT (Instan).
  - Trigger a budget 100% event.
  - Verify: A notification log appears in the Notifications page.
  - Verify: An OS system push notification appears immediately.
  - Verify: Clicking the push navigates to the correct page (e.g. /budgets for budget alerts).
  - Verify: The log is marked as read after click.

- [ ] **Scenario C — INSTANT mode, daily push cap reached**:
  - Set delivery mode to INSTANT, daily cap to 3 (or lowest available).
  - Trigger more than `cap` valid budget events (from separate transactions).
  - Verify: ALL events appear as logs in the Notifications page (not limited by cap).
  - Verify: OS push notifications appear at most `cap` times.
  - Verify: Logs beyond the cap are NOT silently lost — they appear in the inbox with no push.

- [ ] **Scenario D — DIGEST mode**:
  - Set delivery mode to DIGEST (Ringkasan).
  - Trigger 3 or more budget threshold events from separate transactions.
  - Verify: Each event creates an individual log in the Notifications page.
  - Verify: No individual OS push notification appears for each event.
  - Verify: At the user's configured digest time, ONE summary push notification appears.
  - Verify: The digest text summarizes the logs (e.g. "Ada 3 pembaruan penting hari ini: ...").
  - Verify: Clicking the digest push opens `/notifications` (NOT `/budgets`).

- [ ] **Scenario D2 — DIGEST mode, no logs today**:
  - Set delivery mode to DIGEST.
  - Ensure no budget events occur today.
  - Verify: No digest push fires (empty digest is not sent).

- [ ] **Scenario E — Delivery mode normalization**:
  - Inspect IDB notification_settings (DevTools → Application → IndexedDB).
  - Verify: `deliveryMode` is set to `"INSTANT"`, `"BATCH"`, or `"NONE"` (not a mix).
  - Verify: `instantAlerts` and `dailyDigest` are consistent with `deliveryMode`.
  - Verify: `instantAlerts=true` only when `deliveryMode="INSTANT"`.
  - Verify: `dailyDigest=true` only when `deliveryMode="BATCH"`.
  - If legacy inconsistency found (both booleans true): set mode via UI and verify normalization.

## System Integrations & Edge Cases

- [ ] **Export XLSX**:
  - While online, navigate to Analytics and trigger an Export.
  - Verify the Excel file downloads successfully and contains correct formatting.
  - (Note: Export is expected to fail or disable while offline).
- [ ] **Mobile/Desktop UI Checks**:
  - Inspect UI on mobile dimensions. Verify forms, charts, and drawer components respond properly.
  - Ensure Service Worker installs correctly and prompts for PWA installation.

## Performance & Core Web Vitals Regression

- [ ] **Lighthouse Testing**:
  - Run Lighthouse on major pages (Dashboard, Notifications, Transactions, Budgets, Analytics) after UI/performance changes.
  - Test both desktop and mobile viewports.
  - Test in incognito or after clearing site data, because IndexedDB/local data may affect loading behavior.
  - Verify Dashboard loads without visible layout jumps (CLS).
  - Verify Dashboard Core Web Vitals remain in the green range.
  - Test with small and larger local datasets to ensure sync scalability.
