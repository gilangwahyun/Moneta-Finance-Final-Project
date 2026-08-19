/*
 * File: src/lib/local-db/repositories/wallets.ts
 * Description: Repositori lokal IndexedDB untuk manajemen data dompet (wallets),
 * mendukung arsitektur offline-first, provisi dompet default, dan kalkulasi saldo dari transaksi.
 */

import { getDB } from "../index";
import { STORES } from "../schema";
import { Wallet, WalletType, Transaction } from "@/types/models.types";
import { enqueueChange } from "./sync-queue";
import { generateClientId } from "@/lib/utils/helpers";

/********** Tipe dan Label Dompet **********/

const WALLET_TYPE_LABELS: Record<WalletType, string> = {
  TUNAI: "Tunai",
  BANK: "Bank",
  E_WALLET: "Dompet Digital",
  INVESTASI: "Investasi",
  LAINNYA: "Lainnya",
};

/********** Operasi Pembuatan (Create) **********/

export interface AddWalletInput {
  name: string;
  type: WalletType;
  initialBalance?: number;
  userId: string;
}

/**
 * Menambahkan dompet baru. Secara otomatis membuat clientId unik dan mengatur syncStatus menjadi PENDING.
 *
 * @param input - Data input dompet (name, type, initialBalance, userId).
 * @returns Promise berisi objek Wallet yang baru dibuat.
 */
export async function addWallet(input: AddWalletInput): Promise<Wallet> {
  const now = new Date().toISOString();

  const wallet: Wallet = {
    clientId: generateClientId(),
    name: input.name.trim(),
    type: input.type,
    initialBalance: input.initialBalance ?? 0,
    userId: input.userId,
    syncStatus: "PENDING",
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  const db = await getDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORES.WALLETS, "readwrite");
    tx.objectStore(STORES.WALLETS).put(wallet);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  await enqueueChange("wallet", "create", wallet.clientId, { ...wallet });
  return wallet;
}

/********** Operasi Pembaruan (Update) **********/

export interface UpdateWalletInput {
  clientId: string;
  name?: string;
  type?: WalletType;
  initialBalance?: number;
}

/**
 * Memperbarui field dompet. Menandai status sebagai PENDING dan memasukkannya ke antrean sinkronisasi.
 *
 * @param input - Data perubahan dompet berdasarkan clientId.
 * @returns Promise berisi objek Wallet yang diperbarui, atau null jika tidak ditemukan.
 */
export async function updateWallet(input: UpdateWalletInput): Promise<Wallet | null> {
  const existing = await getWalletById(input.clientId);
  if (!existing) return null;

  const updated: Wallet = {
    ...existing,
    name: input.name !== undefined ? input.name.trim() : existing.name,
    type: input.type !== undefined ? input.type : existing.type,
    initialBalance: input.initialBalance !== undefined ? input.initialBalance : existing.initialBalance,
    syncStatus: "PENDING",
    updatedAt: new Date().toISOString(),
  };

  const db = await getDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORES.WALLETS, "readwrite");
    tx.objectStore(STORES.WALLETS).put(updated);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  await enqueueChange("wallet", "update", updated.clientId, { ...updated });
  return updated;
}

/********** Operasi Penghapusan (Delete) **********/

/**
 * Melakukan soft-delete pada dompet dengan menandai timestamp deletedAt.
 *
 * @param clientId - ID lokal unik dari dompet yang akan dihapus.
 * @returns Promise berisi boolean yang menunjukkan apakah rekod ditemukan dan dihapus.
 */
export async function deleteWallet(clientId: string): Promise<boolean> {
  const existing = await getWalletById(clientId);
  if (!existing) return false;

  const updated: Wallet = {
    ...existing,
    deletedAt: new Date().toISOString(),
    syncStatus: "PENDING",
    updatedAt: new Date().toISOString(),
  };

  const db = await getDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORES.WALLETS, "readwrite");
    tx.objectStore(STORES.WALLETS).put(updated);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  await enqueueChange("wallet", "delete", clientId, { ...updated });
  return true;
}

/********** Penghapusan Permanen (Khusus Sinkronisasi) **********/

/**
 * Menghapus rekod dompet secara permanen dari IndexedDB lokal.
 *
 * @param clientId - ID lokal unik dari dompet yang akan dihapus permanen.
 * @returns Promise void setelah rekod dihapus.
 */
export async function hardDeleteWallet(clientId: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.WALLETS, "readwrite");
    const store = tx.objectStore(STORES.WALLETS);
    const request = store.delete(clientId);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/********** Operasi Pembacaan (Read) **********/

/**
 * Mengambil seluruh dompet aktif (tidak terhapus) milik seorang pengguna, diurutkan berdasarkan nama.
 *
 * @param userId - ID pengguna pemilik dompet.
 * @returns Promise berisi array Wallet aktif.
 */
