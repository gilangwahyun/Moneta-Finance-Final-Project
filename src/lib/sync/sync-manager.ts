/********** [START: Sync Manager] **********/
/********** Mengorkestrasi siklus push/pull sync antara IndexedDB dan
 *  server API menggunakan sync_queue untuk pelacakan mutasi yang andal.
 *
 *  Alur:
 *  1. pushChanges()     — Baca sync_queue, POST ke /api/sync/push, dequeue
 *  2. pullUpdates()     — GET /api/sync/pull, merge ke IndexedDB
 *  3. performFullSync() — push lalu pull secara berurutan
 */
/********** [END: Sync Manager] **********/

import {
  getAllPending,
  dequeueProcessed,
  enqueueChange,
  markEntryAttempt,
  recoverQuarantinedNotificationLogs,
} from '@/lib/local-db/repositories/sync-queue';
import { upsertCategory, getCategoryById, hardDeleteCategory, bulkUpsertCategories } from '@/lib/local-db/repositories/categories';
import {
  upsertTransaction,
  getTransactionById,
  hardDeleteTransaction,
  bulkUpsertTransactions,
} from '@/lib/local-db/repositories/transactions';
import { upsertWallet, getWalletById, hardDeleteWallet, bulkUpsertWallets } from '@/lib/local-db/repositories/wallets';
import {
  upsertBudget,
  getBudgetById,
  getPendingBudgets,
  hardDeleteBudget,
  bulkUpsertBudgets,
  deduplicateBudgets,
} from '@/lib/local-db/repositories/budgets';
import { upsertTarget, getTargetById, hardDeleteTarget, bulkUpsertTargets } from '@/lib/local-db/repositories/targets';
import {
  upsertNotificationLog,
  deleteNotificationLog,
  getNotificationLogById,
  bulkUpsertNotificationLogs,
} from '@/lib/local-db/repositories/notification-logs';
import {
  saveNotificationSettings,
  getNotificationSettings,
  bulkUpsertNotificationSettings,
} from '@/lib/local-db/repositories/notification-settings';
import { getLastSyncedAt, setLastSyncedAt } from '@/lib/local-db/repositories/users';
import { SyncPullResponse, SyncPushPayload, SyncPushResponse } from '@/types/sync.types';
import { SyncEvents } from '@/lib/sync/events';
import { Category, Transaction, Budget, Wallet, SyncQueueEntry } from '@/types/models.types';
import { resolveConflict } from './conflict-resolver';
import { csrfFetch } from '@/lib/utils/csrf-fetch';

export type SyncState = 'idle' | 'syncing' | 'error' | 'offline';

export interface SyncResult {
  state: SyncState;
  pushed: number;
  pulled: number;
  conflicts: number;
  error?: string;
}

/********** [START: Push Changes] **********/
/********** Membaca semua entri dari sync_queue, mengelompokkan per entitas,
 *  lalu mengirimnya ke server secara bulk. Jika berhasil, entri yang sudah
 *  diproses akan didequeue dari antrian.
 */
/********** [END: Push Changes] **********/

/**
 * Mengirim semua perubahan lokal yang tertunda ke server.
 * Membaca sync_queue, menyusun payload, POST ke /api/sync/push,
 * lalu menangani konflik dan mendequeue entri yang berhasil.
 *
 * @returns SyncResult berisi jumlah item yang di-push dan konflik yang terjadi.
 */
