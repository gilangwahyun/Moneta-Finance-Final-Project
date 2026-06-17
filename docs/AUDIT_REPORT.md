# Moneta Codebase Documentation Audit Report

## 1. Executive Summary

This audit evaluated the Moneta codebase against the newly established architectural, structural, and offline-first documentation standards. Because the project recently underwent a comprehensive 3-phase naming and domain restructuring, the codebase is in excellent shape structurally. The primary findings involve leftover, deprecated online-first API routes that are no longer actively consumed by the UI but remain in the `src/app/api` directory.

## 2. Overall Compliance Score

**Mostly compliant with minor fixes**

The core offline-first logic, UI rendering, repository boundaries, and naming conventions strictly adhere to the new standards. A minor cleanup phase is recommended to remove deprecated API routes to prevent future confusion.

---

## 3. Compliance Table

| Area                   | Expected by Docs                                                                 | Current Code                                                                                                                                                                                                                         | Status                  | Risk | Recommended Fix                                                                               |
| ---------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------- | ---- | --------------------------------------------------------------------------------------------- |
| **Project Structure**  | Domain isolation, generic `components/ui`, specific `components/{domain}`        | All domain components successfully reside in `src/components/{domain}`.                                                                                                                                                              | **Compliant**           | None | N/A                                                                                           |
| **Naming Conventions** | `PascalCase.tsx`, `use-*.ts`, `kebab-case` repos, `*.types.ts`                   | All files perfectly conform post-migration.                                                                                                                                                                                          | **Compliant**           | None | N/A                                                                                           |
| **Offline-First UI**   | UI reads ONLY from IndexedDB for core data.                                      | The Dashboard (e.g. `transactions`, `notifications`) relies entirely on `useLiveQuery` and IDB repositories. Direct fetches are strictly limited to allowed exceptions (`/api/export`, `/api/auth`, `/api/notifications/subscribe`). | **Compliant**           | None | N/A                                                                                           |
| **IndexedDB & Repos**  | Dedicated local repos, plural `kebab-case.ts`, no UI logic inside repos.         | Repositories strictly handle IDB queries. No React logic present.                                                                                                                                                                    | **Compliant**           | None | N/A                                                                                           |
| **Sync Architecture**  | Mutations enqueue to `sync_queue`, remote applies skip queue, strict push order. | `sync-manager.ts` handles queues correctly. Push order matches constraints.                                                                                                                                                          | **Compliant**           | None | N/A                                                                                           |
| **Notifications**      | Local logs trigger SW, pulled logs do not.                                       | `fetchNotifications` reads directly from local `notification-logs` repo. The architecture successfully decouples local triggers from server syncs.                                                                                   | **Compliant**           | None | N/A                                                                                           |
| **API Routes**         | Server APIs strictly limited to sync, auth, export, and subscriptions.           | Leftover online-first API routes exist (`api/budgets`, `api/sync/categories`, `api/sync/transactions`) but are not actively called by the offline UI.                                                                                     | **Partially Compliant** | Low  | Delete deprecated API routes to prevent future AI/developer confusion.                        |

---

## 4. High-Risk Issues

_None detected._ The recent offline-first sync fix (resolving `notification_settings` conflict resolution) and the structural renaming migrations have successfully eliminated existing high-risk architectural violations.

## 5. Resolved Issues (Phase 1 Cleanup)

The following legacy endpoints and issues were successfully cleaned up in Phase 1:
- `src/app/api/budgets/reallocate/route.ts` (Deleted)
- `src/app/api/notifications/history/route.ts` (Deleted)
- `src/app/api/notifications/logs/route.ts` (Deleted)
- `src/app/api/notifications/mark-read/route.ts` (Deleted)
- `src/app/(dashboard)/notifications/page.tsx` (Stale comments removed)
- `src/app/api/settings/notifications/route.ts` (Kept - actively used by background worker)

## 6. Medium-Risk Issues

**Outdated/Deprecated API Routes (Phase 2)**
A second sweep revealed three additional legacy backend endpoints that are no longer consumed by the frontend and should be removed:

- `src/app/api/budgets/route.ts`
- `src/app/api/sync/categories/route.ts`
- `src/app/api/sync/transactions/route.ts`

_Risk_: An AI coding assistant or new developer might mistakenly try to use these endpoints instead of routing mutations through the unified `/api/sync/push` and `/api/sync/pull` endpoints.

## 7. Safe Fix Order

1. Delete the deprecated orphaned API files identified in Phase 2.
2. (Future/Optional) Consolidate `notification-prefs` and `notification-inbox` repositories as discussed in prior audits.

## 8. Files Likely Affected

- `src/app/api/budgets/route.ts` (Delete)
- `src/app/api/sync/categories/route.ts` (Delete)
- `src/app/api/sync/transactions/route.ts` (Delete)

## 9. Recommended Next Implementation Plan

**Phase 2: Legacy API Cleanup**
A straightforward, low-risk deletion of the deprecated Phase 2 API routes listed above to finalize the transition to the Offline-First Sync Architecture and secure the project against accidental direct-fetch regressions.
