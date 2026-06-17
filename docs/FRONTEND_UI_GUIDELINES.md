# Moneta Frontend UI/UX Guidelines

## 1. Purpose
This document serves as the single source of truth for the UI/UX of the Moneta application. Any future interface changes, new features, or AI-generated implementations must reference and adhere to these guidelines to ensure visual and interaction consistency across the application.

## 2. Design Principles
- **Local-First Feedback:** The UI must respond to user actions immediately without waiting for server confirmation (optimistic UI), with sync status indicators operating in the background.
- **Clear Hierarchy:** Use typography size, font weight, and color to distinguish primary information from secondary details.
- **Compact Mobile Layout:** Avoid excessive whitespace on mobile views to maximize the information visible on the screen without requiring excessive scrolling.
- **Consistent Action Patterns:** Buttons, context menus, and confirmations must always be located in predictable places and formats.
- **Non-intrusive Notifications:** Use status badges or small indicators rather than large pop-ups that block content.
- **Avoid Hidden Critical Actions:** Actions like "Delete" must never only appear on *hover*. There must always be a clear button or menu (e.g., three-dot icon).
- **Reduce Cognitive Load:** Use simple language, provide data summaries, and group relevant information together.

## 3. Page Layout Standards
- **Dashboard Layout:**
  - **Desktop (md+):** Uses a fixed left Sidebar with a collapsed option. Standard sidebar width is 64 (256px), collapsed is 16 (64px). Main content fills the remaining space on the right.
  - **Mobile:** Uses a fixed Bottom Navigation Bar with 5 main menus. Static top header with logo, status indicators, and profile/notification access.
- **Content Width:** Content is wrapped in a centered container with `max-w-5xl`.
- **Page Title Placement:** Page title (H1) and subtitle are placed at the top of the page (Page Header), typically left-aligned.
- **Primary Action Button:** Placed in the top right corner aligned with the page title (Desktop) or using a Speed Dial FAB (Floating Action Button) in the bottom right corner (Mobile).

## 4. Card and Container Standards
- **Background:** `bg-white` for light mode, `dark:bg-slate-900` or `dark:bg-slate-800/50` for dark mode.
- **Border:** `border border-slate-200 dark:border-slate-800`.
- **Radius:** Use `rounded-2xl`, or `rounded-xl` for smaller card elements.
- **Padding:** Standard is `p-4` or `p-5`. For compact cards, use `p-3`.
- **Spacing:** Standard gap between cards is `gap-4`.
- **Hover/Pressed State:** If interactive, use `hover:shadow-md transition-all active:scale-[0.98]` and a slight background color change.
- **Interactive vs Non-interactive:** Interactive cards must have a pointer cursor and clear hover effects. Static cards must have no visual changes when touched or hovered.

## 5. Typography and Content Hierarchy
- **Page Title:** `text-2xl font-bold text-slate-900 dark:text-white`.
- **Section Title:** `text-lg font-bold text-slate-800 dark:text-slate-100`.
- **Card Title:** `text-base font-semibold`.
- **Label:** `text-sm font-medium text-slate-500 dark:text-slate-400`.
- **Main Value:** Large bold numbers (e.g., `text-3xl font-bold` untuk layar besar, atau `text-base md:text-base` untuk baris metrik kompak di mobile).
- **Subtext:** `text-xs text-slate-400 dark:text-slate-500`.
- **Helper Text:** `text-xs text-slate-500` beneath form inputs.
- **Empty State Wording:** Use a friendly and instructive tone (e.g., "No transactions this month," with instructions on how to add one).

## 6. Color and Semantic State
- **Primary Accent:** Indigo (`indigo-600` light, `indigo-500` dark).
- **Income/Success:** Emerald green (`text-emerald-600 dark:text-emerald-500` or `bg-emerald-50`).
- **Expense/Destructive:** Rose red (`text-rose-600 dark:text-rose-500` or `bg-rose-50`).
- **Warning:** Amber/Yellow (`text-amber-500`).
- **Info:** Blue (`text-blue-500`) or muted Slate/Indigo.
- **Muted Text:** `text-slate-500 dark:text-slate-400`.
- **Sync Status Colors:** Emerald for synced, Amber/Yellow for pending, spinning Blue for syncing, Red for failed/quarantined.
- **Budget Status Colors (Pengeluaran):** Emerald (safe < 75%), Amber/Yellow (nearing limit 75-90%), Rose/Red (exceeded > 90%).
- **Target Status Colors (Pemasukan):** Emerald (Tercapai), Amber/Yellow (Hampir Tercapai), Slate (Belum Tercapai).

