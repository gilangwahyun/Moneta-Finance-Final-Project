// ─── IndexedDB Schema & Constants ───────────────────────
// Single source of truth for the local DB structure.
// When adding new stores or indexes, bump the DB_VERSION.

export const DB_NAME = "moneta-finance";
export const DB_VERSION = 12; // v11: Add financial_targets store

export const STORES = {
  CATEGORIES: "categories",
  TRANSACTIONS: "transactions",
  BUDGETS: "budgets",
  WALLETS: "wallets",
  SYNC_META: "sync_meta",
  SYNC_QUEUE: "sync_queue",
  NOTIFICATION_INBOX: "notification_inbox",
  NOTIFICATION_LOGS: "notification_logs",
  NOTIFICATION_SETTINGS: "notification_settings",
  FINANCIAL_TARGETS: "financial_targets",
} as const;

export interface StoreSchema {
  name: string;
  keyPath: string;
  autoIncrement?: boolean;
  indexes: {
    name: string;
    keyPath: string | string[];
    options?: IDBIndexParameters;
  }[];
}

export const STORE_SCHEMAS: StoreSchema[] = [
  {
    name: STORES.CATEGORIES,
    keyPath: "clientId",
    indexes: [
      { name: "by_userId", keyPath: "userId" },
      { name: "by_syncStatus", keyPath: "syncStatus" },
      { name: "by_type", keyPath: "type" },
      { name: "by_updatedAt", keyPath: "updatedAt" },
    ],
  },
  {
    name: STORES.TRANSACTIONS,
    keyPath: "clientId",
    indexes: [
      { name: "by_userId", keyPath: "userId" },
      { name: "by_walletId", keyPath: "walletId" },
      { name: "by_categoryId", keyPath: "categoryId" },
      { name: "by_syncStatus", keyPath: "syncStatus" },
      { name: "by_date", keyPath: "date" },
      { name: "by_type", keyPath: "type" },
      { name: "by_updatedAt", keyPath: "updatedAt" },
    ],
  },
  {
    name: STORES.BUDGETS,
    keyPath: "clientId",
    indexes: [
      { name: "by_userId", keyPath: "userId" },
      { name: "by_categoryId", keyPath: "categoryId" },
      { name: "by_period", keyPath: "period" },
      { name: "by_syncStatus", keyPath: "syncStatus" },
      { name: "by_updatedAt", keyPath: "updatedAt" },
      { name: "by_userId_period", keyPath: ["userId", "period"] },
    ],
  },
  {
    name: STORES.WALLETS,
    keyPath: "clientId",
    indexes: [
      { name: "by_userId", keyPath: "userId" },
      { name: "by_syncStatus", keyPath: "syncStatus" },
      { name: "by_updatedAt", keyPath: "updatedAt" },
    ],
  },
  {
    name: STORES.SYNC_META,
    keyPath: "key",
    indexes: [],
  },
  {
    name: STORES.SYNC_QUEUE,
    keyPath: "id",
    autoIncrement: true,
    indexes: [
      { name: "by_entity", keyPath: "entity" },
      { name: "by_action", keyPath: "action" },
      { name: "by_createdAt", keyPath: "createdAt" },
      { name: "by_entity_clientId", keyPath: ["entity", "clientId"] },
    ],
  },
  {
    // ── Notification Inbox (v6) ────────────────────────
    name: STORES.NOTIFICATION_INBOX,
    keyPath: "id",
    autoIncrement: true,
    indexes: [
      { name: "by_type", keyPath: "type" },
      { name: "by_isRead", keyPath: "isRead" },
      { name: "by_createdAt", keyPath: "createdAt" },
    ],
  },
  {
    // ── Notification Logs (v7) ─────────────────────────
    // Offline-first sync capable. Research audit trail + system alerts.
    name: STORES.NOTIFICATION_LOGS,
    keyPath: "clientId",
    indexes: [
      { name: "by_userId", keyPath: "userId" },
      { name: "by_status", keyPath: "status" },
      { name: "by_createdAt", keyPath: "createdAt" },
      { name: "by_syncStatus", keyPath: "syncStatus" },
      { name: "by_dedupeKey", keyPath: "dedupeKey", options: { unique: true } },
    ],
  },
  {
    // ── Notification Settings (v10) ────────────────────────
    name: STORES.NOTIFICATION_SETTINGS,
    keyPath: "clientId",
    indexes: [
      { name: "by_userId", keyPath: "userId" },
      { name: "by_updatedAt", keyPath: "updatedAt" },
      { name: "by_syncStatus", keyPath: "syncStatus" },
    ],
  },
  {
    // ── Financial Targets (v11) ────────────────────────────
    name: STORES.FINANCIAL_TARGETS,
    keyPath: "clientId",
    indexes: [
      { name: "by_userId", keyPath: "userId" },
      { name: "by_type", keyPath: "type" },
      { name: "by_syncStatus", keyPath: "syncStatus" },
      { name: "by_updatedAt", keyPath: "updatedAt" },
      { name: "by_categoryId", keyPath: "categoryId" },
      { name: "by_walletId", keyPath: "walletId" },
    ],
  },
];