export async function pushChanges(): Promise<SyncResult> {
  const result: SyncResult = { state: 'idle', pushed: 0, pulled: 0, conflicts: 0 };

  try {
    /********** [START: Deduplikasi budget lokal sebelum push] **********/
    /********** Mencegah constraint violation unik di server (categoryId+period)
     *  yang dapat menyebabkan seluruh push gagal dan terjebak di antrian.
     */
    try {
      await deduplicateBudgets();
    } catch (dedupeErr) {
      console.warn('[Sync] deduplicateBudgets gagal (non-fatal):', dedupeErr);
    }
    /********** [END: Deduplikasi budget lokal sebelum push] **********/

    /********** [START: Recovery budget orphan] **********/
    /********** Budget yang pernah di-dequeue saat masih PENDING perlu
     *  di-enqueue ulang agar tidak hilang dari siklus push berikutnya.
     */
    const pendingBudgets = await getPendingBudgets();
    if (pendingBudgets.length > 0) {
      const queuedItems = await getAllPending();
      const queuedBudgetClientIds = new Set(queuedItems.filter((e) => e.entity === 'budget').map((e) => e.clientId));

      for (const b of pendingBudgets) {
        if (!queuedBudgetClientIds.has(b.clientId)) {
          console.log(`[Sync] Recovery budget orphan: ${b.clientId}`);
          await enqueueChange('budget', 'update', b.clientId, { ...b });
        }
      }
    }
    /********** [END: Recovery budget orphan] **********/

    /********** Pulihkan notification log yang terjebak di kuarantin akibat bug crash post-push. */
    await recoverQuarantinedNotificationLogs();

    const pending = await getAllPending();

    /********** Filter entri yang sudah gagal permanen atau sudah melebihi batas retry. */
    const MAX_RETRIES = 3;
    const activePending = pending.filter((e) => !e.failedAt && (e.retryCount ?? 0) < MAX_RETRIES);

    if (activePending.length === 0) {
      return result;
    }

    /********** Kelompokkan dan deduplikasi — hanya simpan entri terbaru per clientId. */
    const latestByClientId = deduplicateQueue(activePending);

    /********** Susun payload push dari entri yang sudah dideduplikasi. */
    const buildPayloadStart = performance.now();
    const payload = await buildPushPayload(latestByClientId);
    const buildPayloadEnd = performance.now();
    // console.log(`[Sync Diagnostics] buildPushPayload duration: ${buildPayloadEnd - buildPayloadStart}ms`);

    if (
      payload.categories.length === 0 &&
      payload.transactions.length === 0 &&
      payload.budgets.length === 0 &&
      payload.wallets.length === 0 &&
      (!payload.financial_targets || payload.financial_targets.length === 0) &&
      (!payload.notification_logs || payload.notification_logs.length === 0) &&
      (!payload.notification_settings || payload.notification_settings.length === 0)
    ) {
      /********** Tidak ada yang perlu di-push — langsung dequeue semua. */
      await dequeueProcessed(activePending.map((e) => e.id!));
      return result;
    }

    /********** POST payload ke server. */
    const pushRequestStart = performance.now();
    const response = await csrfFetch('/api/sync/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    const pushRequestEnd = performance.now();
    // console.log(`[Sync Diagnostics] push request duration: ${pushRequestEnd - pushRequestStart}ms`);

    if (!response.ok) {
      if (response.status === 401) {
        /********** Belum terautentikasi — lewati tanpa error. */
        return result;
      }
      throw new Error(`Push failed with status ${response.status}`);
    }

    const pushResult: SyncPushResponse = await response.json();

    /********** Tangani konflik — terapkan versi server ke lokal DB. */
    for (const conflict of pushResult.conflicts) {
      if (conflict.entity === 'category') {
        if (!conflict.serverVersion.clientId) {
          await hardDeleteCategory(conflict.clientId);
        } else {
          if (conflict.clientId !== conflict.serverVersion.clientId) {
            await hardDeleteCategory(conflict.clientId);
          }
          await upsertCategory(conflict.serverVersion as Category, true);
        }
      } else if (conflict.entity === 'transaction') {
        if (!conflict.serverVersion.clientId) {
          await hardDeleteTransaction(conflict.clientId);
        } else {
          if (conflict.clientId !== conflict.serverVersion.clientId) {
            await hardDeleteTransaction(conflict.clientId);
          }
          await upsertTransaction(conflict.serverVersion as Transaction, true);
        }
      } else if (conflict.entity === 'budget') {
        if (!conflict.serverVersion.clientId) {
          await hardDeleteBudget(conflict.clientId);
        } else {
          if (conflict.clientId !== conflict.serverVersion.clientId) {
            /********** Pakai hardDelete agar tidak men-enqueue soft delete tambahan. */
            await hardDeleteBudget(conflict.clientId);
          }
          await upsertBudget(conflict.serverVersion as Budget, true);
        }
      } else if (conflict.entity === 'wallet') {
        if (!conflict.serverVersion.clientId) {
          await hardDeleteWallet(conflict.clientId);
        } else {
          if (conflict.clientId !== conflict.serverVersion.clientId) {
            await hardDeleteWallet(conflict.clientId);
          }
          await upsertWallet(conflict.serverVersion as Wallet, true);
        }
      } else if (conflict.entity === 'financial_target') {
        if (!conflict.serverVersion.clientId) {
          await hardDeleteTarget(conflict.clientId);
        } else {
          if (conflict.clientId !== conflict.serverVersion.clientId) {
            /********** Pakai hardDelete agar tidak men-enqueue soft delete tambahan. */
            await hardDeleteTarget(conflict.clientId);
          }
          await upsertTarget(conflict.serverVersion as import('@/types/models.types').FinancialTarget, true);
        }
      } else if (conflict.entity === 'notification_log') {
        if (conflict.clientId !== conflict.serverVersion.clientId) {
          await deleteNotificationLog(conflict.clientId);
        }
        await upsertNotificationLog({ ...conflict.serverVersion, syncStatus: 'SYNCED' }, true);
      } else if (conflict.entity === 'notification_settings') {
        await saveNotificationSettings({ ...conflict.serverVersion, syncStatus: 'SYNCED' }, true);
      }
    }

    /********** Tandai item yang berhasil di-push sebagai SYNCED di lokal DB. */
    if (!pushResult.synced) {
      console.warn(
        "[Sync] Server response tidak memiliki 'synced' acknowledgement. Dianggap response legacy — hindari false success.",
      );
      throw new Error('Sync response missing explicit synced acknowledgement');
    }

    const postPushResStart = performance.now();
    const conflictClientIds = new Set(pushResult.conflicts.map((c) => c.clientId));
    const processedIdsToDequeue: number[] = [];

    const entityToSyncedKey: Record<string, keyof typeof pushResult.synced> = {
      category: 'categories',
      wallet: 'wallets',
      budget: 'budgets',
      transaction: 'transactions',
      financial_target: 'financial_targets',
      notification_log: 'notification_logs',
      notification_settings: 'notification_settings',
    };

    for (const entry of latestByClientId) {
      const syncedKey = entityToSyncedKey[entry.entity];
      const isAcknowledged = pushResult.synced[syncedKey]?.includes(entry.clientId);
      const isConflicted = conflictClientIds.has(entry.clientId);

      if (isAcknowledged || isConflicted) {
        processedIdsToDequeue.push(entry.id!);

        if (isAcknowledged && !isConflicted) {
          /********** Tidak ada konflik dan sudah di-acknowledge — tandai entitas sebagai SYNCED. */
          if (entry.entity === 'category') {
            const cat = await getCategoryById(entry.clientId);
            if (cat) {
              await upsertCategory({ ...cat, syncStatus: 'SYNCED' }, true);
            }
          } else if (entry.entity === 'transaction') {
            const txn = await getTransactionById(entry.clientId);
            if (txn) {
              await upsertTransaction({ ...txn, syncStatus: 'SYNCED' } as Transaction, true);
            }
          } else if (entry.entity === 'budget') {
            const bdg = await getBudgetById(entry.clientId);
            if (bdg) {
              await upsertBudget({ ...bdg, syncStatus: 'SYNCED' } as Budget, true);
            }
          } else if (entry.entity === 'wallet') {
            const wlt = await getWalletById(entry.clientId);
            if (wlt) {
              await upsertWallet({ ...wlt, syncStatus: 'SYNCED' } as Wallet, true);
            }
          } else if (entry.entity === 'financial_target') {
            const tgt = await getTargetById(entry.clientId);
            if (tgt) {
              await upsertTarget({ ...tgt, syncStatus: 'SYNCED' } as import('@/types/models.types').FinancialTarget, true);
            }
          } else if (entry.entity === 'notification_log') {
            const log = await getNotificationLogById(entry.clientId);
            if (log) {
              await upsertNotificationLog({ ...log, syncStatus: 'SYNCED' }, true);
            } else {
              console.warn(`[Sync] Local notification log not found for clientId: ${entry.clientId} during post-push resolution.`);
            }
          } else if (entry.entity === 'notification_settings') {
            const userId = entry.clientId.replace('notification-settings:', '');
            const settings = await getNotificationSettings(userId);
            if (settings) {
              await saveNotificationSettings({ ...settings, syncStatus: 'SYNCED' }, true);
            }
          }
        }
      } else {
        console.warn(`[Sync] Item tidak di-acknowledge server dan tidak ada konflik. Tetap di antrian: ${entry.entity} ${entry.clientId}`);
      }
    }

    /********** Hanya dequeue entri yang sudah diproses. */
    if (processedIdsToDequeue.length > 0) {
      await dequeueProcessed(processedIdsToDequeue);
    }
    const postPushResEnd = performance.now();
    // console.log(`[Sync Diagnostics] local post-push resolution duration: ${postPushResEnd - postPushResStart}ms`);

    result.pushed = latestByClientId.length;
    result.conflicts = pushResult.conflicts.length;

    return result;
  } catch (error) {
    console.error('[Sync] Error saat push:', error);

    /********** Coba tandai entri sebagai failed agar retry counter bertambah. */
    try {
      /********** Ambil ulang item pending untuk ditandai, atau gunakan activePending. */
      const pendingItems = await getAllPending();
      const MAX_RETRIES = 3;
      const activePending = pendingItems.filter((e) => !e.failedAt && (e.retryCount ?? 0) < MAX_RETRIES);
      const errorMsg = error instanceof Error ? error.message : 'Push failed';
      for (const item of activePending) {
        if (item.id) {
          await markEntryAttempt(item.id, errorMsg, MAX_RETRIES);
        }
      }
    } catch (e) {
      console.error('[Sync] Gagal menandai sync queue attempts:', e);
    }

    result.state = 'error';
    result.error = error instanceof Error ? error.message : 'Push failed';
    return result;
  }
}

/********** [START: Pull Updates] **********/
/********** Mengambil pembaruan delta dari server (record yang berubah sejak
 *  lastSyncedAt) dan merge-nya ke IndexedDB. Menghormati perubahan lokal
 *  yang masih pending saat proses merge berlangsung.
 */
/********** [END: Pull Updates] **********/

/**
 * Mengambil pembaruan dari server dan menggabungkannya ke lokal DB.
 *
 * @returns SyncResult berisi jumlah item yang di-pull dan konflik yang terjadi.
 */
export async function pullUpdates(): Promise<SyncResult> {
  const result: SyncResult = { state: 'idle', pushed: 0, pulled: 0, conflicts: 0 };

  try {
    const lastSyncedAt = (await getLastSyncedAt()) || new Date(0).toISOString();
    // console.log(`[Sync] Pulling updates since: ${lastSyncedAt}`);

    const pullReqStart = performance.now();
    const response = await fetch(`/api/sync/pull?lastSyncedAt=${encodeURIComponent(lastSyncedAt)}`, { credentials: 'include' });
    const pullReqTime = performance.now() - pullReqStart;
    // console.log(`[PullPerf] fetch /api/sync/pull: ${pullReqTime.toFixed(0)}ms`);

    if (!response.ok) {
      if (response.status === 401) {
        /********** Belum terautentikasi — lewati tanpa error. */
        return result;
      }
      throw new Error(`Pull failed with status ${response.status}`);
    }

    const resText = await response.text();
    const resSizeKB = (resText.length / 1024).toFixed(2);
    // console.log(`[PullPerf] response size: ${resSizeKB}KB`);
    const json = JSON.parse(resText);

    const pullData: SyncPullResponse = json.data;
    // console.log(`[Sync] Received ${pullData.categories.length} categories, ${pullData.transactions.length} transactions, ${pullData.budgets?.length || 0} budgets, and ${pullData.wallets?.length || 0} wallets`);

    const applyStartTotal = performance.now();
    let partialErrors: string[] = [];

    /********** Flag dependensi — entity yang bergantung pada wallet/kategori bisa diskip jika parent gagal. */
    let walletsSuccess = true;
    let categoriesSuccess = true;

    /********** Merge wallets **********/
    try {
      const applyWalletsStart = performance.now();
      if (pullData.wallets && pullData.wallets.length > 0) {
        const walletsToApply: Wallet[] = [];
        for (const serverWlt of pullData.wallets) {
          const localWlt = await getWalletById(serverWlt.clientId);

          if (localWlt && localWlt.syncStatus === 'PENDING') {
            const { winner } = resolveConflict({
              clientVersion: localWlt,
              serverVersion: serverWlt as Wallet,
            });

            if (winner === serverWlt) {
              walletsToApply.push({ ...serverWlt, syncStatus: 'SYNCED' } as Wallet);
              result.conflicts++;
            }
          } else {
            walletsToApply.push({ ...serverWlt, syncStatus: 'SYNCED' } as Wallet);
          }
        }
        await bulkUpsertWallets(walletsToApply);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event(SyncEvents.WALLET_UPDATED));
        }
      }
    } catch (err) {
      console.error('[Sync] Failed to apply wallets:', err);
      walletsSuccess = false;
      partialErrors.push('Wallets apply failed');
    }

    /********** Merge categories **********/
    try {
      if (pullData.categories && pullData.categories.length > 0) {
        const categoriesToApply: Category[] = [];
        for (const serverCat of pullData.categories) {
          const localCat = await getCategoryById(serverCat.clientId);

          if (localCat && localCat.syncStatus === 'PENDING') {
            const { winner } = resolveConflict({
              clientVersion: localCat,
              serverVersion: serverCat as Category,
            });

            if (winner === serverCat) {
              categoriesToApply.push({ ...serverCat, syncStatus: 'SYNCED' } as Category);
              result.conflicts++;
            }
          } else {
            categoriesToApply.push({ ...serverCat, syncStatus: 'SYNCED' } as Category);
          }
        }
        await bulkUpsertCategories(categoriesToApply);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event(SyncEvents.CATEGORY_UPDATED));
        }
      }
    } catch (err) {
      console.error('[Sync] Failed to apply categories:', err);
      categoriesSuccess = false;
      partialErrors.push('Categories apply failed');
    }

    /********** Merge transactions **********/
    try {
      if (!walletsSuccess || !categoriesSuccess) {
        /********** Skip transaksi kalau parent dependencies (wallets/categories) gagal. */
        throw new Error('Skipped transactions because parent dependencies (wallets/categories) failed.');
      }
      if (pullData.transactions && pullData.transactions.length > 0) {
        const transactionsToApply: Transaction[] = [];
        for (const serverTxn of pullData.transactions) {
          const localTxn = await getTransactionById(serverTxn.clientId);

          if (localTxn && localTxn.syncStatus === 'PENDING') {
            const { winner } = resolveConflict({
              clientVersion: localTxn,
              serverVersion: serverTxn as Transaction,
            });

            if (winner === serverTxn) {
              transactionsToApply.push({ ...serverTxn, syncStatus: 'SYNCED' } as Transaction);
              result.conflicts++;
            }
          } else {
            transactionsToApply.push({ ...serverTxn, syncStatus: 'SYNCED' } as Transaction);
          }
        }
        await bulkUpsertTransactions(transactionsToApply);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event(SyncEvents.TRANSACTION_UPDATED));
        }
      }
    } catch (err) {
      console.error('[Sync] Failed to apply transactions:', err);
      partialErrors.push(err instanceof Error ? err.message : 'Transactions apply failed');
    }

    /********** Merge budgets **********/
    try {
      if (!categoriesSuccess) {
        /********** Skip budget kalau kategori gagal — budget bergantung pada kategorId. */
        throw new Error('Skipped budgets because categories failed.');
      }
      if (pullData.budgets && pullData.budgets.length > 0) {
        const budgetsToApply: Budget[] = [];
        for (const serverBdg of pullData.budgets) {
          const localBdg = await getBudgetById(serverBdg.clientId);

          if (localBdg && localBdg.syncStatus === 'PENDING') {
            const { winner } = resolveConflict({
              clientVersion: localBdg,
              serverVersion: serverBdg as Budget,
            });

            if (winner === serverBdg) {
              budgetsToApply.push({ ...serverBdg, syncStatus: 'SYNCED' } as Budget);
              result.conflicts++;
            }
          } else {
            budgetsToApply.push({ ...serverBdg, syncStatus: 'SYNCED' } as Budget);
          }
        }
        await bulkUpsertBudgets(budgetsToApply);
        result.pulled += budgetsToApply.length;
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event(SyncEvents.BUDGET_UPDATED));
        }
      }
    } catch (err) {
      console.error('[Sync] Failed to apply budgets:', err);
      partialErrors.push(err instanceof Error ? err.message : 'Budgets apply failed');
    }

    /********** Merge financial targets **********/
    try {
      if (!categoriesSuccess) {
        /********** Skip targets kalau kategori gagal. */
        throw new Error('Skipped financial targets because categories failed.');
      }
      if (pullData.financial_targets && pullData.financial_targets.length > 0) {
        const targetsToApply: import('@/types/models.types').FinancialTarget[] = [];
        for (const serverTgt of pullData.financial_targets) {
          const localTgt = await getTargetById(serverTgt.clientId);

          if (localTgt && localTgt.syncStatus === 'PENDING') {
            const { winner } = resolveConflict({
              clientVersion: localTgt,
              serverVersion: serverTgt as import('@/types/models.types').FinancialTarget,
            });

            if (winner === serverTgt) {
              targetsToApply.push({ ...serverTgt, syncStatus: 'SYNCED' } as import('@/types/models.types').FinancialTarget);
              result.conflicts++;
            }
          } else {
            targetsToApply.push({ ...serverTgt, syncStatus: 'SYNCED' } as import('@/types/models.types').FinancialTarget);
          }
        }

        await bulkUpsertTargets(targetsToApply);
        result.pulled += targetsToApply.length;
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event(SyncEvents.TARGET_UPDATED));
        }
      }
    } catch (err) {
      console.error('[Sync] Failed to apply financial targets:', err);
      partialErrors.push(err instanceof Error ? err.message : 'Targets apply failed');
    }

    /********** Merge notification logs **********/
    try {
      if (pullData.notification_logs && pullData.notification_logs.length > 0) {
        const logsToApply: any[] = [];
        for (const serverLog of pullData.notification_logs) {
          const localLog = await getNotificationLogById(serverLog.clientId);

          if (localLog && localLog.syncStatus === 'PENDING') {
            const { winner } = resolveConflict({
              clientVersion: localLog,
              serverVersion: serverLog as any,
            });

            if (winner === serverLog) {
              logsToApply.push({ ...serverLog, syncStatus: 'SYNCED' });
              result.conflicts++;
            }
          } else {
            logsToApply.push({ ...serverLog, syncStatus: 'SYNCED' });
          }
        }
        await bulkUpsertNotificationLogs(logsToApply);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event(SyncEvents.NOTIFICATION_UPDATED));
        }
      }
    } catch (err) {
      console.error('[Sync] Failed to apply notification logs:', err);
      partialErrors.push('Notification logs apply failed');
    }

    /********** Merge notification settings **********/
    try {
      if (pullData.notification_settings && pullData.notification_settings.length > 0) {
        const settingsToApply: any[] = [];
        for (const serverSet of pullData.notification_settings) {
          const userId = serverSet.clientId.replace('notification-settings:', '');
          const localSet = await getNotificationSettings(userId);

          if (localSet && localSet.syncStatus === 'PENDING') {
            const { winner } = resolveConflict({
              clientVersion: localSet,
              serverVersion: serverSet as any,
            });

            if (winner === serverSet) {
              settingsToApply.push({ ...serverSet, syncStatus: 'SYNCED' });
              result.conflicts++;
            }
          } else {
            settingsToApply.push({ ...serverSet, syncStatus: 'SYNCED' });
          }
        }
        await bulkUpsertNotificationSettings(settingsToApply);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event(SyncEvents.NOTIFICATION_SETTINGS_UPDATED));
        }
      }
    } catch (err) {
      console.error('[Sync] Failed to apply notification settings:', err);
      partialErrors.push('Notification settings apply failed');
    }

    if (partialErrors.length > 0) {
      console.warn('[Sync] Pull selesai dengan partial error:', partialErrors);
      /********** Tidak throw agar sync tidak gagal total jika sebagian data berhasil. */
    }

    /********** Perbarui timestamp last synced. */
    await setLastSyncedAt(pullData.serverTime);
    // console.log(`[Sync] Pull complete. New serverTime: ${pullData.serverTime}`);

    result.pulled =
      pullData.categories.length +
      pullData.transactions.length +
      (pullData.budgets?.length || 0) +
      (pullData.wallets?.length || 0) +
      (pullData.notification_logs?.length || 0);

    return result;
  } catch (error) {
    console.error('[Sync] Pull error:', error);
    result.state = 'error';
    result.error = error instanceof Error ? error.message : 'Pull failed';
    return result;
  }
}

