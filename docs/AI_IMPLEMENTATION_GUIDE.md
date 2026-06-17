# AI Implementation Guide & Guardrails

This document contains **strict, mandatory rules** for any AI coding assistant or human developer modifying the Moneta codebase. It exists to prevent regressions in the offline-first architecture, UI structure, and sync engine.

---

## 1. Architectural Guardrails (Offline-First)

- **Read the Docs First**: You MUST read `Moneta Finance - Architecture Summary` and `DATA_FLOW.md` before modifying any sync logic, local repositories, or notification behavior.
- **Do NOT Bypass IndexedDB**: The UI (`src/app/`, `src/components/`) must ONLY read from local IndexedDB repositories for **offline-first domain data** (transactions, budgets, wallets, categories, etc.).
  - **Explicit Exceptions**: You MAY use direct server fetches/mutations for: `auth` endpoints, `export XLSX` generation, `push subscription registration`, the unified `sync push/pull` endpoints themselves, and server-scheduled `digest/reminder` web pushes.
- **Sync Loop Prevention**: When saving data pulled from the server or during hydration (Remote Apply), you MUST set `skipSyncQueue = true` and `syncStatus = "SYNCED"`. **Do not** enqueue remote-pulled data into the `sync_queue`.
- **System Notification Safety**: **Do not** trigger system notifications (`showNotification()`) from pulled server logs. Only logs generated locally by the `local-engine` should trigger device notifications.
- **Conflict Resolution Mandate**: All core entities, including `notification_settings` and `notification_logs`, MUST pass through `resolveConflict({ clientVersion, serverVersion })` during pull sync if a local `PENDING` version exists. `updatedAt` dictates the winner.
- **Push Dependency Order**: If you modify `pushChanges()` in the sync manager, you MUST respect the foreign key constraints: Wallets/Categories -> Budgets -> Transactions -> Settings -> Logs.

## 2. Structural & UI Guardrails

- **Domain Isolation**: **Do not** add complex, domain-aware components (like a `BudgetModal` or `TransactionItem`) to `src/components/ui/`. The `ui` folder is exclusively for generic primitives (buttons, inputs, charts). Use `src/components/{domain}/` instead.
- **Logic Separation**: **Do not** mix React UI rendering logic or React hooks into the database repositories (`src/lib/local-db/repositories/`) or the sync manager (`src/lib/sync/`).
- **Database Schema Immortality**: **Do not** change the Prisma database schema or the IndexedDB schema versions unless explicitly instructed and approved by the user. Schema changes require complex, coordinated migration strategies.

## 3. Frontend UI/UX Implementation Rules

**MANDATORY INSTRUCTION:** Before implementing any UI/frontend change, AI must read and follow: `docs/FRONTEND_UI_GUIDELINES.md`

**WARNING:** Frontend changes that ignore the UI guideline should be treated as non-compliant even if they compile successfully.

1. Reuse existing UI patterns before creating new ones.
2. Follow the standardized entity action pattern:
   - desktop: three-dot action menu / compact popover
   - mobile: bottom sheet
   - delete always requires confirmation
3. Do not use hover-only actions for critical operations.
4. Do not create new modal/bottom sheet patterns without checking the guideline.
5. Do not make mobile UI unnecessarily tall with stacked passive metric cards.
6. Use compact summary cards on mobile for passive metrics.
7. Popovers and bottom sheets must avoid clipping/overlap, using portal/fixed overlay pattern when needed.
8. Keep offline-first feedback visible and consistent.
9. Keep button labels consistent:
   - Add (Tambah)
   - Edit (Ubah)
   - Delete (Hapus)
   - Cancel (Batal)
   - Save (Simpan)
10. Do not bypass existing shared components unless there is a clear reason.

## 4. Tooling & Verification Rules

- **Type Safety**: After making structural changes, refactoring code, or updating models, you MUST run `npx tsc --noEmit` and ensure zero errors.
- **Case-Sensitive Renaming**: When executing case-only file renames on Windows (e.g., `hook.ts` -> `Hook.ts`), you MUST use an intermediate temporary extension (`hook.tmp.ts`) so Git accurately registers the rename.
- **No abbreviations**: Avoid domain abbreviations in new code. Use `transactions`, `notifications`, `settings`. Do not use `txn`, `notif`, or `prefs`.
