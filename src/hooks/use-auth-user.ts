import { useState, useEffect, useCallback } from 'react';
import { User } from '@/types/models.types';

export function useAuthUser() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    loadUser,
    upsertLocalUser,
    clearLocalUser
  };
}
