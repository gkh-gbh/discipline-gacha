export type AppRoute = "/" | "/tasks" | "/pool" | "/wallet" | "/stats" | "/settings";

export type TaskType = "daily" | "series" | "main";
export type TaskStatus = "active" | "completed" | "archived";
export type TaskDifficulty =
  | "simple"
  | "normal"
  | "medium"
  | "hard"
  | "breakthrough";

export type RewardRarity = "N" | "R" | "SR" | "SSR" | "UR";

export type TaskRewardSettings = Record<
  TaskDifficulty,
  {
    gems: number;
    dust: number;
  }
>;

export type UserSettings = {
  id: string;
  monthlyBudgetLimit: number;
  gachaCost: number;
  gachaOpenDays: number[];
  taskRewardSettings: TaskRewardSettings;
  showDevTools: boolean;
  enablePity: boolean;
  seriesWeeklyTarget: number;
  seriesWeeklyBonusMultiplier: number;
  timezone: string;
  createdAt: string;
  updatedAt: string;
};

export type Task = {
  id: string;
  type: TaskType;
  templateId?: string;
  date?: string;
  category?: string;
  title: string;
  description?: string;
  status: TaskStatus;
  difficulty: TaskDifficulty;
  rewardGems: number;
  rewardDust: number;
  dueDate?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  weeklyTarget?: number;
  weeklyCompletedCount?: number;
  weekPeriodStart?: string;
  weeklyBonusGems?: number;
  weeklyBonusDust?: number;
};

export type DailyTaskTemplate = {
  id: string;
  title: string;
  difficulty: TaskDifficulty;
  rewardGems: number;
  rewardDust: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TaskInstance = {
  id: string;
  taskId?: string;
  templateId?: string;
  date: string;
  title: string;
  type: TaskType;
  isCompleted: boolean;
  completedAt?: string;
  rewardGems: number;
  rewardDust: number;
};

export type SeriesTaskProgress = {
  id: string;
  taskId: string;
  periodType: "week" | "month";
  periodStart: string;
  periodEnd: string;
  targetCount: number;
  completedCount: number;
  bonusClaimed: boolean;
  bonusGems: number;
  bonusDust: number;
};

export type Wallet = {
  id: string;
  gems: number;
  dust: number;
  rewardBalance: number;
  monthlyUnlockedAmount: number;
  monthlySpentAmount: number;
  month: string;
  updatedAt: string;
};

export type ResourceTransactionType =
  | "task_reward"
  | "series_bonus"
  | "gacha_cost"
  | "gacha_reward"
  | "dust_redeem"
  | "spending"
  | "manual_adjustment";

export type ResourceTransaction = {
  id: string;
  type: ResourceTransactionType;
  gemsDelta: number;
  dustDelta: number;
  rewardBalanceDelta: number;
  relatedTaskId?: string;
  relatedGachaPullId?: string;
  note?: string;
  createdAt: string;
};

export type GachaPool = {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  startAt?: string;
  endAt?: string;
  costGems: number;
  createdAt: string;
  updatedAt: string;
};

export type GachaRewardTier = {
  id: string;
  poolId: string;
  rarity: RewardRarity;
  probability: number;
  rewardAmount: number;
  displayName: string;
};

export type GachaPull = {
  id: string;
  poolId: string;
  batchId?: string;
  pullType?: "single" | "ten";
  costGems: number;
  rarity: RewardRarity;
  rewardAmount: number;
  pityTriggered: boolean;
  createdAt: string;
};

export type PityState = {
  id: string;
  poolId: string;
  pullsSinceLastSR: number;
  pullsSinceLastSSR: number;
  updatedAt: string;
};

export type SpendingRecord = {
  id: string;
  amount: number;
  category?: string;
  note: string;
  spentAt: string;
  createdAt: string;
};

export type DashboardSnapshot = {
  today: string;
  todayCompleted: number;
  todayTotal: number;
  todayGems: number;
  weekGems: number;
  weekDust: number;
  rewardBalance: number;
  daysUntilWeekendPool: number;
};

export type NavItem = {
  href: AppRoute;
  label: string;
  shortLabel: string;
};

export type TaskCreateInput = {
  title: string;
  difficulty: TaskDifficulty;
  type: TaskType;
  category?: string;
  weeklyTarget?: number;
};

export type DailyTaskTemplateCreateInput = {
  title: string;
  difficulty: TaskDifficulty;
};

export type DailyTaskTemplateUpdateInput = {
  title: string;
  difficulty: TaskDifficulty;
};

export type TaskUpdateInput = {
  title: string;
  difficulty: TaskDifficulty;
  category?: string;
};

export type AppDebugState = {
  forceWeekendOpen: boolean;
};

export type AppState = {
  tasks: Task[];
  dailyTaskTemplates: DailyTaskTemplate[];
  wallet: Wallet;
  resourceTransactions: ResourceTransaction[];
  gachaPulls: GachaPull[];
  pityState: PityState;
  spendingRecords: SpendingRecord[];
  userSettings: UserSettings;
  debug: AppDebugState;
};
