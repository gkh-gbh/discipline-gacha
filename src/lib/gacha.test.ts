import { describe, it, expect } from "vitest";
import {
  rollGachaReward,
  resolveGachaRewardWithPity,
  resolveSequentialGachaPulls,
  isSrOrHigher,
  getRemainingPullsUntilSrPity,
  getRemainingPullsUntilUrPity,
  getGachaTierByRarity,
  formatPullResult,
  GACHA_REWARD_TIERS,
  DEFAULT_GACHA_COST,
  SR_PITY_THRESHOLD,
  UR_PITY_THRESHOLD,
} from "@/lib/gacha";
import type { PityState, GachaPull } from "@/types/domain";

function makePityState(overrides: Partial<PityState> = {}): PityState {
  return {
    id: "pity_test",
    poolId: "pool_weekend_main",
    pullsSinceLastSR: 0,
    pullsSinceLastSSR: 0,
    updatedAt: "2026-05-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("rollGachaReward", () => {
  it("returns N tier for randomValue 0", () => {
    const tier = rollGachaReward(0);
    expect(tier.rarity).toBe("N");
  });

  it("returns N tier for randomValue just below N threshold", () => {
    const tier = rollGachaReward(0.599);
    expect(tier.rarity).toBe("N");
  });

  it("returns R tier for randomValue at R range", () => {
    const tier = rollGachaReward(0.6);
    expect(tier.rarity).toBe("R");
  });

  it("returns SR tier for randomValue at SR range", () => {
    const tier = rollGachaReward(0.85);
    expect(tier.rarity).toBe("SR");
  });

  it("returns SSR tier for randomValue at SSR range", () => {
    const tier = rollGachaReward(0.95);
    expect(tier.rarity).toBe("SSR");
  });

  it("returns UR tier for randomValue at UR range", () => {
    const tier = rollGachaReward(0.99);
    expect(tier.rarity).toBe("UR");
  });

  it("falls back to last tier for randomValue >= 1", () => {
    const tier = rollGachaReward(1);
    expect(tier.rarity).toBe("UR");
  });

  it("probabilities sum to 1", () => {
    const total = GACHA_REWARD_TIERS.reduce((sum, t) => sum + t.probability, 0);
    expect(total).toBeCloseTo(1, 10);
  });
});

describe("isSrOrHigher", () => {
  it("returns true for SR, SSR, UR", () => {
    expect(isSrOrHigher("SR")).toBe(true);
    expect(isSrOrHigher("SSR")).toBe(true);
    expect(isSrOrHigher("UR")).toBe(true);
  });

  it("returns false for N, R", () => {
    expect(isSrOrHigher("N")).toBe(false);
    expect(isSrOrHigher("R")).toBe(false);
  });
});

describe("getRemainingPullsUntilSrPity", () => {
  it("returns threshold when no pulls since last SR", () => {
    expect(getRemainingPullsUntilSrPity(0)).toBe(SR_PITY_THRESHOLD);
  });

  it("returns 0 when pity threshold reached", () => {
    expect(getRemainingPullsUntilSrPity(SR_PITY_THRESHOLD)).toBe(0);
  });

  it("returns 0 when exceeded", () => {
    expect(getRemainingPullsUntilSrPity(15)).toBe(0);
  });

  it("returns correct remaining for partial progress", () => {
    expect(getRemainingPullsUntilSrPity(7)).toBe(3);
  });
});

describe("getRemainingPullsUntilUrPity", () => {
  it("returns threshold when no pulls since last UR", () => {
    expect(getRemainingPullsUntilUrPity(0)).toBe(UR_PITY_THRESHOLD);
  });

  it("returns 0 when UR pity threshold reached", () => {
    expect(getRemainingPullsUntilUrPity(UR_PITY_THRESHOLD)).toBe(0);
  });

  it("returns correct remaining for partial progress", () => {
    expect(getRemainingPullsUntilUrPity(77)).toBe(23);
  });
});

describe("getGachaTierByRarity", () => {
  it("finds each rarity", () => {
    expect(getGachaTierByRarity("N").rarity).toBe("N");
    expect(getGachaTierByRarity("R").rarity).toBe("R");
    expect(getGachaTierByRarity("SR").rarity).toBe("SR");
    expect(getGachaTierByRarity("SSR").rarity).toBe("SSR");
    expect(getGachaTierByRarity("UR").rarity).toBe("UR");
  });

  it("falls back to first tier for unknown rarity", () => {
    expect(getGachaTierByRarity("UNKNOWN" as any).rarity).toBe("N");
  });
});

