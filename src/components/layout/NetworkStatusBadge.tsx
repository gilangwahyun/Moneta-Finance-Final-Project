// ─── NetworkStatusBadge ──────────────────────────────────
// Bug 12 Fix: Hyper-minimalist compact badge that never causes
// horizontal overflow on small mobile viewports.
// Shows only when offline. Uses "Mode Luring" with WifiOff icon.

"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

export function NetworkStatusBadge() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    // Initialise from current navigator state
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

  if (!isOffline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex max-w-fit items-center gap-1 whitespace-nowrap rounded-full border border-amber-300/60 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:border-amber-500/30 dark:bg-amber-900/20 dark:text-amber-400"
    >
      <WifiOff className="h-3 w-3 shrink-0" />
      <span>Offline</span>
    </div>
  );
}
