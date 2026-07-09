/*
 * File: src/components/ToastProvider.tsx
 * Description: Penyedia notifikasi toast bergaya dari Sonner dengan penataan posisi responsif (tengah bawah untuk seluler, kanan bawah untuk desktop).
 */

"use client";

import { Toaster } from "sonner";

/**
 * Merender komponen Toaster dari Sonner untuk menampilkan notifikasi mengapung di aplikasi.
 *
 * @returns Elemen JSX Toaster
 */
export function ToastProvider() {
  /********** [START: Perenderan Penyedia Toast Notifikasi] **********/
  return (
    <Toaster
      position="bottom-center"
      toastOptions={{
        duration: 3000,
        style: {
          borderRadius: "12px",
          fontSize: "13px",
          padding: "12px 16px",
        },
      }}
      richColors
      closeButton
    />
  );
  /********** [END: Perenderan Penyedia Toast Notifikasi] **********/
}
