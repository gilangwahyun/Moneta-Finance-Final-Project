// ─── NotificationToggle ──────────────────────────────────
// Client component that handles the full Web Push subscription
// lifecycle, including all browser API edge cases that cause
// the "silent / unresponsive button" bug.
//
// Root causes of the "button does nothing" bug (all handled below):
//   1. navigator.serviceWorker.register() resolves BEFORE the SW is
//      actually active. Using `navigator.serviceWorker.ready` (a Promise
//      that waits for the active SW) is the correct fix.
//   2. pushManager.subscribe() silently fails if the VAPID key is
//      passed as a raw base64url string instead of a Uint8Array/ArrayBuffer.
//   3. No try/catch means errors are swallowed and the UI never updates.
//   4. Notification.permission is not re-checked on mount, so the button
//      shows the wrong state if the user previously granted/denied.

"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { csrfFetch } from "@/lib/utils/csrf-fetch";
import { urlBase64ToUint8Array } from "@/lib/sw/register";

// ── Types ────────────────────────────────────────────────

type PermissionState = "unsupported" | "default" | "granted" | "denied";

// ── VAPID key encoder ────────────────────────────────────
//
// THE #1 ROOT CAUSE OF SILENT FAILURES: passing the raw base64url
// string directly to pushManager.subscribe(). The Web Push API requires
// a Uint8Array / ArrayBuffer. This function performs the conversion.
//
// Source: https://web.dev/push-notifications-subscribing-a-user/


// ── Component ────────────────────────────────────────────

interface NotificationToggleProps {
  /** Additional CSS classes for the wrapper */
  className?: string;
}

