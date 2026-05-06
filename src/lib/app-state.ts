import { getLocalDateKey, getWeekStartKey } from "@/lib/storage";
import { getRemainingPullsUntilSrPity, SR_PITY_THRESHOLD } from "@/lib/gacha";
import { groupSeriesTasksByCategory, TASK_TYPE_ORDER } from "@/lib/task-types";
import type { AppState, DailyTaskTemplate, Task, TaskType } from "@/types/domain";

function sortTasks(tasks: Task[]) {
  return [...tasks].sort((left, right) => {
    if (left.status !== right.status) {
      if (left.status === "active") {
        return -1;
      }

      if (right.status === "active") {
        return 1;
      }
    }

    return right.updatedAt.localeCompare(left.updatedAt);
  });
}

function sortTemplates(templates: DailyTaskTemplate[]) {
  return [...templates].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export function getTodayKey() {
  return getLocalDateKey(new Date());
}

export function getDailyTaskTemplates(state: AppState) {
  return sortTemplates(state.dailyTaskTemplates);
}

export function getTodayDailyTasks(state: AppState, dateKey = getTodayKey()) {
  return sortTasks(
    state.tasks.filter(
      (task) => task.type === "daily" && task.date === dateKey && task.status !== "archived",
    ),
  );
}

export function getTasksByType(state: AppState, type: TaskType) {
  return sortTasks(state.tasks.filter((task) => task.type === type));
}

export function getVisibleTasksByType(state: AppState, type: TaskType) {
  return sortTasks(state.tasks.filter((task) => task.type === type && task.status !== "archived"));
}

export function getArchivedTasksByType(state: AppState, type: TaskType) {
  return sortTasks(state.tasks.filter((task) => task.type === type && task.status === "archived"));
}

export function getActiveTasksByType(state: AppState, type: TaskType) {
  return sortTasks(state.tasks.filter((task) => task.type === type && task.status === "active"));
}

export function getCompletedTasksByType(state: AppState, type: TaskType) {
  return sortTasks(
    state.tasks.filter((task) => task.type === type && task.status === "completed"),
  );
}

export function getSeriesTaskGroups(state: AppState) {
  return groupSeriesTasksByCategory(getVisibleTasksByType(state, "series"));
}

export function getArchivedSeriesTaskGroups(state: AppState) {
  return groupSeriesTasksByCategory(getArchivedTasksByType(state, "series"));
}

export function getTaskCountsByType(state: AppState) {
  return TASK_TYPE_ORDER.reduce(
    (result, type) => {
      result[type] = getVisibleTasksByType(state, type).length;
      return result;
    },
    {} as Record<TaskType, number>,
  );
}

export function getCompletedTaskCountsByType(state: AppState) {
  return TASK_TYPE_ORDER.reduce(
    (result, type) => {
      result[type] = state.tasks.filter(
        (task) => task.type === type && task.status === "completed",
      ).length;
      return result;
    },
    {} as Record<TaskType, number>,
  );
}

export function getLatestGachaPull(state: AppState) {
  return state.gachaPulls[0] ?? null;
}

export function getSrPityStatus(state: AppState) {
  const pullsSinceLastSR = state.pityState.pullsSinceLastSR;

  return {
    enabled: state.userSettings.enablePity,
    pullsSinceLastSR,
    threshold: SR_PITY_THRESHOLD,
    progressLabel: `${Math.min(pullsSinceLastSR, SR_PITY_THRESHOLD - 1)} / ${SR_PITY_THRESHOLD}`,
    remainingPulls: getRemainingPullsUntilSrPity(pullsSinceLastSR),
  };
}

export function getTodayRewardGems(state: AppState) {
  const todayKey = getTodayKey();

  return state.resourceTransactions.reduce((total, transaction) => {
    if (
      transaction.type === "task_reward" &&
      getLocalDateKey(new Date(transaction.createdAt)) === todayKey
    ) {
      return total + transaction.gemsDelta;
    }

    return total;
  }, 0);
}

export function getDashboardStats(state: AppState) {
  return {
    currentGems: state.wallet.gems,
    currentDust: state.wallet.dust,
    rewardBalance: state.wallet.rewardBalance,
    todayGems: getTodayRewardGems(state),
    todayDailyTasks: getTodayDailyTasks(state),
    seriesTasks: getVisibleTasksByType(state, "series"),
    mainTasks: getVisibleTasksByType(state, "main"),
    seriesTaskGroups: getSeriesTaskGroups(state),
    latestGachaPull: getLatestGachaPull(state),
  };
}

export function getStatsPageData(state: AppState) {
  const todayKey = getTodayKey();
  const weekStart = getWeekStartKey(new Date());

  const todayCompleted = state.tasks.filter(
    (t) => t.status === "completed" && t.completedAt && getLocalDateKey(new Date(t.completedAt)) === todayKey,
  ).length;

  const weekTransactions = state.resourceTransactions.filter(
    (t) => getLocalDateKey(new Date(t.createdAt)) >= weekStart,
  );
  const weekGems = weekTransactions.reduce((sum, t) => sum + t.gemsDelta, 0);
  const weekDust = weekTransactions.reduce((sum, t) => sum + t.dustDelta, 0);

  const weekPulls = state.gachaPulls.filter(
    (p) => getLocalDateKey(new Date(p.createdAt)) >= weekStart,
  ).length;

  const totalCompleted = state.tasks.filter((t) => t.status === "completed").length;
  const totalTasks = state.tasks.filter((t) => t.status !== "archived").length;

  const seriesProgress = state.tasks
    .filter((t) => t.type === "series" && t.status === "active" && t.weeklyTarget)
    .map((t) => ({
      title: t.title,
      completed: t.weeklyCompletedCount || 0,
      target: t.weeklyTarget || 0,
      reached: (t.weeklyCompletedCount || 0) >= (t.weeklyTarget || 0),
    }));

  const mainCompleted = state.tasks.filter(
    (t) => t.type === "main" && t.status === "completed",
  ).length;
  const mainTotal = state.tasks.filter((t) => t.type === "main").length;

  const totalUnlocked = state.wallet.monthlyUnlockedAmount;
  const totalSpent = state.spendingRecords.reduce((sum, r) => sum + r.amount, 0);

  return {
    todayCompleted,
    weekGems,
    weekDust,
    weekPulls,
    totalCompleted,
    totalTasks,
    seriesProgress,
    mainCompleted,
    mainTotal,
    totalUnlocked,
    totalSpent,
  };
}
