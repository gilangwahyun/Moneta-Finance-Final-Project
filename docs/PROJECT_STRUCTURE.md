# Moneta Project Structure

This document outlines the purpose, boundaries, and naming conventions for each core directory in the Moneta project to ensure consistent and maintainable architecture.

---

## 1. `src/app`

- **Purpose**: Next.js App Router root. Handles application routing, server-side API endpoints, and page-level entry points.
- **What belongs here**: `page.tsx`, `layout.tsx`, API route handlers (`route.ts`).
- **What does NOT belong here**: Reusable UI components, complex business logic, database queries.
- **Naming Convention**: Framework standard (`page.tsx`, `layout.tsx`, `route.ts`). Folders in `kebab-case`.
- **Examples**: `src/app/(dashboard)/transactions/page.tsx`, `src/app/api/sync/pull/route.ts`

## 2. `src/components`

- **Purpose**: Root directory for all React components. Divided strictly into generic UI primitives and domain-specific groupings.
- **Note**: All UI components must adhere to the standards defined in `docs/FRONTEND_UI_GUIDELINES.md`.
- **Naming Convention**: `PascalCase.tsx`
- **Examples**: `NetworkStatusBadge.tsx`

### `src/components/ui`

- **Purpose**: Dumb, generic, reusable UI primitives. These components should not know about Moneta's business logic, domains, or IndexedDB.
- **What belongs here**: Buttons, inputs, generic unconfigured chart primitives (e.g., a base Recharts component), time filters without domain hooks.
- **What does NOT belong here**: Domain-aware elements like a `TransactionItem`, `BudgetModal`, or domain-configured charts (e.g., `SpendingAnalyticsChart`).
- **Examples**: `DonutChart.tsx`, `SegmentedControl.tsx`

### `src/components/{domain}`

- **Purpose**: Domain-aware, feature-specific components.
- **What belongs here**: Complex UI elements tied to specific business domains (`transactions`, `budgets`, `analytics`, `categories`, `wallets`, `notifications`, `targets`).
- **What does NOT belong here**: Pure generic primitives.
- **Examples**: `src/components/transactions/TransactionItem.tsx`, `src/components/targets/TargetModal.tsx`

## 3. `src/hooks`

- **Purpose**: Custom React hooks for abstracting component logic and reacting to state/IDB changes.
- **What belongs here**: Hooks wrapping `useLiveQuery`, hydration managers, UI state hooks.
- **What does NOT belong here**: Direct database schema definitions, pure non-React utility functions.
- **Naming Convention**: `use-kebab-case.ts`
- **Examples**: `use-transactions.ts`, `use-analytics.ts`

## 4. `src/providers`

- **Purpose**: React Context providers wrapping application sub-trees.
- **What belongs here**: Providers managing global client-side state (Theme, Sync, Global Time Filters).
- **Naming Convention**: `PascalCase.tsx`
- **Examples**: `SyncProvider.tsx`, `TransactionFormProvider.tsx`

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

## 10. Constants (`src/lib/utils/constants.ts`)

- **Purpose**: Application-wide static definitions.
- **What belongs here**: Store names, version numbers, route paths, configuration objects.

## 11. Documentation (`docs/`)

- **Purpose**: Project documentation and guidelines.
- **Key Files**:
  - `docs/FRONTEND_UI_GUIDELINES.md` — Standard guidelines for Moneta's frontend UI/UX, including layout patterns, cards, buttons, forms, modals, bottom sheets, action menus, and responsive behavior. Contains visual standards, interaction patterns, accessibility rules, and future AI implementation guardrails.
