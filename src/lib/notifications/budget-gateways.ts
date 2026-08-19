/********** @deprecated Modul ini adalah legacy notification engine yang paralel.
 *
 *  ALASAN DEPRECATED:
 *  - Engine ini membaca preferensi notifikasi dari localStorage (stale, device-local).
 *  - Engine memanggil showNotification() tanpa membuat entri notification_logs di IDB,
 *    sehingga alert-nya tidak terlihat di halaman Notifikasi in-app.
 *  - Entry point aktifnya (evaluateAndFireBudgetGateway di sw/register.ts) adalah
 *    dead export — tidak pernah dipanggil dari jalur kode app manapun.
 *  - Deteksi threshold budget (20%, 50%, 100%) sudah ditangani sepenuhnya oleh local-engine.ts,
 *    yang dengan benar menulis notification_logs terlebih dahulu, lalu gating push pada deliveryMode.
 *
 *  JANGAN tambahkan pemanggil baru ke modul ini.
 *  JANGAN gunakan evaluateBudgetGateways() atau readNotifPrefsFromLS() untuk keputusan delivery.
 *  Gunakan resolveDeliveryMode() dari notification-prefs.ts dan local-engine.ts sebagai gantinya.
 *
 *  File ini dipertahankan hanya sebagai referensi. Akan dihapus pada fase cleanup berikutnya.
 */

/********** Format state kategori:
 *  { [categoryId]: { t1Fired: string | null, t2Fired: string | null, deficitFired: string | null } }
 *  Value = tanggal ISO 'YYYY-MM-DD' kapan threshold tersebut terakhir dikirim.
 *  Auto-reset: jika tanggal tidak sama dengan hari ini, dianggap belum dikirim.
 */

import { DEFAULT_DAILY_CAP } from '@/lib/local-db/notification-prefs';

/********** Types **********/

type GatewayTier = "T1" | "T2" | "DEFICIT" | null;

export interface GatewayEvalResult {
  shouldNotify: boolean;
  tier: GatewayTier;
  title: string;
  body: string;
  suppressed: boolean;
  suppressReason?: string;
}

interface CategoryGatewayState {
  t1Fired: string | null;   // ISO date 'YYYY-MM-DD' or null
  t2Fired: string | null;
  deficitFired: string | null;
}

type GatewayStateMap = Record<string, CategoryGatewayState>;

/********** Constants **********/

const GATEWAY_STATE_KEY = 'moneta-gateway-state';
const SUPPRESSION_LOG_KEY = 'moneta-suppression-log';

/********** Threshold definitions (sisa anggaran sebagai persentase). */
const TIER_1_THRESHOLD = 50; /********** Sisa <= 50% → Tier 1 */
const TIER_2_THRESHOLD = 20; /********** Sisa <= 20% → Tier 2 */

/********** Helpers **********/

function fmtRupiah(amount: number): string {
  return 'Rp ' + Math.round(amount).toLocaleString('id-ID');
}

/********** Gateway State (localStorage) **********/

function loadGatewayState(): GatewayStateMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(GATEWAY_STATE_KEY);
    return raw ? (JSON.parse(raw) as GatewayStateMap) : {};
  } catch {
    return {};
  }
}

function saveGatewayState(state: GatewayStateMap): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(GATEWAY_STATE_KEY, JSON.stringify(state));
  } catch {}
}

function getCategoryState(
  state: GatewayStateMap,
  categoryId: string
): CategoryGatewayState {
  return (
    state[categoryId] || { t1Fired: null, t2Fired: null, deficitFired: null }
  );
}

/**
 * Cek apakah threshold sudah pernah dikirim hari ini.
 * Auto-reset jika tanggal berbeda (hari baru = kuota penuh lagi).
 */
function hasFiredToday(firedAt: string | null): boolean {
  if (!firedAt) return false;
  const today = new Date().toISOString().substring(0, 10);
  return firedAt.startsWith(today);
}

/********** Suppression Audit Trail **********/

function logSuppression(
  categoryId: string,
  categoryName: string,
  tier: GatewayTier,
  reason: string
): void {
  if (typeof window === "undefined") return;
  try {
    const rawLog = localStorage.getItem(SUPPRESSION_LOG_KEY);
    const log: Array<{
      ts: string;
      categoryId: string;
      categoryName: string;
      tier: GatewayTier;
      reason: string;
    }> = rawLog ? JSON.parse(rawLog) : [];

    log.push({
      ts: new Date().toISOString(),
      categoryId,
      categoryName,
      tier,
      reason,
    });

    // Simpan maks 200 entri terakhir untuk efisiensi storage
    if (log.length > 200) log.splice(0, log.length - 200);
    localStorage.setItem(SUPPRESSION_LOG_KEY, JSON.stringify(log));
  } catch {}
}

/********** Core Evaluator **********/

/**
 * Evaluasi apakah notifikasi gateway perlu dikirim setelah transaksi baru.
 *
 * @param categoryId     - clientId kategori yang baru dicatat transaksinya
 * @param categoryName   - Nama kategori (untuk teks notifikasi)
 * @param spentAmount    - Total pengeluaran kategori ini bulan ini (setelah transaksi baru)
 * @param budgetAmount   - Batas anggaran kategori ini
 * @returns GatewayEvalResult — hasil evaluasi + teks notifikasi jika perlu
 */