describe("resolveGachaRewardWithPity", () => {
  it("triggers pity when pullsSinceLastSR >= threshold - 1", () => {
    const pityState = makePityState({ pullsSinceLastSR: SR_PITY_THRESHOLD - 1 });
    const result = resolveGachaRewardWithPity({
      pityState,
      enablePity: true,
      randomValue: 0,
    });

    expect(result.pityTriggered).toBe(true);
    expect(result.tier.rarity).toBe("SR");
  });

  it("does not trigger pity when enablePity is false", () => {
    const pityState = makePityState({ pullsSinceLastSR: SR_PITY_THRESHOLD - 1 });
    const result = resolveGachaRewardWithPity({
      pityState,
      enablePity: false,
      randomValue: 0,
    });

    expect(result.pityTriggered).toBe(false);
    expect(result.tier.rarity).toBe("N");
  });

  it("resets pullsSinceLastSR to 0 on SR+ pull", () => {
    const pityState = makePityState({ pullsSinceLastSR: 5 });
    const result = resolveGachaRewardWithPity({
      pityState,
      enablePity: true,
      randomValue: 0.85,
    });

    expect(result.nextPullsSinceLastSR).toBe(0);
  });

  it("increments pullsSinceLastSR on non-SR pull", () => {
    const pityState = makePityState({ pullsSinceLastSR: 3 });
    const result = resolveGachaRewardWithPity({
      pityState,
      enablePity: true,
      randomValue: 0,
    });

    expect(result.nextPullsSinceLastSR).toBe(4);
  });

  it("triggers independent UR pity when pullsSinceLastSSR >= threshold - 1", () => {
    const pityState = makePityState({ pullsSinceLastSR: 0, pullsSinceLastSSR: UR_PITY_THRESHOLD - 1 });
    const result = resolveGachaRewardWithPity({
      pityState,
      enablePity: true,
      randomValue: 0,
    });

    expect(result.pityTriggered).toBe(true);
    expect(result.tier.rarity).toBe("UR");
    expect(result.nextPullsSinceLastSR).toBe(0);
    expect(result.nextPullsSinceLastSSR).toBe(0);
  });

  it("increments pullsSinceLastSSR when UR is not hit", () => {
    const pityState = makePityState({ pullsSinceLastSR: 0, pullsSinceLastSSR: 12 });
    const result = resolveGachaRewardWithPity({
      pityState,
      enablePity: true,
      randomValue: 0.85,
    });

    expect(result.tier.rarity).toBe("SR");
    expect(result.nextPullsSinceLastSSR).toBe(13);
  });

  it("resets pullsSinceLastSSR when UR is rolled naturally", () => {
    const pityState = makePityState({ pullsSinceLastSR: 0, pullsSinceLastSSR: 12 });
    const result = resolveGachaRewardWithPity({
      pityState,
      enablePity: true,
      randomValue: 0.999,
    });

    expect(result.tier.rarity).toBe("UR");
    expect(result.nextPullsSinceLastSSR).toBe(0);
  });
});

describe("resolveSequentialGachaPulls", () => {
  it("resolves multiple pulls", () => {
    const pityState = makePityState();
    const result = resolveSequentialGachaPulls({
      count: 3,
      pityState,
      enablePity: true,
      randomValues: [0, 0.5, 0.9],
    });

    expect(result.results).toHaveLength(3);
    expect(result.results[0].rarity).toBe("N");
    expect(result.results[1].rarity).toBe("N");
    expect(result.results[2].rarity).toBe("SR");
  });

  it("calculates total reward amount", () => {
    const pityState = makePityState();
    const result = resolveSequentialGachaPulls({
      count: 2,
      pityState,
      enablePity: false,
      randomValues: [0, 0.9],
    });

    expect(result.totalRewardAmount).toBe(5 + 30);
  });

  it("triggers pity correctly in sequence", () => {
    const pityState = makePityState({ pullsSinceLastSR: 9 });
    const result = resolveSequentialGachaPulls({
      count: 1,
      pityState,
      enablePity: true,
    });

    expect(result.results[0].pityTriggered).toBe(true);
    expect(result.results[0].rarity).toBe("SR");
    expect(result.pityTriggeredCount).toBe(1);
  });

  it("returns updated pity state after sequence", () => {
    const pityState = makePityState({ pullsSinceLastSR: 0 });
    const result = resolveSequentialGachaPulls({
      count: 2,
      pityState,
      enablePity: true,
      randomValues: [0, 0],
    });

    expect(result.nextPityState.pullsSinceLastSR).toBe(2);
  });

  it("applies UR pity within sequential pulls", () => {
    const pityState = makePityState({ pullsSinceLastSR: 0, pullsSinceLastSSR: UR_PITY_THRESHOLD - 1 });
    const result = resolveSequentialGachaPulls({
      count: 1,
      pityState,
      enablePity: true,
      randomValues: [0],
    });

    expect(result.results[0].rarity).toBe("UR");
    expect(result.results[0].pityTriggered).toBe(true);
    expect(result.nextPityState.pullsSinceLastSSR).toBe(0);
  });
});

describe("formatPullResult", () => {
  it("formats a normal pull", () => {
    const pull: GachaPull = {
      id: "p1",
      poolId: "pool_weekend_main",
      costGems: 100,
      rarity: "N",
      rewardAmount: 5,
      pityTriggered: false,
      createdAt: "2026-05-01T00:00:00.000Z",
    };
    expect(formatPullResult(pull)).toContain("N");
    expect(formatPullResult(pull)).toContain("¥5");
    expect(formatPullResult(pull)).not.toContain("保底");
  });

  it("includes pity suffix when triggered", () => {
    const pull: GachaPull = {
      id: "p2",
      poolId: "pool_weekend_main",
      costGems: 100,
      rarity: "SR",
      rewardAmount: 30,
      pityTriggered: true,
      createdAt: "2026-05-01T00:00:00.000Z",
    };
    expect(formatPullResult(pull)).toContain("保底触发");
  });
});
