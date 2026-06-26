'use client';

/********** [START: Halaman Pengaturan Notifikasi] **********/
/**********
 * Bug 8 Fix: Mutual exclusivity via Radio Group — user selects
 *   EITHER "Peringatan Instan" OR "Ringkasan Berkala", never both.
 * Bug 7 Fix: Progressive Disclosure —
 *   - Time picker expands only when Ringkasan Berkala is selected
 *   - "Batas Frekuensi Harian" hidden inside collapsible "Pengaturan Lanjutan"
 **********/
/********** [END: Halaman Pengaturan Notifikasi] **********/

/********** Imports **********/

import { useState, useEffect, useCallback } from 'react';
import { Zap, CalendarClock, Save, Info, Bell, ShieldCheck, AlertTriangle, ChevronDown, BellOff, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { SecondaryPageLayout } from '@/components/layout/SecondaryPageLayout';
import {
  saveNotifPrefs,
  readTodayCountFromLS,
  DEFAULT_NOTIF_PREFS,
  DEFAULT_DAILY_CAP,
  type LocalNotificationPrefs,
} from '@/lib/local-db/notification-prefs';
import { useNotificationSettings } from '@/hooks/use-notifications';
import { useSyncContext } from '@/providers/SyncProvider';
import { subscribeToPushNotifications } from '@/lib/sw/register';

/********** Render Helpers & Utilities **********/

/********** Types & Constants **********/

type NotifMode = 'NONE' | 'INSTANT' | 'DIGEST';

const DIGEST_TIME_OPTIONS = [
  { value: '07:00', label: '07.00 — Pagi hari' },
  { value: '12:00', label: '12.00 — Siang hari' },
  { value: '18:00', label: '18.00 — Sore hari' },
  { value: '20:00', label: '20.00 — Malam hari (Standar)' },
  { value: '21:00', label: '21.00 — Malam hari' },
  { value: '22:00', label: '22.00 — Sebelum tidur' },
];

const CAP_OPTIONS = [3, 5, 10, -1] as const;

/********** Sub-components **********/

/**
 * Contoh notifikasi OS yang ditampilkan sebagai preview.
 */
function NotificationPreview({ title, body, action1, action2 }: { title: string; body: string; action1?: string; action2?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/60">
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-[10px] font-bold text-white">
          M
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{title}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">{body}</p>
          {(action1 || action2) && (
            <div className="mt-2 flex gap-2">
              {action1 && (
                <span className="rounded border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-700 dark:border-indigo-800/50 dark:bg-indigo-900/30 dark:text-indigo-300">
                  {action1}
                </span>
              )}
              {action2 && (
                <span className="rounded border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                  {action2}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Bug 8: Mutually-exclusive mode card (Radio pattern).
 */
function ModeCard({
  id,
  icon,
  title,
  description,
  selected,
  onSelect,
}: {
  id: NotifMode;
  icon: React.ReactNode;
  title: string;
  description: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`w-full rounded-xl border p-4 text-left transition-all duration-200 active:scale-[0.99] ${
        selected
          ? 'border-indigo-400 bg-indigo-50/60 shadow-sm ring-1 ring-indigo-400 dark:border-indigo-500 dark:bg-indigo-500/10 dark:ring-indigo-500'
          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600 dark:hover:bg-slate-800/50'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
            selected ? 'border-indigo-600 dark:border-indigo-400' : 'border-slate-300 dark:border-slate-600'
          }`}
        >
          {selected && <div className="h-2.5 w-2.5 rounded-full bg-indigo-600 dark:bg-indigo-400" />}
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className={selected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400'}>{icon}</span>
            <p
              className={`text-sm font-semibold ${
                selected ? 'text-indigo-800 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-200'
              }`}
            >
              {title}
            </p>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">{description}</p>
        </div>
      </div>
    </button>
  );
}

/**
 * Expandable container for advanced settings.
 */
function AdvancedSettings({ title = 'Pengaturan Lanjutan', children }: { title?: string; children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const contentId = 'advanced-settings-content';
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700/60">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-expanded={isOpen}
        aria-controls={contentId}
        className="flex w-full items-center justify-between bg-slate-50 px-4 py-3 text-left transition-colors hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800"
      >
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">{title}</span>
        <ChevronDown className={`h-4 w-4 text-slate-600 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div id={contentId} className="animate-in slide-in-from-top-2 fade-in duration-200 bg-white px-4 pb-4 pt-3 dark:bg-slate-900">
          {children}
        </div>
      )}
    </div>
  );
}

/**
 * Selector for setting the daily notification cap.
 */
function DailyCapSelector({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Batas Frekuensi Harian</p>
          <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
            Moneta tidak akan mengirim lebih dari batas ini dalam satu hari.
          </p>
        </div>
        <span className="shrink-0 rounded-lg bg-indigo-50 px-2.5 py-1 text-sm font-bold text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
          {value === -1 ? 'Tanpa batas' : `${value}x / hari`}
        </span>
      </div>
      <div className="flex gap-2">
        {CAP_OPTIONS.map((cap) => (
          <button
            key={cap}
            type="button"
            onClick={() => onChange(cap)}
            aria-pressed={value === cap}
            className={`flex min-h-[44px] flex-1 items-center justify-center rounded-xl border text-sm font-bold transition-all active:scale-95 ${
              value === cap
                ? 'border-indigo-500 bg-indigo-600 text-white shadow-sm'
                : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:bg-indigo-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400'
            }`}
          >
            {cap === -1 ? 'Tanpa batas' : cap}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
        Batas ini hanya berlaku untuk notifikasi perangkat (OS). Riwayat di halaman Notifikasi tetap tersimpan meskipun batas tercapai.
      </p>
    </div>
  );
}

/**
 * Progress bar showing today's notification usage relative to the daily cap.
 */
function TodayUsageBar({ count, cap }: { count: number; cap: number }) {
  const pct = cap > 0 ? Math.min(100, Math.round((count / cap) * 100)) : 0;
  const isFull = count >= cap;
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3.5 dark:border-slate-800 dark:bg-slate-900/50">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Penggunaan Hari Ini</p>
        <span className={`text-xs font-bold ${isFull ? 'text-amber-600 dark:text-amber-400' : 'text-indigo-600 dark:text-indigo-400'}`}>
          {cap === -1 ? `${count} terkirim hari ini · Tanpa batas` : `${count} / ${cap}`}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
        <div
          className={`h-full rounded-full transition-all duration-500 ${isFull ? 'bg-amber-500' : 'bg-indigo-500'}`}
          style={{ width: `${cap === -1 ? 100 : pct}%` }}
        />
      </div>
      <p className="mt-1.5 text-xs text-slate-600">
        {cap === -1
          ? 'Perangkat ini dapat menerima jumlah notifikasi yang tidak terbatas.'
          : isFull
            ? 'Batas notifikasi perangkat hari ini tercapai. Riwayat di halaman Notifikasi tetap tersimpan.'
            : count === 0
              ? 'Belum ada notifikasi perangkat hari ini.'
              : `${cap - count} notifikasi perangkat tersisa hari ini.`}
      </p>
    </div>
  );
}

/********** Page Component **********/
export default function NotificationSettingsPage() {
  /********** State **********/
  const { isLoading, fetchSettings, getUser } = useNotificationSettings();
  const [isSaving, setIsSaving] = useState(false);

  const { scheduleSync } = useSyncContext();

  // Bug 8: Single notifMode enum replaces two independent booleans
  const [notifMode, setNotifMode] = useState<NotifMode>('NONE');
  const [dailyReminder, setDailyReminder] = useState<boolean>(true);
  const [digestTime, setDigestTime] = useState('20:00');
  const [dailyCap, setDailyCap] = useState<number>(DEFAULT_NOTIF_PREFS.dailyCap);
  const [todayCount, setTodayCount] = useState(0);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [isRequestingPerm, setIsRequestingPerm] = useState(false);

  /********** Effects **********/

  useEffect(() => {
    if (typeof Notification === 'undefined') {
      setNotifPermission('unsupported');
      return;
    }
    setNotifPermission(Notification.permission);
  }, []);



  useEffect(() => {
    async function loadSettings() {
      try {
        const pushCountData = readTodayCountFromLS();
        setTodayCount(pushCountData.count);

        const s = await fetchSettings();
        if (s) {
          if (s.dailyDigest) setNotifMode('DIGEST');
          else if (s.instantAlerts) setNotifMode('INSTANT');
          else setNotifMode('NONE');
          setDailyReminder(s.dailyReminder ?? true);
          setDigestTime(s.digestTime || '20:00');
          setDailyCap(s.dailyCap ?? DEFAULT_DAILY_CAP);
        } else {
          setDailyCap(DEFAULT_DAILY_CAP);
        }
      } finally {
        // isLoading is handled by the hook
      }
    }
    loadSettings();
  }, [fetchSettings]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const instantAlerts = notifMode === 'INSTANT';
      const dailyDigest = notifMode === 'DIGEST';

      const user = await getUser();
      if (!user) {
        toast.error('Sesi pengguna tidak ditemukan.');
        return;
      }

      let serverPushFailed = false;

      // If user enabled notifications or daily reminder, ensure Web Push subscription is set up
      if (notifMode !== 'NONE' || dailyReminder) {
        if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
          try {
            const registration = await navigator.serviceWorker.ready;
            const pushResult = await subscribeToPushNotifications(registration);

            if (!pushResult.success) {
              serverPushFailed = true;
              console.warn('[NotificationSettings] Web push subscription failed:', pushResult);
              // Avoid showing the fallback toast if the user explicitly denied permission,
              // as they already know they denied it.
              if (pushResult.reason !== 'Izin notifikasi tidak diberikan oleh browser.') {
                if (pushResult.errorName === 'CSRF_VALIDATION_FAILED') {
                  toast.error(pushResult.reason);
                } else {
                  toast.error(
                    'Izin notifikasi diberikan, tetapi registrasi Web Push gagal. Notifikasi lokal tetap aktif, tetapi digest/reminder server belum bisa dikirim ke perangkat ini.',
                  );
                }
              }
            }
          } catch (subErr) {
            serverPushFailed = true;
            console.error('[NotificationSettings] Push subscription exception:', subErr);
            toast.error(
              'Izin notifikasi diberikan, tetapi registrasi Web Push gagal. Notifikasi lokal tetap aktif, tetapi digest/reminder server belum bisa dikirim ke perangkat ini.',
            );
          }
        } else {
          serverPushFailed = true;
          toast.error(
            'Izin notifikasi diberikan, tetapi registrasi Web Push gagal. Notifikasi lokal tetap aktif, tetapi digest/reminder server belum bisa dikirim ke perangkat ini.',
          );
        }
      }

      const prefs: LocalNotificationPrefs = {
        instantAlerts,
        dailyDigest,
        // Decouple local vs server state:
        // If server push failed, we disable it on the server (NONE) so it doesn't try to push,
        // but we preserve the local instantAlerts/dailyDigest flags so local nudges still work.
        deliveryMode: serverPushFailed ? 'NONE' : notifMode === 'INSTANT' ? 'INSTANT' : notifMode === 'DIGEST' ? 'BATCH' : 'NONE',
        dailyReminder,
        digestTime,
        dailyCap,
        userId: user.id,
        updatedAt: new Date().toISOString(),
      };

      await saveNotifPrefs(prefs);

      console.log('[DailyCapSaveDebug]', {
        selectedValue: dailyCap === -1 ? 'Tanpa batas' : dailyCap,
        savedDailyCap: prefs.dailyCap,
      });

      scheduleSync();

      if (!serverPushFailed) {
        toast.success('Preferensi notifikasi berhasil disimpan.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Gagal menyimpan preferensi lokal.');
    } finally {
      setIsSaving(false);
    }
  }, [notifMode, dailyReminder, digestTime, dailyCap, getUser, scheduleSync]);

  const handleRequestPermission = useCallback(async () => {
    if (typeof Notification === 'undefined') return;
    setIsRequestingPerm(true);
    try {
      const result = await Notification.requestPermission();
      setNotifPermission(result);
      if (result === 'granted') {
        toast.success('Izin notifikasi diberikan. Gateway siap aktif.');
        await handleSave(); // Langsung auto-save preferensi (sehingga push subscription terdaftar)
      }
      else {
        toast.error('Izin ditolak. Notifikasi OS tidak akan dikirim.');
      }
    } finally {
      setIsRequestingPerm(false);
    }
  }, [handleSave]);

  return (
    <SecondaryPageLayout
      title="Pengaturan Notifikasi"
      description="Pilih satu mode notifikasi. Moneta hanya mengirim peringatan saat benar-benar diperlukan."
      backRoute="/profile"
    >
      {isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />
        </div>
      ) : (
        <div className="space-y-5 animate-in fade-in duration-300">
          <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3.5 dark:border-slate-800 dark:bg-slate-900/50">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-600" />
            <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              Moneta menerapkan kebijakan{' '}
              <span className="font-semibold text-slate-700 dark:text-slate-300">&quot;hanya saat diperlukan&quot;</span>. Pencatatan
              transaksi normal tidak memicu notifikasi apapun.
            </p>
          </div>

          {notifPermission === 'default' && (
            <div className="flex items-start gap-3 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-4 dark:border-indigo-800/40 dark:bg-indigo-900/15">
              <Bell className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
              <div className="flex-1">
                <p className="text-xs font-semibold text-indigo-800 dark:text-indigo-300">Izin notifikasi diperlukan</p>
                <p className="mt-0.5 text-xs text-indigo-700 dark:text-indigo-400">
                  Izinkan notifikasi dari browser untuk mengaktifkan peringatan OS.
                </p>
                <button
                  id="btn-request-permission"
                  onClick={handleRequestPermission}
                  disabled={isRequestingPerm}
                  className="mt-2.5 flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-500/20 transition-all hover:bg-indigo-500 active:scale-95 disabled:opacity-60 dark:bg-indigo-500 dark:hover:bg-indigo-400"
                >
                  {isRequestingPerm ? (
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <Bell className="h-3.5 w-3.5" />
                  )}
                  Izinkan Notifikasi
                </button>
              </div>
            </div>
          )}
          {notifPermission === 'denied' && (
            <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3.5 dark:border-rose-800/40 dark:bg-rose-900/15">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
              <div>
                <p className="text-xs font-semibold text-rose-800 dark:text-rose-300">Notifikasi diblokir oleh browser</p>
                <p className="mt-0.5 text-xs text-rose-700 dark:text-rose-400">
                  Buka pengaturan browser → ikon gembok → ubah &quot;Notifications&quot; menjadi &quot;Allow&quot;, lalu refresh.
                </p>
              </div>
            </div>
          )}
          {notifPermission === 'granted' && (
            <div className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-800/40 dark:bg-emerald-900/10">
              <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Izin notifikasi aktif. Semua gateway siap.</p>
            </div>
          )}

          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">Pengingat Harian</p>
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors ${dailyReminder ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-500'}`}>
                  <Bell className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Ingatkan Catat Keuangan</p>
                  <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                    Kirim notifikasi setiap pukul 20:00 jika belum ada transaksi yang dicatat pada hari ini.
                  </p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={dailyReminder}
                onClick={() => setDailyReminder(!dailyReminder)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 ${
                  dailyReminder ? "bg-indigo-600" : "bg-slate-200 dark:bg-slate-600"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out ${
                    dailyReminder ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>
          </div>

          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">Mode Peringatan Anggaran</p>

            <div className="space-y-2.5" role="radiogroup" aria-label="Mode notifikasi">
              <ModeCard
                id="INSTANT"
                icon={<Zap className="h-4 w-4" />}
                title="Peringatan Instan (Hanya Krisis)"
                description="Notifikasi OS dikirim saat anggaran kategori mendekati (50%) atau melewati batas (100%). Hening untuk transaksi biasa."
                selected={notifMode === 'INSTANT'}
                onSelect={() => setNotifMode('INSTANT')}
              />
              <ModeCard
                id="DIGEST"
                icon={<CalendarClock className="h-4 w-4" />}
                title="Ringkasan Berkala (Malam Hari)"
                description="Mode Ringkasan tetap mencatat notifikasi di halaman Notifikasi, tetapi hanya mengirim satu notifikasi perangkat berisi ringkasan pada waktu yang dipilih."
                selected={notifMode === 'DIGEST'}
                onSelect={() => setNotifMode('DIGEST')}
              />
              <ModeCard
                id="NONE"
                icon={<BellOff className="h-4 w-4" />}
                title="Nonaktif"
                description="Mode Mati tidak menampilkan notifikasi perangkat. Riwayat penting tetap dapat muncul di halaman Notifikasi."
                selected={notifMode === 'NONE'}
                onSelect={() => setNotifMode('NONE')}
              />
            </div>
          </div>

          {notifMode === 'INSTANT' && (
            <div className="animate-in slide-in-from-top-2 fade-in duration-200 space-y-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-start gap-3">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
                <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                  Moneta mengirim peringatan saat anggaran mendekati atau melewati batas. Kamu tetap bisa membatasi jumlah push harian.
                </p>
              </div>
              <AdvancedSettings title="Lihat aturan peringatan">
                <ul className="list-inside list-disc space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                  <li>Penggunaan 20%: informasi</li>
                  <li>Penggunaan 50%: peringatan</li>
                  <li>Penggunaan 100%: peringatan kritis</li>
                  <li>Melewati batas: rekomendasi tindakan jika tersedia</li>
                </ul>
              </AdvancedSettings>
            </div>
          )}

          {notifMode === 'DIGEST' && (
            <div className="animate-in slide-in-from-top-2 fade-in duration-200 space-y-4 rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div>
                <label
                  htmlFor="digest-time"
                  className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400"
                >
                  Waktu Ringkasan (WIB)
                </label>
                <div className="flex flex-col gap-4">
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                      <Clock className="h-5 w-5 text-indigo-500" />
                    </div>
                    <input
                      type="time"
                      id="digest-time"
                      value={digestTime}
                      onChange={(e) => setDigestTime(e.target.value)}
                      required
                      className="w-full cursor-pointer appearance-none rounded-xl border-2 border-indigo-100 bg-indigo-50/50 py-4 pl-12 pr-4 text-xl font-bold tracking-wider text-indigo-900 shadow-sm outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 active:scale-[0.98] dark:border-indigo-500/30 dark:bg-indigo-950/30 dark:text-indigo-100"
                    />
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
                      <span className="text-xs font-semibold text-indigo-500 uppercase">Ubah</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {['19:00', '20:00', '21:00', '22:00'].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setDigestTime(preset)}
                        className={`flex items-center justify-center rounded-xl border py-2.5 text-sm font-semibold transition-all active:scale-95 ${
                          digestTime === preset
                            ? 'border-indigo-500 bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                  Moneta akan mengirim satu notifikasi ringkasan pada waktu ini selama aplikasi aktif. Ringkasan dikirim mengikuti waktu WIB
                  (Asia/Jakarta).
                </p>
              </div>
              <NotificationPreview
                title="Ringkasan Keuangan Hari Ini"
                body="Hari ini kamu mencatat 4 transaksi dengan total Rp 85.000. Pengeluaranmu lebih tinggi Rp 32.000 dibanding rata-rata harianmu minggu ini."
                action1="Buka Ringkasan"
                action2="Tutup"
              />
            </div>
          )}

          {notifMode !== 'NONE' && (
            <div className="animate-in fade-in duration-300">
              <AdvancedSettings>
                <div className="space-y-4">
                  <DailyCapSelector value={dailyCap} onChange={setDailyCap} />
                  <TodayUsageBar count={todayCount} cap={dailyCap} />
                </div>
              </AdvancedSettings>
            </div>
          )}

          <div className="pt-2">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3.5 text-sm font-semibold text-white shadow-md shadow-indigo-500/20 transition-all hover:bg-indigo-500 active:scale-95 disabled:opacity-70 dark:bg-indigo-500 dark:hover:bg-indigo-400"
            >
              {isSaving ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Simpan Preferensi
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </SecondaryPageLayout>
  );
}
