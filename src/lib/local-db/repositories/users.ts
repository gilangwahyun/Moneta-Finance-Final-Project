/*
 * File: src/lib/local-db/repositories/users.ts
 * Description: Repositori lokal IndexedDB untuk penyimpanan sesi user aktif (di store sync_meta),
 * mengelola data cache pengguna, waktu sinkronisasi terakhir, serta pemicu migrasi dan provisi dompet.
 */

import { getDB } from "../index";
import { STORES } from "../schema";
import { User } from "@/types/models.types";

/********** Operasi Pengguna (User Session) **********/

const USER_KEY = "current_user";
const LAST_SYNCED_KEY = "last_synced_at";

/**
 * Menyimpan data pengguna aktif ke dalam penyimpanan lokal (sync_meta).
 * Secara otomatis memprovisi dompet default "Tunai" jika belum ada dan menjalankan migrasi v5.
 *
 * @param user - Objek User dari hasil autentikasi.
 * @returns Promise void setelah user disimpan dan inisialisasi selesai.
 */
export async function upsertUser(user: User): Promise<void> {
  const db = await getDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORES.SYNC_META, "readwrite");
    const store = tx.objectStore(STORES.SYNC_META);
    store.put({ key: USER_KEY, value: user });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  /********** Impor secara lazy untuk menghindari circular dependency dengan wallets.ts. */
  const { provisionDefaultWallet } = await import("./wallets");
  await provisionDefaultWallet(user.id);

  /********** Jalankan migrasi sekali per perangkat: perbaiki transaksi lama yang belum memiliki walletId. */
  /* Transaksi yang dibuat sebelum skema multi-dompet v5 */
  const { runV5WalletMigration } = await import("../migrations/v5-wallet-migration");
  await runV5WalletMigration(user.id).catch((err) =>
    console.error("[Migration v5] Failed:", err)
  );
}

/**
 * Mengambil informasi pengguna yang saat ini terautentikasi dari penyimpanan lokal.
 *
 * @returns Promise berisi User aktif jika ada, atau null.
 */
export async function getCurrentUser(): Promise<User | null> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.SYNC_META, "readonly");
    const store = tx.objectStore(STORES.SYNC_META);
    const request = store.get(USER_KEY);

    request.onsuccess = () => {
      const result = request.result;
      resolve(result ? result.value : null);
    };
    request.onerror = () => reject(request.error);
  });
}

/********** Metadata Sinkronisasi & Sesi **********/

/**
 * Menyimpan timestamp waktu sinkronisasi terakhir berhasil dilakukan.
 *
 * @param timestamp - Format waktu ISO string.
 * @returns Promise void setelah waktu disimpan.
 */
export async function setLastSyncedAt(timestamp: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.SYNC_META, "readwrite");
    const store = tx.objectStore(STORES.SYNC_META);
    store.put({ key: LAST_SYNCED_KEY, value: timestamp });

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Mengambil timestamp kapan sinkronisasi terakhir kali berhasil dilakukan.
 *
 * @returns Promise berisi ISO string waktu sinkronisasi, atau null.
 */
export async function getLastSyncedAt(): Promise<string | null> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.SYNC_META, "readonly");
    const store = tx.objectStore(STORES.SYNC_META);
    const request = store.get(LAST_SYNCED_KEY);

    request.onsuccess = () => {
      const result = request.result;
      resolve(result ? result.value : null);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Menghapus seluruh data sesi lokal di store sync_meta (digunakan saat logout).
 *
 * @returns Promise void setelah penyimpanan lokal dikosongkan.
 */
export async function clearLocalSession(): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.SYNC_META, "readwrite");
    const store = tx.objectStore(STORES.SYNC_META);
    store.clear();

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
