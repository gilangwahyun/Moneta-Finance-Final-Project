//********** START: useSync Hook **********
//********** Provides sync state, pending count, and control functions
//********** to React components. Integrates with the sync queue controller
//********** and service worker registration.
//********** END: useSync Hook **********

"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useOnlineStatus } from "./use-online-status";
import { SyncState, SyncResult } from "@/lib/sync/sync-manager";
import {
  forceSyncNow,
  scheduleSyncCycle,
  startPeriodicSync,
  stopPeriodicSync,
  cleanupSync,
} from "@/lib/sync/queue";
import { getPendingCount, getQuarantinedCount, getSyncQueueSummary, SyncQueueSummary } from "@/lib/local-db/repositories/sync-queue";
import { getLastSyncedAt } from "@/lib/local-db/repositories/users";
import {
  registerServiceWorker,
  requestBackgroundSync,
} from "@/lib/sw/register";

//********** TYPES **********
export interface UseSyncReturn {
  //********** Current sync state
  syncState: SyncState;
  //********** Whether the browser is online
  isOnline: boolean;
  //********** Number of active pending mutations in the sync queue
  pendingCount: number;
  //********** Number of quarantined items that failed sync
  quarantinedCount: number;
  //********** Lightweight summary of queue items
  queueSummary: SyncQueueSummary[];
  //********** ISO timestamp of the last successful sync
  lastSyncedAt: string | null;
  //********** Last sync result (includes pushed/pulled/conflicts counts)
  lastResult: SyncResult | null;
  //********** Force an immediate sync cycle
  triggerSync: () => Promise<void>;
  //********** Schedule a debounced sync (call after mutations)
  scheduleSync: () => void;
}

//********** HOOK **********
export function useSync(): UseSyncReturn {
  const isOnline = useOnlineStatus();
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [pendingCount, setPendingCount] = useState(0);
  const [quarantinedCount, setQuarantinedCount] = useState(0);
  const [queueSummary, setQueueSummary] = useState<SyncQueueSummary[]>([]);
  const [lastSyncedAt, setLastSynced] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);
  const initializedRef = useRef(false);

  //********** Refresh the pending count from IndexedDB
  const refreshPendingCount = useCallback(async () => {
    try {
      const activeCount = await getPendingCount();
      const failedCount = await getQuarantinedCount();
      const summary = await getSyncQueueSummary();
      setPendingCount(activeCount);
      setQuarantinedCount(failedCount);
      setQueueSummary(summary);
    } catch {
      //********** IndexedDB not available (SSR) - ignore
    }
  }, []);

  //********** Refresh the last synced timestamp
  const refreshLastSynced = useCallback(async () => {
    try {
      const ts = await getLastSyncedAt();
      setLastSynced(ts);
    } catch {
      //********** Ignore
    }
  }, []);

  //********** Callback for sync results
  const handleSyncResult = useCallback(
    (result: SyncResult) => {
      setLastResult(result);
      refreshPendingCount();
      refreshLastSynced();
    },
    [refreshPendingCount, refreshLastSynced]
  );

  //********** Initialize: register SW + start periodic sync
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    //********** Register service worker
    registerServiceWorker({
      onSyncTriggered: () => {
        //********** Background sync fired - trigger a full sync
        forceSyncNow(setSyncState, handleSyncResult);
      },
    });

    //********** Load initial state
    refreshPendingCount();
    refreshLastSynced();

    //********** Start periodic sync if online
    if (navigator.onLine) {
      startPeriodicSync(setSyncState, handleSyncResult);
    }

    return () => {
      cleanupSync();
    };
  }, [handleSyncResult, refreshPendingCount, refreshLastSynced]);

  //********** Auto-sync when coming back online
  useEffect(() => {
    if (isOnline) {
      setSyncState((prev) => (prev === "offline" ? "idle" : prev));
      scheduleSyncCycle(setSyncState, handleSyncResult);
      startPeriodicSync(setSyncState, handleSyncResult);
    } else {
      setSyncState("offline");
      stopPeriodicSync();
    }
  }, [isOnline, handleSyncResult]);

  //********** Manual sync trigger
  const triggerSync = useCallback(async () => {
    if (!isOnline) {
      setSyncState("offline");
      //********** Request background sync for when connectivity returns
      await requestBackgroundSync();
      return;
    }
    await forceSyncNow(setSyncState, handleSyncResult);
  }, [isOnline, handleSyncResult]);

  //********** Debounced sync (call after every mutation)
  const scheduleSync = useCallback(() => {
    refreshPendingCount(); //********** Update UI immediately
    if (isOnline) {
      scheduleSyncCycle(setSyncState, handleSyncResult);
    }
  }, [isOnline, handleSyncResult, refreshPendingCount]);

  return {
    syncState,
    isOnline,
    pendingCount,
    quarantinedCount,
    queueSummary,
    lastSyncedAt,
    lastResult,
    triggerSync,
    scheduleSync,
  };
}
