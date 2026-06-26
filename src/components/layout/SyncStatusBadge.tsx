// ─── Sync Status Components ─────────────────────────────
// Layer 2: Visual indicators that warn users about unsynced
// data and provide context on sync status.
//
// Two variants:
//   SyncStatusBadge  — compact pill for mobile header
//   SyncStatusPanel  — full card for desktop sidebar

"use client";

import { useSyncContext } from "@/providers/SyncProvider";

// ─── Compact Badge (for mobile header) ─────────────────

export function SyncStatusBadge() {
  const { syncState, pendingCount, quarantinedCount, isOnline } = useSyncContext();

  const hasPending = pendingCount > 0;
  const hasQuarantined = quarantinedCount > 0;
  const isOffline = !isOnline;

  let dotColor: string;
  let label: string;

  if (isOffline && hasPending) {
    dotColor = "bg-orange-400";
    label = `${pendingCount} belum tersimpan`;
  } else if (syncState === "syncing") {
    dotColor = "bg-amber-400 animate-pulse";
    label = "Menyinkronkan...";
  } else if (hasPending) {
    dotColor = "bg-amber-400";
    label = `${pendingCount} perubahan menunggu sinkronisasi`;
  } else if (hasQuarantined) {
    dotColor = "bg-red-400";
    label = `${quarantinedCount} item gagal disinkronkan`;
  } else if (isOffline) {
    dotColor = "bg-slate-400";
    label = "Luring";
  } else {
    dotColor = "bg-emerald-400";
    label = "Tersinkronisasi";
  }

  return (
    <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${dotColor}`} />
      {label}
    </div>
  );
}

// ─── Full Panel (for desktop sidebar) ──────────────────

export function SyncStatusPanel() {
  const { syncState, pendingCount, quarantinedCount, queueSummary, isOnline, triggerSync } = useSyncContext();

  const hasPending = pendingCount > 0;
  const isOffline = !isOnline;
  const isSyncing = syncState === "syncing";

  let mainCard;

  const ENTITY_NAMES_ID: Record<string, string> = {
    transaction: "transaksi",
    category: "kategori",
    wallet: "dompet",
    budget: "anggaran",
    notification_log: "notifikasi",
    notification_settings: "pengaturan notifikasi"
  };

  const pendingItems = queueSummary.filter((e) => !e.failedAt && e.retryCount < 3);
  const failedItems = queueSummary.filter((e) => !!e.failedAt || e.retryCount >= 3);

  const pendingGrouped = pendingItems.reduce((acc, curr) => {
    acc[curr.entity] = (acc[curr.entity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const failedGrouped = failedItems.reduce((acc, curr) => {
    acc[curr.entity] = (acc[curr.entity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Decide which variant to render
  if (isOffline && hasPending) {
    mainCard = (
      <SyncCard
        variant="critical"
        icon={<WarningIcon />}
        title={`${pendingCount} perubahan belum tersimpan`}
        description="Kamu sedang luring. Jangan hapus data browser sebelum terhubung kembali."
        actionLabel="Coba sinkronkan"
        onAction={triggerSync}
        disabled={true}
      />
    );
  } else if (isSyncing) {
    mainCard = (
      <SyncCard
        variant="syncing"
        icon={<SpinnerIcon />}
        title="Menyinkronkan..."
        description="Data kamu sedang disimpan ke server."
      />
    );
  } else if (hasPending) {
    mainCard = (
      <SyncCard
        variant="pending"
        icon={<CloudIcon />}
        title={`${pendingCount} perubahan menunggu sinkronisasi`}
        description="Akan disinkronkan otomatis saat siap."
        actionLabel="Sinkronkan sekarang"
        onAction={triggerSync}
      />
    );
  } else if (isOffline) {
    mainCard = (
      <SyncCard
        variant="offline"
        icon={<OfflineIcon />}
        title="Kamu sedang luring"
        description="Perubahan akan disinkronkan saat kamu terhubung kembali."
      />
    );
  } else {
    // All synced
    mainCard = (
      <SyncCard
        variant="synced"
        icon={<CheckIcon />}
        title="Tersinkronisasi"
        description="Data sudah mutakhir."
      />
    );
  }

  return (
    <div className="relative space-y-2">
      {/* Absolute container that grows upwards */}
      <div className="absolute bottom-full mb-2 left-0 right-0 flex flex-col justify-end pointer-events-none">
        {/* Active Pending Diagnostics */}
        {hasPending && !isSyncing && (
          <div className="pointer-events-auto mb-2 max-h-48 overflow-y-auto rounded-xl border border-indigo-200 bg-indigo-50 p-3 shadow-lg dark:border-indigo-800/50 dark:bg-indigo-950/90 dark:backdrop-blur-sm">
            <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">
              {pendingCount} menunggu antrean
            </p>
            <ul className="mt-1 space-y-1">
              {Object.entries(pendingGrouped).map(([entity, count], idx) => (
                <li key={`pending-group-${idx}`} className="text-[10px] text-indigo-600/80 dark:text-indigo-400/80">
                  • {count} {ENTITY_NAMES_ID[entity] || entity}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Quarantined/Failed Diagnostics */}
        {quarantinedCount > 0 && (
          <div className="pointer-events-auto max-h-48 overflow-y-auto rounded-xl border border-red-200 bg-red-50 p-3 shadow-lg dark:border-red-800/50 dark:bg-red-950/90 dark:backdrop-blur-sm">
            <p className="text-xs font-semibold text-red-600 dark:text-red-400">
              {quarantinedCount} item gagal disinkronkan
            </p>
            <ul className="mt-1 space-y-1">
              {Object.entries(failedGrouped).map(([entity, count], idx) => (
                <li key={`failed-group-${idx}`} className="text-[10px] text-red-500 dark:text-red-400/80">
                  • {count} {ENTITY_NAMES_ID[entity] || entity}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {mainCard}
    </div>
  );
}

// ─── Card Shell ────────────────────────────────────────

type CardVariant = "critical" | "syncing" | "pending" | "offline" | "synced";

const VARIANT_STYLES: Record<CardVariant, { bg: string; border: string; iconBg: string; iconText: string }> = {
  critical: {
    bg: "bg-orange-50 dark:bg-orange-950/30",
    border: "border-orange-200 dark:border-orange-800/50",
    iconBg: "bg-orange-100 dark:bg-orange-900/40",
    iconText: "text-orange-600 dark:text-orange-400",
  },
  syncing: {
    bg: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-amber-200 dark:border-amber-800/50",
    iconBg: "bg-amber-100 dark:bg-amber-900/40",
    iconText: "text-amber-600 dark:text-amber-400",
  },
  pending: {
    bg: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-amber-200 dark:border-amber-800/50",
    iconBg: "bg-amber-100 dark:bg-amber-900/40",
    iconText: "text-amber-600 dark:text-amber-400",
  },
  offline: {
    bg: "bg-slate-50 dark:bg-slate-800/50",
    border: "border-slate-200 dark:border-slate-700",
    iconBg: "bg-slate-100 dark:bg-slate-700",
    iconText: "text-slate-600 dark:text-slate-400",
  },
  synced: {
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    border: "border-emerald-200 dark:border-emerald-800/50",
    iconBg: "bg-emerald-100 dark:bg-emerald-900/40",
    iconText: "text-emerald-600 dark:text-emerald-400",
  },
};

function SyncCard({
  variant,
  icon,
  title,
  description,
  actionLabel,
  onAction,
  disabled,
}: {
  variant: CardVariant;
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  disabled?: boolean;
}) {
  const s = VARIANT_STYLES[variant];

  return (
    <div className={`rounded-xl border p-3 transition-all ${s.bg} ${s.border}`}>
      <div className="flex items-start gap-2.5">
        <div
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${s.iconBg} ${s.iconText}`}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{title}</p>
          <p className="mt-0.5 text-[11px] leading-tight text-slate-600 dark:text-slate-400">
            {description}
          </p>
          {actionLabel && onAction && (
            <button
              onClick={onAction}
              disabled={disabled}
              className="mt-1.5 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              {actionLabel} →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Icons ─────────────────────────────────────────────

function WarningIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
      />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

function CloudIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6h.1a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
      />
    </svg>
  );
}

function OfflineIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M18.364 5.636a9 9 0 010 12.728M5.636 18.364a9 9 0 010-12.728M12 12h.01M8.464 15.536a5 5 0 010-7.072M15.536 8.464a5 5 0 010 7.072"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
      />
    </svg>
  );
}
