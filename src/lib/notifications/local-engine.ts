import dayjs from 'dayjs';
import { Transaction } from '@/types/models.types';
import { getAllTransactions } from '@/lib/local-db/repositories/transactions';
import { getBudgetsByPeriod } from '@/lib/local-db/repositories/budgets';
import { getAllCategories } from '@/lib/local-db/repositories/categories';
import { generateNudges, NudgeInsight, findBudgetReallocationRecommendation } from '@/lib/nudging';
import { upsertNotificationLog, checkDedupeKeyExists } from '@/lib/local-db/repositories/notification-logs';
import { getNotificationSettings } from '@/lib/local-db/repositories/notification-settings';
import {
  incrementTodayCountInLS,
  readTodayCountFromLS,
  resolveDeliveryMode,
  normalizeDailyCap,
  isDailyCapReached,
} from '@/lib/local-db/notification-prefs';
import { formatCurrency, generateClientId } from '@/lib/utils/helpers';
import { isTargetActiveForDate } from '@/lib/utils/target-helpers';
import { showSyncToast } from '@/lib/utils/show-toast';

const BUDGET_CRITICAL_PRIORITY = 0.1;
const BUDGET_WARNING_PRIORITY = 0.2;
const BUDGET_INFO_PRIORITY = 0.3;

// Helper to sum income and expense
function sumByType(txns: Transaction[]) {
  let income = 0,
    expense = 0;
  for (const t of txns) {
    if (t.type === 'INCOME') income += Number(t.amount);
    else if (t.type === 'EXPENSE') expense += Number(t.amount);
  }
  return { income, expense, net: income - expense };
}

// Generate dedupe key based on priority
function getDedupeKey(insight: NudgeInsight, userId: string, tx: Transaction): string {
  if (insight.dedupeKeyOverride) {
    return insight.dedupeKeyOverride;
  }

  const monthStr = dayjs(tx.date).format('YYYY-MM');

  // Budget usage nudges currently use priority 0.1, 0.2, and 0.3, so they must not fall back to GENERIC_NUDGE.
  if (
    insight.priority === BUDGET_CRITICAL_PRIORITY ||
    insight.priority === BUDGET_WARNING_PRIORITY ||
    insight.priority === BUDGET_INFO_PRIORITY
  ) {
    const contextId = insight.relatedBudgetId || insight.relatedCategoryId || tx.categoryId || 'none';
    const thresholdStr = insight.threshold ? insight.threshold.toString() : 'UNKNOWN';
    const revMarker = insight.budgetUpdatedAt ? new Date(insight.budgetUpdatedAt).getTime().toString() : 'none';
    return `BUDGET_USAGE:${userId}:${contextId}:${monthStr}:${thresholdStr}:${revMarker}`;
  }

  if (insight.priority === 1) {
    return `PAYDAY_LEAK:${userId}:${monthStr}`;
  } else if (insight.priority === 1.1) {
    return `HIGH_EXPENSE_RATIO:${userId}:${monthStr}`;
  } else if (insight.priority === 2) {
    const weekStr = dayjs(tx.date).format('YYYY-ww');
    return `WEEKEND_TRAP:${userId}:${weekStr}`;
  } else if (insight.priority === 2.1) {
    return `NIGHT_OWL:${userId}:${monthStr}`;
  } else if (insight.priority === 2.2) {
    return `CATEGORY_SPIKE:${userId}:${tx.categoryId || 'none'}:${monthStr}`;
  } else if (insight.priority === 2.5) {
    return `WANTS_PROJECTION:${userId}:${monthStr}`;
  } else if (insight.priority === 3) {
    return `LATTE_FACTOR:${userId}:${monthStr}`;
  } else if (insight.priority === 3.1) {
    return `SUBSCRIPTIONS:${userId}:${monthStr}`;
  } else if (insight.priority === 3.5) {
    const weekStr = dayjs(tx.date).format('YYYY-ww');
    return `WEEKLY_SAVINGS:${userId}:${weekStr}`;
  } else if (insight.priority === 3.6) {
    return `INCOME_INCREASE:${userId}:${monthStr}`;
  } else if (insight.priority === 3.8) {
    return `PEAK_DAY:${userId}:${monthStr}`;
  }

  return `GENERIC_NUDGE:${userId}:${insight.title.replace(/\s+/g, '')}:${monthStr}`;
}

