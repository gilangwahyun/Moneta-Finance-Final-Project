# Comprehensive QA Verification Checklist (Black Box Testing)

This document serves as the comprehensive manual verification checklist for Moneta Finance. It is designed for complete black-box testing covering all functional areas of the application, including offline capabilities, edge cases, and detailed UI interactions. 

> Note: Do not include Playwright or automation testing frameworks in this manual checklist.

---

## 1. Authentication & User Management
- [ ] **Registration**: User can register with a valid email and username.
- [ ] **Registration Errors**: System rejects duplicate emails/usernames and weak passwords.
- [ ] **Login**: User can login successfully.
- [ ] **Login Errors**: System rejects invalid credentials.
- [ ] **Session**: User session persists across page reloads.
- [ ] **Logout**: User can log out; data is cleared securely, and user is redirected to login.

## 2. Core Entities (Offline & Online CRUD)

### 2.1. Wallets (Dompet)
- [ ] **Create**: User can create a new wallet (Tunai, Bank, E-Wallet, Investasi, Lainnya).
- [ ] **Validation**: Wallet name cannot be empty.
- [ ] **Edit**: User can edit wallet details.
- [ ] **Delete**: User can de
- [ ] **Delete Constraint**: Deleting a wallet with transactions triggers a warning and resolves correctly.
- [ ] **Balance Calculation**: Wallet balance correctly reflects initial balance + Income - Expenses + Incoming Transfers - Outgoing Transfers.
- [ ] **Quick Transfer**: User can click the "Transfer" button directly on the Wallet Management page (WalletWidget) to initiate a transfer between wallets.
- [ ] **Hide Balance (HiddenBalanceWidget)**: User can toggle the visibility of wallet balances (eye icon) to hide/show sensitive financial figures across the dashboard.
- [ ] **Offline**: Wallet CRUD works smoothly when network is disconnected. Sync status updates to `PENDING`.

## 2. Core Entities (Offline & Online CRUD)

### 2.1. Wallets (Dompet)
- [ ] **Create**: User can create a new wallet (Tunai, Bank, E-Wallet, Investasi, Lainnya).
- [ ] **Validation**: Wallet name cannot be empty.
- [ ] **Edit**: User can edit wallet details.
- [ ] **Delete**: User can delete a wallet.
- [ ] **Delete Constraint**: Deleting a wallet with transactions triggers a warning and resolves correctly.
- [ ] **Balance Calculation**: Wallet balance correctly reflects initial balance + Income - Expenses + Incoming Transfers - Outgoing Transfers.
- [ ] **Quick Transfer**: User can click the "Transfer" button directly on the Wallet Management page (WalletWidget) to initiate a transfer between wallets.
- [ ] **Hide Balance (HiddenBalanceWidget)**: User can toggle the visibility of wallet balances (eye icon) to hide/show sensitive financial figures across the dashboard.
- [ ] **Offline**: Wallet CRUD works smoothly when network is disconnected. Sync status updates to `PENDING`.

### 2.2. Categories (Kategori)
- [x] **Create**: User can create an Income or Expense category with specific icons and colors.
- [x] **Quick Add from Transaction**: User can create a new category *directly* from the Transaction Modal without navigating away to the Categories page (CategoryBuilder/CategoryPickerSheet).
- [x] **Default Categories**: New users automatically receive default categories.
- [x] **Edit**: User can edit custom category details.
- [x] **Delete**: User can delete custom categories.
- [x] **Offline**: Category CRUD works instantly offline and syncs upon reconnection.

### 2.3. Transactions (Transaksi)
- [ ] **Create Income**: Adds correctly to the selected wallet and Income category.
- [ ] **Create Expense**: Deducts correctly from the selected wallet and Expense category.
- [ ] **Create Transfer**: Deducts from source wallet, adds to destination wallet.
- [ ] **Transfer Constraint**: Source and Destination wallets cannot be the same.
- [ ] **Transfer Exclusion**: Transfers do NOT affect total Income, total Expense, or Budget usage.
- [ ] **Edit**: Updating amounts or dates reflects instantly across Wallet balances and Budgets.
- [ ] **Delete**: Deleting a transaction reverses its effect on the wallet balance and budget usage.
- [ ] **Offline**: Transaction CRUD works seamlessly without network connection.

### 2.4. Budgets (Anggaran)
- [ ] **Create**: Set a monthly limit for a specific Expense category.
- [ ] **Constraint**: Cannot create duplicate budgets for the same category in the same month.
- [ ] **Progress/Usage**: Budget usage correctly sums all Expense transactions for that category and month.
- [ ] **Rhythm Status & Urgent Indicators**: The Budget Health Bar correctly indicates if spending is "Aman", "Mendekati Batas", or "Melebihi Batas". Urgent Budget Progress Bar displays appropriately for critical budgets.
- [ ] **Reallocation (Subsidi Silang Modal)**: User can transfer budget limits from one category to another using the ReallocateModal.
- [ ] **Reallocation Constraints**: Target category cannot be the same as source. Amount cannot exceed source's remaining limit.
- [ ] **Edit/Delete**: Updating budget limits updates the progress UI.
- [ ] **Offline**: All budget actions, including reallocation, work offline.

