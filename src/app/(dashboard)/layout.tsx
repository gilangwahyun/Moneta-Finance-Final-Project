//********** START: Dashboard Layout **********
//********** Responsive layout shell for the main app:
//**********   - Mobile:  Bottom tab bar navigation
//**********   - Desktop: Fixed left sidebar navigation
//**********
//********** Includes client-side auth guard.
//********** END: Dashboard Layout **********

"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuthUser } from "@/hooks/use-auth-user";

import { useHydration } from "@/hooks/use-hydration";
import { requestPersistentStorage } from "@/lib/utils/persistent-storage";
import { useSyncContext } from "@/providers/SyncProvider";
import { SyncStatusBadge, SyncStatusPanel } from "@/components/layout/SyncStatusBadge";
import { useBackButtonGuard } from "@/hooks/use-back-button-guard";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { useTransactionForm } from "@/providers/TransactionFormProvider";
import { Plus, PieChart, PanelLeftClose, PanelLeft } from "lucide-react";
import { NetworkStatusBadge } from "@/components/layout/NetworkStatusBadge";
import { SpeedDialFAB } from "@/components/ui/SpeedDialFAB";
import { useNotifications } from "@/hooks/use-notifications";

//********** Navigation Items (Bottom nav - 5 items, Notifications moved to header) **********
const BASE_NAV_ITEMS = [
  {
    label: "Beranda",
    href: "/",
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1h-2z" />
      </svg>
    ),
  },
  {
    label: "Transaksi",
    href: "/transactions",
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
  },
  {
    label: "Analisis",
    href: "/analytics",
    icon: (
      <PieChart className="h-5 w-5" strokeWidth={1.8} />
    ),
  },
  {
    label: "Anggaran",
    href: "/budgets",
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12V7a2 2 0 00-2-2H5a2 2 0 00-2 2v5m18 0v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5m18 0H3m14-7a2 2 0 00-2-2m-2 2a2 2 0 00-2-2m-2 2a2 2 0 00-2-2" />
      </svg>
    ),
  },
];

const TARGET_ITEM = {
  label: "Target",
  href: "/targets",
  icon: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
};

const PROFILE_ITEM = {
  label: "Profil",
  href: "/profile",
  icon: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
};

const NOTIFICATION_ITEM = {
  label: "Notifikasi",
  href: "/notifications",
  icon: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
    </svg>
  ),
};

const MOBILE_NAV_ITEMS = [
  ...BASE_NAV_ITEMS,
  TARGET_ITEM,
];

const SIDEBAR_ITEMS = [
  ...BASE_NAV_ITEMS,
  TARGET_ITEM,
  NOTIFICATION_ITEM,
  PROFILE_ITEM,
];

