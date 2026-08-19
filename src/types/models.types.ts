//********** START: Shared Entity Interfaces **********
//********** These mirror the Prisma schema and are used on both
//********** client (IndexedDB) and server (API payloads).
//********** END: Shared Entity Interfaces **********

type SyncStatus = "SYNCED" | "PENDING" | "CONFLICT";

//********** TRANSFER: money moved between wallets - excluded from P&L calculations
export type TransactionType = "INCOME" | "EXPENSE" | "TRANSFER";

export type CategoryType = "INCOME" | "EXPENSE";

export type WalletType = "TUNAI" | "BANK" | "E_WALLET" | "INVESTASI" | "LAINNYA";

export type TargetType = "INCOME_TARGET" | "SAVING_TARGET" | "BALANCE_TARGET";

export type TargetPeriod = "DAILY" | "WEEKLY" | "MONTHLY" | "CUSTOM";

//********** Base sync metadata (every data entity includes this) **********

interface SyncMetadata {
  clientId: string; //********** UUID generated on the client
  syncStatus: SyncStatus;
  createdAt: string; //********** ISO 8601
  updatedAt: string; //********** ISO 8601
  deletedAt: string | null; //********** Soft delete
}

//********** User **********

export interface User {
  id: string;
  email: string;
  username: string;
  createdAt: string;
  updatedAt: string;
}

//********** START: Wallet **********
//********** Represents a financial account (cash, bank, e-wallet, etc.)
//********** Balance is ALWAYS calculated - never stored as a static field.
//********** Calculated balance = initialBalance + SUM(INCOME) - SUM(EXPENSE)
//**********                    + SUM(transfer_in) - SUM(transfer_out)
//********** END: Wallet **********

export interface Wallet extends SyncMetadata {
  id?: string;          //********** Server-assigned; absent until first sync
  name: string;         //********** e.g. "BCA", "GoPay", "Dompet Tunai"
  type: WalletType;
  initialBalance: number; //********** Seed balance at wallet creation time
  userId: string;
}

//********** Category **********

export interface Category extends SyncMetadata {
  id?: string;
  name: string;
  type: CategoryType;
  icon?: string | null;
  color?: string | null;
  isDefault: boolean;
  userId: string;
}

interface NotificationSettings {
  id?: string;
  deliveryMode: string;
  instantAlerts: boolean;
  dailyDigest: boolean;
  dailyReminder: boolean;
  digestTime: string;
}

//********** Transaction **********

export interface Transaction extends SyncMetadata {
  id?: string;
  amount: number;
  type: TransactionType;
  description?: string | null;
  note?: string | null;
  date: string;               //********** ISO 8601 date (YYYY-MM-DD)
  walletId: string;           //********** REQUIRED - source wallet clientId
  targetWalletId?: string | null; //********** Only for TRANSFER type
  categoryId?: string | null; //********** Optional - TRANSFER has no category
  userId: string;
  category?: Category;        //********** Joined locally
  wallet?: Wallet;            //********** Joined locally
  targetWallet?: Wallet;      //********** Joined locally
}

//********** Budget **********

export interface Budget extends SyncMetadata {
  id?: string;
  amount: number;
  period: string; //********** format "YYYY-MM"
  categoryId: string;
  userId: string;
  category?: Category; //********** Joined locally
}

//********** Financial Target **********

export interface FinancialTarget extends SyncMetadata {
  id?: string;
  name: string;
  type: TargetType;
  targetAmount: number;
  period: TargetPeriod;
  startDate: string;         //********** ISO 8601 date (YYYY-MM-DD)
  endDate?: string | null;   //********** ISO 8601 date (YYYY-MM-DD)
  categoryId?: string | null;
  walletId?: string | null;
  isActive: boolean;
  note?: string | null;
  userId: string;
  category?: Category;       //********** Joined locally
  wallet?: Wallet;           //********** Joined locally
}

//********** Sync Queue **********

export type SyncQueueAction = "create" | "update" | "delete";
export type SyncQueueEntity = "category" | "transaction" | "budget" | "wallet" | "notification_log" | "notification_settings" | "financial_target";

export interface SyncQueueEntry {
  id?: number; //********** Auto-increment (assigned by IndexedDB)
  entity: SyncQueueEntity;
  action: SyncQueueAction;
  clientId: string;
  data: Record<string, unknown>;
  createdAt: string;
  retryCount: number;
  lastError?: string;
  lastAttemptAt?: string;
  failedAt?: string;
}
