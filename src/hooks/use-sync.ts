/*
 * File: src/hooks/use-sync.ts
 * Description: Hook kustom React untuk mengelola status sinkronisasi, antrean mutasi lokal,
 *              integrasi Service Worker, dan pemantauan status koneksi secara real-time.
 *
 * Arsitektur Sinkronisasi:
 *   Hook ini adalah "otak" dari seluruh sistem sinkronisasi Moneta Finance di sisi klien.
 *   Ia menjembatani tiga lapisan utama:
 *   1. useOnlineStatus  — mendeteksi perubahan konektivitas jaringan secara real-time
 *                         melalui event native browser (window "online"/"offline").
 *   2. Service Worker   — menerima sinyal "SYNC_TRIGGERED" dari background sync API
 *                         saat browser mendeteksi koneksi kembali di latar belakang.
 *   3. Sync Queue       — mengeksekusi siklus push/pull ke server dengan mekanisme
 *                         debounce, retry, dan periodic polling setiap 30 detik.
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
  /* Status sinkronisasi saat ini: 'idle' | 'syncing' | 'error' | 'offline' */
  syncState: SyncState;
  /* Status koneksi jaringan browser — berasal dari useOnlineStatus (window online/offline event) */
  isOnline: boolean;
  /* Jumlah mutasi aktif yang sedang menunggu antrean sinkronisasi di IndexedDB (sync_queue) */
  pendingCount: number;
  /* Jumlah item yang diisolasi (quarantine) akibat kegagalan berulang melebihi MAX_RETRIES */
  quarantinedCount: number;
  /* Ringkasan entitas dalam antrean sinkronisasi, dikelompokkan per tipe (transaksi, dompet, dst.) */
  queueSummary: SyncQueueSummary[];
  /* Timestamp ISO dari sinkronisasi sukses terakhir — digunakan sebagai titik awal pull berikutnya */
  lastSyncedAt: string | null;
  /* Hasil dari proses sinkronisasi terakhir: jumlah item yang di-push, di-pull, dan konflik */
  lastResult: SyncResult | null;
  /* Memicu proses sinkronisasi secara instan tanpa debounce — cocok untuk tombol "Sync Sekarang" */
  triggerSync: () => Promise<void>;
  /* Menjadwalkan sinkronisasi dengan debounce 500ms — dipanggil otomatis setelah setiap mutasi lokal */
  scheduleSync: () => void;
}

/********** Hook Utama (useSync) **********/

/**
 * Hook kustom untuk memantau status sinkronisasi lokal dan remote, menghitung antrean
 * mutasi yang tertunda, serta mengelola seluruh siklus sinkronisasi latar belakang.
 *
 * Pola penggunaan:
 *   const { syncState, isOnline, pendingCount, scheduleSync } = useSync();
 *   // Panggil scheduleSync() setiap kali data lokal berubah (create/update/delete).
 *
 * @returns Objek yang berisi status jaringan, jumlah antrean sinkronisasi, dan
 *          fungsi kontrol untuk memicu sinkronisasi.
 */