## 7. Buttons and CTA
- **Primary Button:** Background `bg-indigo-600`, white text, font-semibold, with a subtle shadow (`shadow-md shadow-indigo-500/20`).
- **Secondary Button:** Transparent background with `border-slate-200`, text `slate-700` (light mode), or gray background variant `bg-slate-100`.
- **Destructive Button:** Background `bg-rose-600` or text `text-rose-600` with transparent background.
- **Icon Button:** Circular or square (`h-8 w-8` or `h-10 w-10`), centered icon. Must have an accessibility label (`aria-label`).
- **Disabled State:** 50% opacity (`opacity-50`) and not-allowed cursor (`cursor-not-allowed`).
- **Loading State:** Replace icon or text with a spinner (`animate-spin`).
- **Mobile Tap Target:** Ensure interactive elements have a physical click area of at least `44x44px` even if visually smaller.

## 8. Forms, Modals, and Bottom Sheets
- **Create/Edit Entity:** Use a *Modal* (dialog) on Desktop and a *Bottom Sheet* on Mobile.
- **Bottom Sheet Rules (Mobile):** Appears from the bottom with animation (`slide-in-from-bottom`), dark overlay background (`bg-black/40` and up), and handles the bottom safe area (`pb-safe`).
- **Modal Rules (Desktop):** Centered on screen, heavy shadow (`shadow-2xl`), fully rounded borders, can be closed by clicking the overlay or pressing ESC.
- **Input Spacing:** Use `space-y-4` between form elements.
- **Validation Message Style:** Small red text (`text-xs text-rose-500`) directly below the relevant input.
- **Submit/Cancel Placement:** In a single row at the bottom (or stacked in bottom sheets). Submit button on the right/top, Cancel button on the left/bottom.

## 9. Entity Action Pattern
Standardized for: Transactions, Budgets, Wallets, and Categories.
- **Edit/Delete Action (Standard):**
  - **Desktop:** Floating popover menu (using horizontal three-dot icon).
  - **Mobile:** Opens a Bottom Sheet containing large, easily clickable action options.
- **Edit Action:** Always opens a form within a Modal (Desktop) or Sheet (Mobile).
- **Delete Action:** Always opens a confirmation dialog.
- **Important:** Action features must never only be accessible via *hover*. *Hover* is not supported on touchscreens.
- **Critical Actions:** Must always have an accessible fallback path (e.g., entering transaction details then finding a delete option).
- **Clipping Prevention:** Popovers and Bottom Sheets should be rendered using a Portal (`createPortal` to `document.body`) or handled with `fixed` positioning to avoid being clipped by parent containers with `overflow-hidden`.

## 10. Delete Confirmation Standards
Used when deleting: Transaction, Budget, Wallet, or Category.
- **No Instant Delete:** Never delete important data immediately upon the first click.
- **Confirmation Required:** Use the `DeleteConfirmDialog` component (Modal on desktop, Bottom Sheet on mobile).
- **Local-First Behavior:** Deletion occurs instantly in local state (IndexedDB) and the UI updates immediately (optimistic update), while the server deletion request is queued (sync queue).
- **Wording:**
  - Title: "Delete [Entity Name]?" (e.g., "Delete Transaction?")
  - Warning message: Ensure the impact of deletion is communicated (e.g., "This action cannot be undone" or "Wallet balance will be adjusted").
  - Confirm Button: Red ("Yes, Delete"). Cancel Button: Standard secondary.

