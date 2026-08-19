//********** START: Sync Payload Types **********
//********** Defines the shape of data exchanged between the
//********** IndexedDB client and the /api/sync endpoints.
//********** END: Sync Payload Types **********

import { Category, Transaction, Budget } from "./models.types";

//********** Push (Client -> Server) **********

interface NotificationLogSyncItem {
  clientId: string;
  dedupeKey: string;
  type: string;
  title: string;
  body: string;
  severity?: string | null;
  source?: string | null;
  relatedTransactionClientId?: string | null;
  relatedCategoryId?: string | null;
  relatedBudgetId?: string | null;
  readAt?: string | null;
  dismissedAt?: string | null;
  pushedAt?: string | null;
  digestSentAt?: string | null;
  eventType?: string | null;
  deliveryModeAtCreation?: string | null;
  ctaRoute?: string | null;
  actionType?: string | null;
  ctaLabel?: string | null;
  sourceBudgetId?: string | null;
  targetBudgetId?: string | null;
  recommendedAmount?: number | null;
  categoryName?: string | null;
  usageRatio?: number | null;
  budgetLimit?: number | null;
  budgetSpent?: number | null;
  deficitAmount?: number | null;
  todayAmount?: number | null;
  comparisonAmount?: number | null;
  comparisonLabel?: string | null;
  sourceCategoryName?: string | null;
  targetCategoryName?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface NotificationSettingsSyncItem {
  clientId: string;
  isEnabled: boolean;
  deliveryMode: "INSTANT" | "BATCH" | "DIGEST" | "NONE";
  instantAlerts: boolean;
  dailyDigest: boolean;
  digestTime: string;
  dailyCap?: number | null;
  updatedAt: string;
}

export interface SyncPushPayload {
  wallets: WalletSyncItem[];
  categories: CategorySyncItem[];
  transactions: TransactionSyncItem[];
  budgets: BudgetSyncItem[];
  notification_logs?: NotificationLogSyncItem[];
  notification_settings?: NotificationSettingsSyncItem[];
  financial_targets?: FinancialTargetSyncItem[];
}

interface WalletSyncItem {
  clientId: string;
  name: string;
  type: string;
  initialBalance: number;
  updatedAt: string;
  deletedAt?: string | null;
}

interface CategorySyncItem {
  clientId: string;
  name: string;
  type: "INCOME" | "EXPENSE";
  icon?: string | null;
  color?: string | null;
  updatedAt: string; //********** ISO timestamp - used for conflict resolution
  deletedAt?: string | null;
}

interface TransactionSyncItem {
  clientId: string;
  amount: number;
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  description?: string | null;
  note?: string | null;
  date: string;
  categoryId?: string | null; //********** Optional for TRANSFER
  walletId: string; //********** client-side walletId
  targetWalletId?: string | null; //********** client-side targetWalletId
  updatedAt: string;
  deletedAt?: string | null;
}

interface BudgetSyncItem {
  clientId: string;
  amount: number;
  period: string; //********** YYYY-MM
  categoryId: string; //********** client-side categoryId
  updatedAt: string;
  deletedAt?: string | null;
}

interface FinancialTargetSyncItem {
  clientId: string;
  name: string;
  type: import("./models.types").TargetType;
  targetAmount: number;
  period: import("./models.types").TargetPeriod;
  startDate: string;
  endDate?: string | null;
  categoryId?: string | null;
  walletId?: string | null;
  isActive?: boolean;
  note?: string | null;
  updatedAt: string;
  deletedAt?: string | null;
}

//********** Pull (Server -> Client) **********

interface SyncPullParams {
  lastSyncedAt: string; //********** ISO timestamp - fetch changes after this
  limit?: number; //********** Optional: max records per entity type
}

export interface SyncPullResponse {
  wallets: import("./models.types").Wallet[];
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
  financial_targets?: import("./models.types").FinancialTarget[];
  notification_logs?: any[]; // Defined implicitly by server schema mapping
  notification_settings?: any; // Single settings object for the user
  serverTime: string; //********** Client stores this as lastSyncedAt for next pull
  hasMore: boolean; //********** True if there are more records beyond the limit
}

//********** Push Response **********

export interface SyncPushResponse {
  success: boolean;
  processedCount: number; //********** Number of records successfully processed
  synced?: {
    wallets: string[];
    categories: string[];
    transactions: string[];
    budgets: string[];
    financial_targets: string[];
    notification_logs: string[];
    notification_settings: string[];
  };
  conflicts: SyncConflict[];
  serverTime: string;
}

export interface SyncConflict {
  clientId: string;
  entity: "wallet" | "category" | "transaction" | "budget" | "financial_target" | "notification_log" | "notification_settings";
  serverVersion: import("./models.types").Wallet | Category | Transaction | Budget | import("./models.types").FinancialTarget | any;
  resolution: "server_wins" | "client_wins";
}

