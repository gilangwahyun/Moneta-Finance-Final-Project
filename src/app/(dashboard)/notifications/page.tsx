'use client';

/********** Imports **********/
import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useNotifications } from '@/hooks/use-notifications';
/********** Types **********/
import { SegmentedControl } from '@/components/ui/SegmentedControl';

interface DisplayNotification {
  /** Unique key for deduplication */
  key: string;
  /** IDB auto-increment id (local items only) */
  localId?: number;
  /** Server-side NotificationLog UUID (same as clientId for this entity) */
  serverId?: string;
  title: string;
  body: string;
  type: string;
  eventType?: string;
  /** true = unread */
  isUnread: boolean;
  createdAt: string;
  ctaRoute?: string;
  actionType?: string;
  ctaLabel?: string;
  sourceBudgetId?: string;
  targetBudgetId?: string;
  recommendedAmount?: number;
  /** "local" | "server" — determines which mark-read path to use */
  source: 'local' | 'server';
}

/********** Helpers **********/

function formatAbsoluteTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Formats a date string into a relative time description (e.g., "Baru saja", "Kemarin").
 *
 * @param dateStr - The ISO date string to format.
 * @returns A relative time string or null if older than 7 days.
 */
function formatRelativeTime(dateStr: string): string | null {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'Baru saja';
  if (diffMins < 60) return `${diffMins} mnt lalu`;
  if (diffHours < 24) return `${diffHours} jam lalu`;
  if (diffDays === 1) return 'Kemarin';
  if (diffDays < 7) return `${diffDays} hari lalu`;

  return null;
}

interface NotificationGroup {
  label: string;
  items: DisplayNotification[];
}

/**
 * Groups an array of notifications by their creation date (Hari Ini, Kemarin, or full date).
 *
 * @param notifications - The list of display notifications to group.
 * @returns An array of notification groups ready for rendering.
 */
function groupNotifications(notifications: DisplayNotification[]): NotificationGroup[] {
  const groups: NotificationGroup[] = [];
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  notifications.forEach(notif => {
    const date = new Date(notif.createdAt);
    const notifDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    let label = '';
    if (notifDate.getTime() === today.getTime()) {
      label = 'Hari Ini';
    } else if (notifDate.getTime() === yesterday.getTime()) {
      label = 'Kemarin';
    } else {
      label = date.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      });
    }
    
    let group = groups.find(g => g.label === label);
    if (!group) {
      group = { label, items: [] };
      groups.push(group);
    }
    group.items.push(notif);
  });
  
  return groups;
}

/********** Render Helpers **********/

/**
 * Renders a semantic pill badge based on the notification type or eventType.
 * Maps system types to user-friendly Indonesian labels and colors.
 */
