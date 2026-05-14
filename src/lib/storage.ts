import { DEFAULT_GACHA_OPEN_DAYS, getGachaPoolStatus, normalizeGachaOpenDays } from "@/lib/date";
import {
  createInitialPityState,
  DEFAULT_GACHA_COST,
  DEFAULT_GACHA_REWARD_TIERS,
  isSrOrHigher,
  rollGachaReward,
  resolveGachaRewardWithPity,
  resolveSequentialGachaPulls,
  TEN_PULL_COUNT,
  WEEKEND_GACHA_POOL,
} from "@/lib/gacha";
import {
  DEFAULT_SERIES_TASK_CATEGORY,
  DEFAULT_SERIES_WEEKLY_TARGET,
  getSeriesTaskCategoryLabel,
  SERIES_WEEKLY_BONUS_MULTIPLIER,
  TASK_TYPE_ORDER,
} from "@/lib/task-types";
import { formatDustRedeemNote, getDustRedeemOption } from "@/lib/redeem";
import {
  DEFAULT_TASK_REWARD_SETTINGS,
  getRewardByDifficulty,
  normalizeTaskRewardSettings,
} from "@/lib/task-rewards";
import type {
  AppDebugState,
  AppState,
  DailyTaskTemplate,
  DailyTaskTemplateCreateInput,
  DailyTaskTemplateUpdateInput,
  GachaPull,
  GachaRewardTier,
  PityState,
  ResourceTransaction,
  RewardRarity,
  SpendingRecord,
  Task,
  TaskCreateInput,
  TaskUpdateInput,
  TaskRewardSettings,
  UserSettings,
  Wallet,
} from "@/types/domain";

export const APP_STATE_STORAGE_KEY = "discipline-gacha-state";

type UserSettingsUpdateInput = Pick<
  UserSettings,
  | "monthlyBudgetLimit"
  | "gachaCost"
  | "gachaOpenDays"
  | "taskRewardSettings"
  | "gachaRewardTiers"
  | "showDevTools"
  | "enablePity"
  | "srPityThreshold"
  | "urPityThreshold"
  | "seriesWeeklyTarget"
  | "seriesWeeklyBonusMultiplier"
>;

const EMPTY_DEBUG_STATE: AppDebugState = {
  forceWeekendOpen: false,
};

const EMPTY_WALLET: Wallet = {
  id: "wallet_main",
  gems: 0,
  dust: 0,
  rewardBalance: 0,
  monthlyUnlockedAmount: 0,
  monthlySpentAmount: 0,
  month: "",
  updatedAt: "",
};

const DAILY_ROLLOVER_HOUR = 3;

export const EMPTY_APP_STATE: AppState = {
  tasks: [],
  dailyTaskTemplates: [],
  wallet: EMPTY_WALLET,
  resourceTransactions: [],
  gachaPulls: [],
  pityState: createInitialPityState(""),
  spendingRecords: [],
  userSettings: createUserSettingsTemplate(),
  debug: EMPTY_DEBUG_STATE,
};

function canUseLocalStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function padNumber(value: number) {
  return value.toString().padStart(2, "0");
}

export function getLocalDateKey(date: Date) {
  const shiftedDate = new Date(date);
  shiftedDate.setHours(shiftedDate.getHours() - DAILY_ROLLOVER_HOUR);

  return `${shiftedDate.getFullYear()}-${padNumber(shiftedDate.getMonth() + 1)}-${padNumber(shiftedDate.getDate())}`;
}

function getLocalMonthKey(date: Date) {
  return `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}`;
}

export function getWeekStartKey(date: Date) {
  const d = new Date(date);
  d.setHours(d.getHours() - DAILY_ROLLOVER_HOUR);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  return `${d.getFullYear()}-${padNumber(d.getMonth() + 1)}-${padNumber(d.getDate())}`;
}

function createTimestamp(date = new Date()) {
  return date.toISOString();
}

function getDefaultTimezone() {
  if (typeof Intl !== "undefined") {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (timezone) {
      return timezone;
    }
  }

  return "Asia/Shanghai";
}

function createWalletTemplate(date = new Date()): Wallet {
  const timestamp = createTimestamp(date);

  return {
    ...EMPTY_WALLET,
    month: getLocalMonthKey(date),
    updatedAt: timestamp,
  };
}

