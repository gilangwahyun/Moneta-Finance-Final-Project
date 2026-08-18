/*
 * File: src/components/notifications/NotificationToggle.tsx
 * Description: Komponen klien untuk mengelola seluruh siklus berlangganan Web Push Notification termasuk pendaftaran Service Worker dan manajemen izin browser.
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { csrfFetch } from "@/lib/utils/csrf-fetch";
import { urlBase64ToUint8Array } from "@/lib/sw/register";

/********** Definisi Tipe Status Izin Notifikasi **********/

type PermissionState = "unsupported" | "default" | "granted" | "denied";

/********** Komponen Tombol Saklar Notifikasi (NotificationToggle) **********/

interface NotificationToggleProps {
  className?: string;
}

/**
 * Merender tombol saklar (switch) untuk mengaktifkan atau menonaktifkan langganan Web Push Notification pada perangkat pengguna.
 *
 * @param props - Properti kelas CSS tambahan untuk wadah komponen
 * @returns Elemen JSX saklar notifikasi
 */
export function NotificationToggle({ className = "" }: NotificationToggleProps) {
  const [permission, setPermission] = useState<PermissionState>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true); /* Bernilai true saat memeriksa status awal */

  /* Pemeriksaan status dukungan API Notifikasi dan Service Worker saat komponen dimuat */
  useEffect(() => {
    /* Penjaga: SSR atau peramban tanpa dukungan Notification API */
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPermission("unsupported");
      setIsLoading(false);
      return;
    }

    /* Penjaga: peramban tanpa dukungan Service Worker API */
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setPermission("unsupported");
      setIsLoading(false);
      return;
    }

    /* Membaca izin notifikasi saat ini tanpa memicu dialog prompt */
    setPermission(Notification.permission as PermissionState);

    /* Memeriksa apakah terdapat langganan aktif untuk peramban ini */
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        setIsSubscribed(sub !== null);
      })
      .catch((err) => {
        console.error("[NotificationToggle] Error getSubscription:", err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  /********** [START: Pendaftaran Berlangganan Web Push Notification] **********/
  const handleSubscribe = useCallback(async () => {
    setIsLoading(true);

    try {
      /* Langkah 1: Meminta izin notifikasi dari pengguna */
      // We request permission early here just to update the UI state immediately if denied,
      // though subscribeToPushNotifications also requests it.
      const initialPermission = await Notification.requestPermission();
      setPermission(initialPermission as PermissionState);

      if (initialPermission !== "granted") {
        if (initialPermission === "denied") {
          toast.error(
            "Notifikasi diblokir. Izinkan melalui pengaturan situs di browser kamu, lalu muat ulang halaman.",
            { duration: 6000 }
          );
        } else {
          toast.warning("Izin notifikasi tidak diberikan.");
        }
        setIsLoading(false);
        return;
      }

      console.log("[NotificationToggle] Menunggu Service Worker aktif…");
      const registration = await navigator.serviceWorker.ready;
      
      const { subscribeToPushNotifications } = await import("@/lib/sw/register");
      const result = await subscribeToPushNotifications(registration);

      if (result.success) {
        setIsSubscribed(true);
        toast.success("Notifikasi diaktifkan! Kamu akan menerima pengingat dari Moneta.");
      } else {
        console.error("[NotificationToggle] Error berlangganan:", result);
        toast.error(`Gagal mengaktifkan notifikasi: ${result.reason}`);
        
        // Reset permission if it was actually denied
        if (Notification.permission === 'denied') {
          setPermission("denied");
        } else {
          setPermission("default");
        }
      }
    } catch (err: unknown) {
      console.error("[NotificationToggle] Error berlangganan:", err);
      const message = err instanceof Error ? err.message : "Terjadi kesalahan yang tidak diketahui.";
      toast.error(`Gagal mengaktifkan notifikasi: ${message}`);
    } finally {
      setIsLoading(false);
    }
  }, []);
  /********** [END: Pendaftaran Berlangganan Web Push Notification] **********/

  /********** [START: Pembatalan Berlangganan Web Push Notification] **********/
  const handleUnsubscribe = useCallback(async () => {
    setIsLoading(true);

    try {
      const registration = await navigator.serviceWorker.ready;
      const { unsubscribeFromPushNotifications } = await import("@/lib/sw/register");
      
      const success = await unsubscribeFromPushNotifications(registration);

      if (success) {
        setIsSubscribed(false);
        toast.success("Notifikasi dinonaktifkan.");
      } else {
        toast.error("Gagal menonaktifkan notifikasi. Silakan coba lagi.");
      }
    } catch (err) {
      console.error("[NotificationToggle] Unsubscribe error:", err);
      toast.error("Gagal menonaktifkan notifikasi. Silakan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  /* Kasus: Peramban tidak mendukung fitur notifikasi push */
  if (permission === "unsupported") {
    return (
      <div className={`rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50 ${className}`}>
        <div className="flex items-start gap-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-700">
            <BellSlashIcon />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Notifikasi tidak tersedia
            </p>
            <p className="mt-0.5 text-[11px] text-slate-600 dark:text-slate-400">
              Browser kamu tidak mendukung notifikasi push.
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* Kasus: Pengguna memblokir izin notifikasi */
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
            <p className="mt-0.5 text-[11px] leading-tight text-slate-600 dark:text-slate-400">
              Untuk mengaktifkannya, klik ikon gembok di bilah alamat browser kamu
              dan atur <strong>Notifikasi</strong> ke <strong>Izinkan</strong>,
              lalu muat ulang halaman.
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* Kasus normal: Tombol saklar notifikasi dapat dioperasikan */
  const isOn = isSubscribed && permission === "granted";

  return (
    <div className={`rounded-xl border p-3 transition-all ${
      isOn
        ? "border-indigo-200 bg-indigo-50 dark:border-indigo-800/50 dark:bg-indigo-950/30"
        : "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50"
    } ${className}`}>
      <div className="flex items-center gap-2.5">
        {/* Ikon Indikator Status */}
        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors ${
          isOn
            ? "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400"
            : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400"
        }`}>
          {isLoading ? <SpinnerIcon /> : isOn ? <BellIcon /> : <BellSlashIcon />}
        </div>

        {/* Label Status dan Keterangan */}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
            {isOn ? "Notifikasi aktif" : "Notifikasi nonaktif"}
          </p>
          <p className="mt-0.5 text-[11px] leading-tight text-slate-600 dark:text-slate-400">
            {isOn
              ? "Kamu akan menerima pengingat dari Moneta."
              : "Aktifkan untuk menerima peringatan anggaran dan pengeluaran."}
          </p>
        </div>

        {/* Tombol Saklar Utama */}
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

/********** Komponen Ikon Pendukung **********/

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