## 11. Summary Metrics Pattern
- **Desktop:** May use separate card components aligned horizontally (column grid) to display metrics like Total Income, Total Expense.
- **Mobile:** Use a single compact card (Compact Summary Card) for passive information. Avoid stacking 3 or more large metric cards vertically, as it consumes screen space before the main content is visible.
- Avoid overly long helper text (subtext) on compact metrics.

## 12. Analytics and Insight UI
- **Insight Cards:** Displays system findings (e.g., a sharp increase in expenses).
- **Severity Styling:** Use icons and light background colors corresponding to the warning level (green for positive, yellow/red for negative).
- **Data-Driven Wording:** Insight wording must be dynamic based on actual numbers ("Food expenses increased by 20%"), do not hard-code category assumptions in the UI.
- **Interaction Hints:** Charts must have visual hints if they can be clicked/touched.
- **Clickable Categories:** Category detail rows must look interactive (e.g., with hover effects or arrows) if they lead to further details.

## 13. Notification UI
- **Notification List Style:** Icon on the left, bold title, small relative time on the right/bottom.
- **Read/Unread State:** Unread notifications must have a visual marker (e.g., an indigo dot or slightly different background).
- **Notification Settings Pattern:** Preference settings (in the Profile section) use standard toggle switches.
- **Tiering Explanation:** If paid/free notification limits apply, use limit labels or brief explanations.
- **Local vs System Distinction:** The UI does not need to explicitly distinguish this for the user unless it is useful (e.g., sync failures).

## 14. Sync Status UI
- **Synced:** Cloud icon or green/gray checkmark.
- **Syncing:** Spinning blue/indigo sync icon.
- **Pending:** Cloud icon with a dot, or amber color (indicating un-synced data on the device).
- **Failed/Quarantined:** Red warning icon.
- **User-Friendly Wording:** Do not use backend technical jargon. Use "Saved to device," "Data synced," or "Waiting for connection."
- **Diagnostics:** Do not clutter the screen with technical logs, but provide an option (e.g., in a dedicated panel or profile page) to view details if persistent issues occur.

## 15. Empty, Loading, and Error States
- **Empty State Format:** Consists of a central illustration/large gray icon, a friendly bold title, short explanatory text, and (optional) a primary button to create the first entity.
- **Loading Skeleton Use:** Use animated shimmer UI skeletons instead of circular spinners when loading lists (transactions, budgets) for a smoother experience and to prevent UI jumping.
- **Error Message Style:** Reddish (rose) background box with a warning icon and a retry option.
- **Offline State Wording:** Avoid claiming "Connection Error," instead use "You are offline. Changes will be saved to your device."
- **Initial Hydration Empty State:** If the app is loading the initial IndexedDB, show a pulsing Moneta logo or a friendly message "Setting up your data."

## 16. Responsive Behavior
- **Mobile-First Constraints:** Design new features considering mobile screen sizes first.
- Avoid stacking many vertical cards on mobile that require excessive scrolling before reaching the page's core content.
- **No Hover-Only Interactions:** All functionality must be accessible via touch/tap.
- **Bottom Navigation Safe Area:** Ensure elements at the very bottom of the page (especially the last list item) are not obscured by the bottom navigation. Use `pb-20` or equivalent on the main container on mobile.
- **Desktop Sidebar Behavior:** The sidebar should remain fixed. A collapsed feature is allowed.
- **Compact Layout:** Use compact row tables or small chips for passive information on mobile.
- **Responsive Filter UI:** Mobile uses a standardized `FilterBottomSheet` (compact trigger buttons, full-width option rows, check icons for active state) to prevent horizontal overflow. Desktop/tablet use segmented controls, pills, or wider filter controls. Both viewports share the same underlying filter state. 
  - *Example:* The Budget status filter ("Semua Status", "Aman", "Mendekati Batas", "Melebihi Batas") uses a bottom sheet on mobile to prevent long labels from causing horizontal overflow.
  - *Example:* The Transaction period filter supports "Hari Ini" (using local browser date logic), "Semua Waktu" (disabling the date filter), and other ranges, alongside a functional reset action.