### 2.5. Financial Targets (Target Keuangan)
- [ ] **Create Target**: User can set Income, Saving, or Balance targets.
- [ ] **Period Setup**: User can choose Daily, Weekly, Monthly, or Custom periods (with start/end dates).
- [ ] **Scope**: Target can be scoped to all transactions, or restricted to a specific Wallet/Category.
- [ ] **Progress (Income Target)**: Only counts INCOME transactions within the specified period.
- [ ] **Progress (Saving Target)**: Calculates Income - Expense within the period.
- [ ] **Progress (Balance Target)**: Evaluates the total balance of the specified wallet.
- [ ] **Target Completion**: Progress correctly displays 100% when achieved.
- [ ] **Offline**: Target creation and dynamic progress calculation works entirely offline via IndexedDB.

## 3. Analytics & Export

### 3.1. Analytics Dashboard (Insight & Charts)
- [x] **Time Filters (AnalyticsTimeFilter)**: Filters (Today, This Week, This Month, All Time, Custom Range) correctly alter the displayed data on the Dashboard and Analytics pages.
- [x] **Charts**: SpendingAnalyticsChart and BarTrendChart render without crashing and update dynamically based on filters.
- [x] **Comparative Analytics Widget**: Displays comparisons between the current period and the previous period (e.g., this month vs last month) correctly.
- [x] **Category Drilldown Drawer**: Clicking on a section of the Donut Chart or a category in the adjacent list opens a Bottom Sheet / Drawer (`CategoryDrilldownDrawer`) showing the detailed list of individual transactions for that specific category.
- [ ] **Insights Engine**: Dashboard generates relevant insights based on transaction history (evaluating 30 different rules).
- [ ] **Insight Priority**: Critical insights (red) always bypass the UI limits and appear at the top.
- [ ] **Insight Fatigue Mitigation**: The UI limits default visible insights to a maximum of 3 (excluding criticals) to prevent cognitive overload.
- [ ] **Insight Expansion**: The "Lihat insight lainnya..." button successfully expands the hidden insights and collapses them back smoothly.
- [ ] **Historical Rules**: Simulating transactions across a 3-month window successfully triggers historical rules (e.g., Target Streak, Category Creep).

### 3.2. Export Data
- [x] **Export (XLSX)**: User can export filtered transaction data.
- [x] **Export Content**: The downloaded Excel file contains correct columns (Date, Type, Category, Wallet, Amount, Note) and accurate values.

## 4. Notifications & Background Processing

### 4.1. Notification Engine & Tiers
- [ ] **Thresholds**: Creating an expense triggers a warning if it passes 20%, 50%, or 100% of the budget.
- [ ] **Deduplication**: The exact same threshold alert for the same budget in the same month only triggers ONCE.
- [ ] **Inbox Logs**: Triggered alerts appear immediately in the Notification Inbox page.
- [ ] **Read State**: User can mark notifications as read.
- [ ] **Action/CTA**: Clicking a notification navigates the user to the correct related page (e.g., Budgets, Analytics).

### 4.2. Settings & Delivery Modes
- [ ] **Delivery Modes**: User can switch between OFF, INSTANT, and DIGEST modes.
- [ ] **OFF Mode**: Alerts are logged in the inbox but do not trigger an OS-level push notification.
- [ ] **INSTANT Mode**: Alerts trigger an OS-level push notification immediately.
- [ ] **Daily Cap**: If INSTANT mode is capped (e.g., max 3/day), the 4th alert only appears in the inbox, suppressing the OS push.
- [ ] **DIGEST Mode**: Alerts are grouped and a single summary push is sent at the configured daily time.
- [ ] **Push Subscription**: Browser prompts for notification permissions and successfully registers the endpoint.

## 5. Offline-First Architecture & Sync Edge Cases
- [ ] **Service Worker (PWA)**: The app can be loaded while the browser network is completely offline (using cached shell).
- [ ] **Local-First Feedback**: All UI changes (create, edit, delete) reflect in milliseconds, regardless of network speed.
- [ ] **Sync Status Indicators**: Visual badges accurately show 'SYNCED' (green check), 'PENDING' (amber dot), or 'SYNCING' (spinner).
- [ ] **Push Sync After Reconnect**: After performing offline actions, restoring the network automatically pushes all pending changes to the server.
- [ ] **Hydration**: Clearing IndexedDB and reloading the page successfully pulls all remote data back into the local DB.
- [ ] **Multi-Device Pull**: Changing data on Device A automatically reflects on Device B after a pull sync cycle.
- [ ] **Conflict Safety**: Local 'PENDING' changes on Device A are not overwritten by pulls from Device B until Device A's changes are pushed.

## 6. Frontend UI/UX Regressions
- [ ] **Responsive Design**: Mobile layout uses Bottom Sheet for forms/actions; Desktop layout uses Modals/Popovers.
- [ ] **No Visual Clipping**: Popovers and dropdowns are not cut off by hidden overflow containers.
- [ ] **Action Menus**: Edit/Delete menus are accessible via click/tap (no hover-only dependencies).
- [ ] **Delete Confirmation**: Every destructive action prompts a confirmation dialog before proceeding.
- [ ] **Empty States**: Pages with no data display friendly illustrations/text and a clear CTA button.
- [ ] **Loading States**: Skeletons are used during initial loads instead of layout-jumping spinners.
- [ ] **Dark Mode**: UI looks consistent, readable, and contrasts properly in Dark Theme.

## 7. Performance & Web Vitals
- [ ] **No Layout Jumps (CLS)**: The dashboard loads smoothly without widgets violently shifting position as data resolves.
- [ ] **Heavy Load Test**: Add 100+ transactions and ensure the UI remains responsive, scrolling is smooth, and sync does not lock up the browser.