/********** [START: Full Sync] **********/
/********** Push dulu agar perubahan lokal sampai ke server, baru pull.
 *  Urutan ini penting untuk mencegah kehilangan data.
 */
/********** [END: Full Sync] **********/

/**
 * Menjalankan siklus sync penuh: push lalu pull.
 *
 * @returns SyncResult gabungan dari push dan pull.
 */
export async function performFullSync(): Promise<SyncResult> {
  const combinedResult: SyncResult = {
    state: 'idle',
    pushed: 0,
    pulled: 0,
    conflicts: 0,
  };

  try {
    /********** Langkah 1: Push perubahan lokal ke server. */
    const pushResult = await pushChanges();
    combinedResult.pushed = pushResult.pushed;
    combinedResult.conflicts += pushResult.conflicts;

    if (pushResult.state === 'error') {
      combinedResult.state = 'error';
      combinedResult.error = pushResult.error;
      return combinedResult;
    }

    /********** Langkah 2: Pull perubahan dari server. */
    const pullResult = await pullUpdates();
    combinedResult.pulled = pullResult.pulled;
    combinedResult.conflicts += pullResult.conflicts;

    if (pullResult.state === 'error') {
      combinedResult.state = 'error';
      combinedResult.error = pullResult.error;
      return combinedResult;
    }

    combinedResult.state = 'idle';

    /********** Dispatch event agar UI me-render ulang jika ada data yang berubah. */
    if (typeof window !== 'undefined' && (combinedResult.pushed > 0 || combinedResult.pulled > 0)) {
      window.dispatchEvent(new Event(SyncEvents.SYNC_COMPLETED));
    }

    return combinedResult;
  } catch (error) {
    console.error('[Sync] Full sync error:', error);
    return {
      state: 'error',
      pushed: combinedResult.pushed,
      pulled: combinedResult.pulled,
      conflicts: combinedResult.conflicts,
      error: error instanceof Error ? error.message : 'Sync failed',
    };
  }
}

