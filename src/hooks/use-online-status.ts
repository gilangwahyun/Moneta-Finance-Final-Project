//********** START: useOnlineStatus Hook **********
//********** Tracks whether the browser is online or offline.
//********** Useful for showing connectivity indicators and triggering sync.
//********** END: useOnlineStatus Hook **********

"use client";

import { useState, useEffect } from "react";

//********** HOOK **********
/**
 * Tracks whether the browser is online or offline.
 * @returns boolean indicating if the browser is online
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

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

  return isOnline;
}
