/********** Mengatur penjadwalan sync dengan debouncing, retry logic,
 *  periodic polling, dan concurrency guard agar tidak ada dua siklus
 *  sync yang berjalan bersamaan.
 */

/********** Imports **********/

import { performFullSync, SyncState, SyncResult } from './sync-manager';
import { requestBackgroundSync } from '@/lib/sw/register';

/********** Constants **********/

let isSyncing = false;
let syncRequestedAgain = false;
let syncTimer: ReturnType<typeof setTimeout> | null = null;
let periodicTimer: ReturnType<typeof setInterval> | null = null;
let retryCount = 0;

const SYNC_DEBOUNCE_MS = 500; /********** Tunggu 500ms setelah perubahan terakhir sebelum sync. */
const PERIODIC_SYNC_MS = 30000; /********** Poll setiap 30 detik saat online. */
const MAX_RETRIES = 3;
const RETRY_BACKOFF_BASE_MS = 2000; /********** Backoff: 2s, 4s, 8s secara eksponensial. */
const MAX_DRAIN_CYCLES = 3;

/********** Types **********/

export type SyncStateCallback = (state: SyncState) => void;
export type SyncResultCallback = (result: SyncResult) => void;

/********** Main Logic **********/

/**
 * Menjadwalkan siklus sync dengan debounce.
 * Timer direset setiap kali fungsi ini dipanggil — sync baru dieksekusi
 * setelah user berhenti melakukan perubahan selama `SYNC_DEBOUNCE_MS`.
 *
 * @param onStateChange - Callback yang dipanggil saat status sync berubah.
 * @param onResult - Callback yang dipanggil setelah sync selesai.
 */
export function scheduleSyncCycle(
  onStateChange?: SyncStateCallback,
  onResult?: SyncResultCallback
): void {
  if (syncTimer) {
    clearTimeout(syncTimer);
  }

  /********** Kalau sedang sync, tandai bahwa ada permintaan sync berikutnya. */
  if (isSyncing) {
    syncRequestedAgain = true;
    return;
  }

  syncTimer = setTimeout(async () => {
    await executeSyncWithRetry(onStateChange, onResult);
  }, SYNC_DEBOUNCE_MS);
}

/**
 * Memaksa sync langsung tanpa menunggu debounce.
 *
 * @param onStateChange - Callback saat status berubah.
 * @param onResult - Callback setelah sync selesai.
 * @returns Result sync, atau `null` jika sync sedang berjalan.
 */
export async function forceSyncNow(
  onStateChange?: SyncStateCallback,
  onResult?: SyncResultCallback
): Promise<SyncResult | null> {
  if (isSyncing) return null;

  if (syncTimer) {
    clearTimeout(syncTimer);
    syncTimer = null;
  }

  return executeSyncWithRetry(onStateChange, onResult);
}

/**
 * Menjalankan sync dengan retry logic dan exponential backoff.
 * Juga mendukung drain cycle — melanjutkan sync tambahan jika masih
 * ada item pending setelah siklus pertama selesai.
 *
 * @param onStateChange - Callback saat status berubah.
 * @param onResult - Callback setelah setiap siklus selesai.
 * @returns Result sync terakhir.
 */
async function executeSyncWithRetry(
  onStateChange?: SyncStateCallback,
  onResult?: SyncResultCallback
): Promise<SyncResult> {
  if (isSyncing) {
    return { state: 'syncing', pushed: 0, pulled: 0, conflicts: 0 };
  }

  isSyncing = true;
  let currentResult: SyncResult = { state: 'idle', pushed: 0, pulled: 0, conflicts: 0 };

  for (let drainCycle = 0; drainCycle < MAX_DRAIN_CYCLES; drainCycle++) {
    syncRequestedAgain = false;
    onStateChange?.('syncing');

    currentResult = await performFullSync();

    if (currentResult.state === 'error' && retryCount < MAX_RETRIES) {
      retryCount++;
      const backoffMs = RETRY_BACKOFF_BASE_MS * Math.pow(2, retryCount - 1);
      console.log(
        `[Sync Queue] Retry ${retryCount}/${MAX_RETRIES} in ${backoffMs}ms`
      );

      isSyncing = false;

      await new Promise((resolve) => setTimeout(resolve, backoffMs));
      return executeSyncWithRetry(onStateChange, onResult);
    }

    /********** Reset retry count setelah berhasil melewati backoff loop. */
    retryCount = 0;

    onResult?.(currentResult);

    /********** Cek apakah masih ada item pending yang perlu di-drain. */
    let hasActivePending = false;
    try {
      const { getPendingCount } = await import('@/lib/local-db/repositories/sync-queue');
      const pendingCount = await getPendingCount();
      hasActivePending = pendingCount > 0;
    } catch (e) {
      /********** Abaikan error dynamic import / DB — tidak kritis. */
    }

    if (currentResult.state !== 'error' && (syncRequestedAgain || hasActivePending)) {
      /********** Lanjutkan ke drain cycle berikutnya. */
    } else {
      break;
    }
  }

  isSyncing = false;
  onStateChange?.(currentResult.state);

  /********** Kalau sync gagal dan retry sudah habis, minta background sync
   *  dari browser agar dicoba lagi saat koneksi membaik. */
  if (currentResult.state === 'error') {
    requestBackgroundSync().catch(() => {});
  }

  return currentResult;
}

/**
 * Memulai periodic sync polling yang berjalan setiap 30 detik saat online.
 * Panggil sekali saat app diinisialisasi.
 *
 * @param onStateChange - Callback saat status berubah.
 * @param onResult - Callback setelah sync selesai.
 */
export function startPeriodicSync(
  onStateChange?: SyncStateCallback,
  onResult?: SyncResultCallback
): void {
  stopPeriodicSync();

  periodicTimer = setInterval(async () => {
    if (navigator.onLine && !isSyncing) {
      console.log('[Sync Queue] Periodic sync triggered');
      await executeSyncWithRetry(onStateChange, onResult);
    }
  }, PERIODIC_SYNC_MS);
}

/**
 * Menghentikan periodic sync polling.
 */
export function stopPeriodicSync(): void {
  if (periodicTimer) {
    clearInterval(periodicTimer);
    periodicTimer = null;
  }
}

/**
 * Mengecek apakah sync sedang berjalan.
 *
 * @returns `true` jika sync sedang dalam progress.
 */
function isSyncInProgress(): boolean {
  return isSyncing;
}

/**
 * Membersihkan semua timer. Panggil saat komponen di-unmount.
 */
export function cleanupSync(): void {
  if (syncTimer) {
    clearTimeout(syncTimer);
    syncTimer = null;
  }
  stopPeriodicSync();
}
