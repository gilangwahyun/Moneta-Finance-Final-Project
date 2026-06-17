//********** START: Conflict Resolver **********
//********** Implements timestamp-based "last write wins" conflict resolution.
//**********
//********** Used by both the sync manager (client-side) and the API
//********** endpoint (server-side) when conflicts arise between
//********** client and server versions of the same record.
//********** END: Conflict Resolver **********

//********** TYPES **********
export interface ConflictPair<T extends { updatedAt: string }> {
  clientVersion: T;
  serverVersion: T;
}

export type Resolution = "client_wins" | "server_wins";

export interface ConflictResult<T> {
  winner: T;
  loser: T;
  resolution: Resolution;
}

//********** UTILS **********
/**
 * Resolve a conflict between client and server versions using
 * the "last write wins" strategy based on `updatedAt` timestamps.
 */
export function resolveConflict<T extends { updatedAt: string }>(
  pair: ConflictPair<T>
): ConflictResult<T> {
  const clientTime = new Date(pair.clientVersion.updatedAt).getTime();
  const serverTime = new Date(pair.serverVersion.updatedAt).getTime();

  if (clientTime >= serverTime) {
    return {
      winner: pair.clientVersion,
      loser: pair.serverVersion,
      resolution: "client_wins",
    };
  } else {
    return {
      winner: pair.serverVersion,
      loser: pair.clientVersion,
      resolution: "server_wins",
    };
  }
}

/**
 * Check whether a server record should overwrite a local record
 * during a pull operation.
 *
 * Returns true if:
 *  - The local record doesn't exist
 *  - The local record is already SYNCED (no pending local changes)
 *  - The server version has a newer updatedAt timestamp
 */
export function shouldOverwriteLocal<
  T extends { updatedAt: string; syncStatus?: string }
>(local: T | undefined, server: T): boolean {
  //********** No local version - always accept server
  if (!local) return true;

  //********** Local is already synced - safe to overwrite
  if (local.syncStatus === "SYNCED") return true;

  //********** Local has pending changes - compare timestamps
  const localTime = new Date(local.updatedAt).getTime();
  const serverTime = new Date(server.updatedAt).getTime();

  return serverTime > localTime;
}