export async function evaluateAndTriggerNudges(createdTxn: Transaction) {
  console.log('[LocalEngine] Starting evaluateAndTriggerNudges for txn:', createdTxn.clientId);
  try {
    const userId = createdTxn.userId;
    const now = dayjs(createdTxn.date);
    const currentPeriodStr = now.format('YYYY-MM');

    // Fetch all necessary local data
    const [allTxns, budgets, allCategories] = await Promise.all([
      getAllTransactions(userId),
      getBudgetsByPeriod(userId, currentPeriodStr),
      getAllCategories(userId),
    ]);

    // Current period transactions
    const currentTxns = allTxns.filter((t) => dayjs(t.date).format('YYYY-MM') === currentPeriodStr);

    // Previous period transactions
    const prevPeriodStr = now.subtract(1, 'month').format('YYYY-MM');
    const prevTxns = allTxns.filter((t) => dayjs(t.date).format('YYYY-MM') === prevPeriodStr);

    const current = sumByType(currentTxns);
    const prev = sumByType(prevTxns);

    // Compute basic indicators for generateNudges
    // 1. Payday leak
    const paydayLeak = (() => {
      const thirtyDaysAgo = dayjs().subtract(30, 'day');
      const incomes = allTxns.filter((t) => t.type === 'INCOME' && dayjs(t.date).isAfter(thirtyDaysAgo));
      if (incomes.length === 0) return null;
      let maxIncome = incomes[0];
      for (const inc of incomes) {
        if (Number(inc.amount) > Number(maxIncome.amount)) maxIncome = inc;
      }
      const daysSincePayday = dayjs().diff(dayjs(maxIncome.date), 'day');
      if (daysSincePayday >= 0 && daysSincePayday <= 3) {
        const budgetLimit = budgets.reduce((s, b) => s + b.amount, 0);
        const limit = budgetLimit > 0 ? budgetLimit : current.income;
        if (limit > 0 && current.expense > limit * 0.4) {
          return { percentage: Math.round((current.expense / limit) * 100), days: Math.max(1, daysSincePayday) };
        }
      }
      return null;
    })();

    // 2. Weekend Trap
    const weekendTrap = (() => {
      const thisWeekExpenses = currentTxns.filter((t) => t.type === 'EXPENSE' && dayjs(t.date).isSame(dayjs(), 'week'));
      let weekTotal = 0,
        weekendTotal = 0;
      for (const tx of thisWeekExpenses) {
        const amt = Number(tx.amount);
        weekTotal += amt;
        const d = dayjs(tx.date).day();
        if (d === 0 || d === 6) weekendTotal += amt;
      }
      if (weekTotal > 0 && weekendTotal / weekTotal > 0.7) return { percentage: Math.round((weekendTotal / weekTotal) * 100) };
      return null;
    })();

    // 3. Top Expense Category Spike
    const topExpenseCategory = (() => {
      const relevant = currentTxns.filter((t) => t.type === 'EXPENSE' && t.categoryId);
      const grouped: Record<string, number> = {};
      for (const t of relevant) {
        grouped[t.categoryId!] = (grouped[t.categoryId!] || 0) + Number(t.amount);
      }
      const sorted = Object.entries(grouped).sort((a, b) => b[1] - a[1]);
      if (sorted.length === 0) return null;

      const topCatId = sorted[0][0];
      const topValue = sorted[0][1];
      const cat = allCategories.find((c) => c.clientId === topCatId);

      const prevRelevant = prevTxns.filter((t) => t.type === 'EXPENSE' && t.categoryId === topCatId);
      const prevValue = prevRelevant.reduce((s, t) => s + Number(t.amount), 0);

      return { name: cat?.name || 'Lainnya', value: topValue, prevValue };
    })();

    // 4. Night Owl
    const nightOwl = (() => {
      const wantsRegex = /(hiburan|jajan|pribadi|gaya hidup|hobi)/i;
      let nightTotal = 0;
      const expenses = currentTxns.filter((t) => t.type === 'EXPENSE');
      for (const tx of expenses) {
        const cat = allCategories.find((c) => c.clientId === tx.categoryId);
        if (cat && wantsRegex.test(cat.name)) {
          const h = dayjs(tx.createdAt).hour();
          if (h >= 22 || h <= 4) nightTotal += Number(tx.amount);
        }
      }
      if (nightTotal >= 150_000) return { totalAmount: nightTotal };
      return null;
    })();

    // We can compute others, but let's keep it robust enough for the ones we need.
    // Pass null for complex ones we skip to save performance unless necessary.
    const nudgeInsights = generateNudges(
      current,
      prev,
      topExpenseCategory,
      0, // weeklySavings mock
      null, // frequentTxn mock
      null, // peakDay mock
      null, // wantsProjection mock
      paydayLeak,
      weekendTrap,
      nightOwl,
      null, // subscriptions mock
    );

    // Evaluate Budget Limits
    // Instant budget warnings are scoped to the transaction category
    // to avoid cross-category notification mismatch.
    for (const budget of budgets) {
      if (!budget.categoryId) continue;
      // Only evaluate the budget that matches the created transaction
      if (budget.categoryId !== createdTxn.categoryId) continue;

      const spent = currentTxns
        .filter((t) => t.categoryId === budget.categoryId && t.type === 'EXPENSE')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const budgetLimit = Number(budget.amount);
      const ratio = spent / budgetLimit;
      const cat = allCategories.find((c) => c.clientId === budget.categoryId);
      const catName = cat?.name || 'Kategori';

      // --- Calculate Historical Comparison Data ---
      const today = dayjs().format('YYYY-MM-DD');
      const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
      const lastWeekSameDay = dayjs().subtract(7, 'day').format('YYYY-MM-DD');

      const catTxns = allTxns.filter((t) => t.categoryId === budget.categoryId && t.type === 'EXPENSE');

      const todayAmount = catTxns.filter((t) => dayjs(t.date).format('YYYY-MM-DD') === today).reduce((sum, t) => sum + Number(t.amount), 0);
      const yesterdayAmount = catTxns
        .filter((t) => dayjs(t.date).format('YYYY-MM-DD') === yesterday)
        .reduce((sum, t) => sum + Number(t.amount), 0);
      const lastWeekAmount = catTxns
        .filter((t) => dayjs(t.date).format('YYYY-MM-DD') === lastWeekSameDay)
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const last7DaysAmount = catTxns
        .filter((t) => {
          const d = dayjs(t.date);
          // last 7 days excluding today
          return d.isAfter(dayjs().subtract(8, 'day').endOf('day')) && d.isBefore(dayjs().startOf('day'));
        })
        .reduce((sum, t) => sum + Number(t.amount), 0);
      const avg7Days = last7DaysAmount / 7;

      let comparisonAmount: number | undefined = undefined;
      let comparisonLabel: string | undefined = undefined;
      let comparisonText = '';

      if (avg7Days > 0 && todayAmount > avg7Days) {
        comparisonAmount = todayAmount - avg7Days;
        comparisonLabel = 'avg7Days';
        comparisonText = ` Pengeluaran hari ini ${formatCurrency(todayAmount)}, lebih tinggi ${formatCurrency(comparisonAmount)} dari rata-rata harian minggu lalu.`;
      } else if (lastWeekAmount > 0 && todayAmount > lastWeekAmount) {
        comparisonAmount = todayAmount - lastWeekAmount;
        comparisonLabel = 'lastWeekSameDay';
        comparisonText = ` Pengeluaran hari ini ${formatCurrency(todayAmount)}, lebih tinggi ${formatCurrency(comparisonAmount)} dibanding hari yang sama minggu lalu.`;
      }

      const baseInsight = {
        categoryName: catName,
        usageRatio: ratio,
        budgetLimit: budgetLimit,
        budgetSpent: spent,
        todayAmount,
        comparisonAmount,
        comparisonLabel,
      };

      if (ratio > 1.0) {
        // Collect all budgets data for recommendation
        const allBudgetsInfo = budgets.map((b) => {
          const bCat = allCategories.find((c) => c.clientId === b.categoryId);
          const bSpent = currentTxns
            .filter((t) => t.categoryId === b.categoryId && t.type === 'EXPENSE')
            .reduce((sum, t) => sum + Number(t.amount), 0);
          return {
            id: b.clientId!,
            categoryId: b.categoryId,
            limit: Number(b.amount),
            spent: bSpent,
            name: bCat?.name || 'Kategori',
          };
        });

        const targetBudgetInfo = allBudgetsInfo.find((b) => b.id === budget.clientId);

        const deficitAmount = spent - budgetLimit;
        let mergedTitle = 'Batas Anggaran Terlampaui';
        let mergedBody = `Anggaran ${catName} telah melewati batas sebesar ${formatCurrency(deficitAmount)}. Kamu dapat meninjau pengeluaran atau mempertimbangkan penyesuaian anggaran.`;
        let mergedCtaLabel = 'Tinjau Anggaran';
        let mergedCtaRoute = '/budgets';
        let actionType: string | undefined = undefined;
        let sourceBudgetId: string | undefined = undefined;
        let targetBudgetId: string | undefined = undefined;
        let recommendedAmount: number | undefined = undefined;
        let sourceCategoryName: string | undefined = undefined;
        let targetCategoryName: string | undefined = undefined;
        let dedupeKeyOverride: string | undefined = undefined;

        if (targetBudgetInfo) {
          const recommendation = findBudgetReallocationRecommendation(targetBudgetInfo, allBudgetsInfo);
          if (recommendation) {
            const targetDeficitRound = Math.round(deficitAmount / 5000) * 5000;
            const recAmountRound = Math.round(recommendation.recommendedAmount / 5000) * 5000;

            const sourceBudgetInfo = allBudgetsInfo.find((b) => b.id === recommendation.sourceBudgetId);
            const sourceBudgetRaw = budgets.find((b) => b.clientId === recommendation.sourceBudgetId);

            const sourceLimit = sourceBudgetInfo ? sourceBudgetInfo.limit : 0;
            const sourceSpent = sourceBudgetInfo ? sourceBudgetInfo.spent : 0;
            const sourceRemainingRound = Math.round((sourceLimit - sourceSpent) / 5000) * 5000;

            const targetUpdatedAt = budget.updatedAt ? new Date(budget.updatedAt).getTime() : 0;
            const sourceUpdatedAt = sourceBudgetRaw?.updatedAt ? new Date(sourceBudgetRaw.updatedAt).getTime() : 0;

            const contextHash = `${targetBudgetInfo.limit}_${targetBudgetInfo.spent}_${targetDeficitRound}_${recAmountRound}_${sourceLimit}_${sourceSpent}_${sourceRemainingRound}_${targetUpdatedAt}_${sourceUpdatedAt}`;

            const currentPeriodStr = dayjs(createdTxn.date).format('YYYY-MM');
            dedupeKeyOverride = `BUDGET_REALLOCATION_RECOMMENDATION:${userId}:${currentPeriodStr}:${recommendation.targetBudgetId}:${recommendation.sourceBudgetId}:${contextHash}`;

            mergedTitle = 'Rekomendasi Subsidi Silang';
            mergedBody = `Anggaran ${catName} telah melewati batas sebesar ${formatCurrency(deficitAmount)}. Kamu dapat mempertimbangkan memindahkan ${formatCurrency(recommendation.recommendedAmount)} dari ${recommendation.sourceCategoryName}. Keputusan tetap ada di tanganmu.`;
            mergedCtaLabel = 'Subsidi Silang';
            mergedCtaRoute = `/budgets?action=reallocate&sourceBudgetId=${recommendation.sourceBudgetId}&targetBudgetId=${recommendation.targetBudgetId}&amount=${recommendation.recommendedAmount}`;
            actionType = 'REALLOCATE_BUDGET';
            sourceBudgetId = recommendation.sourceBudgetId;
            targetBudgetId = recommendation.targetBudgetId;
            recommendedAmount = recommendation.recommendedAmount;
            sourceCategoryName = recommendation.sourceCategoryName;
            targetCategoryName = recommendation.targetCategoryName;
          }
        }

        nudgeInsights.push({
          ...baseInsight,
          priority: BUDGET_CRITICAL_PRIORITY,
          severity: 'critical',
          title: mergedTitle,
          body: mergedBody,
          ctaLabel: mergedCtaLabel,
          ctaRoute: mergedCtaRoute,
          relatedBudgetId: budget.clientId,
          relatedCategoryId: budget.categoryId,
          threshold: 101, // arbitrary number for >100%
          budgetUpdatedAt: budget.updatedAt,
          actionType,
          sourceBudgetId,
          targetBudgetId,
          recommendedAmount,
          dedupeKeyOverride,
          deficitAmount,
          sourceCategoryName,
          targetCategoryName,
        });
      } else if (ratio === 1.0) {
        nudgeInsights.push({
          ...baseInsight,
          priority: BUDGET_CRITICAL_PRIORITY,
          severity: 'critical',
          title: 'Batas Anggaran Tercapai',
          body: `Anggaran ${catName} sudah mencapai batas bulan ini. Pengeluaran berikutnya akan membuat anggaran melewati limit.`,
          ctaLabel: 'Tinjau Anggaran',
          ctaRoute: '/budgets',
          relatedBudgetId: budget.clientId,
          relatedCategoryId: budget.categoryId,
          threshold: 100,
          budgetUpdatedAt: budget.updatedAt,
        });
      } else if (ratio >= 0.8) {
        let title = 'Anggaran Mulai Menipis';
        if (comparisonAmount) {
          title = `Pengeluaran ${catName} Naik`;
        }
        nudgeInsights.push({
          ...baseInsight,
          priority: BUDGET_WARNING_PRIORITY,
          severity: 'warning',
          title: title,
          body: `Anggaran ${catName} sudah terpakai 80%.${comparisonText} Pertimbangkan menahan pengeluaran berikutnya agar tidak melewati batas.`,
          ctaLabel: 'Lihat Anggaran',
          ctaRoute: '/budgets',
          relatedBudgetId: budget.clientId,
          relatedCategoryId: budget.categoryId,
          threshold: 80,
          budgetUpdatedAt: budget.updatedAt,
        });
      } else if (ratio >= 0.5) {
        nudgeInsights.push({
          ...baseInsight,
          priority: BUDGET_INFO_PRIORITY,
          severity: 'info',
          title: 'Penggunaan Anggaran Berjalan',
          body: `Anggaran ${catName} sudah terpakai 50%. Masih ada ruang, tetapi mulai pantau agar tetap sesuai rencana.`,
          ctaLabel: 'Lihat Anggaran',
          ctaRoute: '/budgets',
          relatedBudgetId: budget.clientId,
          relatedCategoryId: budget.categoryId,
          threshold: 50,
          budgetUpdatedAt: budget.updatedAt,
        });
      }
    }

    // Sort by priority to evaluate the most important nudges first
    nudgeInsights.sort((a, b) => a.priority - b.priority);

    console.log('[LocalEngine] Generated nudges:', nudgeInsights.length);

    // ── Read settings once outside the loop ────────────────
    // (fetched here so we do not hit IDB on every dedupe-skipped insight)
    const settings = await getNotificationSettings(userId);
    const deliveryMode = resolveDeliveryMode(settings);
    const rawDailyCap = settings?.dailyCap;
    const dailyCap = normalizeDailyCap(rawDailyCap);

    console.log(`[LocalEngine] Delivery mode resolved: ${deliveryMode} | dailyCap: ${dailyCap}`);

    for (const insight of nudgeInsights) {
      if (insight.severity === 'neutral') {
        continue;
      }

      const dedupeKey = getDedupeKey(insight, userId, createdTxn);
      const exists = await checkDedupeKeyExists(dedupeKey);
      console.log(
        `[LocalEngine] Evaluated nudge: ${insight.title} | severity: ${insight.severity} | DedupeKey: ${dedupeKey} | alreadyLogged: ${exists}`,
      );

      if (!exists) {
        // ── STEP 1: Create notification log (always, independent of delivery mode) ──
        // Log creation must not be blocked by delivery mode or daily push cap.
        // The in-app Notifications page shows these logs regardless of device push state.
        const logId = crypto.randomUUID();
        const now = new Date().toISOString();

        let eventType = 'SPENDING_INSIGHT';
        if (insight.priority === BUDGET_CRITICAL_PRIORITY) eventType = 'BUDGET_CRITICAL';
        else if (insight.priority === BUDGET_WARNING_PRIORITY) eventType = 'BUDGET_WARNING';
        else if (insight.priority === BUDGET_INFO_PRIORITY) eventType = 'BUDGET_INFO';

        await upsertNotificationLog({
          clientId: logId,
          dedupeKey,
          userId,
          title: insight.title,
          body: insight.body,
          type: insight.priority.toString(),
          eventType,
          status: 'delivered',
          severity: insight.severity,
          source: 'local-engine',
          relatedTransactionClientId: createdTxn.clientId,
          relatedCategoryId: insight.relatedCategoryId || createdTxn.categoryId || undefined,
          relatedBudgetId: insight.relatedBudgetId,
          deliveryModeAtCreation: deliveryMode,
          createdAt: now,
          updatedAt: now,
          syncStatus: 'PENDING',
          ctaRoute: insight.ctaRoute,
          actionType: insight.actionType,
          ctaLabel: insight.ctaLabel,
          sourceBudgetId: insight.sourceBudgetId,
          targetBudgetId: insight.targetBudgetId,
          recommendedAmount: insight.recommendedAmount,

          // Added metadata fields
          categoryName: insight.categoryName,
          usageRatio: insight.usageRatio,
          budgetLimit: insight.budgetLimit,
          budgetSpent: insight.budgetSpent,
          deficitAmount: insight.deficitAmount,
          todayAmount: insight.todayAmount,
          comparisonAmount: insight.comparisonAmount,
          comparisonLabel: insight.comparisonLabel,
          sourceCategoryName: insight.sourceCategoryName,
          targetCategoryName: insight.targetCategoryName,
        });
        console.log(`[LocalEngine] Log created in IDB — logId: ${logId}`);

        // ── STEP 2: In-app UI updates (always, regardless of delivery mode) ────
        showSyncToast(insight.title, insight.body);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('moneta-notification-updated'));
        }

        // ── STEP 3: Delivery Decision — gate system push on delivery mode ────
        // Only one push attempt per transaction evaluation (break after decision).

        if (deliveryMode === 'NONE') {
          // OFF mode: logs exist in Notifications page; no device notification.
          console.log('[LocalEngine] Push skipped — reason: mode_off');
          break;
        }

        if (deliveryMode === 'DIGEST') {
          // DIGEST mode: logs exist; individual pushes suppressed; digest fires later.
          console.log('[LocalEngine] Push skipped — reason: digest_mode_active');
          break;
        }

        // ── STEP 4: INSTANT mode — check push prerequisites ─────────────────
        if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
          console.log('[LocalEngine] Push skipped — reason: service_worker_unavailable');
          break;
        }

        if (Notification.permission !== 'granted') {
          console.log('[LocalEngine] Push skipped — reason: permission_not_granted');
          break;
        }

        // Daily push cap: use localStorage counter (counts actual pushes, not logs).
        // This ensures cap limits device notifications and never blocks log creation.
        const { count: todayPushCount } = readTodayCountFromLS();
        const capReached = isDailyCapReached(todayPushCount, dailyCap);
        const isUnlimited = dailyCap === null;

        console.log('[DailyCapDebug]', {
          context: 'local-engine',
          rawDailyCap,
          normalizedDailyCap: dailyCap,
          currentPushCount: todayPushCount,
          isUnlimited,
          capReached,
          settingsSource: 'indexedDB',
        });

        if (capReached) {
          console.log(`[LocalEngine] Push skipped — reason: daily_push_cap_reached (${todayPushCount}/${dailyCap})`);
          break;
        }

        // ── STEP 5: Execute push via Service Worker ──────────────────────────
        try {
          const reg = await navigator.serviceWorker.ready;
          const isCritical = insight.priority === BUDGET_CRITICAL_PRIORITY;

          console.log(`[LocalEngine] showNotification — logId: ${logId} | ctaRoute: ${insight.ctaRoute} | dedupeKey: ${dedupeKey}`);

          await reg.showNotification(insight.title, {
            body: insight.body,
            icon: '/icons/icon-192x192.png',
            tag: dedupeKey, // Prevent duplicate OS banners for same event
            renotify: true, // Force banner even if same tag was reused
            requireInteraction: isCritical, // Keep critical alerts on screen
            data: {
              clientId: logId,
              logId: logId,
              ctaRoute: insight.ctaRoute || '/notifications',
              url: insight.ctaRoute || '/notifications',
              type: isCritical ? 'DEFICIT' : 'INSTANT',
              relatedBudgetId: insight.relatedBudgetId,
              relatedCategoryId: insight.relatedCategoryId,
              actionType: insight.actionType,
              ctaLabel: insight.ctaLabel,
              sourceBudgetId: insight.sourceBudgetId,
              targetBudgetId: insight.targetBudgetId,
              recommendedAmount: insight.recommendedAmount,
            },
          } as any);

          // Increment push counter ONLY after successful showNotification.
          // This counter represents device notifications sent, not logs created.
          incrementTodayCountInLS();
          const { markLogPushed } = await import('@/lib/local-db/repositories/notification-logs');
          await markLogPushed(logId, new Date().toISOString());
          console.log('[LocalEngine] Push delivered successfully.');
        } catch (swErr: any) {
          console.error('[LocalEngine] Push skipped — reason: show_notification_error:', swErr.name, swErr.message);
        }

        // One push attempt per transaction — intentional to avoid spamming.
        break;
      }
    }
  } catch (err) {
    console.error('[LocalEngine] Failed to evaluate nudges:', err);
  }
}

