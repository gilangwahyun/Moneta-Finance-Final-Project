/*
 * File: src/lib/utils/persistent-storage.ts
 * Description: Utilitas untuk meminta penyimpanan persisten (Persistent Storage API) dari browser
 * agar data IndexedDB tidak dihapus otomatis saat memori penuh, serta mengambil estimasi penggunaan kuota penyimpanan.
 */

/********** Permintaan Penyimpanan Persisten **********/

/**
 * Meminta izin penyimpanan persisten (persistent storage) dari browser.
 * Jika diizinkan, data IndexedDB tidak akan dihapus otomatis oleh sistem saat ruang penyimpanan penuh.
 *
 * @returns Promise boolean yang menunjukkan apakah izin persistensi diberikan.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof navigator === "undefined") return false;
  if (!navigator.storage?.persist) {
    console.log("[Storage] Persistent Storage API not supported.");
    return false;
  }

  /********** Periksa apakah penyimpanan sudah bersifat persisten. */
  const alreadyPersisted = await navigator.storage.persisted();
  if (alreadyPersisted) {
    console.log("[Storage] Storage is already persistent.");
    return true;
  }

  /********** Ajukan permintaan izin penyimpanan persisten ke browser. */
  const granted = await navigator.storage.persist();
  console.log(`[Storage] Persistence ${granted ? "granted ✓" : "denied ✗"}`);
  return granted;
}

/********** Estimasi Penggunaan Penyimpanan **********/

/**
 * Mengambil estimasi penggunaan dan kuota penyimpanan browser saat ini.
 *
 * @returns Promise berisi objek usage (terpakai dalam byte), quota (total kuota), dan percentage, atau null jika API tidak didukung.
 */
export async function getStorageEstimate(): Promise<{
  usage: number;
  quota: number;
  percentage: number;
} | null> {
  if (typeof navigator === "undefined") return null;
  if (!navigator.storage?.estimate) return null;

  const estimate = await navigator.storage.estimate();
  const usage = estimate.usage || 0;
  const quota = estimate.quota || 0;
  const percentage = quota > 0 ? Math.round((usage / quota) * 100) : 0;

  return { usage, quota, percentage };
}
