/*
 * File: src/hooks/use-notifications.ts
 * Description: Hook kustom React untuk mengelola log notifikasi lokal, kotak masuk pesan belum dibaca, dan pengaturan preferensi pemberitahuan via IndexedDB.
 */

import { useState, useEffect, useCallback } from 'react';
import { getCurrentUser } from '@/lib/local-db/repositories/users';
import { getAllLogs, markLogRead as repoMarkLogRead, markAllLogsRead as repoMarkAllLogsRead, NotificationLogRecord } from '@/lib/local-db/repositories/notification-logs';
import { getUnreadCount as repoGetUnreadCount } from '@/lib/local-db/repositories/notification-inbox';

/********** Hook Utama (useNotifications) **********/

/**
 * Hook kustom untuk mengambil daftar notifikasi lokal pengguna, mengalkulasi jumlah pesan belum dibaca, serta mengelola penandaan status dibaca.
 *
 * @returns Objek berisi daftar log notifikasi, jumlah belum dibaca, status loading, dan metode penandaan status.
 */
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
      /* Abaikan kesalahan jika gagal mengambil jumlah belum dibaca */
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

  /********** [START: Tandai Satu Notifikasi Dibaca & Pembaruan Optimistik] **********/
  const markLogRead = useCallback(async (clientId: string) => {
    /* Pembaruan optimistik jumlah belum dibaca dan status log antarmuka pengguna */
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
  /********** [END: Tandai Satu Notifikasi Dibaca & Pembaruan Optimistik] **********/

  /********** [START: Tandai Semua Notifikasi Dibaca & Pembaruan Optimistik] **********/
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
  /********** [END: Tandai Semua Notifikasi Dibaca & Pembaruan Optimistik] **********/

  /********** Pengembalian Data Hook **********/

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

/********** Hook Pengaturan Notifikasi (useNotificationSettings) **********/

/**
 * Hook kustom untuk mengambil dan mengelola pengaturan serta preferensi notifikasi dari pengguna aktif.
 *
 * @returns Objek berisi status loading dan metode pemanggilan konfigurasi notifikasi.
 */
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

  /********** Pengembalian Data Hook **********/

  return {
    isLoading,
    fetchSettings,
    getUser
  };
}
