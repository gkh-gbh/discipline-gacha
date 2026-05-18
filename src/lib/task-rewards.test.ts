import { describe, it, expect } from "vitest";
import {
  normalizeTaskRewardSettings,
  getRewardByDifficulty,
  getRewardPreviewLabel,
  DEFAULT_TASK_REWARD_SETTINGS,
} from "@/lib/task-rewards";

describe("normalizeTaskRewardSettings", () => {
  it("returns defaults for null/undefined input", () => {
    expect(normalizeTaskRewardSettings(null)).toEqual(DEFAULT_TASK_REWARD_SETTINGS);
    expect(normalizeTaskRewardSettings(undefined)).toEqual(DEFAULT_TASK_REWARD_SETTINGS);
  });

  it("returns defaults for non-object input", () => {
    expect(normalizeTaskRewardSettings("invalid")).toEqual(DEFAULT_TASK_REWARD_SETTINGS);
    expect(normalizeTaskRewardSettings(42)).toEqual(DEFAULT_TASK_REWARD_SETTINGS);
  });

  it("preserves valid overrides", () => {
    const result = normalizeTaskRewardSettings({
      simple: { gems: 20, dust: 1 },
    });
    expect(result.simple.gems).toBe(20);
    expect(result.simple.dust).toBe(1);
    expect(result.normal.gems).toBe(DEFAULT_TASK_REWARD_SETTINGS.normal.gems);
  });

  it("falls back to default for negative values", () => {
    const result = normalizeTaskRewardSettings({
      simple: { gems: -5, dust: 0 },
    });
    expect(result.simple.gems).toBe(DEFAULT_TASK_REWARD_SETTINGS.simple.gems);
  });

  it("falls back to default for non-integer values", () => {
    const result = normalizeTaskRewardSettings({
      simple: { gems: 1.5, dust: 0 },
    });
    expect(result.simple.gems).toBe(DEFAULT_TASK_REWARD_SETTINGS.simple.gems);
  });

  it("falls back to default for missing sub-fields", () => {
    const result = normalizeTaskRewardSettings({
      simple: { gems: 20 },
    });
    expect(result.simple.gems).toBe(20);
    expect(result.simple.dust).toBe(DEFAULT_TASK_REWARD_SETTINGS.simple.dust);
  });
});

describe("getRewardByDifficulty", () => {
  it("returns correct reward for each difficulty", () => {
    expect(getRewardByDifficulty("simple")).toEqual({ rewardGems: 10, rewardDust: 0 });
    expect(getRewardByDifficulty("normal")).toEqual({ rewardGems: 30, rewardDust: 1 });
    expect(getRewardByDifficulty("medium")).toEqual({ rewardGems: 60, rewardDust: 3 });
    expect(getRewardByDifficulty("hard")).toEqual({ rewardGems: 100, rewardDust: 6 });
    expect(getRewardByDifficulty("breakthrough")).toEqual({ rewardGems: 150, rewardDust: 10 });
  });

  it("uses custom reward settings when provided", () => {
    const custom = { ...DEFAULT_TASK_REWARD_SETTINGS, simple: { gems: 99, dust: 7 } };
    expect(getRewardByDifficulty("simple", custom)).toEqual({ rewardGems: 99, rewardDust: 7 });
  });
});

describe("getRewardPreviewLabel", () => {
  it("formats label correctly", () => {
    expect(getRewardPreviewLabel("simple")).toBe("10 宝石 / 0 积分");
    expect(getRewardPreviewLabel("medium")).toBe("60 宝石 / 3 积分");
  });
});
