/*
 * File: src/components/layout/NetworkStatusBadge.tsx
 * Description: Lencana indikator status jaringan yang hanya muncul saat peramban berada dalam kondisi luring (offline).
 */

"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

/**
 * Merender indikator status luring agar pengguna mengetahui bahwa aplikasi beroperasi secara offline.
 *
 * @returns Elemen JSX lencana status jaringan atau null jika daring
 */
export function NetworkStatusBadge() {
  const [isOffline, setIsOffline] = useState(false);

  /********** [START: Pemantauan Status Jaringan Peramban] **********/
  useEffect(() => {
    /* Inisialisasi awal berdasarkan status koneksi navigator peramban */
    setIsOffline(!navigator.onLine);

    const goOffline = () => setIsOffline(true);
    const goOnline = () => setIsOffline(false);

    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);
  /********** [END: Pemantauan Status Jaringan Peramban] **********/

  if (!isOffline) return null;

  /********** [START: Perenderan Lencana Status Luring] **********/
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex max-w-fit items-center gap-1 whitespace-nowrap rounded-full border border-amber-300/60 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:border-amber-500/30 dark:bg-amber-900/20 dark:text-amber-400"
    >
      <WifiOff className="h-3 w-3 shrink-0" />
      <span>Mode Luring</span>
    </div>
  );
  /********** [END: Perenderan Lencana Status Luring] **********/
}