## 17. Accessibility Rules
- **Accessibility Improvements:** Implementations should adhere to fundamental accessibility standards. Avoid viewport zoom restrictions (never use `user-scalable="no"` or `maximum-scale=1`).
- **Color Contrast:** Maintain sufficient color contrast for muted/secondary text in both light and dark modes. Use standardized low-contrast text classes.
- **ARIA Attributes:** Always use `aria-label` for icons or buttons without text (especially icon-only action buttons, theme toggles, and sidebar expand/collapse buttons). Use `aria-expanded` and `aria-controls` for collapsible sections.
- **Dialogs & Bottom Sheets:** Ensure bottom sheets and dialogs use appropriate attributes like `role="dialog"`, `aria-modal="true"`, and `aria-labelledby`.
- Ensure basic interactions are supported by the keyboard (Tab navigation).
- **Focus Management:** Safely return focus when confirmation dialogs or pop-up forms are closed.
- Color should not be the **only** indicator of status. Use distinct text or icons (e.g., in addition to green, add the text "Success").
- Tap targets must be a minimum of 44x44 pixels on touch screens.
- Modals and popovers must always be dismissible via clicking outside the element (backdrop).

## 18. Performance & Core Web Vitals (Lighthouse)
- **Cumulative Layout Shift (CLS):** UI implementations must prioritize layout stability to maintain Core Web Vitals in the green range (as verified on Dashboard, Notifications, Transactions, Budgets, and Analytics pages).
- **Skeleton Loaders & Reserved Space:** Reserve accurate space for asynchronous components before IndexedDB/API data finishes loading. Loading skeletons (e.g., Budget health/status cards, compact stat cards, urgent category lists) must visually match the height and dimensions of the final loaded content to prevent layout jumps.
- **State Consistency:** Ensure loading, empty, and loaded states use consistent layout dimensions. Avoid rendering large sections from empty space dynamically without a placeholder.

## 19. AI Implementation Do and Don't

**Do:**
- Always **reuse existing UI patterns** and components (like `EntityActionMenu`, `DeleteConfirmDialog`, form inputs) rather than creating new ones from scratch.
- **Follow the action menu standard** for edit/delete.
- **Keep the mobile layout compact** and informative without wasting space.
- Use **semantic colors** (Indigo, Emerald, Rose, Amber) configured via standard Moneta Tailwind classes.
- Keep **offline-first behavior and local state indicators** visible (e.g., Sync badge).
- Always assume the application will be tested on both **desktop and mobile**.

**Don't:**
- **Don't** create new modal patterns or styles without a strong reason if a dialog/sheet already exists.
- **Don't** rely on *hover* for critical actions.
- **Don't** delete immediately without providing the standard confirmation dialog.
- **Don't** add 3+ large vertical metric cards on the mobile view.
- **Don't** hard-code analytic texts or financial advice that ignores actual user metrics.
- **Don't** bypass existing UI components; (Use `src/components/ui/` rather than raw HTML elements constantly).
- **Don't** introduce inconsistent action button labels (Stick to "Edit", "Delete", "Save", "Cancel").
- **Don't** tie UI updates to waiting for server responses; the UI must update local data instantly (Local-First).
- **Don't** use semi-transparent overlays that visually mix or confusingly blur with the content behind them (use appropriate contrast/blur).
- **Don't** place static (non-portal) Popovers/Dropdown menus inside list containers with `overflow-hidden` styles, as the menu will be clipped. Always use Portals.

## 19. Verification Checklist for Future UI Changes
Before submitting/merging UI changes, ensure to check:
- [ ] Desktop layout is checked and proportional.
- [ ] Mobile layout is checked and does not unnecessarily stack elements.
- [ ] Action menus on new entities follow standards (Portal, Bottom Sheet on mobile).
- [ ] Delete confirmation (Delete Dialog) is used on new entities.
- [ ] UI changes operate smoothly in offline conditions (Optimistic updates / Local-first).
- [ ] Sync status indicators are unaffected or function reasonably.
- [ ] Form elements and buttons have accessibility tags (`aria-label`) if necessary.
- [ ] No visual clipping or unnatural overlapping occurs between popup menus and parent containers.
- [ ] TypeScript checks run without error messages (`npx tsc --noEmit`).
- [ ] `npm run build` succeeds without UI errors.
