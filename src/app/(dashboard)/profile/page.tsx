/********** Imports **********/

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthUser } from "@/hooks/use-auth-user";
import { useSyncContext } from "@/providers/SyncProvider";
import { useOnlineStatus } from "@/hooks/use-online-status";

import { clearLocalCache } from "@/lib/local-db/cache-manager";
import { 
  subscribeToPushNotifications, 
  unsubscribeFromPushNotifications
} from '@/lib/sw/register';
import { csrfFetch } from "@/lib/utils/csrf-fetch";
import { Bell, Tags, ChevronRight, Info, Wallet } from "lucide-react";
import { Tooltip } from "@/components/ui/Tooltip";

/********** Page Component **********/
export default function ProfilePage() {
  /********** State **********/
  const { user, isLoading, clearLocalUser } = useAuthUser();
  const [syncing, setSyncing] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [testingPush, setTestingPush] = useState(false);
  
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const { triggerSync, syncState, pendingCount } = useSyncContext();
  const isOnline = useOnlineStatus();
  const router = useRouter();

  /********** Effects **********/

  useEffect(() => {
    // Check notification permission status
    if ("Notification" in window && "serviceWorker" in navigator) {
      // This initial check is for the browser's permission status, not subscription
      // The actual subscription status is checked in the new useEffect below
      // setPushEnabled(Notification.permission === "granted"); // Removed as new useEffect handles this
    }
  }, []);

  /********** Check push subscription status on mount. */
  useEffect(() => {
    // Check if we already have a subscription on mount
    if ("serviceWorker" in navigator && "PushManager" in window) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          if (sub) {
            setPushEnabled(true);
          }
        });
      });
    }
  }, []);

  /********** Event Handlers **********/

  /**
   * Toggles the push notification subscription status.
   */
  async function handleTogglePush() {
    /********** If already enabled, we unsubscribe. */
    if (pushEnabled) {
      await handleDisablePush();
    } else {
      await handleEnablePush();
    }
  }

  /**
   * Unsubscribes from push notifications both locally and on the server.
   */
  async function handleDisablePush() {
    setSubscribing(true);
    setMessage(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const success = await unsubscribeFromPushNotifications(reg);
      setPushEnabled(!success);
      setMessage(
        success 
          ? { type: 'success', text: 'Notifikasi push dinonaktifkan.' }
          : { type: 'error', text: 'Gagal menonaktifkan notifikasi.' }
      );
    } catch (err) {
      console.error('Failed to disable push:', err);
      setMessage({ type: 'error', text: 'Gagal menonaktifkan notifikasi.' });
    } finally {
      setSubscribing(false);
    }
  }

  /**
   * Triggers a manual sync via the SyncContext.
   */
  async function handleForceSync() {
    setSyncing(true);
    setMessage(null);
    try {
      await triggerSync();
      setMessage({ type: "success", text: "Sinkronisasi berhasil!" });
    } catch {
      setMessage({ type: "error", text: "Sinkronisasi gagal. Silakan coba lagi." });
    } finally {
      setSyncing(false);
    }
  }

  /**
   * Clears the local IndexedDB cache while preserving the user session.
   */
  async function handleClearCache() {
    if (
      !confirm(
        "Ini akan menghapus semua data cache lokal (transaksi, kategori). Data di server aman. Lanjutkan?"
      )
    ) {
      return;
    }

    setClearing(true);
    setMessage(null);
    try {
      await clearLocalCache();

      setMessage({
        type: "success",
        text: "Cache lokal dihapus. Memuat ulang aplikasi...",
      });

      // Reload window to trigger useHydration for a clean state
      setTimeout(() => window.location.reload(), 1000);
    } catch {
      setMessage({ type: "error", text: "Gagal menghapus cache." });
    } finally {
      setClearing(false);
    }
  }

  /**
   * Initiates a download of the user's transaction report from the server.
   */
  async function handleDownloadReport() {
    setDownloading(true);
    setMessage(null);
    try {
      const response = await fetch("/api/export", { credentials: "include" });
      if (!response.ok) {
        const contentType = response.headers.get("Content-Type");
        if (contentType && contentType.includes("application/json")) {
          const errData = await response.json();
          if (errData?.error?.message) {
            throw new Error(errData.error.message);
          }
        }
        throw new Error("Gagal mengekspor data. Coba lagi.");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      // Extract filename from Content-Disposition or use default
      const disposition = response.headers.get("Content-Disposition");
      const match = disposition?.match(/filename="(.+)"/);
      a.download = match?.[1] || "moneta-transaksi.xlsx";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setMessage({ type: "success", text: "Laporan berhasil diunduh!" });
    } catch (err: any) {
      setMessage({ 
        type: "error", 
        text: err?.message || "Gagal mengunduh laporan. Silakan coba lagi." 
      });
    } finally {
      setDownloading(false);
    }
  }

  /**
   * Prompts the user for notification permissions and subscribes to push notifications.
   */
  async function handleEnablePush() {
    if (!('serviceWorker' in navigator)) {
      setMessage({ type: 'error', text: 'Service Worker tidak didukung.' });
      return;
    }
    setSubscribing(true);
    setMessage(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const result = await subscribeToPushNotifications(reg);
      if (result.success) {
        setPushEnabled(true);
        setMessage({ type: 'success', text: 'Notifikasi berhasil diaktifkan untuk perangkat ini!' });
      } else {
        setMessage({ type: 'error', text: result.reason || 'Gagal mengaktifkan notifikasi.' });
        setPushEnabled(false);
      }
    } catch (err: any) {
      console.error('Push subscription failed:', err);
      setMessage({ type: 'error', text: 'Gagal mengaktifkan notifikasi.' });
      setPushEnabled(false);
    } finally {
      setSubscribing(false);
    }
  }

  /**
   * Requests the server to send a test push notification to this device.
   */
  async function handleTestPush() {
    setTestingPush(true);
    setMessage(null);
    try {
      const res = await csrfFetch("/api/notifications/test", { method: "POST" });
      if (!res.ok) throw new Error("Gagal mengirim notifikasi uji coba");
      setMessage({ type: "success", text: "Notifikasi uji coba terkirim! Cek perangkatmu." });
    } catch (err) {
      setMessage({ type: "error", text: "Gagal mengirim notifikasi uji coba." });
    } finally {
      setTestingPush(false);
    }
  }

  /**
   * Logs the user out, clearing the local session and redirecting to the login page.
   * Prompts for confirmation if there are pending sync changes.
   */
  async function handleLogout() {
    if (pendingCount > 0) {
      if (
        !confirm(
          `Kamu memiliki ${pendingCount} perubahan yang belum disinkronkan. Keluar tidak akan menghapusnya dari IndexedDB, tapi tidak akan tersinkronisasi sampai kamu masuk kembali. Lanjutkan?`
        )
      ) {
        return;
      }
    }

    setLoggingOut(true);
    try {
      // Clear the server-side auth cookie
      await csrfFetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      // Clear the local session (user info + lastSyncedAt)
      await clearLocalUser();

      // Redirect to login
      router.replace("/login");
    } catch {
      setMessage({ type: "error", text: "Keluar gagal. Silakan coba lagi." });
      setLoggingOut(false);
    }
  }

  /********** Rendering **********/
  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
            Memuat profil...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-50 sm:text-2xl">
          Profil
        </h1>
        <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">
          Pengaturan akun dan manajemen data
        </p>
      </div>


      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800/50 dark:bg-slate-900">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-xl font-bold text-white shadow-md">
            {user?.username?.charAt(0).toUpperCase() || "U"}
          </div>
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold text-slate-900 dark:text-slate-50">
              {user?.username || "User"}
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Pencatat Keuangan
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 border-t border-slate-100 pt-5 dark:border-slate-800/50 sm:grid-cols-2">
          <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
              Bergabung Sejak
            </p>
            <p className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-slate-50">
              {user?.createdAt
                ? new Date(user.createdAt).toLocaleDateString("id-ID", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                : "—"}
            </p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
              Status Sinkronisasi
            </p>
            <div className="mt-0.5 flex items-center gap-2">
              <span
                className={`inline-block h-2 w-2 rounded-full ${
                  syncState === "syncing"
                    ? "animate-pulse bg-amber-400"
                    : syncState === "error"
                    ? "bg-red-400"
                    : syncState === "offline"
                    ? "bg-slate-400"
                    : "bg-emerald-400"
                }`}
              />
              <p className="text-sm font-semibold capitalize text-slate-900 dark:text-slate-50">
                {syncState === "syncing" ? "Menyinkronkan" : syncState === "error" ? "Kesalahan" : syncState === "offline" ? "Luring" : "Tersinkronisasi"}
                {pendingCount > 0 && ` (${pendingCount} tertunda)`}
              </p>
            </div>
          </div>
        </div>
      </div>


      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800/50 dark:bg-slate-900">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-600">
          Pengaturan Aplikasi
        </h2>

        <div className="space-y-3">
          {/* Wallet Management */}
          <Link
            href="/wallets"
            className="group flex w-full items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-left transition-all hover:bg-slate-50 dark:border-slate-800/50 dark:bg-slate-900 dark:hover:bg-slate-800"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400">
              <Wallet className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-50">
                Manajemen Dompet
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Tambah dan kelola dompet atau rekening kamu
              </p>
            </div>
            <div className="text-slate-600 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-600 dark:group-hover:text-slate-300">
              <ChevronRight className="h-5 w-5" />
            </div>
          </Link>

          {/* Category Management */}
          <Link
            href="/categories"
            className="group flex w-full items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-left transition-all hover:bg-slate-50 dark:border-slate-800/50 dark:bg-slate-900 dark:hover:bg-slate-800"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400">
              <Tags className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-50">
                Manajemen Kategori
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Tambah, ubah, atau hapus kategori kustom
              </p>
            </div>
            <div className="text-slate-600 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-600 dark:group-hover:text-slate-300">
              <ChevronRight className="h-5 w-5" />
            </div>
          </Link>

          {/* Notifications */}
          <Link
            href="/profile/notifications"
            className="group flex w-full items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-left transition-all hover:bg-slate-50 dark:border-slate-800/50 dark:bg-slate-900 dark:hover:bg-slate-800"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400">
              <Bell className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-50">
                Pengaturan Notifikasi
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Kelola peringatan dan ringkasan harian
              </p>
            </div>
            <div className="text-slate-600 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-600 dark:group-hover:text-slate-300">
              <ChevronRight className="h-5 w-5" />
            </div>
          </Link>
        </div>
      </div>


      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800/50 dark:bg-slate-900">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
          Manajemen Data
        </h2>

        <div className="space-y-3">
          {/* Force Sync */}
          <button
            onClick={handleForceSync}
            disabled={syncing}
            className="flex w-full items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-left transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800/50 dark:bg-slate-900 dark:hover:bg-slate-800/50"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400">
              {syncing ? (
                <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
              ) : (
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.8}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-50">
                Sinkronisasi Paksa
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Kirim perubahan lokal dan tarik pembaruan server
              </p>
            </div>
          </button>

          {/* Clear Cache */}
          <button
            onClick={handleClearCache}
            disabled={clearing}
            className="flex w-full items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-left transition-all hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800/50 dark:bg-slate-900 dark:hover:bg-red-900/10"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {clearing ? (
                <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
              ) : (
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.8}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-medium text-red-600 dark:text-red-400">
                  Hapus Cache Lokal
                </p>
                <Tooltip content="Menghapus data sementara di peramban. Transaksi aman." position="top">
                  <Info className="h-3.5 w-3.5 text-slate-600" />
                </Tooltip>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Hapus semua data cache (data server aman)
              </p>
            </div>
          </button>

          {/* Download Report */}
          <button
            onClick={handleDownloadReport}
            disabled={downloading || !isOnline}
            className="flex w-full items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-left transition-all hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800/50 dark:bg-slate-900 dark:hover:bg-emerald-900/10"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400">
              {downloading ? (
                <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
              ) : (
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.8}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                Unduh Laporan Excel
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {isOnline
                  ? "Unduh seluruh data transaksi dalam format Excel (.xlsx) yang rapi"
                  : "Butuh koneksi internet untuk mengekspor laporan Excel"}
              </p>
            </div>
          </button>
        </div>
      </div>



      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800/50 dark:bg-slate-900">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
          Akun
        </h2>

        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex w-full items-center gap-3 rounded-lg border border-red-200 bg-white px-4 py-3 text-left transition-all hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-500/30 dark:bg-slate-900 dark:hover:bg-red-500/10"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {loggingOut ? (
              <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
            ) : (
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-red-600 dark:text-red-400">
              Keluar
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Keluar dan kembali ke layar login
            </p>
          </div>
        </button>
      </div>


      {message && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            message.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400"
              : "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400"
          }`}
        >
          {message.text}
        </div>
      )}
    </div>
  );
}
