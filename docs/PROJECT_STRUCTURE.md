# Moneta Project Structure

This document outlines the purpose, boundaries, and naming conventions for each core directory in the Moneta project to ensure consistent and maintainable architecture.

---

## 1. `src/app`

- **Purpose**: Next.js App Router root. Handles application routing, server-side API endpoints, and page-level entry points.
- **What belongs here**: `page.tsx`, `layout.tsx`, API route handlers (`route.ts`).
- **What does NOT belong here**: Reusable UI components, complex business logic, database queries.
- **Naming Convention**: Framework standard (`page.tsx`, `layout.tsx`, `route.ts`). Folders in `kebab-case`.
- **Examples**: `src/app/(dashboard)/transactions/page.tsx`, `src/app/api/sync/pull/route.ts`
- **Subdirectories**:
  - `(auth)`: Login and registration pages.
  - `(dashboard)`: Main application views including wallets, categories, transactions, budgets, targets, analytics, and notifications.
  - `api`: Backend endpoints handling auth, sync (`/sync/push`, `/sync/pull`), exports, and web push subscriptions.

## 2. `src/components`

- **Purpose**: Root directory for all React components. Divided strictly into generic UI primitives and domain-specific groupings.
- **Note**: All UI components must adhere to the standards defined in `docs/FRONTEND_UI_GUIDELINES.md`.
- **Naming Convention**: `PascalCase.tsx`
- **Examples**: `Skeletons.tsx`, `ToastProvider.tsx`

### `src/components/ui`

- **Purpose**: Dumb, generic, reusable UI primitives. These components should not know about Moneta's business logic, domains, or IndexedDB.
- **What belongs here**: Buttons, inputs, dialogs, dropdowns, form elements.
- **What does NOT belong here**: Domain-aware elements like a `TransactionItem` or `BudgetModal`.
- **Examples**: `button.tsx`, `dialog.tsx`, `input.tsx`

### `src/components/{domain}`

- **Purpose**: Domain-aware, feature-specific components.
- **What belongs here**: Complex UI elements tied to specific business domains.
  - `analytics`: Charts and insight cards.
  - `budgets`: Budget forms, rhythm indicators, reallocation modals.
  - `categories`: Category selectors, list items.
  - `notifications`: Inbox items, settings forms.
  - `targets`: Target progress cards, target creation forms.
  - `transactions`: Transaction list, transaction creation forms.
  - `wallets`: Wallet cards, transfer forms.
  - `layout`: Global shell components like Sidebar, BottomNavigation, Header.
- **What does NOT belong here**: Pure generic primitives.
- **Examples**: `src/components/transactions/TransactionItem.tsx`, `src/components/targets/TargetModal.tsx`

## 3. `src/hooks`

- **Purpose**: Custom React hooks for abstracting component logic and reacting to state/IDB changes.
- **What belongs here**: Hooks wrapping `useLiveQuery`, hydration managers, UI state hooks, specialized data fetching logic.
- **What does NOT belong here**: Direct database schema definitions.
- **Naming Convention**: `use-kebab-case.ts`
- **Examples**: `use-transactions.ts`, `use-analytics.ts`, `use-offline-sync.ts`

## 4. `src/providers`

- **Purpose**: React Context providers wrapping application sub-trees.
- **What belongs here**: Providers managing global client-side state (Theme, Auth, Toast).
- **Naming Convention**: `PascalCase.tsx`
- **Examples**: `ThemeProvider.tsx`

## 5. `src/lib/local-db`

- **Purpose**: The core IndexedDB infrastructure and migrations (the Offline-First heart of the app).
- **What belongs here**: DB initialization, schema definitions, migration scripts.
- **What does NOT belong here**: High-level React UI logic.
- **Naming Convention**: `kebab-case.ts`
- **Examples**: `index.ts`, `schema.ts`, `migrations/v5-wallet-migration.ts`

### `src/lib/local-db/repositories`

- **Purpose**: Direct CRUD operations interacting with IndexedDB.
- **What belongs here**: Repository functions to get, insert, and update specific entities.
- **Naming Convention**: Plural entity names in `kebab-case.ts`
- **Examples**: `transactions.ts`, `budgets.ts`, `notification-logs.ts`

## 6. `src/lib/sync`

- **Purpose**: The bidirectional synchronization engine logic.
- **What belongs here**: Push queue processing, pull delta merging, and conflict resolution logic.
- **What does NOT belong here**: UI rendering, direct API routing.
- **Naming Convention**: `kebab-case.ts`
- **Examples**: `sync-manager.ts`, `conflict-resolver.ts`

## 7. `src/lib/notifications`

- **Purpose**: Push notification triggers, local engine logic, and background web push helpers.
- **What belongs here**: The logic to evaluate budgets and trigger a local warning or background cron job.
- **Naming Convention**: `kebab-case.ts`
- **Examples**: `local-engine.ts`, `daily-digest.ts`

## 8. `src/lib/utils`

- **Purpose**: Pure functions, formatting helpers, and independent utility logic.
- **What belongs here**: Currency formatters, date manipulators, CSRF utilities, icons.
- **What does NOT belong here**: Database queries, React hooks.
- **Naming Convention**: `kebab-case.ts`
- **Examples**: `date-utils.ts`, `format-currency.ts`

## 9. `src/types`

- **Purpose**: Global TypeScript interfaces and types.
- **What belongs here**: Shared models, API request/response types, sync payloads.
- **Naming Convention**: `*.types.ts`
- **Examples**: `api.types.ts`, `models.types.ts`, `sync.types.ts`

## 10. `prisma`

- **Purpose**: The PostgreSQL database schema and migrations for the cloud state.
- **What belongs here**: `schema.prisma`, `migrations/`, `seed.ts`.
- **What does NOT belong here**: Frontend logic.

## 11. `tests`

- **Purpose**: End-to-End and UI testing infrastructure.
- **What belongs here**: Playwright spec files (`*.spec.ts`).
- **Note**: Only automation tests go here; manual QA checklists reside in `docs/`.

## 12. Documentation (`docs/`)

- **Purpose**: Project documentation and guidelines.
- **Key Files**:
  - `FRONTEND_UI_GUIDELINES.md` — UI/UX and styling rules.
  - `QA_CHECKLIST.md` — Comprehensive manual Black Box testing checklist.
  - `DATA_DESIGN.md` — Database ERD and IndexedDB schema definitions.
  - `AUDIT_REPORT.md` — Project health and compliance audits.
  - `RULE_BASED_INSIGHT_ENGINE.md` — Complete reference of the 30 rules implemented for Analytics Insights and Local Push Notifications.
