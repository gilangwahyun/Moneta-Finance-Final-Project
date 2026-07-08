/*
 * File: src/hooks/use-sync.ts
 * Description: Hook kustom React untuk mengelola status sinkronisasi, antrean mutasi lokal, integrasi Service Worker, dan pemantauan status koneksi secara real-time.
 */

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

/********** Tipe Data & Antarmuka **********/

export interface UseSyncReturn {
  /* Status sinkronisasi saat ini */
  syncState: SyncState;
  /* Status koneksi jaringan browser */
  isOnline: boolean;
  /* Jumlah mutasi aktif yang sedang menunggu antrean sinkronisasi */
  pendingCount: number;
  /* Jumlah item yang diisolasi (quarantine) akibat kegagalan berulang */
  quarantinedCount: number;
  /* Ringkasan entitas dalam antrean sinkronisasi */
  queueSummary: SyncQueueSummary[];
  /* Timestamp ISO sinkronisasi sukses terakhir */
  lastSyncedAt: string | null;
  /* Hasil dari proses sinkronisasi terakhir (jumlah push, pull, dan konflik) */
  lastResult: SyncResult | null;
  /* Memicu proses sinkronisasi secara instan */
  triggerSync: () => Promise<void>;
  /* Menjadwalkan sinkronisasi dengan debounce (dipanggil setelah mutasi data lokal) */
  scheduleSync: () => void;
}

/********** Hook Utama (useSync) **********/

/**
 * Hook kustom untuk memantau status sinkronisasi lokal dan remote, menghitung antrean mutasi yang tertunda, serta mengelola siklus sinkronisasi latar belakang.
 *
 * @returns Objek yang berisi status jaringan, jumlah antrean sinkronisasi, dan fungsi kontrol untuk memicu sinkronisasi.
 */
export function useSync(): UseSyncReturn {
  const isOnline = useOnlineStatus();
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [pendingCount, setPendingCount] = useState(0);
  const [quarantinedCount, setQuarantinedCount] = useState(0);
  const [queueSummary, setQueueSummary] = useState<SyncQueueSummary[]>([]);
  const [lastSyncedAt, setLastSynced] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);
  const initializedRef = useRef(false);

  /* Memperbarui jumlah mutasi yang tertunda dari IndexedDB */
  const refreshPendingCount = useCallback(async () => {
    try {
      const activeCount = await getPendingCount();
      const failedCount = await getQuarantinedCount();
      const summary = await getSyncQueueSummary();
      setPendingCount(activeCount);
      setQuarantinedCount(failedCount);
      setQueueSummary(summary);
    } catch {
      /* IndexedDB tidak tersedia pada lingkungan SSR — abaikan tanpa error */
    }
  }, []);

  /* Memperbarui timestamp sinkronisasi terakhir dari database lokal */
  const refreshLastSynced = useCallback(async () => {
    try {
      const ts = await getLastSyncedAt();
      setLastSynced(ts);
    } catch {
      /* Abaikan tanpa error */
    }
  }, []);

  /* Callback yang dijalankan ketika siklus sinkronisasi selesai */
  const handleSyncResult = useCallback(
    (result: SyncResult) => {
      setLastResult(result);
      refreshPendingCount();
      refreshLastSynced();
    },
    [refreshPendingCount, refreshLastSynced]
  );

  /********** [START: Inisialisasi Service Worker & Sinkronisasi Berkala] **********/
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    /* Daftarkan service worker untuk menerima pemicu sinkronisasi latar belakang */
    registerServiceWorker({
      onSyncTriggered: () => {
        /* Sinkronisasi latar belakang dipicu — jalankan sinkronisasi penuh saat ini juga */
        forceSyncNow(setSyncState, handleSyncResult);
      },
    });

    /* Muat status awal antrean dari IndexedDB */
    refreshPendingCount();
    refreshLastSynced();

    /* Mulai sinkronisasi berkala jika browser dalam keadaan online */
    if (navigator.onLine) {
      startPeriodicSync(setSyncState, handleSyncResult);
    }

    return () => {
      cleanupSync();
    };
  }, [handleSyncResult, refreshPendingCount, refreshLastSynced]);
  /********** [END: Inisialisasi Service Worker & Sinkronisasi Berkala] **********/

  /* Sinkronisasi otomatis begitu koneksi internet kembali aktif */
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

  /* Memicu siklus sinkronisasi secara manual */
  const triggerSync = useCallback(async () => {
    if (!isOnline) {
      setSyncState("offline");
      /* Minta sinkronisasi latar belakang agar dijalankan saat koneksi kembali normal */
      await requestBackgroundSync();
      return;
    }
    await forceSyncNow(setSyncState, handleSyncResult);
  }, [isOnline, handleSyncResult]);

  /* Menjadwalkan sinkronisasi dengan debounce (dipanggil setiap kali terjadi mutasi lokal) */
  const scheduleSync = useCallback(() => {
    refreshPendingCount(); /* Perbarui antrean antarmuka pengguna saat ini juga */
    if (isOnline) {
      scheduleSyncCycle(setSyncState, handleSyncResult);
    }
  }, [isOnline, handleSyncResult, refreshPendingCount]);

  /********** Pengembalian Data Hook **********/

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
