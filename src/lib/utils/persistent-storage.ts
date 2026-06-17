/********** Helpers **********/
/**
 * Request persistent storage from the browser.
 *
 * If granted, IndexedDB won't be auto-evicted under memory pressure.
 * Safely no-ops in environments where the API is unavailable.
 *
 * @returns A boolean indicating whether persistence was granted.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof navigator === "undefined") return false;
  if (!navigator.storage?.persist) {
    console.log("[Storage] Persistent Storage API not supported.");
    return false;
  }

  /********** Check if already persisted. */
  const alreadyPersisted = await navigator.storage.persisted();
  if (alreadyPersisted) {
    console.log("[Storage] Storage is already persistent.");
    return true;
  }

  /********** Request persistence. */
  const granted = await navigator.storage.persist();
  console.log(`[Storage] Persistence ${granted ? "granted ✓" : "denied ✗"}`);
  return granted;
}

/**
 * Get a human-readable summary of current storage usage.
 *
 * @returns An object containing usage, quota, and percentage, or null if unsupported.
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
