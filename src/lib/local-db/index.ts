/*
 * File: src/lib/local-db/index.ts
 * Description: Modul inisialisasi dan pengelola koneksi IndexedDB lokal,
 * menangani pembukaan database, migrasi skema/versi, serta penanganan konflik antar-tab.
 */

import { DB_NAME, DB_VERSION, STORE_SCHEMAS, STORES } from "./schema";

/********** Koneksi & Inisialisasi Database **********/

let dbPromise: Promise<IDBDatabase> | null = null;

/**
 * Membuka atau mengembalikan koneksi database IndexedDB yang sudah ada (singleton pattern).
 * Otomatis membuat object store dan indeks pada saat pertama kali dibuka atau saat upgrade versi.
 *
 * @returns Promise berisi instance IDBDatabase yang aktif.
 */
export function getDB(): Promise<IDBDatabase> {
  if (dbPromise) {
    /* console.log("[DB] Returning existing dbPromise"); */
    return dbPromise;
  }

  console.log(`[DB] Opening ${DB_NAME} v${DB_VERSION}...`);

  dbPromise = new Promise((resolve, reject) => {
    try {
      if (typeof indexedDB === 'undefined') {
        throw new Error("IndexedDB is not available (SSR or unsupported environment)");
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      /********** Tangani pemblokiran (misalnya tab lain sedang membuka versi lama). */
      request.onblocked = (event) => {
        console.warn("[DB] Database open BLOCKED by another connection. Please close other tabs of this app.", event);
        alert("Database upgrade blocked. Please close other tabs of Moneta and refresh.");
      };

      request.onupgradeneeded = (event) => {
        console.log(`[DB] Upgrade needed: v${event.oldVersion} -> v${event.newVersion}`);
        const db = (event.target as IDBOpenDBRequest).result;
        const existingStores = Array.from(db.objectStoreNames);

        for (const schema of STORE_SCHEMAS) {
          let store: IDBObjectStore;
          if (!existingStores.includes(schema.name)) {
            console.log(`[DB] Creating store: ${schema.name}`);
            store = db.createObjectStore(schema.name, {
              keyPath: schema.keyPath,
              autoIncrement: schema.autoIncrement,
            });
          } else {
            store = request.transaction!.objectStore(schema.name);
          }

          const existingIndexes = Array.from(store.indexNames);
          for (const index of schema.indexes) {
            if (!existingIndexes.includes(index.name)) {
              console.log(`[DB] Creating index: ${index.name} on ${schema.name}`);
              
              /********** Jika menambahkan indeks unik ke store yang sudah ada, kosongkan store terlebih dahulu untuk menghindari error konstrain. */
              if (schema.name === STORES.NOTIFICATION_LOGS && index.name === "by_dedupeKey") {
                 console.log("[DB] Clearing notification_logs to allow creation of unique index by_dedupeKey");
                 store.clear();
              }
              
              store.createIndex(index.name, index.keyPath, index.options);
            }
          }
        }
      };

      request.onsuccess = () => {
        const db = request.result;
        console.log("[DB] Success: Connection established");

        /********** Tangani perubahan versi yang diminta oleh tab atau service worker lain. */
        db.onversionchange = () => {
          console.warn("[DB] Version change detected. Closing connection to allow upgrade.");
          db.close();
          dbPromise = null;
          window.location.reload(); /* Muat ulang halaman untuk menggunakan versi baru */
        };

        resolve(db);
      };

      request.onerror = (event) => {
        console.error("[DB] Open Error:", request.error);
        dbPromise = null;
        reject(request.error);
      };
    } catch (err) {
      console.error("[DB] Initialization Exception:", err);
      dbPromise = null;
      reject(err);
    }
  });

  return dbPromise;
}

/********** Penutupan Koneksi **********/

/**
 * Menutup dan mereset koneksi database secara manual.
 * Digunakan saat reset data lokal atau logout.
 */
function closeDB(): void {
  if (dbPromise) {
    dbPromise.then((db) => {
      console.log("[DB] Closing connection manually");
      db.close();
    }).catch(() => {});
    dbPromise = null;
  }
}
