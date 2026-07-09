/*
 * File: src/providers/SyncProvider.tsx
 * Description: Penyedia konteks React (React Context) yang menyediakan status konektivitas, jumlah antrean sinkronisasi luring, serta fungsi kontrol sinkronisasi ke seluruh aplikasi.
 */

"use client";

import React, { createContext, useContext } from "react";
import { useSync, UseSyncReturn } from "@/hooks/use-sync";

const SyncContext = createContext<UseSyncReturn | null>(null);

/********** [START: Penyedia Konteks Sinkronisasi Luring/Daring] **********/
/**
 * Komponen penyedia konteks sinkronisasi data lokal (IndexedDB) dengan server backend.
 *
 * @param props - Properti penyedia konteks sinkronisasi
 * @returns Elemen JSX penyedia konteks
 */
export function SyncProvider({ children }: { children: React.ReactNode }) {
  const syncValue = useSync();

  return (
    <SyncContext.Provider value={syncValue}>{children}</SyncContext.Provider>
  );
}
/********** [END: Penyedia Konteks Sinkronisasi Luring/Daring] **********/

/********** [START: Hook Pengakses Konteks Sinkronisasi] **********/
/**
 * Hook untuk mengakses status sinkronisasi dan fungsi kontrol dari komponen mana pun.
 *
 * Menyediakan:
 * - `syncState` - "idle" | "syncing" | "error" | "offline"
 * - `isOnline` - status konektivitas jaringan peramban
 * - `pendingCount` - jumlah mutasi lokal yang belum disinkronkan ke server
 * - `lastSyncedAt` - penanda waktu ISO sinkronisasi sukses terakhir
 * - `lastResult` - hasil detail siklus sinkronisasi terakhir
 * - `triggerSync()` - memicu sinkronisasi langsung secara manual
 * - `scheduleSync()` - menjadwalkan sinkronisasi debounced setelah mutasi data
 *
 * @returns Objek nilai dan metode dari UseSyncReturn
 */
export function useSyncContext(): UseSyncReturn {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error("useSyncContext harus digunakan di dalam SyncProvider");
  }
  return context;
}
/********** [END: Hook Pengakses Konteks Sinkronisasi] **********/