export function evaluateBudgetGateways(
  categoryId: string,
  categoryName: string,
  spentAmount: number,
  budgetAmount: number
): GatewayEvalResult {
  const SILENT: GatewayEvalResult = {
    shouldNotify: false,
    tier: null,
    title: "",
    body: "",
    suppressed: false,
  };

  // Jika tidak ada budget, tidak ada yang bisa dievaluasi
  if (budgetAmount <= 0) return SILENT;

  const remainingAmount = budgetAmount - spentAmount;
  const remainingPct = (remainingAmount / budgetAmount) * 100;

  /********** Cek preferensi pengguna. */
  const prefs = { dailyDigest: false, instantAlerts: true, dailyCap: DEFAULT_DAILY_CAP };

  /********** Jika "Ringkasan Berkala" aktif, supresi semua real-time alert. */
  if (prefs?.dailyDigest) {
    /********** Catat supresi untuk audit trail. */
    logSuppression(
      categoryId,
      categoryName,
      null,
      "Ringkasan Berkala aktif — semua real-time alert disupresi"
    );
    return {
      ...SILENT,
      suppressed: true,
      suppressReason: "daily_digest_active",
    };
  }

  // Jika "Peringatan Instan" tidak aktif, tidak ada yang dikirim
  if (!prefs?.instantAlerts) {
    return {
      ...SILENT,
      suppressed: true,
      suppressReason: "instant_alerts_disabled",
    };
  }

  /********** Tentukan tier yang terlampaui. */
  let tier: GatewayTier = null;

  if (remainingPct <= 0) {
    tier = 'DEFICIT'; /********** >= 100% spent. */
  } else if (remainingPct <= TIER_2_THRESHOLD) {
    tier = 'T2'; /********** Sisa <= 20%. */
  } else if (remainingPct <= TIER_1_THRESHOLD) {
    tier = 'T1'; /********** Sisa <= 50%. */
  }

  /********** Transaksi normal (sisa > 50%) — selalu hening di OS level. */
  if (!tier) return SILENT;

  /********** Cek apakah threshold ini sudah pernah dikirim hari ini. */
  const state = loadGatewayState();
  const catState = getCategoryState(state, categoryId);

  const alreadyFired =
    (tier === "T1" && hasFiredToday(catState.t1Fired)) ||
    (tier === "T2" && hasFiredToday(catState.t2Fired)) ||
    (tier === "DEFICIT" && hasFiredToday(catState.deficitFired));

  if (alreadyFired) {
    logSuppression(
      categoryId,
      categoryName,
      tier,
      `Threshold ${tier} sudah pernah dikirim hari ini`
    );
    return {
      ...SILENT,
      suppressed: true,
      suppressReason: `already_fired_today_${tier}`,
    };
  }

  /********** Cek daily cap. */
  /********** Daily cap dibaca dari prefs; jika sudah habis, supresi. */
  const dailyCap = prefs?.dailyCap ?? DEFAULT_DAILY_CAP;
  const today = new Date().toISOString().substring(0, 10);
  const countKey = "moneta-notification-daily-count";
  let dailyCount = 0;
  try {
    const raw = localStorage.getItem(countKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.date === today) dailyCount = parsed.count;
    }
  } catch {}

  if (dailyCount >= dailyCap) {
    logSuppression(
      categoryId,
      categoryName,
      tier,
      `Batas harian (${dailyCap}) tercapai — notifikasi ditahan`
    );
    return {
      ...SILENT,
      suppressed: true,
      suppressReason: "daily_cap_reached",
    };
  }

  /********** Bangun teks notifikasi. */
  let title: string;
  let body: string;
  const remainingFmt = fmtRupiah(Math.max(0, remainingAmount));

  if (tier === 'DEFICIT') {
    title = 'Peringatan Batas Anggaran';
    body = `Anggaran ${categoryName} kamu sudah habis. Sisa ${fmtRupiah(0)} dari ${fmtRupiah(budgetAmount)}. Pertimbangkan realokasi dari kategori lain.`;
  } else if (tier === 'T2') {
    title = 'Peringatan Batas Anggaran';
    body = `Sisa anggaran ${categoryName} kamu kritis, tinggal ${remainingFmt}. Pertimbangkan kembali pengeluaran berikutnya.`;
  } else {
    /********** T1 */
    title = 'Pengingat Anggaran';
    body = `Sudah separuh anggaran ${categoryName} terpakai. Sisa anggaran: ${remainingFmt}. Pertahankan ritme pengeluaranmu.`;
  }

  /********** Rekam threshold sebagai sudah dikirim. */
  const today2 = new Date().toISOString().substring(0, 10);
  const newCatState: CategoryGatewayState = { ...catState };
  if (tier === "T1") newCatState.t1Fired = today2;
  else if (tier === "T2") newCatState.t2Fired = today2;
  else newCatState.deficitFired = today2;

  state[categoryId] = newCatState;
  saveGatewayState(state);

  return {
    shouldNotify: true,
    tier,
    title,
    body,
    suppressed: false,
  };
}

/**
 * Reset gateway state untuk sebuah kategori.
 * Berguna saat unit test atau saat anggaran di-reset oleh pengguna.
 */
function resetCategoryGatewayState(categoryId: string): void {
  const state = loadGatewayState();
  delete state[categoryId];
  saveGatewayState(state);
}

/**
 * Baca suppression audit log (untuk halaman admin/peneliti).
 */
function readSuppressionLog(): Array<{
  ts: string;
  categoryId: string;
  categoryName: string;
  tier: GatewayTier;
  reason: string;
}> {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SUPPRESSION_LOG_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