export function createUserSettingsTemplate(date = new Date()): UserSettings {
  const timestamp = createTimestamp(date);

  return {
    id: "user_settings_main",
    monthlyBudgetLimit: 500,
    gachaCost: DEFAULT_GACHA_COST,
    gachaOpenDays: [...DEFAULT_GACHA_OPEN_DAYS],
    taskRewardSettings: normalizeTaskRewardSettings(DEFAULT_TASK_REWARD_SETTINGS),
    gachaRewardTiers: DEFAULT_GACHA_REWARD_TIERS.map((t) => ({ ...t })),
    showDevTools: true,
    enablePity: true,
    srPityThreshold: 10,
    urPityThreshold: 100,
    seriesWeeklyTarget: DEFAULT_SERIES_WEEKLY_TARGET,
    seriesWeeklyBonusMultiplier: SERIES_WEEKLY_BONUS_MULTIPLIER,
    timezone: getDefaultTimezone(),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizePositiveNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : fallback;
}

function isValidTaskType(value: unknown): value is Task["type"] {
  return typeof value === "string" && TASK_TYPE_ORDER.includes(value as Task["type"]);
}

function isValidTaskStatus(value: unknown): value is Task["status"] {
  return value === "active" || value === "completed" || value === "archived";
}

function normalizeTask(candidate: unknown): Task | null {
  if (!isObject(candidate)) {
    return null;
  }

  if (
    typeof candidate.id !== "string" ||
    typeof candidate.title !== "string" ||
    typeof candidate.difficulty !== "string" ||
    typeof candidate.rewardGems !== "number" ||
    typeof candidate.rewardDust !== "number" ||
    typeof candidate.createdAt !== "string" ||
    typeof candidate.updatedAt !== "string"
  ) {
    return null;
  }

  const type = isValidTaskType(candidate.type) ? candidate.type : "main";
  const status = isValidTaskStatus(candidate.status)
    ? candidate.status
    : typeof candidate.completedAt === "string"
      ? "completed"
      : "active";
  const inferredDate =
    type === "daily" ? getLocalDateKey(new Date(candidate.createdAt)) : undefined;

  return {
    id: candidate.id,
    type,
    templateId: typeof candidate.templateId === "string" ? candidate.templateId : undefined,
    date:
      typeof candidate.date === "string"
        ? candidate.date
        : inferredDate,
    category:
      type === "series" && typeof candidate.category === "string"
        ? getSeriesTaskCategoryLabel(candidate.category)
        : undefined,
    title: candidate.title,
    status,
    difficulty: candidate.difficulty as Task["difficulty"],
    rewardGems: candidate.rewardGems,
    rewardDust: candidate.rewardDust,
    createdAt: candidate.createdAt,
    updatedAt: candidate.updatedAt,
    completedAt: typeof candidate.completedAt === "string" ? candidate.completedAt : undefined,
    description: typeof candidate.description === "string" ? candidate.description : undefined,
    dueDate: typeof candidate.dueDate === "string" ? candidate.dueDate : undefined,
    weeklyTarget: type === "series" && typeof candidate.weeklyTarget === "number" ? candidate.weeklyTarget : undefined,
    weeklyCompletedCount: type === "series" && typeof candidate.weeklyCompletedCount === "number" ? candidate.weeklyCompletedCount : undefined,
    weekPeriodStart: type === "series" && typeof candidate.weekPeriodStart === "string" ? candidate.weekPeriodStart : undefined,
    weeklyBonusGems: type === "series" && typeof candidate.weeklyBonusGems === "number" ? candidate.weeklyBonusGems : undefined,
    weeklyBonusDust: type === "series" && typeof candidate.weeklyBonusDust === "number" ? candidate.weeklyBonusDust : undefined,
  };
}

function toGachaRewardTiers(tiers: UserSettings["gachaRewardTiers"]): GachaRewardTier[] {
  return tiers.map((t) => ({
    id: `tier_${t.rarity.toLowerCase()}`,
    poolId: WEEKEND_GACHA_POOL.id,
    ...t,
  }));
}

function normalizeGachaRewardTiers(candidate: unknown) {
  if (!Array.isArray(candidate) || candidate.length === 0) {
    return DEFAULT_GACHA_REWARD_TIERS.map((t) => ({ ...t }));
  }

  const validRarities: RewardRarity[] = ["N", "R", "SR", "SSR", "UR"];
  const result = validRarities.map((rarity, index) => {
    const item = candidate.find((c) => c?.rarity === rarity);
    const defaultTier = DEFAULT_GACHA_REWARD_TIERS[index];
    return {
      rarity,
      probability: typeof item?.probability === "number" && item.probability >= 0 ? item.probability : defaultTier.probability,
      rewardAmount: typeof item?.rewardAmount === "number" && item.rewardAmount >= 0 ? Math.round(item.rewardAmount) : defaultTier.rewardAmount,
      displayName: typeof item?.displayName === "string" ? item.displayName : defaultTier.displayName,
    };
  });

  return result;
}

function normalizeDailyTaskTemplate(candidate: unknown): DailyTaskTemplate | null {
  if (!isObject(candidate)) {
    return null;
  }

  if (
    typeof candidate.id !== "string" ||
    typeof candidate.title !== "string" ||
    typeof candidate.difficulty !== "string" ||
    typeof candidate.rewardGems !== "number" ||
    typeof candidate.rewardDust !== "number" ||
    typeof candidate.isActive !== "boolean" ||
    typeof candidate.createdAt !== "string" ||
    typeof candidate.updatedAt !== "string"
  ) {
    return null;
  }

  return {
    id: candidate.id,
    title: candidate.title,
    difficulty: candidate.difficulty as DailyTaskTemplate["difficulty"],
    rewardGems: candidate.rewardGems,
    rewardDust: candidate.rewardDust,
    isActive: candidate.isActive,
    createdAt: candidate.createdAt,
    updatedAt: candidate.updatedAt,
  };
}

function normalizeWallet(candidate: unknown): Wallet {
  if (!isObject(candidate)) {
    return createWalletTemplate();
  }

  const date = new Date();

  return {
    id: typeof candidate.id === "string" ? candidate.id : EMPTY_WALLET.id,
    gems: typeof candidate.gems === "number" ? candidate.gems : 0,
    dust: typeof candidate.dust === "number" ? candidate.dust : 0,
    rewardBalance: typeof candidate.rewardBalance === "number" ? candidate.rewardBalance : 0,
    monthlyUnlockedAmount:
      typeof candidate.monthlyUnlockedAmount === "number"
        ? candidate.monthlyUnlockedAmount
        : 0,
    monthlySpentAmount:
      typeof candidate.monthlySpentAmount === "number" ? candidate.monthlySpentAmount : 0,
    month: typeof candidate.month === "string" ? candidate.month : getLocalMonthKey(date),
    updatedAt:
      typeof candidate.updatedAt === "string" ? candidate.updatedAt : createTimestamp(date),
  };
}

function normalizeTransaction(candidate: unknown): ResourceTransaction | null {
  if (!isObject(candidate)) {
    return null;
  }

  if (
    typeof candidate.id !== "string" ||
    typeof candidate.type !== "string" ||
    typeof candidate.gemsDelta !== "number" ||
    typeof candidate.dustDelta !== "number" ||
    typeof candidate.rewardBalanceDelta !== "number" ||
    typeof candidate.createdAt !== "string"
  ) {
    return null;
  }

  return {
    id: candidate.id,
    type: candidate.type as ResourceTransaction["type"],
    gemsDelta: candidate.gemsDelta,
    dustDelta: candidate.dustDelta,
    rewardBalanceDelta: candidate.rewardBalanceDelta,
    createdAt: candidate.createdAt,
    relatedTaskId:
      typeof candidate.relatedTaskId === "string" ? candidate.relatedTaskId : undefined,
    relatedGachaPullId:
      typeof candidate.relatedGachaPullId === "string"
        ? candidate.relatedGachaPullId
        : undefined,
    note: typeof candidate.note === "string" ? candidate.note : undefined,
  };
}

function normalizeGachaPull(candidate: unknown): GachaPull | null {
  if (!isObject(candidate)) {
    return null;
  }

  if (
    typeof candidate.id !== "string" ||
    typeof candidate.poolId !== "string" ||
    typeof candidate.costGems !== "number" ||
    typeof candidate.rarity !== "string" ||
    typeof candidate.rewardAmount !== "number" ||
    typeof candidate.pityTriggered !== "boolean" ||
    typeof candidate.createdAt !== "string"
  ) {
    return null;
  }

  return {
    id: candidate.id,
    poolId: candidate.poolId,
    batchId: typeof candidate.batchId === "string" ? candidate.batchId : undefined,
    pullType:
      candidate.pullType === "single" || candidate.pullType === "ten"
        ? candidate.pullType
        : undefined,
    costGems: candidate.costGems,
    rarity: candidate.rarity as GachaPull["rarity"],
    rewardAmount: candidate.rewardAmount,
    pityTriggered: candidate.pityTriggered,
    createdAt: candidate.createdAt,
  };
}

function normalizeDebug(candidate: unknown): AppDebugState {
  if (!isObject(candidate)) {
    return EMPTY_DEBUG_STATE;
  }

  return {
    forceWeekendOpen: candidate.forceWeekendOpen === true,
  };
}

function normalizePityState(candidate: unknown): PityState {
  const defaults = createInitialPityState();

  if (!isObject(candidate)) {
    return defaults;
  }

  return {
    id: typeof candidate.id === "string" ? candidate.id : defaults.id,
    poolId: typeof candidate.poolId === "string" ? candidate.poolId : defaults.poolId,
    pullsSinceLastSR:
      typeof candidate.pullsSinceLastSR === "number" && candidate.pullsSinceLastSR >= 0
        ? candidate.pullsSinceLastSR
        : defaults.pullsSinceLastSR,
    pullsSinceLastSSR:
      typeof candidate.pullsSinceLastSSR === "number" && candidate.pullsSinceLastSSR >= 0
        ? candidate.pullsSinceLastSSR
        : defaults.pullsSinceLastSSR,
    updatedAt:
      typeof candidate.updatedAt === "string" ? candidate.updatedAt : defaults.updatedAt,
  };
}

function normalizeSpendingRecord(candidate: unknown): SpendingRecord | null {
  if (!isObject(candidate)) {
    return null;
  }

  if (
    typeof candidate.id !== "string" ||
    typeof candidate.amount !== "number" ||
    typeof candidate.note !== "string" ||
    typeof candidate.spentAt !== "string" ||
    typeof candidate.createdAt !== "string"
  ) {
    return null;
  }

  return {
    id: candidate.id,
    amount: candidate.amount,
    note: candidate.note,
    spentAt: candidate.spentAt,
    createdAt: candidate.createdAt,
    category: typeof candidate.category === "string" ? candidate.category : undefined,
  };
}

function normalizeUserSettings(candidate: unknown): UserSettings {
  const defaults = createUserSettingsTemplate();

  if (!isObject(candidate)) {
    return defaults;
  }

  return {
    id: typeof candidate.id === "string" ? candidate.id : defaults.id,
    monthlyBudgetLimit: normalizePositiveNumber(
      candidate.monthlyBudgetLimit,
      defaults.monthlyBudgetLimit,
    ),
    gachaCost: normalizePositiveNumber(candidate.gachaCost, defaults.gachaCost),
    gachaOpenDays: normalizeGachaOpenDays(
      Array.isArray(candidate.gachaOpenDays) ? candidate.gachaOpenDays : defaults.gachaOpenDays,
    ),
    taskRewardSettings: normalizeTaskRewardSettings(candidate.taskRewardSettings),
    gachaRewardTiers: normalizeGachaRewardTiers(candidate.gachaRewardTiers),
    showDevTools:
      typeof candidate.showDevTools === "boolean" ? candidate.showDevTools : true,
    enablePity:
      typeof candidate.enablePity === "boolean" ? candidate.enablePity : defaults.enablePity,
    srPityThreshold:
      typeof candidate.srPityThreshold === "number" && candidate.srPityThreshold >= 1
        ? Math.round(candidate.srPityThreshold)
        : defaults.srPityThreshold,
    urPityThreshold:
      typeof candidate.urPityThreshold === "number" && candidate.urPityThreshold >= 1
        ? Math.round(candidate.urPityThreshold)
        : defaults.urPityThreshold,
    seriesWeeklyTarget:
      typeof candidate.seriesWeeklyTarget === "number" && candidate.seriesWeeklyTarget >= 1 && candidate.seriesWeeklyTarget <= 7
        ? Math.round(candidate.seriesWeeklyTarget)
        : defaults.seriesWeeklyTarget,
    seriesWeeklyBonusMultiplier:
      typeof candidate.seriesWeeklyBonusMultiplier === "number" && candidate.seriesWeeklyBonusMultiplier >= 0
        ? candidate.seriesWeeklyBonusMultiplier
        : defaults.seriesWeeklyBonusMultiplier,
    timezone: typeof candidate.timezone === "string" ? candidate.timezone : defaults.timezone,
    createdAt:
      typeof candidate.createdAt === "string" ? candidate.createdAt : defaults.createdAt,
    updatedAt:
      typeof candidate.updatedAt === "string" ? candidate.updatedAt : defaults.updatedAt,
  };
}

function syncWalletMonth(wallet: Wallet, date = new Date()) {
  const month = getLocalMonthKey(date);

  if (wallet.month === month) {
    return wallet;
  }

  return {
    ...wallet,
    month,
    monthlyUnlockedAmount: 0,
    monthlySpentAmount: 0,
  };
}

function ensureDailyTasksForDate(baseState: AppState, date = new Date()) {
  const dateKey = getLocalDateKey(date);
  const timestamp = createTimestamp(date);
  const existingKeys = new Set(
    baseState.tasks
      .filter((task) => task.type === "daily" && task.templateId && task.date === dateKey)
      .map((task) => `${task.templateId}:${task.date}`),
  );

  const newTasks = baseState.dailyTaskTemplates
    .filter((template) => template.isActive)
    .filter((template) => !existingKeys.has(`${template.id}:${dateKey}`))
    .map<Task>((template) => ({
      id: createId("task"),
      type: "daily",
      templateId: template.id,
      date: dateKey,
      title: template.title,
      status: "active",
      difficulty: template.difficulty,
      rewardGems: template.rewardGems,
      rewardDust: template.rewardDust,
      createdAt: timestamp,
      updatedAt: timestamp,
    }));

  if (newTasks.length === 0) {
    return baseState;
  }

  return {
    ...baseState,
    tasks: [...newTasks, ...baseState.tasks],
  };
}

function normalizeAppState(candidate: unknown): AppState {
  if (!isObject(candidate)) {
    return getInitialAppState();
  }

  const tasks = Array.isArray(candidate.tasks)
    ? candidate.tasks.map(normalizeTask).filter((task): task is Task => task !== null)
    : [];

  const dailyTaskTemplates = Array.isArray(candidate.dailyTaskTemplates)
    ? candidate.dailyTaskTemplates
        .map(normalizeDailyTaskTemplate)
        .filter((template): template is DailyTaskTemplate => template !== null)
    : [];

  const resourceTransactions = Array.isArray(candidate.resourceTransactions)
    ? candidate.resourceTransactions
        .map(normalizeTransaction)
        .filter((transaction): transaction is ResourceTransaction => transaction !== null)
    : [];

  const gachaPulls = Array.isArray(candidate.gachaPulls)
    ? candidate.gachaPulls
        .map(normalizeGachaPull)
        .filter((pull): pull is GachaPull => pull !== null)
    : [];

  const spendingRecords = Array.isArray(candidate.spendingRecords)
    ? candidate.spendingRecords
        .map(normalizeSpendingRecord)
        .filter((record): record is SpendingRecord => record !== null)
    : [];

  return ensureDailyTasksForDate({
    tasks,
    dailyTaskTemplates,
    wallet: normalizeWallet(candidate.wallet),
    resourceTransactions,
    gachaPulls,
    pityState: normalizePityState(candidate.pityState),
    spendingRecords,
    userSettings: normalizeUserSettings(candidate.userSettings),
    debug: normalizeDebug(candidate.debug),
  });
}

export function getInitialAppState(): AppState {
  return ensureDailyTasksForDate({
    tasks: [],
    dailyTaskTemplates: [],
    wallet: createWalletTemplate(),
    resourceTransactions: [],
    gachaPulls: [],
    pityState: createInitialPityState(),
    spendingRecords: [],
    userSettings: createUserSettingsTemplate(),
    debug: EMPTY_DEBUG_STATE,
  });
}

export function loadAppState(): AppState {
  if (!canUseLocalStorage()) {
    return getInitialAppState();
  }

  const raw = window.localStorage.getItem(APP_STATE_STORAGE_KEY);

  if (!raw) {
    const initialState = getInitialAppState();
    saveAppState(initialState);
    return initialState;
  }

  try {
    const state = normalizeAppState(JSON.parse(raw));
    saveAppState(state);
    return state;
  } catch {
    const fallbackState = getInitialAppState();
    saveAppState(fallbackState);
    return fallbackState;
  }
}

export function saveAppState(state: AppState) {
  if (!canUseLocalStorage()) {
    return;
  }

  window.localStorage.setItem(APP_STATE_STORAGE_KEY, JSON.stringify(state));
}

export function resetAppState() {
  const initialState = getInitialAppState();

  if (canUseLocalStorage()) {
    window.localStorage.removeItem(APP_STATE_STORAGE_KEY);
    saveAppState(initialState);
  }

  return initialState;
}

export function ensureAppStateReady(baseState = loadAppState(), now = new Date()) {
  const nextState = ensureDailyTasksForDate(baseState, now);

  if (nextState !== baseState) {
    saveAppState(nextState);
  }

  return nextState;
}

export function updateUserSettings(
  input: UserSettingsUpdateInput,
  baseState = loadAppState(),
  now = new Date(),
) {
  const monthlyBudgetLimit = normalizePositiveNumber(
    input.monthlyBudgetLimit,
    baseState.userSettings.monthlyBudgetLimit,
  );
  const gachaCost = normalizePositiveNumber(input.gachaCost, baseState.userSettings.gachaCost);
  const gachaOpenDays = normalizeGachaOpenDays(input.gachaOpenDays);
  const taskRewardSettings: TaskRewardSettings = normalizeTaskRewardSettings(
    input.taskRewardSettings,
  );
  const showDevTools = input.showDevTools === true;
  const enablePity = input.enablePity !== false;
  const seriesWeeklyTarget = normalizePositiveNumber(
    input.seriesWeeklyTarget,
    baseState.userSettings.seriesWeeklyTarget,
  );
  const seriesWeeklyBonusMultiplier = normalizePositiveNumber(
    input.seriesWeeklyBonusMultiplier,
    baseState.userSettings.seriesWeeklyBonusMultiplier,
  );
  const gachaRewardTiers = normalizeGachaRewardTiers(input.gachaRewardTiers);
  const srPityThreshold = normalizePositiveNumber(
    input.srPityThreshold,
    baseState.userSettings.srPityThreshold,
  );
  const urPityThreshold = normalizePositiveNumber(
    input.urPityThreshold,
    baseState.userSettings.urPityThreshold,
  );
  const timestamp = createTimestamp(now);

  const nextState: AppState = {
    ...baseState,
    userSettings: {
      ...baseState.userSettings,
      monthlyBudgetLimit,
      gachaCost,
      gachaOpenDays,
      taskRewardSettings,
      gachaRewardTiers,
      showDevTools,
      enablePity,
      srPityThreshold,
      urPityThreshold,
      seriesWeeklyTarget,
      seriesWeeklyBonusMultiplier,
      updatedAt: timestamp,
    },
  };

  saveAppState(nextState);
  return nextState;
}

function buildTaskPatch(
  task: Task,
  input: TaskUpdateInput,
  rewardSettings: TaskRewardSettings,
  now = new Date(),
): Task {
  const title = input.title.trim();
  const timestamp = createTimestamp(now);
  const nextTask: Task = {
    ...task,
    title: title || task.title,
    updatedAt: timestamp,
  };

  if (task.type === "series") {
    nextTask.category = getSeriesTaskCategoryLabel(input.category ?? task.category);
  }

  if (task.status === "active") {
    const rewards = getRewardByDifficulty(input.difficulty, rewardSettings);
    nextTask.difficulty = input.difficulty;
    nextTask.rewardGems = rewards.rewardGems;
    nextTask.rewardDust = rewards.rewardDust;
    return nextTask;
  }

  if (task.status === "completed") {
    nextTask.difficulty = task.difficulty;
    nextTask.rewardGems = task.rewardGems;
    nextTask.rewardDust = task.rewardDust;
    return nextTask;
  }

  const rewards = getRewardByDifficulty(input.difficulty, rewardSettings);
  nextTask.difficulty = input.difficulty;
  nextTask.rewardGems = rewards.rewardGems;
  nextTask.rewardDust = rewards.rewardDust;
  return nextTask;
}

export function addTask(input: TaskCreateInput, baseState = loadAppState()) {
  const title = input.title.trim();

  if (!title) {
    return baseState;
  }

  const timestamp = createTimestamp();
  const rewards = getRewardByDifficulty(
    input.difficulty,
    baseState.userSettings.taskRewardSettings,
  );
  const now = new Date();
  const isSeries = input.type === "series";
  const defaultWeeklyTarget = baseState.userSettings.seriesWeeklyTarget;
  const bonusMultiplier = baseState.userSettings.seriesWeeklyBonusMultiplier;
  const weeklyTarget = isSeries ? (input.weeklyTarget && input.weeklyTarget > 0 ? input.weeklyTarget : defaultWeeklyTarget) : undefined;
  const weeklyBonusGems = isSeries ? Math.round(rewards.rewardGems * weeklyTarget! * bonusMultiplier) : undefined;
  const weeklyBonusDust = isSeries ? Math.round(rewards.rewardDust * weeklyTarget! * bonusMultiplier) : undefined;

  const nextState: AppState = {
    ...baseState,
    tasks: [
      {
        id: createId("task"),
        type: input.type,
        category:
          input.type === "series"
            ? getSeriesTaskCategoryLabel(input.category ?? DEFAULT_SERIES_TASK_CATEGORY)
            : undefined,
        title,
        status: "active",
        difficulty: input.difficulty,
        rewardGems: rewards.rewardGems,
        rewardDust: rewards.rewardDust,
        createdAt: timestamp,
        updatedAt: timestamp,
        weeklyTarget,
        weeklyCompletedCount: isSeries ? 0 : undefined,
        weekPeriodStart: isSeries ? getWeekStartKey(now) : undefined,
        weeklyBonusGems,
        weeklyBonusDust,
      },
      ...baseState.tasks,
    ],
  };

  saveAppState(nextState);
  return nextState;
}

export function updateTask(
  taskId: string,
  input: TaskUpdateInput,
  baseState = loadAppState(),
  now = new Date(),
) {
  const targetTask = baseState.tasks.find((task) => task.id === taskId);

  if (!targetTask || targetTask.type === "daily") {
    return baseState;
  }

  const nextState: AppState = {
    ...baseState,
    tasks: baseState.tasks.map((task) =>
      task.id === taskId
        ? buildTaskPatch(task, input, baseState.userSettings.taskRewardSettings, now)
        : task,
    ),
  };

  saveAppState(nextState);
  return nextState;
}

export function archiveTask(taskId: string, baseState = loadAppState(), now = new Date()) {
  const targetTask = baseState.tasks.find((task) => task.id === taskId);

  if (!targetTask || targetTask.type === "daily" || targetTask.status === "archived") {
    return baseState;
  }

  const timestamp = createTimestamp(now);
  const nextState: AppState = {
    ...baseState,
    tasks: baseState.tasks.map((task) =>
      task.id === taskId
        ? {
            ...task,
            status: "archived",
            updatedAt: timestamp,
          }
        : task,
    ),
  };

  saveAppState(nextState);
  return nextState;
}

export function restoreTask(taskId: string, baseState = loadAppState(), now = new Date()) {
  const targetTask = baseState.tasks.find((task) => task.id === taskId);

  if (!targetTask || targetTask.type === "daily" || targetTask.status !== "archived") {
    return baseState;
  }

  const timestamp = createTimestamp(now);
  const nextState: AppState = {
    ...baseState,
    tasks: baseState.tasks.map((task) =>
      task.id === taskId
        ? {
            ...task,
            status: "active",
            updatedAt: timestamp,
          }
        : task,
    ),
  };

  saveAppState(nextState);
  return nextState;
}

export function deleteTask(taskId: string, baseState = loadAppState()) {
  const targetTask = baseState.tasks.find((task) => task.id === taskId);

  if (!targetTask || targetTask.type === "daily") {
    return baseState;
  }

  const nextState: AppState = {
    ...baseState,
    tasks: baseState.tasks.filter((task) => task.id !== taskId),
  };

  saveAppState(nextState);
  return nextState;
}

export function addDailyTaskTemplate(
  input: DailyTaskTemplateCreateInput,
  baseState = loadAppState(),
  now = new Date(),
) {
  const title = input.title.trim();

  if (!title) {
    return baseState;
  }

  const timestamp = createTimestamp(now);
  const rewards = getRewardByDifficulty(
    input.difficulty,
    baseState.userSettings.taskRewardSettings,
  );
  const nextState = ensureDailyTasksForDate(
    {
      ...baseState,
      dailyTaskTemplates: [
        {
          id: createId("daily_template"),
          title,
          difficulty: input.difficulty,
          rewardGems: rewards.rewardGems,
          rewardDust: rewards.rewardDust,
          isActive: true,
          createdAt: timestamp,
          updatedAt: timestamp,
        },
        ...baseState.dailyTaskTemplates,
      ],
    },
    now,
  );

  saveAppState(nextState);
  return nextState;
}

export function updateDailyTaskTemplate(
  templateId: string,
  input: DailyTaskTemplateUpdateInput,
  baseState = loadAppState(),
  now = new Date(),
) {
  const targetTemplate = baseState.dailyTaskTemplates.find((template) => template.id === templateId);

  if (!targetTemplate) {
    return baseState;
  }

  const title = input.title.trim();

  if (!title) {
    return baseState;
  }

  const rewards = getRewardByDifficulty(
    input.difficulty,
    baseState.userSettings.taskRewardSettings,
  );
  const timestamp = createTimestamp(now);
  const nextState: AppState = {
    ...baseState,
    dailyTaskTemplates: baseState.dailyTaskTemplates.map((template) =>
      template.id === templateId
        ? {
            ...template,
            title,
            difficulty: input.difficulty,
            rewardGems: rewards.rewardGems,
            rewardDust: rewards.rewardDust,
            updatedAt: timestamp,
          }
        : template,
    ),
  };

  saveAppState(nextState);
  return nextState;
}

export function toggleDailyTaskTemplate(
  templateId: string,
  baseState = loadAppState(),
  now = new Date(),
) {
  const targetTemplate = baseState.dailyTaskTemplates.find((template) => template.id === templateId);

  if (!targetTemplate) {
    return baseState;
  }

  const timestamp = createTimestamp(now);
  const toggledState = {
    ...baseState,
    dailyTaskTemplates: baseState.dailyTaskTemplates.map((template) =>
      template.id === templateId
        ? {
            ...template,
            isActive: !template.isActive,
            updatedAt: timestamp,
          }
        : template,
    ),
  };
  const nextState = ensureDailyTasksForDate(toggledState, now);

  saveAppState(nextState);
  return nextState;
}

export function deleteDailyTaskTemplate(templateId: string, baseState = loadAppState()) {
  const targetTemplate = baseState.dailyTaskTemplates.find((template) => template.id === templateId);

  if (!targetTemplate) {
    return baseState;
  }

  const nextState: AppState = {
    ...baseState,
    dailyTaskTemplates: baseState.dailyTaskTemplates.filter(
      (template) => template.id !== templateId,
    ),
  };

  saveAppState(nextState);
  return nextState;
}

export function completeTask(taskId: string, baseState = loadAppState()) {
  const targetTask = baseState.tasks.find((task) => task.id === taskId);

  if (!targetTask || targetTask.status === "archived") {
    return baseState;
  }

  if (targetTask.type === "series") {
    return completeSeriesTask(targetTask, baseState);
  }

  if (targetTask.status === "completed") {
    return baseState;
  }

  const timestamp = createTimestamp();
  const syncedWallet = syncWalletMonth(baseState.wallet, new Date(timestamp));
  const completedTask: Task = {
    ...targetTask,
    status: "completed",
    completedAt: timestamp,
    updatedAt: timestamp,
  };

  const nextState: AppState = {
    ...baseState,
    tasks: baseState.tasks.map((task) => (task.id === taskId ? completedTask : task)),
    wallet: {
      ...syncedWallet,
      gems: syncedWallet.gems + targetTask.rewardGems,
      dust: syncedWallet.dust + targetTask.rewardDust,
      updatedAt: timestamp,
      month: syncedWallet.month || getLocalMonthKey(new Date()),
    },
    resourceTransactions: [
      {
        id: createId("txn"),
        type: "task_reward",
        gemsDelta: targetTask.rewardGems,
        dustDelta: targetTask.rewardDust,
        rewardBalanceDelta: 0,
        relatedTaskId: targetTask.id,
        note: `完成任务：${targetTask.title}`,
        createdAt: timestamp,
      },
      ...baseState.resourceTransactions,
    ],
  };

  saveAppState(nextState);
  return nextState;
}

function completeSeriesTask(targetTask: Task, baseState: AppState) {
  const now = new Date();
  const timestamp = createTimestamp(now);
  const currentWeekStart = getWeekStartKey(now);
  const weekStart = targetTask.weekPeriodStart || currentWeekStart;
  const needsWeekReset = weekStart !== currentWeekStart;
  const currentCount = needsWeekReset ? 0 : (targetTask.weeklyCompletedCount || 0);
  const weeklyTarget = targetTask.weeklyTarget || DEFAULT_SERIES_WEEKLY_TARGET;
  const newCount = currentCount + 1;
  const targetReached = newCount >= weeklyTarget && (needsWeekReset || (targetTask.weeklyCompletedCount || 0) < weeklyTarget);
  const bonusGems = targetReached ? (targetTask.weeklyBonusGems || 0) : 0;
  const bonusDust = targetReached ? (targetTask.weeklyBonusDust || 0) : 0;

  const syncedWallet = syncWalletMonth(baseState.wallet, now);
  const updatedTask: Task = {
    ...targetTask,
    weeklyCompletedCount: newCount,
    weekPeriodStart: currentWeekStart,
    updatedAt: timestamp,
  };

  const transactions: ResourceTransaction[] = [
    {
      id: createId("txn"),
      type: "task_reward",
      gemsDelta: targetTask.rewardGems,
      dustDelta: targetTask.rewardDust,
      rewardBalanceDelta: 0,
      relatedTaskId: targetTask.id,
      note: `完成系列任务：${targetTask.title}（本周第 ${newCount}/${weeklyTarget} 次）`,
      createdAt: timestamp,
    },
  ];

  if (targetReached) {
    transactions.push({
      id: createId("txn"),
      type: "series_bonus",
      gemsDelta: bonusGems,
      dustDelta: bonusDust,
      rewardBalanceDelta: 0,
      relatedTaskId: targetTask.id,
      note: `周目标达成：${targetTask.title}（${newCount}/${weeklyTarget}），额外奖励`,
      createdAt: timestamp,
    });
  }

  const nextState: AppState = {
    ...baseState,
    tasks: baseState.tasks.map((task) => (task.id === targetTask.id ? updatedTask : task)),
    wallet: {
      ...syncedWallet,
      gems: syncedWallet.gems + targetTask.rewardGems + bonusGems,
      dust: syncedWallet.dust + targetTask.rewardDust + bonusDust,
      updatedAt: timestamp,
      month: syncedWallet.month || getLocalMonthKey(now),
    },
    resourceTransactions: [...transactions, ...baseState.resourceTransactions],
  };

  saveAppState(nextState);
  return nextState;
}

export function setForceWeekendOpen(forceWeekendOpen: boolean, baseState = loadAppState()) {
  const nextState: AppState = {
    ...baseState,
    debug: {
      ...baseState.debug,
      forceWeekendOpen,
    },
  };

  saveAppState(nextState);
  return nextState;
}

export function singleGachaPull(baseState = loadAppState(), now = new Date()) {
  const syncedWallet = syncWalletMonth(baseState.wallet, now);
  const gachaCost = baseState.userSettings.gachaCost;
  const poolStatus = getGachaPoolStatus({
    now,
    openDays: baseState.userSettings.gachaOpenDays,
  });

  if (!poolStatus.isOpen || syncedWallet.gems < gachaCost) {
    const unchangedState =
      syncedWallet === baseState.wallet
        ? baseState
        : {
            ...baseState,
            wallet: syncedWallet,
          };

    if (unchangedState !== baseState) {
      saveAppState(unchangedState);
    }

    return unchangedState;
  }

  const timestamp = createTimestamp(now);
  const customTiers = toGachaRewardTiers(baseState.userSettings.gachaRewardTiers);
  const tier = rollGachaReward(undefined, customTiers);
  const pull: GachaPull = {
    id: createId("pull"),
    poolId: WEEKEND_GACHA_POOL.id,
    pullType: "single",
    costGems: gachaCost,
    rarity: tier.rarity,
    rewardAmount: tier.rewardAmount,
    pityTriggered: false,
    createdAt: timestamp,
  };

  const nextState: AppState = {
    ...baseState,
    wallet: {
      ...syncedWallet,
      gems: syncedWallet.gems - gachaCost,
      rewardBalance: syncedWallet.rewardBalance + tier.rewardAmount,
      monthlyUnlockedAmount: syncedWallet.monthlyUnlockedAmount + tier.rewardAmount,
      updatedAt: timestamp,
      month: syncedWallet.month || getLocalMonthKey(now),
    },
    resourceTransactions: [
      {
        id: createId("txn"),
        type: "gacha_reward",
        gemsDelta: 0,
        dustDelta: 0,
        rewardBalanceDelta: tier.rewardAmount,
        relatedGachaPullId: pull.id,
        note: `抽卡获得 ${tier.rarity} 奖励`,
        createdAt: timestamp,
      },
      {
        id: createId("txn"),
        type: "gacha_cost",
        gemsDelta: -gachaCost,
        dustDelta: 0,
        rewardBalanceDelta: 0,
        relatedGachaPullId: pull.id,
        note: `单抽消耗 ${gachaCost} 宝石`,
        createdAt: timestamp,
      },
      ...baseState.resourceTransactions,
    ],
    gachaPulls: [pull, ...baseState.gachaPulls],
  };

  saveAppState(nextState);
  return nextState;
}

export function singleGachaPullWithPity(baseState = loadAppState(), now = new Date()) {
  const syncedWallet = syncWalletMonth(baseState.wallet, now);
  const gachaCost = baseState.userSettings.gachaCost;
  const poolStatus = getGachaPoolStatus({
    now,
    openDays: baseState.userSettings.gachaOpenDays,
  });

  if (!poolStatus.isOpen || syncedWallet.gems < gachaCost) {
    const unchangedState =
      syncedWallet === baseState.wallet
        ? baseState
        : {
            ...baseState,
            wallet: syncedWallet,
          };

    if (unchangedState !== baseState) {
      saveAppState(unchangedState);
    }

    return unchangedState;
  }

  const timestamp = createTimestamp(now);
  const customTiers = toGachaRewardTiers(baseState.userSettings.gachaRewardTiers);
  const pityResult = resolveGachaRewardWithPity({
    pityState: baseState.pityState,
    enablePity: baseState.userSettings.enablePity,
    customTiers,
    srPityThreshold: baseState.userSettings.srPityThreshold,
    urPityThreshold: baseState.userSettings.urPityThreshold,
  });
  const tier = pityResult.tier;
  const pull: GachaPull = {
    id: createId("pull"),
    poolId: WEEKEND_GACHA_POOL.id,
    pullType: "single",
    costGems: gachaCost,
    rarity: tier.rarity,
    rewardAmount: tier.rewardAmount,
    pityTriggered: pityResult.pityTriggered,
    createdAt: timestamp,
  };
  const nextPityState: PityState = {
    ...baseState.pityState,
    poolId: WEEKEND_GACHA_POOL.id,
    pullsSinceLastSR: pityResult.nextPullsSinceLastSR,
    pullsSinceLastSSR: pityResult.nextPullsSinceLastSSR,
    updatedAt: timestamp,
  };

  const nextState: AppState = {
    ...baseState,
    wallet: {
      ...syncedWallet,
      gems: syncedWallet.gems - gachaCost,
      rewardBalance: syncedWallet.rewardBalance + tier.rewardAmount,
      monthlyUnlockedAmount: syncedWallet.monthlyUnlockedAmount + tier.rewardAmount,
      updatedAt: timestamp,
      month: syncedWallet.month || getLocalMonthKey(now),
    },
    pityState: nextPityState,
    resourceTransactions: [
      {
        id: createId("txn"),
        type: "gacha_reward",
        gemsDelta: 0,
        dustDelta: 0,
        rewardBalanceDelta: tier.rewardAmount,
        relatedGachaPullId: pull.id,
        note: pull.pityTriggered
          ? `抽卡获得 ${tier.rarity} 奖励（保底触发）`
          : `抽卡获得 ${tier.rarity} 奖励`,
        createdAt: timestamp,
      },
      {
        id: createId("txn"),
        type: "gacha_cost",
        gemsDelta: -gachaCost,
        dustDelta: 0,
        rewardBalanceDelta: 0,
        relatedGachaPullId: pull.id,
        note: `单抽消耗 ${gachaCost} 宝石`,
        createdAt: timestamp,
      },
      ...baseState.resourceTransactions,
    ],
    gachaPulls: [pull, ...baseState.gachaPulls],
  };

  saveAppState(nextState);
  return nextState;
}

export function performTenPull(baseState = loadAppState(), now = new Date()) {
  const syncedWallet = syncWalletMonth(baseState.wallet, now);
  const gachaCost = baseState.userSettings.gachaCost;
  const totalCost = gachaCost * TEN_PULL_COUNT;
  const poolStatus = getGachaPoolStatus({
    now,
    openDays: baseState.userSettings.gachaOpenDays,
  });

  if (!poolStatus.isOpen || syncedWallet.gems < totalCost) {
    const unchangedState =
      syncedWallet === baseState.wallet
        ? baseState
        : {
            ...baseState,
            wallet: syncedWallet,
          };

    if (unchangedState !== baseState) {
      saveAppState(unchangedState);
    }

    return unchangedState;
  }

  const timestamp = createTimestamp(now);
  const batchId = createId("pull_batch");
  const customTiers = toGachaRewardTiers(baseState.userSettings.gachaRewardTiers);
  const sequence = resolveSequentialGachaPulls({
    count: TEN_PULL_COUNT,
    pityState: baseState.pityState,
    enablePity: baseState.userSettings.enablePity,
    customTiers,
    srPityThreshold: baseState.userSettings.srPityThreshold,
    urPityThreshold: baseState.userSettings.urPityThreshold,
  });

  const pulls: GachaPull[] = sequence.results.map((result, index) => ({
    id: createId("pull"),
    poolId: WEEKEND_GACHA_POOL.id,
    batchId,
    pullType: "ten",
    costGems: gachaCost,
    rarity: result.rarity,
    rewardAmount: result.rewardAmount,
    pityTriggered: result.pityTriggered,
    createdAt: new Date(now.getTime() + index).toISOString(),
  }));

  const nextPityState: PityState = {
    ...baseState.pityState,
    poolId: WEEKEND_GACHA_POOL.id,
    pullsSinceLastSR: sequence.nextPityState.pullsSinceLastSR,
    pullsSinceLastSSR: sequence.nextPityState.pullsSinceLastSSR,
    updatedAt: timestamp,
  };

  const nextState: AppState = {
    ...baseState,
    wallet: {
      ...syncedWallet,
      gems: syncedWallet.gems - totalCost,
      rewardBalance: syncedWallet.rewardBalance + sequence.totalRewardAmount,
      monthlyUnlockedAmount:
        syncedWallet.monthlyUnlockedAmount + sequence.totalRewardAmount,
      updatedAt: timestamp,
      month: syncedWallet.month || getLocalMonthKey(now),
    },
    pityState: nextPityState,
    resourceTransactions: [
      {
        id: createId("txn"),
        type: "gacha_reward",
        gemsDelta: 0,
        dustDelta: 0,
        rewardBalanceDelta: sequence.totalRewardAmount,
        relatedGachaPullId: pulls[pulls.length - 1]?.id,
        note:
          sequence.pityTriggeredCount > 0
            ? `十连抽：获得快乐预算 ¥${sequence.totalRewardAmount}（含 ${sequence.pityTriggeredCount} 次保底）`
            : `十连抽：获得快乐预算 ¥${sequence.totalRewardAmount}`,
        createdAt: timestamp,
      },
      {
        id: createId("txn"),
        type: "gacha_cost",
        gemsDelta: -totalCost,
        dustDelta: 0,
        rewardBalanceDelta: 0,
        relatedGachaPullId: pulls[pulls.length - 1]?.id,
        note: `十连抽消耗 ${totalCost} 宝石`,
        createdAt: timestamp,
      },
      ...baseState.resourceTransactions,
    ],
    gachaPulls: [...pulls.slice().reverse(), ...baseState.gachaPulls],
  };

  saveAppState(nextState);
  return nextState;
}

export function addSpendingRecord(
  amount: number,
  note: string,
  category?: string,
  baseState = loadAppState(),
  now = new Date(),
) {
  const syncedWallet = syncWalletMonth(baseState.wallet, now);
  const normalizedAmount = Number.isFinite(amount) ? amount : Number.NaN;
  const normalizedNote = note.trim();
  const normalizedCategory = category?.trim() ? category.trim() : undefined;

  if (
    !Number.isFinite(normalizedAmount) ||
    normalizedAmount <= 0 ||
    !normalizedNote ||
    normalizedAmount > syncedWallet.rewardBalance ||
    syncedWallet.monthlySpentAmount + normalizedAmount > baseState.userSettings.monthlyBudgetLimit
  ) {
    const unchangedState =
      syncedWallet === baseState.wallet
        ? baseState
        : {
            ...baseState,
            wallet: syncedWallet,
          };

    if (unchangedState !== baseState) {
      saveAppState(unchangedState);
    }

    return unchangedState;
  }

  const timestamp = createTimestamp(now);
  const record: SpendingRecord = {
    id: createId("spend"),
    amount: normalizedAmount,
    note: normalizedNote,
    category: normalizedCategory,
    spentAt: timestamp,
    createdAt: timestamp,
  };

  const nextState: AppState = {
    ...baseState,
    wallet: {
      ...syncedWallet,
      rewardBalance: syncedWallet.rewardBalance - normalizedAmount,
      monthlySpentAmount: syncedWallet.monthlySpentAmount + normalizedAmount,
      updatedAt: timestamp,
      month: syncedWallet.month || getLocalMonthKey(now),
    },
    resourceTransactions: [
      {
        id: createId("txn"),
        type: "spending",
        gemsDelta: 0,
        dustDelta: 0,
        rewardBalanceDelta: -normalizedAmount,
        note: `记录消费：${normalizedNote}`,
        createdAt: timestamp,
      },
      ...baseState.resourceTransactions,
    ],
    spendingRecords: [record, ...baseState.spendingRecords],
  };

  saveAppState(nextState);
  return nextState;
}

export function redeemDustReward(
  rewardId: string,
  baseState = loadAppState(),
  now = new Date(),
) {
  const option = getDustRedeemOption(rewardId);
  const syncedWallet = syncWalletMonth(baseState.wallet, now);

  if (!option || syncedWallet.dust < option.dustCost) {
    const unchangedState =
      syncedWallet === baseState.wallet
        ? baseState
        : {
            ...baseState,
            wallet: syncedWallet,
          };

    if (unchangedState !== baseState) {
      saveAppState(unchangedState);
    }

    return unchangedState;
  }

  const timestamp = createTimestamp(now);

  const nextState: AppState = {
    ...baseState,
    wallet: {
      ...syncedWallet,
      dust: syncedWallet.dust - option.dustCost,
      rewardBalance: syncedWallet.rewardBalance + option.rewardAmount,
      monthlyUnlockedAmount: syncedWallet.monthlyUnlockedAmount + option.rewardAmount,
      updatedAt: timestamp,
      month: syncedWallet.month || getLocalMonthKey(now),
    },
    resourceTransactions: [
      {
        id: createId("txn"),
        type: "dust_redeem",
        gemsDelta: 0,
        dustDelta: -option.dustCost,
        rewardBalanceDelta: option.rewardAmount,
        note: formatDustRedeemNote(option),
        createdAt: timestamp,
      },
      ...baseState.resourceTransactions,
    ],
  };

  saveAppState(nextState);
  return nextState;
}

export function addDevGems(amount = 500, baseState = loadAppState(), now = new Date()) {
  const normalizedAmount = Number.isFinite(amount) ? Math.max(0, amount) : 0;

  if (normalizedAmount <= 0) {
    return baseState;
  }

  const timestamp = createTimestamp(now);
  const syncedWallet = syncWalletMonth(baseState.wallet, now);

  const nextState: AppState = {
    ...baseState,
    wallet: {
      ...syncedWallet,
      gems: syncedWallet.gems + normalizedAmount,
      updatedAt: timestamp,
      month: syncedWallet.month || getLocalMonthKey(now),
    },
    resourceTransactions: [
      {
        id: createId("txn"),
        type: "manual_adjustment",
        gemsDelta: normalizedAmount,
        dustDelta: 0,
        rewardBalanceDelta: 0,
        note: `开发模式补充 ${normalizedAmount} 宝石`,
        createdAt: timestamp,
      },
      ...baseState.resourceTransactions,
    ],
  };

  saveAppState(nextState);
  return nextState;
}