export async function evaluateTargetNudges(createdTxn: Transaction) {
  console.log('[LocalEngine] Starting evaluateTargetNudges for txn:', createdTxn.clientId);
  try {
    const userId = createdTxn.userId;
    const { getActiveTargets } = await import('@/lib/local-db/repositories/targets');
    const { calculateTargetProgress } = await import('@/lib/local-db/target-queries');

    const targets = await getActiveTargets(userId);
    if (!targets.length) return;

    const settings = await getNotificationSettings(userId);
    const isInstant = resolveDeliveryMode(settings) === 'INSTANT';

    for (const target of targets) {
      if (!isTargetActiveForDate(target, new Date(createdTxn.date))) continue;

      if (createdTxn.type !== 'INCOME') continue;
      if (target.categoryId !== createdTxn.categoryId) continue;

      const progress = await calculateTargetProgress(target, new Date(createdTxn.date));
      if (progress.isNotStarted) continue;

      const startIso = dayjs(progress.periodStart).format('YYYY-MM-DD');
      const endIso = dayjs(progress.periodEnd).format('YYYY-MM-DD');

      let periodKey = '';
      if (target.period === 'DAILY') periodKey = dayjs(progress.periodStart).format('YYYY-MM-DD');
      else if (target.period === 'WEEKLY') periodKey = dayjs(progress.periodStart).format('YYYY-ww');
      else if (target.period === 'MONTHLY') periodKey = dayjs(progress.periodStart).format('YYYY-MM');
      else periodKey = `${startIso}_${endIso}`;

      let threshold = '';
      let title = '';
      let body = '';

      if (progress.percentage >= 100) {
        threshold = '100';
        title = `Target Tercapai: "${target.name}"`;
        body = `Selamat, target pemasukanmu telah tercapai (${formatCurrency(progress.currentAmount)} dari ${formatCurrency(target.targetAmount)}).`;
      } else if (progress.percentage >= 80) {
        threshold = '80';
        title = `Hampir Tercapai: "${target.name}"`;
        body = `Pemasukanmu sudah mencapai ${progress.percentage}% dari target (${formatCurrency(progress.currentAmount)} dari ${formatCurrency(target.targetAmount)}).`;
      }

      if (threshold) {
        const dedupeKey = `TARGET_USAGE:${userId}:${target.clientId}:${target.type}:${target.categoryId || 'none'}:${periodKey}:${threshold}`;

        const exists = await checkDedupeKeyExists(dedupeKey);
        if (!exists) {
          console.log(`[TargetNudge] Triggering Notification: ${title}`);

          const logId = generateClientId();
          
          await upsertNotificationLog({
            clientId: logId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            userId,
            dedupeKey,
            type: progress.percentage >= 100 ? 'TARGET_ACHIEVED' : 'TARGET_PROGRESS',
            title,
            body,
            status: 'delivered',
            ctaLabel: 'Lihat Target',
            ctaRoute: '/targets',
            actionType: 'VIEW_TARGET',
            source: 'local-engine',
            severity: progress.percentage >= 100 ? 'success' : 'info',
            syncStatus: 'PENDING',
          });

          // Notify UI to update bell icon
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('moneta-notification-updated'));
          }

          if (!isInstant) continue;

          const currentCap = readTodayCountFromLS();
          const maxCap = normalizeDailyCap(settings?.dailyCap);
          const capReached = isDailyCapReached(currentCap.count, maxCap);

          if (!capReached) {
            // Toast fallback for UI feedback
            import('sonner').then(({ toast }) => {
              toast.success(title, { description: body });
            });

            // Service worker push
            if (typeof window !== 'undefined' && 'serviceWorker' in navigator && Notification.permission === 'granted') {
              try {
                const reg = await navigator.serviceWorker.ready;
                await reg.showNotification(title, {
                  body: body,
                  icon: '/icons/icon-192x192.png',
                  tag: dedupeKey,
                  renotify: true,
                  requireInteraction: progress.percentage >= 100,
                  data: {
                    clientId: logId,
                    logId: logId,
                    ctaRoute: '/targets',
                    url: '/targets',
                    type: progress.percentage >= 100 ? 'DEFICIT' : 'INSTANT',
                    actionType: 'VIEW_TARGET',
                    ctaLabel: 'Lihat Target',
                  },
                } as any);
                
                const { markLogPushed } = await import('@/lib/local-db/repositories/notification-logs');
                await markLogPushed(logId, new Date().toISOString());
                console.log('[LocalEngine] Target Push delivered successfully.');
              } catch (swErr) {
                console.error('[LocalEngine] Target Push failed:', swErr);
              }
            }

            incrementTodayCountInLS();
          }
        }
      }
    }
  } catch (err) {
    console.error('[LocalEngine] Failed to evaluate target nudges:', err);
  }
}
