export const SyncEvents = {
  TRANSACTION_UPDATED: "moneta-transaction-updated",
  CATEGORY_UPDATED: "moneta-category-updated",
  BUDGET_UPDATED: "moneta-budget-updated",
  WALLET_UPDATED: "moneta-wallet-updated",
  TARGET_UPDATED: "moneta-target-updated",
  NOTIFICATION_UPDATED: "moneta-notification-updated",
  NOTIFICATION_SETTINGS_UPDATED: "moneta-notification-settings-updated",
  SYNC_COMPLETED: "moneta-sync-completed",
} as const;

export type SyncEventType = typeof SyncEvents[keyof typeof SyncEvents];