export function useSync(): UseSyncReturn {
  /*
   * isOnline berasal dari useOnlineStatus yang memasang listener ke
   * window "online" dan "offline" event. Setiap kali nilai ini berubah,
   * React secara otomatis menjalankan ulang useEffect di bawah yang
   * bergantung pada [isOnline] — inilah pintu masuk utama logika
   * "sadar koneksi kembali" di sisi aplikasi.
   */
  const isOnline = useOnlineStatus();
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [pendingCount, setPendingCount] = useState(0);
  const [quarantinedCount, setQuarantinedCount] = useState(0);
  const [queueSummary, setQueueSummary] = useState<SyncQueueSummary[]>([]);
  const [lastSyncedAt, setLastSynced] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);

  /*
   * initializedRef digunakan sebagai guard agar blok inisialisasi (registerServiceWorker,
   * startPeriodicSync) hanya dieksekusi sekali selama lifetime komponen, meskipun
   * React dalam mode Strict Mode memanggil useEffect dua kali di development.
   */
  const initializedRef = useRef(false);

  /*
   * refreshPendingCount membaca sync_queue dari IndexedDB untuk menampilkan
   * jumlah item yang masih menunggu sinkronisasi di UI (badge indikator).
   * Dipanggil setelah setiap siklus sync selesai agar angka di UI selalu akurat.
   */
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

  /*
   * refreshLastSynced membaca timestamp sinkronisasi terakhir dari store "users" di
   * IndexedDB. Timestamp ini ditampilkan di UI sebagai informasi terakhir kali data
   * berhasil direkonsiliasi dengan server, dan juga digunakan oleh pullUpdates()
   * sebagai parameter ?lastSyncedAt= agar server hanya mengirim data yang berubah
   * sejak waktu tersebut (incremental pull / delta sync).
   */
  const refreshLastSynced = useCallback(async () => {
    try {
      const ts = await getLastSyncedAt();
      setLastSynced(ts);
    } catch {
      /* Abaikan tanpa error */
    }
  }, []);

  /*
   * handleSyncResult adalah callback yang dipanggil oleh sync queue setiap kali
   * satu siklus push+pull selesai. Ia menyimpan hasil akhir (pushed/pulled/conflicts)
   * ke state, lalu menyegarkan UI agar jumlah antrean dan timestamp tersinkronisasi.
   */
  const handleSyncResult = useCallback(
    (result: SyncResult) => {
      setLastResult(result);
      refreshPendingCount();
      refreshLastSynced();
    },
    [refreshPendingCount, refreshLastSynced]
  );

  /********** [START: Inisialisasi Service Worker & Sinkronisasi Berkala] **********/
  /*
   * useEffect ini hanya berjalan SEKALI saat hook pertama kali dipasang (mount).
   * Guard initializedRef memastikan tidak ada eksekusi ganda.
   *
   * Tiga hal yang dilakukan di sini:
   *   (a) Mendaftarkan Service Worker — agar browser dapat menerima push notification
   *       dan background sync. Callback onSyncTriggered dipasang di sini: setiap kali
   *       SW mengirim pesan "SYNC_TRIGGERED" (yang terjadi ketika background sync API
   *       browser menyala saat koneksi pulih), forceSyncNow() langsung dipanggil.
   *   (b) Memuat status awal antrean dari IndexedDB — agar UI menampilkan angka
   *       pending yang benar bahkan sebelum sinkronisasi pertama terjadi.
   *   (c) Memulai periodic sync — setInterval setiap 30 detik yang akan terus
   *       mencoba sinkronisasi selama browser online dan tidak ada sync yang berjalan.
   */
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    /*
     * (a) Registrasi Service Worker.
     * registerServiceWorker() memasang navigator.serviceWorker.register('/sw.js')
     * dan menyiapkan listener pesan. Ketika SW menerima event "sync" dengan tag
     * "moneta-sync" (dipicu oleh Background Sync API saat koneksi pulih), SW akan
     * postMessage({ type: "SYNC_TRIGGERED" }) ke semua tab yang terbuka.
     * Listener di register.ts menangkap pesan ini dan memanggil onSyncTriggered(),
     * yang pada akhirnya mengeksekusi forceSyncNow() di baris 108 di bawah ini.
     */
    registerServiceWorker({
      onSyncTriggered: () => {
        /*
         * Titik masuk kedua untuk memulai sinkronisasi:
         * SW memberi sinyal bahwa koneksi sudah stabil → langsung push+pull ke server.
         * Berbeda dengan scheduleSyncCycle() yang ber-debounce, forceSyncNow()
         * langsung mengeksekusi tanpa menunggu.
         */
        forceSyncNow(setSyncState, handleSyncResult);
      },
    });

    /* (b) Muat status awal antrean dari IndexedDB agar UI tidak menampilkan 0 kosong */
    refreshPendingCount();
    refreshLastSynced();

    /*
     * (c) Mulai periodic sync polling jika saat ini sudah online.
     * startPeriodicSync() memasang setInterval setiap 30 detik. Setiap tick
     * mengecek navigator.onLine sebelum menjalankan executeSyncWithRetry(),
     * sehingga polling ini aman dijalankan terus-menerus tanpa memboroskan
     * bandwidth saat perangkat offline.
     */
    if (navigator.onLine) {
      startPeriodicSync(setSyncState, handleSyncResult);
    }

    /* Bersihkan semua timer saat komponen di-unmount untuk mencegah memory leak */
    return () => {
      cleanupSync();
    };
  }, [handleSyncResult, refreshPendingCount, refreshLastSynced]);
  /********** [END: Inisialisasi Service Worker & Sinkronisasi Berkala] **********/

  /*
   * Ini adalah TITIK MASUK PERTAMA dan paling utama untuk sinkronisasi reaktif.
   *
   * useEffect ini bereaksi terhadap perubahan nilai isOnline — yang berubah
   * setiap kali browser mendeteksi perubahan konektivitas melalui event
   * window "online" / "offline" di use-online-status.ts.
   *
   * Skenario ONLINE (koneksi baru saja kembali):
   *   1. Reset syncState dari "offline" ke "idle" agar UI menghilangkan indikator merah.
   *   2. scheduleSyncCycle() — jadwalkan sinkronisasi dengan debounce 500ms.
   *      Ini memastikan sistem tidak langsung membanjiri server jika koneksi
   *      berkedip-kedip, tetapi tetap responsif.
   *   3. startPeriodicSync() — mulai ulang polling 30 detik yang sebelumnya dihentikan.
   *
   * Skenario OFFLINE (koneksi baru saja terputus):
   *   1. Set syncState ke "offline" agar UI menampilkan badge/indikator offline.
   *   2. stopPeriodicSync() — hentikan polling agar tidak ada fetch yang sia-sia
   *      sementara tidak ada koneksi.
   */
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

  /*
   * triggerSync adalah fungsi yang dipanggil dari UI secara eksplisit
   * (misalnya, tombol "Sync Sekarang" di halaman profil atau dashboard).
   *
   * Jika offline: tidak ada gunanya mencoba fetch ke server. Sebagai gantinya,
   * requestBackgroundSync() mendaftarkan tag "moneta-sync" ke SW. Browser akan
   * menyimpan tag ini dan secara otomatis me-fire event "sync" di SW ketika
   * koneksi kembali tersedia — bahkan jika tab sudah ditutup dan dibuka ulang.
   *
   * Jika online: langsung jalankan forceSyncNow() yang melakukan push + pull
   * tanpa menunggu debounce, sehingga pengguna mendapat feedback instan.
   */
  const triggerSync = useCallback(async () => {
    if (!isOnline) {
      setSyncState("offline");
      /* Daftarkan background sync agar sinkronisasi dijadwalkan ulang saat koneksi pulih */
      await requestBackgroundSync();
      return;
    }
    await forceSyncNow(setSyncState, handleSyncResult);
  }, [isOnline, handleSyncResult]);

  /*
   * scheduleSync dipanggil secara otomatis oleh setiap komponen yang melakukan
   * mutasi data lokal (create/update/delete transaksi, dompet, anggaran, dst.).
   *
   * Alih-alih langsung memanggil sync, ia menggunakan scheduleSyncCycle() yang
   * ber-debounce 500ms — artinya jika pengguna menambahkan 5 transaksi secara
   * cepat, hanya akan ada 1 siklus push ke server, bukan 5. Ini mengurangi
   * beban jaringan dan mencegah race condition di sync_queue.
   *
   * refreshPendingCount() dipanggil lebih dulu agar badge pending di UI langsung
   * diperbarui tanpa harus menunggu siklus sync selesai.
   */
  const scheduleSync = useCallback(() => {
    refreshPendingCount(); /* Perbarui antrean UI secara optimistis sebelum sync terjadi */
    if (isOnline) {
      scheduleSyncCycle(setSyncState, handleSyncResult);
    }
    /* Jika offline: tidak perlu menjadwalkan — sync akan otomatis terjadi
       saat koneksi kembali melalui useEffect [isOnline] di atas. */
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
