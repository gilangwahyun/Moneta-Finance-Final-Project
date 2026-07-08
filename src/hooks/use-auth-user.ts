/*
 * File: src/hooks/use-auth-user.ts
 * Description: Hook kustom React untuk mengelola sesi autentikasi dan profil pengguna lokal menggunakan IndexedDB.
 */

import { useState, useEffect, useCallback } from 'react';
import { User } from '@/types/models.types';

/********** Hook Utama (useAuthUser) **********/

/**
 * Hook kustom untuk memuat, memperbarui, dan menghapus sesi pengguna lokal di dalam IndexedDB.
 *
 * @returns Objek berisi profil pengguna, status loading, status autentikasi, dan metode pengelolaan sesi lokal.
 */
export function useAuthUser() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /* Muat profil pengguna aktif dari database lokal */
  const loadUser = useCallback(async () => {
    setIsLoading(true);
    try {
      const { getCurrentUser } = await import('@/lib/local-db/repositories/users');
      const currentUser = await getCurrentUser();
      setUser(currentUser || null);
      return currentUser || null;
    } catch (error) {
      console.error('Failed to load user from local repository:', error);
      setUser(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /* Simpan atau perbarui data sesi pengguna secara lokal */
  const upsertLocalUser = useCallback(async (userData: User) => {
    try {
      const { upsertUser } = await import('@/lib/local-db/repositories/users');
      await upsertUser(userData);
      setUser(userData);
    } catch (error) {
      console.error('Failed to upsert user to local repository:', error);
      throw error;
    }
  }, []);

  /* Bersihkan sesi lokal saat pengguna keluar dari aplikasi */
  const clearLocalUser = useCallback(async () => {
    try {
      const { clearLocalSession } = await import('@/lib/local-db/repositories/users');
      await clearLocalSession();
      setUser(null);
    } catch (error) {
      console.error('Failed to clear local session:', error);
      throw error;
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  /********** Pengembalian Data Hook **********/

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    loadUser,
    upsertLocalUser,
    clearLocalUser
  };
}
