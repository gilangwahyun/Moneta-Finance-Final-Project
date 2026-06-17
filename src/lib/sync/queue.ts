//********** START: Sync Queue Controller **********
//********** Manages sync scheduling with debouncing, retry logic,
//********** periodic polling, and concurrency guards.
//********** END: Sync Queue Controller **********

import { performFullSync, SyncState, SyncResult } from "./sync-manager";
import { requestBackgroundSync } from "@/lib/sw/register";

let isSyncing = false;
let syncRequestedAgain = false;
let syncTimer: ReturnType<typeof setTimeout> | null = null;
let periodicTimer: ReturnType<typeof setInterval> | null = null;
let retryCount = 0;

const SYNC_DEBOUNCE_MS = 500; //********** Wait 500ms after last change
const PERIODIC_SYNC_MS = 30000; //********** Poll every 30s when online
const MAX_RETRIES = 3;
const RETRY_BACKOFF_BASE_MS = 2000; //********** 2s, 4s, 8s
const MAX_DRAIN_CYCLES = 3;

export type SyncStateCallback = (state: SyncState) => void;
export type SyncResultCallback = (result: SyncResult) => void;

//********** CONTROLLER **********
/**
 * Schedule a debounced sync cycle.
 * Resets the timer on every call - waits for the user to stop
 * making changes before syncing.
 */
export function scheduleSyncCycle(
  onStateChange?: SyncStateCallback,
  onResult?: SyncResultCallback
): void {
  if (syncTimer) {
    clearTimeout(syncTimer);
  }

  if (isSyncing) {
    syncRequestedAgain = true;
    return;
  }

  syncTimer = setTimeout(async () => {
    await executeSyncWithRetry(onStateChange, onResult);
  }, SYNC_DEBOUNCE_MS);
}

/**
 * Force an immediate sync (bypasses debounce).
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
 * Execute a sync with retry logic and exponential backoff.
 */
async function executeSyncWithRetry(
  onStateChange?: SyncStateCallback,
  onResult?: SyncResultCallback
): Promise<SyncResult> {
  if (isSyncing) {
    return { state: "syncing", pushed: 0, pulled: 0, conflicts: 0 };
  }

  isSyncing = true;
  let currentResult: SyncResult = { state: "idle", pushed: 0, pulled: 0, conflicts: 0 };

  for (let drainCycle = 0; drainCycle < MAX_DRAIN_CYCLES; drainCycle++) {
    syncRequestedAgain = false;
    onStateChange?.("syncing");

    currentResult = await performFullSync();

    if (currentResult.state === "error" && retryCount < MAX_RETRIES) {
      retryCount++;
      const backoffMs = RETRY_BACKOFF_BASE_MS * Math.pow(2, retryCount - 1);
      console.log(
        `[Sync Queue] Retry ${retryCount}/${MAX_RETRIES} in ${backoffMs}ms`
      );

      isSyncing = false;

      await new Promise((resolve) => setTimeout(resolve, backoffMs));
      return executeSyncWithRetry(onStateChange, onResult);
    }

    //********** Reset retry count after finishing the backoff loop
    retryCount = 0;

    onResult?.(currentResult);

    //********** Check if we need to drain further
    let hasActivePending = false;
    try {
      const { getPendingCount } = await import("@/lib/local-db/repositories/sync-queue");
      const pendingCount = await getPendingCount();
      hasActivePending = pendingCount > 0;
    } catch (e) {
      // Ignore dynamic import / DB errors
    }

    if (currentResult.state !== "error" && (syncRequestedAgain || hasActivePending)) {
      // console.log(`[Sync Queue] Drain cycle ${drainCycle + 1}/${MAX_DRAIN_CYCLES} triggered. syncRequestedAgain: ${syncRequestedAgain}, hasActivePending: ${hasActivePending}`);
      // Continue the loop for another drain cycle
    } else {
      break;
    }
  }

  isSyncing = false;
  onStateChange?.(currentResult.state);

  //********** If sync failed and we exhausted retries, request background sync
  //********** so the browser retries when connectivity improves
  if (currentResult.state === "error") {
    requestBackgroundSync().catch(() => {});
  }

  return currentResult;
}

/**
 * Start periodic sync polling. Runs every 30 seconds when online.
 * Call this once on app initialization.
 */
export function startPeriodicSync(
  onStateChange?: SyncStateCallback,
  onResult?: SyncResultCallback
): void {
  stopPeriodicSync();

  periodicTimer = setInterval(async () => {
    if (navigator.onLine && !isSyncing) {
      console.log("[Sync Queue] Periodic sync triggered");
      await executeSyncWithRetry(onStateChange, onResult);
    }
  }, PERIODIC_SYNC_MS);
}

/**
 * Stop periodic sync polling.
 */
export function stopPeriodicSync(): void {
  if (periodicTimer) {
    clearInterval(periodicTimer);
    periodicTimer = null;
  }
}

/**
 * Check if a sync is currently in progress.
 */
export function isSyncInProgress(): boolean {
  return isSyncing;
}

/**
 * Clean up all timers (call on unmount).
 */
export function cleanupSync(): void {
  if (syncTimer) {
    clearTimeout(syncTimer);
    syncTimer = null;
  }
  stopPeriodicSync();
}
