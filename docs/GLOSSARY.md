# Moneta Glossary

This document defines the core terminology used across the Moneta architecture to ensure alignment among developers and AI assistants.

- **Hydration**: The initial data load process. When a user logs in (or resets local data), the app pulls historical records from the server and populates the local DB. It relies on a bounded history window (e.g., 3 months).
- **Pull Sync**: The process of fetching delta updates (changes made on other devices since `lastSyncedAt`) from the server and merging them into the local DB.
- **Push Sync**: The process of batching local offline mutations from the `sync_queue` and sending them to the server API to be permanently stored.
- **sync_queue**: A local IndexedDB store that acts as a sequential ledger of user mutations (CREATE, UPDATE, DELETE). The Sync Manager processes this queue to execute Push Syncs.
- **Local Mutation**: A user action (e.g., creating a transaction) that updates the local DB and is immediately added to the `sync_queue` to await pushing.
- **Remote Apply**: The act of taking data received from the server (via Pull Sync or Hydration) and writing it to the local DB _without_ adding it to the `sync_queue`.
- **IndexedDB Working Copy**: The local, offline-capable database that serves as the immediate source of truth for the React UI. The UI reads ONLY from this copy.
- **notification_settings**: The user's preferences for alerts (e.g., enable/disable, instant vs batch delivery). Stored locally in IDB and synced to the server.
- **notification_logs**: The actual historical records of generated alerts (e.g., "Budget Exceeded"). Synced across devices so the user sees a consistent inbox history.
- **Financial Target / Target Finansial**: A user-defined financial goal focused on income achievement (Target Pemasukan) that operates independently of strict budgets and is evaluated in real-time on the device using IndexedDB without storing a hardcoded current balance. Unlike Budgets (Anggaran) which limit expenses, Financial Targets are specifically for tracking positive cash flows.
- **notification_subscriptions**: Device-specific web-push tokens mapped to the user. These are never hydrated across devices because a browser token is unique to that specific hardware/browser installation.
- **In-App Notification**: A visual alert rendered purely within the Moneta React UI (e.g., via sonner toasts or an inbox dropdown).
- **System Notification**: A native OS-level notification fired via the browser's Service Worker (`showNotification()`).
- **Server Web Push**: A notification triggered externally by a server-side CRON job or digest script, reaching the user even when the PWA is closed.
- **Nudge**: A gentle notification recommending a positive action or informing the user of general status without implying danger.
- **Recommendation**: Analytical insights served to the user based on spending patterns, designed to improve financial health.
- **clientId**: A robust UUID generated entirely on the client during a local mutation. It serves as the primary anchor for syncing records between IndexedDB and PostgreSQL.
- **serverId**: The internal PostgreSQL ID. It serves as the primary database identifier, though the system heavily relies on `clientId` for offline sync logic.
- **dedupeKey**: A deterministic string (e.g., `BUDGET_USAGE:userId:budgetId:YYYY-MM:WARNING`) used to prevent the system from firing duplicate notification logs for the same recurring event threshold.
- **syncStatus**: An enum field on records (`PENDING`, `SYNCED`, `CONFLICT`) indicating whether a local record has been successfully acknowledged by the server. Deletions are handled via a `deletedAt` timestamp flag rather than a dedicated deletion status.

## Frontend UI/UX Terminology

- **Action Menu**: A compact menu that displays secondary actions such as Edit and Delete on a data item.
- **Bottom Sheet**: An action panel that slides up from the bottom of the screen on mobile devices.
- **Delete Confirmation**: A warning dialog requiring explicit user confirmation before deleting important data.
- **Compact Summary Card**: A compact card on mobile interfaces that displays passive information without taking up much vertical space.
- **Empty State**: A specialized visual state when a list or page has no data to display, often accompanied by instructions to create the first piece of data.
- **Sync Status**: A visual indicator in the UI that informs the user whether local changes are pending, syncing, successfully synced, or failed.
- **Offline-first UI**: An interface designed to respond to user actions instantly with local data, without waiting for a connection or server response.
- **Popover**: A floating menu box in the desktop version that appears near a trigger button.
- **Portal Overlay**: A rendering technique for overlay components (like popovers or modals) outside the parent element structure so they are not clipped by containers with overflow boundaries.
- **Responsive Layout**: Interface design that adapts smoothly from a wide view on desktop (e.g., with a sidebar) to a compact view on mobile devices (e.g., with bottom navigation).
