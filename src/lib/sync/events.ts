/********** Imports **********/

/********** Constants **********/

/********** Daftar nama event custom yang digunakan untuk menginformasikan UI
 *  bahwa ada perubahan data dari hasil sync. Setiap modul yang perlu merespons
 *  perubahan data cukup listen ke event ini lewat window.addEventListener.
 */
export const SyncEvents = {
  TRANSACTION_UPDATED: 'moneta-transaction-updated',
  CATEGORY_UPDATED: 'moneta-category-updated',
  BUDGET_UPDATED: 'moneta-budget-updated',
  WALLET_UPDATED: 'moneta-wallet-updated',
  TARGET_UPDATED: 'moneta-target-updated',
  NOTIFICATION_UPDATED: 'moneta-notification-updated',
  NOTIFICATION_SETTINGS_UPDATED: 'moneta-notification-settings-updated',
  SYNC_COMPLETED: 'moneta-sync-completed',
} as const;

/********** Exports **********/

type SyncEventType = typeof SyncEvents[keyof typeof SyncEvents];
