/*
 * File: src/hooks/use-online-status.ts
 * Description: Hook kustom React untuk memantau status konektivitas jaringan (online/offline) browser secara real-time.
 */

"use client";

import { useState, useEffect } from "react";

/********** Hook Utama (useOnlineStatus) **********/

/**
 * Hook kustom untuk melacak status koneksi jaringan browser apakah sedang terhubung ke internet (online) atau terputus (offline).
 *
 * @returns boolean `true` jika browser terhubung ke jaringan (online), atau `false` jika offline.
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  /* Dengarkan perubahan status konektivitas jaringan browser */
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  /********** Pengembalian Data Hook **********/

  return isOnline;
}
