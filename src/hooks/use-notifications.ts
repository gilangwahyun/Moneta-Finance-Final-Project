import { useState, useEffect, useCallback } from 'react';
import { getCurrentUser } from '@/lib/local-db/repositories/users';
import { getAllLogs, markLogRead as repoMarkLogRead, markAllLogsRead as repoMarkAllLogsRead, NotificationLogRecord } from '@/lib/local-db/repositories/notification-logs';
import { getUnreadCount as repoGetUnreadCount } from '@/lib/local-db/repositories/notification-inbox';

export function useNotifications() {
  const [logs, setLogs] = useState<NotificationLogRecord[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const count = await repoGetUnreadCount();
      setUnreadCount(count);
    } catch {
      // fail silently
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const user = await getCurrentUser();
      if (!user) return;
      const data = await getAllLogs(user.id);
      setLogs(data);
    } catch (err) {
      console.error('[useNotifications] Fetch error:', err);
      setError('Gagal memuat notifikasi. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  const markLogRead = useCallback(async (clientId: string) => {
    // Optimistic unread count
    setUnreadCount(prev => Math.max(0, prev - 1));
    setLogs(prev => prev.map(log => log.clientId === clientId ? { ...log, readAt: new Date().toISOString() } : log));
    try {
      await repoMarkLogRead(clientId);
      fetchUnreadCount();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('moneta-notification-updated'));
      }
    } catch (err) {
      console.error(err);
      fetchUnreadCount();
      fetchLogs();
    }
  }, [fetchUnreadCount, fetchLogs]);

  const markAllLogsRead = useCallback(async () => {
    const prevCount = unreadCount;
    setUnreadCount(0);
    setLogs(prev => prev.map(log => ({ ...log, readAt: new Date().toISOString() })));
    try {
      const user = await getCurrentUser();
      if (user) {
        await repoMarkAllLogsRead(user.id);
        fetchUnreadCount();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('moneta-notification-updated'));
        }
      }
    } catch (err) {
      console.error(err);
      fetchUnreadCount();
      fetchLogs();
    }
  }, [unreadCount, fetchUnreadCount, fetchLogs]);

  return {
    logs,
    unreadCount,
    isLoading,
    error,
    fetchLogs,
    fetchUnreadCount,
    markLogRead,
    markAllLogsRead
  };
}

export function useNotificationSettings() {
  const [isLoading, setIsLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const user = await getCurrentUser();
      if (!user) return null;
      const { getNotificationSettings } = await import('@/lib/local-db/repositories/notification-settings');
      return await getNotificationSettings(user.id);
    } catch (err) {
      console.error(err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getUser = useCallback(async () => {
    return await getCurrentUser();
  }, []);

  return {
    isLoading,
    fetchSettings,
    getUser
  };
}
