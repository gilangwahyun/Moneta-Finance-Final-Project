/*
 * File: src/hooks/use-back-button-guard.ts
 * Description: Hook kustom React untuk mengelola navigasi tombol kembali (back button) pada PWA standalone dengan pola Pinterest, mencegah keluar aplikasi secara tidak sengaja di rute utama.
 */

"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";

/********** Konfigurasi Path Utama **********/

/* Path utama yang memicu pelindung keluar aplikasi (bukan rute internal aplikasi) */
const ROOT_PATHS = new Set(["/", "/dashboard"]);

/********** Hook Utama (useBackButtonGuard) **********/

/**
 * Hook kustom untuk memantau penekanan tombol kembali browser/OS pada mode PWA, menampilkan dialog konfirmasi keluar saat berada di halaman utama.
 *
 * @returns Objek berisi status dialog konfirmasi, fungsi konfirmasi keluar, dan fungsi pembatalan.
 */
export function useBackButtonGuard() {
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const pathname = usePathname();
  const handlerRef = useRef<((e: PopStateEvent) => void) | null>(null);
  const isExitingRef = useRef(false);
  /* Lacak apakah status penjaga dummy saat ini sudah dimasukkan ke history */
  const guardPushedRef = useRef(false);

  /********** [START: Inisialisasi Penanganan Navigasi Kembali PWA] **********/
  useEffect(() => {
    /* Hanya aktifkan pelindung pada mode PWA standalone */
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in window.navigator &&
        (window.navigator as Navigator & { standalone?: boolean })
          .standalone === true);

    if (!isStandalone) return;

    const isAtRoot = ROOT_PATHS.has(pathname);

    /* Hapus event listener yang terdaftar sebelumnya sebelum mendaftarkan ulang */
    if (handlerRef.current) {
      window.removeEventListener("popstate", handlerRef.current);
      handlerRef.current = null;
    }

    if (!isAtRoot) {
      /* Halaman internal: JANGAN dorong status penjaga ke history.
       * Biarkan browser menangani navigasi kembali secara alami (pola Pinterest). */
      guardPushedRef.current = false;
      return;
    }

    /* Halaman utama: dorong SATU status penjaga dummy agar penekanan kembali memicu popstate */
    if (!guardPushedRef.current) {
      history.pushState({ pwaGuard: true }, "");
      guardPushedRef.current = true;
    }

    const handlePopState = (e: PopStateEvent) => {
      if (isExitingRef.current) return;

      /* Hanya hadang ketika pengguna masih berada di rute utama */
      if (!ROOT_PATHS.has(window.location.pathname)) {
        return;
      }

      /* Dorong kembali status agar penjaga tetap aktif untuk penekanan berikutnya */
      history.pushState({ pwaGuard: true }, "");
      setShowExitConfirm(true);
    };

    handlerRef.current = handlePopState;
    window.addEventListener("popstate", handlePopState);

    return () => {
      if (handlerRef.current) {
        window.removeEventListener("popstate", handlerRef.current);
        handlerRef.current = null;
      }
    };
  }, [pathname]);
  /********** [END: Inisialisasi Penanganan Navigasi Kembali PWA] **********/

  /********** [START: Eksekusi Keluar dari Aplikasi PWA] **********/
  const confirmExit = useCallback(() => {
    if (isExitingRef.current) return;
    isExitingRef.current = true;

    /* Hapus listener sebelum navigasi untuk mencegah pemicuan ulang */
    if (handlerRef.current) {
      window.removeEventListener("popstate", handlerRef.current);
      handlerRef.current = null;
    }
    guardPushedRef.current = false;
    setShowExitConfirm(false);

    /* Langkah 1: Coba penutupan standar PWA */
    window.close();

    /* Langkah 2: Fallback anggun — navigasi mundur melewati seluruh entri history */
    setTimeout(() => {
      const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
      if (isStandalone) {
        const steps = window.history.length;
        if (steps > 1) {
          window.history.go(-steps);
        } else {
          window.history.replaceState(null, "", "/");
          window.history.go(-1);
        }
      } else {
        window.history.go(-window.history.length);
      }
    }, 200);
  }, []);
  /********** [END: Eksekusi Keluar dari Aplikasi PWA] **********/

  const cancelExit = useCallback(() => {
    setShowExitConfirm(false);
    isExitingRef.current = false;
    /* Status penjaga sudah didorong kembali oleh handlePopState */
  }, []);

  /********** Pengembalian Data Hook **********/

  return { showExitConfirm, confirmExit, cancelExit };
}
