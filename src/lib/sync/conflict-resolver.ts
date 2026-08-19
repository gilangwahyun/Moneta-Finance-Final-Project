/********** Mengimplementasikan strategi resolusi konflik "last write wins"
 *  berbasis timestamp updatedAt. Digunakan oleh sync manager (sisi klien)
 *  dan API endpoint (sisi server) saat terjadi konflik antara versi klien
 *  dan server untuk record yang sama.
 */

/********** Imports **********/

/********** Types **********/

export interface ConflictPair<T extends { updatedAt: string }> {
  clientVersion: T;
  serverVersion: T;
}

type Resolution = 'client_wins' | 'server_wins';

export interface ConflictResult<T> {
  winner: T;
  loser: T;
  resolution: Resolution;
}

/********** Main Logic **********/

/**
 * Menyelesaikan konflik antara versi klien dan server menggunakan strategi
 * "last write wins" berdasarkan timestamp `updatedAt`.
 *
 * @param pair - Object berisi `clientVersion` dan `serverVersion`.
 * @returns Result berisi pemenang, pecundang, dan hasil resolusi.
 */
export function resolveConflict<T extends { updatedAt: string }>(pair: ConflictPair<T>): ConflictResult<T> {
  const clientTime = new Date(pair.clientVersion.updatedAt).getTime();
  const serverTime = new Date(pair.serverVersion.updatedAt).getTime();

  if (clientTime >= serverTime) {
    return {
      winner: pair.clientVersion,
      loser: pair.serverVersion,
      resolution: 'client_wins',
    };
  } else {
    return {
      winner: pair.serverVersion,
      loser: pair.clientVersion,
      resolution: 'server_wins',
    };
  }
}

/**
 * Menentukan apakah record server harus menimpa record lokal saat operasi pull.
 *
 * Mengembalikan `true` jika:
 * - Record lokal tidak ada
 * - Record lokal sudah berstatus SYNCED (tidak ada perubahan lokal yang pending)
 * - Versi server memiliki timestamp `updatedAt` yang lebih baru
 *
 * @param local - Record lokal saat ini, atau `undefined` jika belum ada.
 * @param server - Record versi server yang akan di-pull.
 * @returns `true` jika record server boleh menimpa lokal.
 */
function shouldOverwriteLocal<T extends { updatedAt: string; syncStatus?: string }>(local: T | undefined, server: T): boolean {
  /********** Tidak ada versi lokal — selalu terima dari server. */
  if (!local) return true;

  /********** Lokal sudah SYNCED — aman untuk ditimpa. */
  if (local.syncStatus === 'SYNCED') return true;

  /********** Lokal masih PENDING — bandingkan timestamp terlebih dahulu. */
  const localTime = new Date(local.updatedAt).getTime();
  const serverTime = new Date(server.updatedAt).getTime();

  return serverTime > localTime;
}
