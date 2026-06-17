//********** START: Sync Provider **********
//********** React context that exposes sync state, pending count,
//********** and control functions to the entire app.
//********** END: Sync Provider **********

"use client";

import React, { createContext, useContext } from "react";
import { useSync, UseSyncReturn } from "@/hooks/use-sync";

const SyncContext = createContext<UseSyncReturn | null>(null);

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const syncValue = useSync();

  return (
    <SyncContext.Provider value={syncValue}>{children}</SyncContext.Provider>
  );
}

//********** HOOK **********
/**
 * Access sync state and controls from any component.
 *
 * Provides:
 * - `syncState` - "idle" | "syncing" | "error" | "offline"
 * - `isOnline` - browser connectivity status
 * - `pendingCount` - number of unsynced mutations
 * - `lastSyncedAt` - ISO timestamp of last successful sync
 * - `lastResult` - detailed result of the last sync cycle
 * - `triggerSync()` - force an immediate sync
 * - `scheduleSync()` - schedule a debounced sync (call after mutations)
 */
export function useSyncContext(): UseSyncReturn {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error("useSyncContext must be used within a SyncProvider");
  }
  return context;
}