//********** COMPONENT **********
/**
 * Main dashboard layout wrapper providing responsive navigation,
 * auth guarding, and global state synchronization.
 * @param children - The page content to render inside the layout
 * @returns The dashboard layout component
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading, loadUser } = useAuthUser();
  const { unreadCount, fetchUnreadCount, markLogRead } = useNotifications();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { scheduleSync } = useSyncContext();

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768 && window.innerWidth < 1024) {
        setIsCollapsed(true);
      } else if (window.innerWidth >= 1024) {
        setIsCollapsed(false);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  //********** Initial hydration (detects empty IndexedDB) **********
  const { hydrationState, hydratedCount } = useHydration();

  //********** Auth guard **********
  useEffect(() => {
    async function checkAuth() {
      try {
        const sessionUser = await loadUser();
        if (!sessionUser) {
          router.replace("/login");
        } else {
          // BUG FIX: Start the digest timer here
          const { startDigestTimer } = await import("@/lib/sw/register");
          startDigestTimer(sessionUser.id);
        }
      } catch {
        router.replace("/login");
      }
    }
    checkAuth();
  }, [router, loadUser]);

  //********** Request persistent storage (Layer 1) **********
  useEffect(() => {
    requestPersistentStorage();
  }, []);

  //********** Fetch unread notification count (for badge) **********
  //********** IDB-only: reads from local notification_inbox for offline support.
  //********** Pull sync populates the inbox so no server fallback is needed.
  // Now handled by useNotifications hook via fetchUnreadCount

  useEffect(() => {
    //********** Fetch after auth check completes (user is set)
    if (!isLoading) fetchUnreadCount();
  }, [isLoading, fetchUnreadCount]);

  //********** Bug 3 Fix: Handle SW_NAVIGATE deep-link from notification click **********
  //********** The service worker sends this message after focusing an existing tab.
  //********** We listen here (root layout, always mounted) and use Next.js router.
  //********** Also handles NOTIFICATION_CLICKED: marks log as read locally and enqueues sync.
  useEffect(() => {
    if (!navigator.serviceWorker) return;

    const handleSWMessage = async (event: MessageEvent) => {
      const msgType = event.data?.type;

      if (msgType === "SW_NAVIGATE" && event.data?.path) {
        router.push(event.data.path);
      }

      //********** Handle notification click: mark as read + enqueue sync
      if (msgType === "NOTIFICATION_CLICKED" && event.data?.notificationClientId) {
        const clientId = event.data.notificationClientId as string;
        console.log("[Layout] NOTIFICATION_CLICKED received — clientId:", clientId);
        try {
          await markLogRead(clientId);
          console.log("[Layout] markLogRead completed for clientId:", clientId);
          // Trigger sync so readAt reaches the server
          scheduleSync();
        } catch (e) {
          console.warn("[Layout] NOTIFICATION_CLICKED handler error:", e);
        }
        // Always refresh unread count
        fetchUnreadCount();
      }

      //********** Legacy: handle ADD_TO_INBOX renamed to INBOX_UPDATED
      if (msgType === "INBOX_UPDATED") {
        //********** Refresh unread badge count after SW writes to inbox
        fetchUnreadCount();
      }
    };

    navigator.serviceWorker.addEventListener("message", handleSWMessage);
    return () => {
      navigator.serviceWorker.removeEventListener("message", handleSWMessage);
    };
  }, [router, fetchUnreadCount, scheduleSync]);

  //********** Cold-start notifRead param: app was closed when notification was clicked.
  //********** SW opened a new window with ?notifRead=<clientId>. Process it once on mount.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const notifReadId = params.get("notifRead");
    if (!notifReadId) return;

    console.log("[Layout] notifRead param detected — clientId:", notifReadId);
    // Remove param from URL cleanly (replace state, no reload)
    const cleanUrl = window.location.pathname + window.location.search.replace(/[?&]notifRead=[^&]+/, "").replace(/^&/, "?");
    window.history.replaceState(null, "", cleanUrl || window.location.pathname);

    (async () => {
      try {
        await markLogRead(notifReadId);
        console.log("[Layout] Cold-start markLogRead completed for clientId:", notifReadId);
        scheduleSync();
        fetchUnreadCount();
      } catch (e) {
        console.warn("[Layout] Cold-start notifRead handler error:", e);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  //********** When hydration pulls new data, reload so hooks re-fetch
  useEffect(() => {
    if (hydrationState === "done" && hydratedCount > 0) {
      window.location.reload();
    }
  }, [hydrationState, hydratedCount]);

  //********** Notification logs are now synced via the global SyncManager (sync-queue).

  //********** Back button guard (PWA only) **********
  //********** Must be called here (before any conditional returns)
  //********** to comply with React's Rules of Hooks.
  const { showExitConfirm, confirmExit, cancelExit } = useBackButtonGuard();
  const { openForm } = useTransactionForm();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent mx-auto" />
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Memuat Moneta…</p>
        </div>
      </div>
    );
  }

  if (hydrationState === "hydrating") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent mx-auto" />
          <p className="mt-4 text-sm font-medium text-slate-700 dark:text-slate-300">Menyinkronkan data…</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Mengambil data dari server, ini hanya terjadi sekali</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">

      {/* //********** Exit Confirmation Dialog (PWA Back Button) ********** */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center">
          {/* //********** Backdrop ********** */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={cancelExit}
          />
          {/* //********** Sheet ********** */}
          <div className="relative z-10 w-full max-w-sm rounded-t-2xl bg-white p-6 shadow-2xl dark:bg-slate-800 sm:rounded-2xl">
            <div className="mb-1 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 dark:bg-red-900/20">
              <svg className="h-6 w-6 text-red-500" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </div>
            <h2 className="mt-3 text-base font-semibold text-slate-900 dark:text-slate-50">
              Keluar dari Moneta?
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Data kamu sudah tersimpan dan akan tersinkronisasi otomatis saat kamu kembali.
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <button
                onClick={confirmExit}
                className="w-full rounded-xl bg-red-600 py-3 text-sm font-semibold text-white transition-all hover:bg-red-700 active:scale-[0.98]"
              >
                Keluar dari Aplikasi
              </button>
              <button
                onClick={cancelExit}
                className="w-full rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300"
              >
                Tetap di Aplikasi
              </button>
            </div>
          </div>
        </div>
      )}
      {/* //********** Desktop Sidebar (md+) ********** */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-slate-200 bg-white transition-all duration-300 dark:border-slate-800 dark:bg-slate-900 md:flex ${
          isCollapsed ? "w-16" : "w-64"
        }`}
      >
        {/* //********** Brand & Toggle Header ********** */}
        <div className={`flex h-16 shrink-0 items-center border-b border-slate-100 dark:border-slate-700 transition-all duration-300 ${isCollapsed ? "justify-center px-2" : "justify-between px-4"}`}>
          {/* //********** Logo & Text (Left) ********** */}
          <div className={`flex items-center overflow-hidden transition-all duration-300 ${isCollapsed ? "max-w-0 opacity-0 gap-0" : "max-w-[150px] opacity-100 gap-3"}`}>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-sm font-bold text-white shadow-md">
              M
            </div>
            <div className="flex flex-col whitespace-nowrap">
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">Moneta</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Pencatat Keuangan</p>
            </div>
          </div>

          {/* //********** Toggle Button - with tooltip when collapsed ********** */}
          <div className="group relative">
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              aria-label={isCollapsed ? "Buka sidebar navigasi" : "Tutup sidebar navigasi"}
              className="rounded-md p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            >
              {isCollapsed ? <PanelLeft className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
            </button>
            {isCollapsed && (
              <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-4 -translate-y-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-md transition-all duration-150 group-hover:opacity-100 dark:bg-white dark:text-slate-900">
                Buka Sidebar
              </span>
            )}
          </div>
        </div>

        {/* //********** Desktop Add Transaction Button ********** */}
        <div className="border-b border-slate-100 py-4 dark:border-slate-800/50">
          <div className="group relative flex justify-center px-3">
            <button
              onClick={() => openForm()}
              className={`flex items-center justify-center rounded-xl bg-indigo-600 text-sm font-semibold text-white shadow-md shadow-indigo-500/20 transition-all hover:bg-indigo-500 active:scale-95 dark:bg-indigo-500 dark:hover:bg-indigo-400 ${
                isCollapsed ? "h-10 w-10 p-0 gap-0 mx-auto shrink-0" : "w-full py-3 px-4 gap-2"
              }`}
            >
              <Plus className="h-5 w-5 shrink-0" />
              <span
                className={`whitespace-nowrap overflow-hidden transition-all duration-300 ${
                  isCollapsed ? "max-w-0 opacity-0" : "max-w-[150px] opacity-100"
                }`}
              >
                Tambah Transaksi
              </span>
            </button>
            {/* //********** Tooltip - only when collapsed ********** */}
            {isCollapsed && (
              <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-4 -translate-y-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-md transition-all duration-150 group-hover:opacity-100 dark:bg-white dark:text-slate-900">
                Tambah Transaksi
              </span>
            )}
          </div>
        </div>

        {/* //********** Nav links ********** */}
        <nav className={`flex-1 px-2 py-3 scrollbar-hide ${isCollapsed ? "overflow-visible" : "overflow-y-auto overflow-x-hidden"}`}>
          <div className="flex flex-col gap-1">
          {SIDEBAR_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            const showBadge = item.href === "/notifications" && unreadCount > 0;
            return (
              <div key={item.href} className="group relative flex items-center">
                <Link
                  href={item.href}
                  className={`relative flex items-center rounded-xl text-sm font-semibold transition-all active:scale-[0.98] ${
                    isCollapsed ? "justify-center p-0 w-10 h-10 mx-auto gap-0" : "w-full gap-3 px-4 py-2.5 min-h-[44px]"
                  } ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20 dark:bg-indigo-500"
                      : "text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-100"
                  }`}
                >
                  <span className={`relative shrink-0 ${isActive ? "text-white" : ""}`}>
                    {item.icon}
                    {showBadge && isCollapsed && (
                      <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-indigo-500 px-1 text-[9px] font-bold text-white ring-2 ring-white dark:ring-slate-800">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}
                    {showBadge && !isCollapsed && (
                      <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-indigo-500 ring-2 ring-white dark:ring-slate-800" />
                    )}
                  </span>

                  <span
                    className={`whitespace-nowrap overflow-hidden transition-all duration-300 ${
                      isCollapsed ? "max-w-0 opacity-0" : "max-w-[150px] opacity-100"
                    }`}
                  >
                    {item.label}
                  </span>

                  {showBadge && !isCollapsed && (
                    <span className={`ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300"
                    }`}>
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </Link>

                {/* //********** Tooltip - only rendered when sidebar is collapsed ********** */}
                {isCollapsed && (
                  <span className="pointer-events-none absolute left-full z-50 ml-4 whitespace-nowrap rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-md transition-all duration-150 group-hover:opacity-100 dark:bg-white dark:text-slate-900">
                    {item.label}
                    {showBadge && (
                      <span className="ml-1.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-indigo-500 px-1 text-[9px] font-bold text-white dark:bg-indigo-600">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}
                  </span>
                )}
              </div>
            );
          })}
          </div>
        </nav>

        {/* //********** Sync status panel (hide when collapsed) ********** */}
        <div className={`px-3 transition-all duration-300 ${isCollapsed ? "max-h-0 opacity-0 pb-0 overflow-hidden" : "opacity-100 pb-2 overflow-visible"}`}>
          <SyncStatusPanel />
        </div>



        {/* //********** User info at bottom ********** */}
        <div className={`border-t border-slate-100 py-3 dark:border-slate-800/50 flex items-center transition-all duration-300 ${isCollapsed ? "flex-col gap-3 justify-center px-2" : "justify-between px-4"}`}>
          <div className="group relative flex items-center">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-200 to-slate-300 text-xs font-bold text-slate-600 dark:from-slate-600 dark:to-slate-700 dark:text-slate-300">
              {user?.username?.charAt(0).toUpperCase() || "U"}
            </div>
            <p
              className={`truncate text-sm font-medium text-slate-800 dark:text-slate-100 transition-all duration-300 ${
                isCollapsed ? "max-w-0 opacity-0 ml-0" : "max-w-[120px] opacity-100 ml-3"
              }`}
            >
              {user?.username || "Pengguna"}
            </p>
            {/* //********** User tooltip (collapsed only) ********** */}
            {isCollapsed && (
              <span className="pointer-events-none absolute left-full z-50 ml-4 whitespace-nowrap rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-md transition-all duration-150 group-hover:opacity-100 dark:bg-white dark:text-slate-900">
                {user?.username || "Pengguna"}
              </span>
            )}
          </div>
          <ThemeToggle />
        </div>
      </aside>

      {/* //********** Main Content ********** */}
      <main
        className={`flex-1 min-w-0 pb-20 md:pb-6 transition-all duration-300 ${
          isCollapsed ? "md:pl-16" : "md:pl-64"
        }`}
      >
        {/* //********** Mobile header ********** */}
        <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur-lg dark:border-slate-800 dark:bg-slate-900/90 md:hidden">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-[10px] font-bold text-white">
              M
            </div>
            <span className="text-sm font-bold text-slate-800 dark:text-slate-100">Moneta</span>
            {/* //********** Offline badge - shown inline with logo ********** */}
            <NetworkStatusBadge />
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <SyncStatusBadge />
            {/* //********** Notification Bell (mobile only) ********** */}
            <Link
              href="/notifications"
              className="relative flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
              aria-label="Notifikasi"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute right-0.5 top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-indigo-600 px-1 text-[9px] font-bold text-white ring-1 ring-white dark:ring-slate-800">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Link>
            <Link href="/profile" className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
              {user?.username?.charAt(0).toUpperCase() || "U"}
            </Link>
          </div>
        </header>

        {/* //********** Page content - single canonical layout wrapper ********** */}
        <div className="w-full max-w-5xl mx-auto p-4 pt-20 md:p-8 md:pt-8 pb-36 md:pb-8 min-h-screen">
          {children}
        </div>
      </main>

      {/* //********** Global Mobile FAB ********** */}
      {(pathname === "/" || pathname === "/transactions") && <SpeedDialFAB />}

      {/* //********** Mobile Bottom Tab Bar ********** */}
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 backdrop-blur-lg dark:border-slate-800 dark:bg-slate-900/95 md:hidden">
        <div className="mx-auto flex max-w-lg items-center justify-around">
          {MOBILE_NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            const showBadge = item.href === "/notifications" && unreadCount > 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-1 flex-col items-center justify-center gap-1 py-2 min-h-[56px] text-[11px] font-medium transition-colors active:scale-95 active:bg-slate-100 dark:active:bg-slate-800/60 ${
                  isActive
                    ? "text-indigo-600 dark:text-indigo-400"
                    : "text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                }`}
              >
                <span className="relative">
                  {item.icon}
                  {showBadge && (
                    <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-indigo-500 ring-1 ring-white dark:ring-slate-800" />
                  )}
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
