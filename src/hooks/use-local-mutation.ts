/*
 * File: src/hooks/use-local-mutation.ts
 * Description: Hook kustom untuk menyederhanakan dan menstandarisasi operasi mutasi (Create, Update, Delete) ke IndexedDB. Menangani penjadwalan sinkronisasi, pembaruan antarmuka, dan pelaporan error secara seragam.
 */

"use client";

import { useCallback, useState } from "react";
import { useSyncContext } from "@/providers/SyncProvider";

export interface MutationOptions<TResult> {
  /** Callback yang dijalankan jika mutasi berhasil. Gunakan untuk memperbarui state UI secara optimistik atau memuat ulang data. */
  onSuccess?: (result: TResult) => void | Promise<void>;
  /** Nama event khusus (CustomEvent) yang akan di-dispatch setelah mutasi berhasil (opsional). */
  eventName?: string;
  /** Pesan error kustom yang akan disetel jika mutasi gagal. */
  errorMessage?: string;
}

/**
 * Hook utilitas untuk membungkus fungsi mutasi database lokal.
 * 
 * @param mutationFn - Fungsi asinkron yang melakukan operasi mutasi aktual ke IndexedDB.
 * @param options - Konfigurasi callback, dispatch event, dan pesan error.
 * @returns Objek berisi fungsi `mutate` untuk dipanggil komponen, dan state `error`.
 */
export function useLocalMutation<TArgs extends any[], TResult>(
  mutationFn: (...args: TArgs) => Promise<TResult>,
  options: MutationOptions<TResult> = {}
) {
  const { scheduleSync } = useSyncContext();
  const [error, setError] = useState<string | null>(null);

  const mutate = useCallback(
    async (...args: TArgs): Promise<TResult | null> => {
      try {
        setError(null);
        
        // 1. Eksekusi mutasi inti
        const result = await mutationFn(...args);

        // 2. Perbarui state / muat ulang data di UI
        if (options.onSuccess) {
          await options.onSuccess(result);
        }

        // 3. Jadwalkan sinkronisasi ke server di latar belakang
        scheduleSync();

        // 4. Beritahu komponen/hook lain jika ada event yang ditentukan
        if (options.eventName) {
          window.dispatchEvent(new Event(options.eventName));
        }

        return result;
      } catch (err) {
        console.error(`[useLocalMutation] ${options.errorMessage || "Mutation failed"}:`, err);
        setError(options.errorMessage || "Terjadi kesalahan sistem saat menyimpan data.");
        return null;
      }
    },
    // We cannot exhaustively list dependencies if options contains inline functions,
    // so we omit options from the dependency array, assuming mutationFn and options are stable
    // or we can use JSON.stringify if needed. Since this is an internal hook, we rely on the
    // developer to pass stable functions or we accept that it might capture stale closures if not careful.
    // To be safe in React, we'll include them but warn the user to memoize options.
    [mutationFn, scheduleSync, options.onSuccess, options.eventName, options.errorMessage]
  );

  return { mutate, error };
}
