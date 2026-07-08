/*
 * File: src/lib/utils/show-toast.ts
 * Description: Kumpulan utilitas untuk menampilkan notifikasi pesan singkat (toast) menggunakan pustaka sonner,
 * dengan dukungan deteksi status koneksi online/offline secara otomatis.
 */

import { toast } from "sonner";

/********** Fungsi Notifikasi Toast **********/

/**
 * Menampilkan notifikasi toast yang sadar status sinkronisasi (koneksi internet).
 * Menampilkan pesan sukses hijau saat online, dan pesan info dengan ikon awan saat offline.
 *
 * @param onlineMessage - Pesan yang ditampilkan saat perangkat online.
 * @param offlineMessage - Pesan kustom opsional saat perangkat offline.
 */
export function showSyncToast(
  onlineMessage: string,
  offlineMessage?: string
) {
  if (typeof navigator !== "undefined" && navigator.onLine) {
    toast.success(onlineMessage);
  } else {
    toast(offlineMessage || "Saved offline. Will sync when connected.", {
      icon: "☁️",
    });
  }
}

/**
 * Menampilkan notifikasi toast untuk tindakan penghapusan data (destructive action).
 *
 * @param message - Pesan konfirmasi penghapusan berhasil.
 */
export function showDeleteToast(message: string = "Deleted successfully") {
  if (typeof navigator !== "undefined" && navigator.onLine) {
    toast.success(message);
  } else {
    toast(message + " (will sync when online)", { icon: "☁️" });
  }
}

/**
 * Menampilkan notifikasi toast untuk kondisi error atau kegagalan sistem.
 *
 * @param message - Pesan error yang akan ditampilkan.
 */
export function showErrorToast(message: string) {
  toast.error(message);
}
