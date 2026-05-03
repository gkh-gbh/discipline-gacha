import type {
  TaskDifficulty,
  TaskRewardSettings,
  UserSettings,
} from "@/types/domain";

export const DEFAULT_TASK_REWARD_SETTINGS: TaskRewardSettings = {
  simple: { gems: 10, dust: 0 },
  normal: { gems: 30, dust: 1 },
  medium: { gems: 60, dust: 3 },
  hard: { gems: 100, dust: 6 },
  breakthrough: { gems: 150, dust: 10 },
};

export const difficultyMeta: Record<
  TaskDifficulty,
  { label: string; tone: string }
> = {
  simple: { label: "简单", tone: "bg-stone-100 text-stone-700" },
  normal: { label: "普通", tone: "bg-teal-100 text-teal-800" },
  medium: { label: "中等", tone: "bg-amber-100 text-amber-800" },
  hard: { label: "困难", tone: "bg-orange-100 text-orange-800" },
  breakthrough: { label: "突破", tone: "bg-rose-100 text-rose-800" },
};

function normalizeRewardValue(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : fallback;
}

export function normalizeTaskRewardSettings(candidate: unknown): TaskRewardSettings {
  const source =
    typeof candidate === "object" && candidate !== null
      ? (candidate as Partial<TaskRewardSettings>)
      : {};

  return {
    simple: {
      gems: normalizeRewardValue(source.simple?.gems, DEFAULT_TASK_REWARD_SETTINGS.simple.gems),
      dust: normalizeRewardValue(source.simple?.dust, DEFAULT_TASK_REWARD_SETTINGS.simple.dust),
    },
    normal: {
      gems: normalizeRewardValue(source.normal?.gems, DEFAULT_TASK_REWARD_SETTINGS.normal.gems),
      dust: normalizeRewardValue(source.normal?.dust, DEFAULT_TASK_REWARD_SETTINGS.normal.dust),
    },
    medium: {
      gems: normalizeRewardValue(source.medium?.gems, DEFAULT_TASK_REWARD_SETTINGS.medium.gems),
      dust: normalizeRewardValue(source.medium?.dust, DEFAULT_TASK_REWARD_SETTINGS.medium.dust),
    },
    hard: {
      gems: normalizeRewardValue(source.hard?.gems, DEFAULT_TASK_REWARD_SETTINGS.hard.gems),
      dust: normalizeRewardValue(source.hard?.dust, DEFAULT_TASK_REWARD_SETTINGS.hard.dust),
    },
    breakthrough: {
      gems: normalizeRewardValue(
        source.breakthrough?.gems,
        DEFAULT_TASK_REWARD_SETTINGS.breakthrough.gems,
      ),
      dust: normalizeRewardValue(
        source.breakthrough?.dust,
        DEFAULT_TASK_REWARD_SETTINGS.breakthrough.dust,
      ),
    },
  };
}

export function getRewardByDifficulty(
  difficulty: TaskDifficulty,
  rewardSettings: TaskRewardSettings = DEFAULT_TASK_REWARD_SETTINGS,
) {
  const reward = rewardSettings[difficulty];

  return {
    rewardGems: reward.gems,
    rewardDust: reward.dust,
  };
}

export function getRewardPreviewLabel(
  difficulty: TaskDifficulty,
  rewardSettings: TaskRewardSettings = DEFAULT_TASK_REWARD_SETTINGS,
) {
  const reward = rewardSettings[difficulty];
  return `${reward.gems} 宝石 / ${reward.dust} 星尘`;
}

export function getTaskRewardSettingsFromUserSettings(userSettings: UserSettings) {
  return normalizeTaskRewardSettings(userSettings.taskRewardSettings);
}