/********** Helpers **********/

/**
 * Mendeduplikasi entri antrian berdasarkan clientId — hanya menyimpan entri
 * terbaru untuk setiap pasangan entity+clientId. Mencegah pengiriman state
 * intermediate saat record diedit beberapa kali sebelum sync.
 *
 * @param entries - Daftar entri sync queue yang perlu dideduplikasi.
 * @returns Array entri yang sudah bersih dari duplikat.
 */
function deduplicateQueue(entries: SyncQueueEntry[]): SyncQueueEntry[] {
  const map = new Map<string, SyncQueueEntry>();

  for (const entry of entries) {
    const key = `${entry.entity}:${entry.clientId}`;
    const existing = map.get(key);

    if (!existing || (entry.id ?? 0) > (existing.id ?? 0)) {
      map.set(key, entry);
    }
  }

  return Array.from(map.values());
}

/**
 * Membangun payload push dari entri antrian yang sudah dideduplikasi.
 * Membaca state entitas saat ini dari IndexedDB (bukan snapshot dari antrian)
 * untuk memastikan versi terbaru yang dikirim ke server.
 *
 * @param entries - Entri deduplikasi yang akan diproses menjadi payload.
 * @returns SyncPushPayload siap kirim ke server.
 */
async function buildPushPayload(entries: SyncQueueEntry[]): Promise<SyncPushPayload> {
  const categories: any[] = [];
  const transactions: any[] = [];
  const budgets: any[] = [];
  const financial_targets: any[] = [];
  const wallets: any[] = [];
  const notification_logs: any[] = [];
  const notification_settings: any[] = [];

  for (const entry of entries) {
    if (entry.entity === 'category') {
      const cat = await getCategoryById(entry.clientId);
      if (cat) {
        categories.push({
          clientId: cat.clientId,
          name: cat.name,
          type: cat.type,
          icon: cat.icon,
          color: cat.color,
          updatedAt: cat.updatedAt,
          deletedAt: cat.deletedAt,
        });
      } else if (entry.action === 'delete') {
        const data = (entry.data as any) || {};
        categories.push({
          clientId: entry.clientId,
          name: data.name ?? 'Deleted',
          type: data.type ?? 'EXPENSE',
          icon: data.icon ?? null,
          color: data.color ?? null,
          updatedAt: data.updatedAt ?? new Date().toISOString(),
          deletedAt: data.deletedAt ?? new Date().toISOString(),
        });
      }
    } else if (entry.entity === 'transaction') {
      const txn = await getTransactionById(entry.clientId);
      if (txn) {
        /********** Guard: skip transaksi lama yang tidak punya walletId (pre-multi-wallet schema). */
        if (!txn.walletId) {
          console.warn('[Sync] Skip transaksi legacy yang tidak punya walletId:', txn.clientId);
          continue;
        }
        transactions.push({
          clientId: txn.clientId,
          amount: txn.amount,
          type: txn.type,
          description: txn.description,
          note: txn.note,
          date: txn.date,
          categoryId: txn.categoryId,
          walletId: txn.walletId,
          targetWalletId: txn.targetWalletId,
          updatedAt: txn.updatedAt,
          deletedAt: txn.deletedAt,
        });
      } else if (entry.action === 'delete') {
        const data = (entry.data as any) || {};
        /********** Tombstone fallback untuk transaksi yang sudah terhapus dari lokal. */
        transactions.push({
          clientId: entry.clientId,
          amount: data.amount ?? 0,
          type: data.type ?? 'EXPENSE',
          description: data.description ?? 'Deleted',
          date: data.date ?? new Date().toISOString(),
          categoryId: data.categoryId ?? '',
          walletId: data.walletId ?? 'legacy', /********** Safe fallback agar API tidak crash. */
          targetWalletId: data.targetWalletId,
          updatedAt: data.updatedAt ?? new Date().toISOString(),
          deletedAt: data.deletedAt ?? new Date().toISOString(),
        });
      }
    } else if (entry.entity === 'budget') {
      const bdg = await getBudgetById(entry.clientId);
      if (bdg) {
        budgets.push({
          clientId: bdg.clientId,
          amount: bdg.amount,
          period: bdg.period,
          categoryId: bdg.categoryId,
          updatedAt: bdg.updatedAt,
          deletedAt: bdg.deletedAt,
        });
      } else if (entry.action === 'delete') {
        const data = (entry.data as any) || {};
        budgets.push({
          clientId: entry.clientId,
          amount: data.amount ?? 0,
          period: data.period ?? '',
          categoryId: data.categoryId ?? '',
          updatedAt: data.updatedAt ?? new Date().toISOString(),
          deletedAt: data.deletedAt ?? new Date().toISOString(),
        });
      }
    } else if (entry.entity === 'financial_target') {
      const tgt = await getTargetById(entry.clientId);
      if (tgt) {
        financial_targets.push({
          clientId: tgt.clientId,
          name: tgt.name,
          type: tgt.type,
          targetAmount: tgt.targetAmount,
          period: tgt.period,
          startDate: tgt.startDate,
          endDate: tgt.endDate,
          categoryId: tgt.categoryId,
          walletId: tgt.walletId,
          isActive: tgt.isActive,
          note: tgt.note,
          updatedAt: tgt.updatedAt,
          deletedAt: tgt.deletedAt,
        });
      } else if (entry.action === 'delete') {
        const data = (entry.data as any) || {};
        financial_targets.push({
          clientId: entry.clientId,
          name: data.name ?? 'Deleted',
          type: data.type ?? 'INCOME_TARGET',
          targetAmount: data.targetAmount ?? 0,
          period: data.period ?? 'MONTHLY',
          startDate: data.startDate ?? new Date().toISOString(),
          endDate: data.endDate ?? null,
          categoryId: data.categoryId ?? null,
          walletId: data.walletId ?? null,
          isActive: data.isActive ?? false,
          note: data.note ?? null,
          updatedAt: data.updatedAt ?? new Date().toISOString(),
          deletedAt: data.deletedAt ?? new Date().toISOString(),
        });
      }
    } else if (entry.entity === 'wallet') {
      const wlt = await getWalletById(entry.clientId);
      if (wlt) {
        wallets.push({
          clientId: wlt.clientId,
          name: wlt.name,
          type: wlt.type,
          initialBalance: wlt.initialBalance,
          updatedAt: wlt.updatedAt,
          deletedAt: wlt.deletedAt,
        });
      } else if (entry.action === 'delete') {
        const data = (entry.data as any) || {};
        wallets.push({
          clientId: entry.clientId,
          name: data.name ?? 'Deleted',
          type: data.type ?? 'CASH',
          initialBalance: data.initialBalance ?? 0,
          updatedAt: data.updatedAt ?? new Date().toISOString(),
          deletedAt: data.deletedAt ?? new Date().toISOString(),
        });
      }
    } else if (entry.entity === 'notification_log') {
      const log = await getNotificationLogById(entry.clientId);
      if (log) {
        notification_logs.push({
          clientId: log.clientId,
          dedupeKey: log.dedupeKey,
          type: log.type,
          eventType: log.eventType,
          deliveryModeAtCreation: log.deliveryModeAtCreation,
          title: log.title,
          body: log.body,
          severity: log.severity,
          source: log.source,
          relatedTransactionClientId: log.relatedTransactionClientId,
          relatedCategoryId: log.relatedCategoryId,
          relatedBudgetId: log.relatedBudgetId,
          ctaRoute: log.ctaRoute,
          actionType: log.actionType,
          ctaLabel: log.ctaLabel,
          sourceBudgetId: log.sourceBudgetId,
          targetBudgetId: log.targetBudgetId,
          recommendedAmount: log.recommendedAmount,
          readAt: log.readAt,
          dismissedAt: log.dismissedAt,
          pushedAt: log.pushedAt,
          digestSentAt: log.digestSentAt,
          createdAt: log.createdAt,
          updatedAt: log.updatedAt,
        });
      }
    } else if (entry.entity === 'notification_settings') {
      const data = entry.data as any;
      if (data) {
        notification_settings.push({
          clientId: data.clientId,
          isEnabled: data.isEnabled,
          deliveryMode: data.deliveryMode,
          instantAlerts: data.instantAlerts,
          dailyDigest: data.dailyDigest,
          digestTime: data.digestTime,
          dailyCap: data.dailyCap,
          updatedAt: data.updatedAt,
        });
      }
    }
  }

  return { wallets, categories, transactions, budgets, financial_targets, notification_logs, notification_settings };
}
