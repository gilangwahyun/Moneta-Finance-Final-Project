# Moneta Codebase Documentation Audit Report

## 1. Executive Summary

This audit evaluated the Moneta codebase against the established architectural, structural, and offline-first documentation standards on June 20, 2026. Because the project recently underwent comprehensive restructuring and added robust E2E testing (Playwright), the codebase is structurally excellent and highly reliable.

## 2. Overall Compliance Score

**Mostly compliant with minor fixes**

The core offline-first logic, UI rendering, repository boundaries, testing practices, and naming conventions strictly adhere to the standards. 

---

## 3. Compliance Table

| Area                   | Expected by Docs                                                                 | Current Code                                                                                                                                                                                                                         | Status                  | Risk | Recommended Fix                                                                               |
| ---------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------- | ---- | --------------------------------------------------------------------------------------------- |
| **Project Structure**  | Domain isolation, generic `components/ui`, specific `components/{domain}`        | All domain components successfully reside in `src/components/{domain}`.                                                                                                                                                              | **Compliant**           | None | N/A                                                                                           |
| **Naming Conventions** | `PascalCase.tsx`, `use-*.ts`, `kebab-case` repos, `*.types.ts`                   | All files perfectly conform post-migration.                                                                                                                                                                                          | **Compliant**           | None | N/A                                                                                           |
| **Testing**            | Comprehensive automated and manual testing                                       | End-to-End Playwright testing is active (`tests/example.spec.ts`, `npm run test:e2e`). Manual QA checklist comprehensively covers Black Box tests without bleeding into automation scope.                                            | **Compliant**           | None | Continue expanding E2E coverage for offline behaviors.                                        |
| **Offline-First UI**   | UI reads ONLY from IndexedDB for core data.                                      | The Dashboard relies entirely on `useLiveQuery` and IDB repositories. Direct fetches are strictly limited to allowed exceptions (`/api/export`, `/api/auth`).                                                                        | **Compliant**           | None | N/A                                                                                           |
| **IndexedDB & Repos**  | Dedicated local repos, plural `kebab-case.ts`, no UI logic inside repos.         | Repositories strictly handle IDB queries. No React logic present.                                                                                                                                                                    | **Compliant**           | None | N/A                                                                                           |
| **Sync Architecture**  | Mutations enqueue to `sync_queue`, remote applies skip queue, strict push order. | `sync-manager.ts` handles queues correctly. Push order matches constraints.                                                                                                                                                          | **Compliant**           | None | N/A                                                                                           |
| **Notifications**      | Local logs trigger SW, pulled logs do not.                                       | `fetchNotifications` reads directly from local `notification-logs` repo. The architecture successfully decouples local triggers from server syncs.                                                                                   | **Compliant**           | None | N/A                                                                                           |
| **API Routes**         | Server APIs strictly limited to sync, auth, export, and subscriptions.           | Leftover online-first API routes exist (`api/budgets`, `api/sync/categories`, `api/sync/transactions`) but are not actively called by the offline UI.                                                                                     | **Partially Compliant** | Low  | Delete deprecated API routes to prevent future AI/developer confusion.                        |

---

## 4. High-Risk Issues

*None detected.* The recent offline-first sync fix and the structural renaming migrations have successfully eliminated existing high-risk architectural violations.

## 5. Medium-Risk Issues

**Outdated/Deprecated API Routes**
Legacy backend endpoints are no longer consumed by the frontend and should be removed:
- `src/app/api/budgets`
- `src/app/api/sync/categories`
- `src/app/api/sync/transactions`

*Risk*: An AI coding assistant or new developer might mistakenly try to use these endpoints instead of routing mutations through the unified `/api/sync/push` and `/api/sync/pull` endpoints.

## 6. Files Likely Affected (For Future Cleanup)

- `src/app/api/budgets/` (Delete Directory)
- `src/app/api/sync/categories/` (Delete Directory)
- `src/app/api/sync/transactions/` (Delete Directory)

## 7. Recommended Next Implementation Plan

**Phase 2: Legacy API Cleanup**
A straightforward, low-risk deletion of the deprecated API routes listed above to finalize the transition to the Offline-First Sync Architecture and secure the project against accidental direct-fetch regressions.