function TypeBadge({ type, eventType }: { type: string; eventType?: string }) {
  const colors: Record<string, string> = {
    system: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
    BUDGET_CRITICAL: 'bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400',
    BUDGET_WARNING: 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-300',
    BUDGET_INFO: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300',
    TARGET_PROGRESS: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
    TARGET_ACHIEVED: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
    SPENDING_INSIGHT: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
    DAILY_EXPENSE_SUMMARY: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
    REMINDER: 'bg-purple-50 text-purple-700 dark:bg-purple-950/20 dark:text-purple-300',
    DIGEST: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
    SYSTEM: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  };
  const label: Record<string, string> = {
    system: 'Sistem',
    BUDGET_CRITICAL: 'Kritis',
    BUDGET_WARNING: 'Peringatan',
    BUDGET_INFO: 'Info Anggaran',
    TARGET_PROGRESS: 'Target',
    TARGET_ACHIEVED: 'Tercapai ✓',
    SPENDING_INSIGHT: 'Insight',
    DAILY_EXPENSE_SUMMARY: 'Harian',
    REMINDER: 'Pengingat',
    DIGEST: 'Ringkasan',
    SYSTEM: 'Sistem',
  };

  // Safe fallback mapping for legacy numeric types
  let resolvedType = eventType || type;
  if (!eventType) {
    if (type === '0.1') resolvedType = 'BUDGET_CRITICAL';
    else if (type === '0.2') resolvedType = 'BUDGET_WARNING';
    else if (type === '0.3') resolvedType = 'BUDGET_INFO';
    else if (!isNaN(Number(type))) resolvedType = 'SPENDING_INSIGHT'; // All other numeric types
  }

  const colorClass = colors[resolvedType] ?? colors['SPENDING_INSIGHT'];
  const labelText = label[resolvedType] ?? resolvedType;

  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${colorClass}`}>{labelText}</span>;
}

/**
 * Loading skeleton for the notifications list.
 */
function NotificationSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className="flex items-start gap-4 rounded-xl border border-slate-100 bg-white p-4 dark:border-slate-800/60 dark:bg-slate-900"
        >
          <div className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full bg-slate-200 dark:bg-slate-700" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <div className="h-3.5 w-32 rounded bg-slate-200 dark:bg-slate-700" />
              <div className="h-3 w-16 rounded bg-slate-200 dark:bg-slate-700" />
            </div>
            <div className="h-3 w-full rounded bg-slate-200 dark:bg-slate-700" />
            <div className="h-3 w-3/4 rounded bg-slate-200 dark:bg-slate-700" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Empty state when there are no notifications matching the current filter.
 */
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="relative mb-6">
        <div className="absolute inset-0 animate-ping rounded-full bg-indigo-500/10" />
        <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-900/20">
          <svg className="h-9 w-9 text-indigo-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
            />
          </svg>
        </div>
      </div>
      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50">Semua aman!</h3>
      <p className="mt-1.5 max-w-xs text-sm text-slate-600 dark:text-slate-400">
        Belum ada peringatan keuangan untukmu saat ini. Kami akan memberitahumu jika ada hal penting.
      </p>
    </div>
  );
}

/**
 * Individual notification item component.
 * Handles read-state styling and rendering embedded CTA buttons.
 */
function NotificationListItem({ item, onMarkRead, onNavigate }: { item: DisplayNotification; onMarkRead: (item: DisplayNotification) => void; onNavigate: (item: DisplayNotification) => void }) {
  return (
    <button
      onClick={() => {
        if (item.isUnread) onMarkRead(item);
        onNavigate(item);
      }}
      className={`group w-full rounded-xl border text-left transition-all duration-200 ${
        item.isUnread
          ? 'border-indigo-200 bg-indigo-50/40 hover:border-indigo-200 hover:bg-indigo-50/70 dark:border-indigo-800/60 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/40'
          : 'border-slate-100 bg-white dark:border-slate-800/60 dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50'
      }`}
    >
      <div className="flex items-start gap-3.5 p-4">
        {/* Unread dot */}
        <div className="mt-1.5 shrink-0">
          {item.isUnread ? (
            <div className="h-2 w-2 rounded-full bg-indigo-500 shadow-sm shadow-indigo-500/50" />
          ) : (
            <div className="h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-600" />
          )}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
            <p
              className={`text-sm font-semibold leading-tight ${
                item.isUnread ? 'text-slate-900 dark:text-slate-50' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {item.title}
            </p>
            <div className="flex shrink-0 items-center gap-2">
              <TypeBadge type={item.type} eventType={item.eventType} />
              <span className="text-[11px] text-slate-600 dark:text-slate-400">
                {formatAbsoluteTime(item.createdAt)}
                {formatRelativeTime(item.createdAt) && ` • ${formatRelativeTime(item.createdAt)}`}
              </span>
            </div>
          </div>
          <p
            className={`text-sm leading-relaxed ${
              item.isUnread ? 'text-slate-600 dark:text-slate-300' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            {item.body}
          </p>
          
          {/* CTA Button */}
          {item.actionType === 'REALLOCATE_BUDGET' && item.ctaRoute && (
            <div className="mt-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (item.isUnread) onMarkRead(item);
                  onNavigate(item);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-600 transition-colors hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-500/20"
              >
                {item.ctaLabel || 'Subsidi Silang'}
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

/********** Page Component **********/
export default function NotificationsPage() {
  /********** State **********/
  const router = useRouter();
  const { logs, unreadCount, isLoading, error, fetchLogs, markLogRead, markAllLogsRead } = useNotifications();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const loadedRef = useRef(false);

  /********** Derived State **********/
  // Map logs to DisplayNotification format
  const notifications: DisplayNotification[] = useMemo(() => {
    return logs.map((item) => ({
      key: `log-${item.clientId}`,
      serverId: item.clientId,
      title: item.title,
      body: item.body,
      type: item.type,
      eventType: item.eventType,
      isUnread: !item.readAt,
      createdAt: item.createdAt,
      ctaRoute: item.ctaRoute,
      actionType: item.actionType,
      ctaLabel: item.ctaLabel,
      sourceBudgetId: item.sourceBudgetId,
      targetBudgetId: item.targetBudgetId,
      recommendedAmount: item.recommendedAmount,
      source: 'local' as const,
    })).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [logs]);

  const filteredNotifications = notifications.filter(n => filter === 'all' || n.isUnread);

  /********** Effects **********/
  
  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  /********** Subscribe to background worker events for live refresh. */
  useEffect(() => {
    const handleEvent = () => fetchLogs();

    window.addEventListener('moneta-notification-updated', handleEvent);
    window.addEventListener('moneta-sync-completed', handleEvent);

    return () => {
      window.removeEventListener('moneta-notification-updated', handleEvent);
      window.removeEventListener('moneta-sync-completed', handleEvent);
    };
  }, [fetchLogs]);

  /********** Event Handlers **********/

  /**
   * Marks a notification as read and performs an optimistic local update.
   */
  const handleMarkRead = useCallback(async (item: DisplayNotification) => {
    if (item.serverId) {
      await markLogRead(item.serverId);
    }
  }, [markLogRead]);

  /**
   * Marks all current unread notifications as read.
   */
  const handleMarkAllRead = useCallback(async () => {
    if (unreadCount === 0 || isMarkingAll) return;
    setIsMarkingAll(true);
    await markAllLogsRead();
    setIsMarkingAll(false);
  }, [unreadCount, isMarkingAll, markAllLogsRead]);

  /**
   * Handles navigation when a notification item or CTA is clicked.
   * Defaults to specific feature pages depending on the notification type
   * if an explicit ctaRoute is not provided.
   *
   * @param item - The selected notification.
   */
  const handleNavigate = useCallback((item: DisplayNotification) => {
    let targetPath = item.ctaRoute;
    if (!targetPath) {
      const type = item.eventType || item.type;
      if (
        type === "BUDGET_CRITICAL" || 
        type === "BUDGET_WARNING" || 
        type === "BUDGET_INFO"
      ) {
        targetPath = "/budgets";
      } else if (type === "TARGET_PROGRESS" || type === "TARGET_ACHIEVED") {
        targetPath = "/targets";
      } else if (
        type === "SPENDING_INSIGHT" || 
        type === "WANTS_PROJECTION" || 
        type === "WEEKEND_TRAP" || 
        type === "CATEGORY_SPIKE" || 
        type === "PEAK_DAY" || 
        type === "HIGH_EXPENSE_RATIO" || 
        type === "DAILY_EXPENSE_SUMMARY"
      ) {
        targetPath = "/analytics";
      } else if (type === "REMINDER") {
        targetPath = "/transactions";
      } else {
        targetPath = "/notifications";
      }
    }
    
    if (targetPath !== "/notifications") {
      router.push(targetPath);
    }
  }, [router]);

  /********** Rendering **********/
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-50 sm:text-2xl">Notifikasi</h1>
          <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">
            {isLoading
              ? 'Memuat...'
              : notifications.length === 0
                ? 'Belum ada pesan'
                : unreadCount > 0
                  ? `${unreadCount} belum dibaca`
                  : 'Semua sudah dibaca'}
          </p>
        </div>

        {unreadCount > 0 && !isLoading && (
          <button
            onClick={handleMarkAllRead}
            disabled={isMarkingAll}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-indigo-600 transition-all hover:bg-indigo-50 disabled:opacity-50 dark:text-indigo-400 dark:hover:bg-indigo-950/40"
          >
            {isMarkingAll ? (
              <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
            ) : (
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            )}
            Tandai semua dibaca
          </button>
        )}
      </div>


      {!isLoading && notifications.length > 0 && (
        <div className="w-full sm:max-w-xs">
          <SegmentedControl
            options={[
              { value: 'all', label: 'Semua' },
              { value: 'unread', label: 'Belum Dibaca' }
            ]}
            value={filter}
            onChange={(val) => setFilter(val as 'all' | 'unread')}
            fullWidth
          />
        </div>
      )}


      {isLoading ? (
        <NotificationSkeleton />
      ) : error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-800/60 dark:bg-rose-950/20 dark:text-rose-400">
          {error}
          <button onClick={fetchLogs} className="ml-2 underline underline-offset-2">
            Coba lagi
          </button>
        </div>
      ) : filteredNotifications.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-6">
          {groupNotifications(filteredNotifications).map((group) => (
            <div key={group.label} className="space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 px-1">
                {group.label}
              </h2>
              <div className="space-y-2">
                {group.items.map((item) => (
                  <NotificationListItem key={item.key} item={item} onMarkRead={handleMarkRead} onNavigate={handleNavigate} />
                ))}
              </div>
            </div>
          ))}

          {/* Footer */}
          <p className="pt-2 text-center text-[11px] text-slate-600 dark:text-slate-600">Menampilkan {filteredNotifications.length} notifikasi</p>
        </div>
      )}
    </div>
  );
}