export function NotificationToggle({ className = "" }: NotificationToggleProps) {
  const [permission, setPermission] = useState<PermissionState>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // start true while we probe state

  // ── 1. Probe current state on mount ─────────────────────
  // Check Notification API support and current permission level so the
  // button renders the correct initial state without a user interaction.
  useEffect(() => {
    // Guard: SSR / browser without Notification API
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPermission("unsupported");
      setIsLoading(false);
      return;
    }

    // Guard: browser without Service Worker API
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setPermission("unsupported");
      setIsLoading(false);
      return;
    }

    // Read the current permission (no prompt — just a read)
    setPermission(Notification.permission as PermissionState);

    // Check if there's already an active subscription for this browser
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        setIsSubscribed(sub !== null);
      })
      .catch((err) => {
        console.error("[NotificationToggle] getSubscription error:", err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  // ── 2. Subscribe ─────────────────────────────────────────
  const handleSubscribe = useCallback(async () => {
    setIsLoading(true);

    try {
      // ── Guard: double-check browser support ──────────────
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        toast.error("Notifikasi push tidak didukung oleh browser ini.");
        return;
      }

      // ── Guard: VAPID key must be set ──────────────────────
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        // This is a developer configuration error, not a user error
        console.error(
          "[NotificationToggle] NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set in .env. " +
          "Push subscription cannot proceed without it."
        );
        toast.error(
          "Konfigurasi notifikasi bermasalah. Silakan hubungi dukungan."
        );
        return;
      }

      // ── Step 1: Request permission ────────────────────────
      // requestPermission() must be called from a user gesture (click).
      // It will no-op if already granted; it shows the prompt if 'default'.
      const result = await Notification.requestPermission();
      setPermission(result as PermissionState);

      if (result !== "granted") {
        if (result === "denied") {
          // Permission is now blocked — the browser will never show the
          // prompt again. The user must manually unblock it.
          toast.error(
            "Notifikasi diblokir. Izinkan melalui pengaturan situs di browser kamu, lalu muat ulang halaman.",
            { duration: 6000 }
          );
        } else {
          toast.warning("Izin notifikasi tidak diberikan.");
        }
        return;
      }

      // ── Step 2: Wait for the active Service Worker ────────
      // navigator.serviceWorker.register() resolves when the SW is
      // *registered*, not when it is *active*. Using `.ready` is the
      // correct way to get a registration with an active worker that
      // can own a PushManager subscription.
      console.log("[NotificationToggle] Waiting for active service worker…");
      const registration = await navigator.serviceWorker.ready;
      console.log("[NotificationToggle] Service worker is active:", registration.active?.scriptURL);

      // ── Step 3: Subscribe with PushManager ───────────────
      // THE CRITICAL FIX: convert the base64url VAPID key to ArrayBuffer.
      // Passing the raw string here silently fails in most browsers.
      const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);

      const pushSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true, // Required by all browsers — must be true
        applicationServerKey,
      });

      console.log(
        "[NotificationToggle] PushSubscription created:",
        pushSubscription.endpoint
      );

      // ── Step 4: Save subscription to the server ───────────
      const response = await csrfFetch("/api/notifications/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pushSubscription.toJSON()),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = typeof errorData.error === 'string' 
          ? errorData.error 
          : (errorData.error?.message || `Server error ${response.status}`);
        
        console.error("[NotificationToggle] Server rejected subscription:", errorData);
        throw new Error(errorMsg);
      }

      setIsSubscribed(true);
      toast.success("Notifikasi diaktifkan! Kamu akan menerima pengingat dari Moneta.");


    } catch (err: unknown) {
      console.error("[NotificationToggle] Subscribe error:", err);

      // DOMException: NotAllowedError — user dismissed the prompt without
      // clicking Allow. Not quite "denied" (they can be asked again).
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        toast.warning("Izin ditolak. Klik tombol lagi untuk mencoba ulang.");
        setPermission("default");
      } else {
        const message =
          err instanceof Error ? err.message : "An unknown error occurred.";
        toast.error(`Gagal mengaktifkan notifikasi: ${message}`);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── 3. Unsubscribe ───────────────────────────────────────
  const handleUnsubscribe = useCallback(async () => {
    setIsLoading(true);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        const endpoint = subscription.endpoint;

        // Unsubscribe at the browser level
        await subscription.unsubscribe();

        // Remove from server DB
        await csrfFetch("/api/notifications/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint }),
        });
      }

      setIsSubscribed(false);
      toast.success("Notifikasi dinonaktifkan.");
    } catch (err) {
      console.error("[NotificationToggle] Unsubscribe error:", err);
      toast.error("Gagal menonaktifkan notifikasi. Silakan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── 4. Render ────────────────────────────────────────────

  // Case: browser doesn't support the required APIs
  if (permission === "unsupported") {
    return (
      <div className={`rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50 ${className}`}>
        <div className="flex items-start gap-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400 dark:bg-slate-700">
            <BellSlashIcon />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Notifikasi tidak tersedia
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
              Browser kamu tidak mendukung notifikasi push.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Case: user has blocked notifications
  if (permission === "denied") {
    return (
      <div className={`rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-800/50 dark:bg-amber-950/30 ${className}`}>
        <div className="flex items-start gap-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400">
            <WarningIcon />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              Notifikasi diblokir
            </p>
            <p className="mt-0.5 text-[11px] leading-tight text-slate-500 dark:text-slate-400">
              Untuk mengaktifkannya, klik ikon gembok di bilah alamat browser kamu
              dan atur <strong>Notifikasi</strong> ke <strong>Izinkan</strong>,
              lalu muat ulang halaman.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Case: normal toggle button (default / granted states)
  const isOn = isSubscribed && permission === "granted";

  return (
    <div className={`rounded-xl border p-3 transition-all ${
      isOn
        ? "border-indigo-200 bg-indigo-50 dark:border-indigo-800/50 dark:bg-indigo-950/30"
        : "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50"
    } ${className}`}>
      <div className="flex items-center gap-2.5">
        {/* Icon */}
        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors ${
          isOn
            ? "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400"
            : "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
        }`}>
          {isLoading ? <SpinnerIcon /> : isOn ? <BellIcon /> : <BellSlashIcon />}
        </div>

        {/* Text */}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
            {isOn ? "Notifikasi aktif" : "Notifikasi nonaktif"}
          </p>
          <p className="mt-0.5 text-[11px] leading-tight text-slate-500 dark:text-slate-400">
            {isOn
              ? "Kamu akan menerima pengingat dari Moneta."
              : "Aktifkan untuk menerima peringatan anggaran dan pengeluaran."}
          </p>
        </div>

        {/* Toggle button */}
        <button
          id="notification-toggle-btn"
          onClick={isOn ? handleUnsubscribe : handleSubscribe}
          disabled={isLoading}
          aria-pressed={isOn}
          aria-label={isOn ? "Nonaktifkan notifikasi" : "Aktifkan notifikasi"}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus:ring-offset-slate-900 ${
            isOn
              ? "bg-indigo-600"
              : "bg-slate-200 dark:bg-slate-600"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out ${
              isOn ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>
    </div>
  );
}

// ── Icons ────────────────────────────────────────────────

function BellIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
      />
    </svg>
  );
}

function BellSlashIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.172 9.172a4 4 0 015.656 5.656M9.172 9.172L6.343 6.343m2.829 2.829A6 6 0 006 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h9m2 0v1a3 3 0 01-3 3m3-4h-3m0 0L6 6m0 0L3 3"
      />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
      />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}