export async function getAllWallets(userId: string): Promise<Wallet[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.WALLETS, "readonly");
    const index = tx.objectStore(STORES.WALLETS).index("by_userId");
    const request = index.getAll(userId);

    request.onsuccess = () => {
      const results = (request.result as Wallet[])
        .filter((w) => !w.deletedAt)
        .sort((a, b) => a.name.localeCompare(b.name));
      resolve(results);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Mengambil seluruh dompet (termasuk yang telah dihapus).
 * Berguna untuk mempertahankan informasi nama dompet pada riwayat transaksi.
 *
 * @param userId - ID pengguna pemilik dompet.
 * @returns Promise berisi array seluruh Wallet.
 */
export async function getAllWalletsIncludingDeleted(userId: string): Promise<Wallet[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.WALLETS, "readonly");
    const index = tx.objectStore(STORES.WALLETS).index("by_userId");
    const request = index.getAll(userId);

    request.onsuccess = () => {
      resolve(request.result as Wallet[]);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Mengambil satu dompet berdasarkan clientId lokal.
 *
 * @param clientId - ID lokal unik dompet.
 * @returns Promise berisi Wallet jika ditemukan, atau undefined.
 */
export async function getWalletById(clientId: string): Promise<Wallet | undefined> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.WALLETS, "readonly");
    const request = tx.objectStore(STORES.WALLETS).get(clientId);
    request.onsuccess = () => resolve(request.result as Wallet | undefined);
    request.onerror = () => reject(request.error);
  });
}

/********** Helper Sinkronisasi & Provisi **********/

/**
 * Upsert tingkat rendah (low-level) — digunakan oleh mesin sinkronisasi untuk menerapkan data dari server.
 *
 * @param wallet - Objek Wallet dari server.
 * @param skipQueue - Jika true, perubahan tidak akan dimasukkan kembali ke antrean sinkronisasi.
 * @returns Promise void setelah penyimpanan selesai.
 */
export async function upsertWallet(
  wallet: Wallet,
  skipQueue: boolean = false
): Promise<void> {
  const existing = await getWalletById(wallet.clientId);
  const action = existing ? "update" : "create";

  const db = await getDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORES.WALLETS, "readwrite");
    tx.objectStore(STORES.WALLETS).put(wallet);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  if (!skipQueue) {
    await enqueueChange("wallet", action, wallet.clientId, { ...wallet });
  }
}

/**
 * Upsert dompet secara massal — digunakan oleh mesin sinkronisasi untuk menerapkan banyak rekod sekaligus dalam satu transaksi IDB.
 *
 * @param wallets - Array objek Wallet dari server.
 * @returns Promise void setelah semua rekod disimpan.
 */
export async function bulkUpsertWallets(wallets: Wallet[]): Promise<void> {
  if (wallets.length === 0) return;
  const db = await getDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORES.WALLETS, "readwrite");
    const store = tx.objectStore(STORES.WALLETS);
    for (const wallet of wallets) {
      store.put(wallet);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}


/**
 * Memprovisi dompet default "Tunai" untuk user jika mereka belum memiliki dompet sama sekali.
 * Perbaikan Anti-Duplikasi: Mengecek backend cloud TERLEBIH DAHULU sebelum membuat dompet baru.
 * Hanya membuat dompet default jika IDB lokal DAN server sama-sama mengembalikan 0 dompet.
 *
 * @param userId - ID pengguna.
 * @returns Promise void setelah pengecekan atau pembuatan dompet selesai.
 */
export async function provisionDefaultWallet(userId: string): Promise<void> {
  /********** Langkah 1: Pengecekan di IDB lokal. */
  const localWallets = await getAllWallets(userId);
  if (localWallets.length > 0) return; /* Jika lokal sudah punya dompet, hentikan proses. */

  /********** Langkah 2: Pengecekan di server (jika online) sebelum membuat dompet default. */
  if (typeof navigator !== "undefined" && navigator.onLine) {
    try {
      const res = await fetch("/api/sync/pull?mode=hydrate");
      if (res.ok) {
        const json = await res.json();
        /* Respons pull membungkus data dalam format { success: true, data: { wallets: [] } } */
        const serverWallets = json?.data?.wallets ?? [];
        if (serverWallets.length > 0) {
          /********** Server memiliki dompet — impor ke lokal untuk mencegah pembuatan duplikat. */
          for (const sw of serverWallets) {
            await upsertWallet({
              ...sw,
              syncStatus: "SYNCED",
            });
          }
          console.log(
            `[Wallets] Imported ${serverWallets.length} wallet(s) from server — no default created.`
          );
          return;
        }
      }
    } catch (err) {
      /* Error jaringan — lanjutkan ke proses pembuatan dompet default. */
      console.warn("[Wallets] Server check failed, falling back to default:", err);
    }
  }

  /********** Langkah 3: Lokal DAN server tidak memiliki dompet — aman untuk membuat dompet default. */
  await addWallet({
    name: "Tunai",
    type: "TUNAI",
    initialBalance: 0,
    userId,
  });

  console.log("[Wallets] Default 'Tunai' wallet provisioned for user:", userId);
}
