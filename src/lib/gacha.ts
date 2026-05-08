import type {
  GachaPool,
  GachaPull,
  GachaRewardTier,
  PityState,
  RewardRarity,
} from "@/types/domain";

export const DEFAULT_GACHA_COST = 100;
export const SR_PITY_THRESHOLD = 10;
export const TEN_PULL_COUNT = 10;

export const WEEKEND_GACHA_POOL: GachaPool = {
  id: "pool_weekend_main",
  name: "快乐预算卡池",
  description: "用宝石抽卡，把奖励金额直接转进快乐预算。",
  isActive: true,
  costGems: DEFAULT_GACHA_COST,
  createdAt: "2026-04-30T00:00:00.000Z",
  updatedAt: "2026-04-30T00:00:00.000Z",
};

export const GACHA_REWARD_TIERS: GachaRewardTier[] = [
  {
    id: "tier_n",
    poolId: WEEKEND_GACHA_POOL.id,
    rarity: "N",
    probability: 0.6,
    rewardAmount: 5,
    displayName: "普通奖励",
  },
  {
    id: "tier_r",
    poolId: WEEKEND_GACHA_POOL.id,
    rarity: "R",
    probability: 0.25,
    rewardAmount: 15,
    displayName: "稀有奖励",
  },
  {
    id: "tier_sr",
    poolId: WEEKEND_GACHA_POOL.id,
    rarity: "SR",
    probability: 0.1,
    rewardAmount: 30,
    displayName: "罕见奖励",
  },
  {
    id: "tier_ssr",
    poolId: WEEKEND_GACHA_POOL.id,
    rarity: "SSR",
    probability: 0.04,
    rewardAmount: 80,
    displayName: "传说奖励",
  },
  {
    id: "tier_ur",
    poolId: WEEKEND_GACHA_POOL.id,
    rarity: "UR",
    probability: 0.01,
    rewardAmount: 200,
    displayName: "史诗奖励",
  },
];

export const GACHA_RARITY_META: Record<
  RewardRarity,
  {
    resultLine: string;
    shellClassName: string;
    haloClassName: string;
    badgeClassName: string;
    accentClassName: string;
    flashClassName: string;
  }
> = {
  N: {
    resultLine: "获得普通奖励，快乐预算 +¥5",
    shellClassName: "from-stone-200 via-white to-stone-100 text-stone-900",
    haloClassName:
      "shadow-[0_0_0_1px_rgba(214,211,209,0.8),0_12px_32px_rgba(120,113,108,0.18)]",
    badgeClassName: "bg-stone-200 text-stone-700",
    accentClassName: "text-stone-600",
    flashClassName:
      "bg-[radial-gradient(circle,_rgba(255,255,255,0.88)_0%,_rgba(255,255,255,0.28)_38%,_transparent_72%)]",
  },
  R: {
    resultLine: "不错，获得稀有奖励，快乐预算 +¥15",
    shellClassName: "from-sky-200 via-white to-cyan-100 text-slate-900",
    haloClassName:
      "shadow-[0_0_24px_rgba(56,189,248,0.22),0_18px_36px_rgba(14,116,144,0.18)]",
    badgeClassName: "bg-sky-100 text-sky-800",
    accentClassName: "text-sky-700",
    flashClassName:
      "bg-[radial-gradient(circle,_rgba(125,211,252,0.92)_0%,_rgba(255,255,255,0.34)_38%,_transparent_72%)]",
  },
  SR: {
    resultLine: "手气很好！快乐预算 +¥30",
    shellClassName: "from-violet-200 via-white to-fuchsia-100 text-slate-900",
    haloClassName:
      "shadow-[0_0_36px_rgba(167,139,250,0.32),0_20px_44px_rgba(168,85,247,0.22)]",
    badgeClassName: "bg-violet-100 text-violet-800",
    accentClassName: "text-violet-700",
    flashClassName:
      "bg-[radial-gradient(circle,_rgba(196,181,253,0.96)_0%,_rgba(255,255,255,0.38)_38%,_transparent_72%)]",
  },
  SSR: {
    resultLine: "传说奖励！快乐预算 +¥80",
    shellClassName: "from-amber-200 via-white to-orange-100 text-stone-900",
    haloClassName:
      "scale-[1.03] shadow-[0_0_48px_rgba(251,191,36,0.4),0_24px_52px_rgba(249,115,22,0.24)]",
    badgeClassName: "bg-amber-100 text-amber-800",
    accentClassName: "text-amber-700",
    flashClassName:
      "bg-[radial-gradient(circle,_rgba(253,230,138,0.98)_0%,_rgba(255,255,255,0.42)_38%,_transparent_72%)]",
  },
  UR: {
    resultLine: "史诗奖励！快乐预算 +¥200",
    shellClassName: "from-rose-300 via-amber-100 to-fuchsia-200 text-stone-900",
    haloClassName:
      "scale-[1.05] shadow-[0_0_64px_rgba(244,114,182,0.45),0_0_36px_rgba(251,191,36,0.35),0_28px_64px_rgba(190,24,93,0.28)]",
    badgeClassName: "bg-rose-100 text-rose-800",
    accentClassName: "text-rose-700",
    flashClassName:
      "bg-[radial-gradient(circle,_rgba(251,207,232,1)_0%,_rgba(253,230,138,0.46)_30%,_rgba(255,255,255,0.28)_48%,_transparent_74%)]",
  },
};

export function createInitialPityState(updatedAt = new Date().toISOString()): PityState {
  return {
    id: "pity_weekend_main",
    poolId: WEEKEND_GACHA_POOL.id,
    pullsSinceLastSR: 0,
    pullsSinceLastSSR: 0,
    updatedAt,
  };
}

export function getGachaTierByRarity(rarity: RewardRarity) {
  return GACHA_REWARD_TIERS.find((tier) => tier.rarity === rarity) ?? GACHA_REWARD_TIERS[0];
}

export const DEFAULT_GACHA_REWARD_TIERS = GACHA_REWARD_TIERS.map((tier) => ({
  rarity: tier.rarity,
  probability: tier.probability,
  rewardAmount: tier.rewardAmount,
  displayName: tier.displayName,
}));

export function getGachaRarityMeta(rarity: RewardRarity, rewardAmount?: number) {
  const meta = GACHA_RARITY_META[rarity];
  if (rewardAmount !== undefined) {
    return {
      ...meta,
      resultLine: `${meta.resultLine.split("，")[0]}，快乐预算 +¥${rewardAmount}`,
    };
  }
  return meta;
}

export function isSrOrHigher(rarity: RewardRarity) {
  return rarity === "SR" || rarity === "SSR" || rarity === "UR";
}

export function getRemainingPullsUntilSrPity(pullsSinceLastSR: number) {
  return Math.max(SR_PITY_THRESHOLD - pullsSinceLastSR, 0);
}

export function rollGachaReward(randomValue = Math.random(), customTiers?: GachaRewardTier[]) {
  const tiers = customTiers ?? GACHA_REWARD_TIERS;
  let cursor = 0;

  for (const tier of tiers) {
    cursor += tier.probability;

    if (randomValue < cursor) {
      return tier;
    }
  }

  return tiers[tiers.length - 1];
}

export function resolveGachaRewardWithPity(options: {
  pityState: PityState;
  enablePity: boolean;
  randomValue?: number;
  customTiers?: GachaRewardTier[];
}) {
  const tiers = options.customTiers ?? GACHA_REWARD_TIERS;
  const shouldTriggerPity =
    options.enablePity && options.pityState.pullsSinceLastSR >= SR_PITY_THRESHOLD - 1;
  const tier = shouldTriggerPity
    ? (tiers.find((t) => t.rarity === "SR") ?? tiers[2])
    : rollGachaReward(options.randomValue, tiers);
  const pityTriggered = shouldTriggerPity;
  const nextPullsSinceLastSR = isSrOrHigher(tier.rarity)
    ? 0
    : options.pityState.pullsSinceLastSR + 1;

  return {
    tier,
    pityTriggered,
    nextPullsSinceLastSR,
  };
}

export function resolveSequentialGachaPulls(options: {
  count: number;
  pityState: PityState;
  enablePity: boolean;
  randomValues?: number[];
  customTiers?: GachaRewardTier[];
}) {
  let currentPityState = { ...options.pityState };
  const results: Array<{
    rarity: RewardRarity;
    rewardAmount: number;
    pityTriggered: boolean;
  }> = [];

  for (let index = 0; index < options.count; index += 1) {
    const result = resolveGachaRewardWithPity({
      pityState: currentPityState,
      enablePity: options.enablePity,
      randomValue: options.randomValues?.[index],
      customTiers: options.customTiers,
    });

    results.push({
      rarity: result.tier.rarity,
      rewardAmount: result.tier.rewardAmount,
      pityTriggered: result.pityTriggered,
    });

    currentPityState = {
      ...currentPityState,
      pullsSinceLastSR: result.nextPullsSinceLastSR,
      pullsSinceLastSSR: isSrOrHigher(result.tier.rarity)
        ? 0
        : currentPityState.pullsSinceLastSSR,
    };
  }

  return {
    results,
    totalRewardAmount: results.reduce((total, item) => total + item.rewardAmount, 0),
    pityTriggeredCount: results.filter((item) => item.pityTriggered).length,
    nextPityState: currentPityState,
  };
}

export function formatPullResult(pull: GachaPull) {
  const tier = getGachaTierByRarity(pull.rarity);
  const pitySuffix = pull.pityTriggered ? " · 保底触发" : "";
  return `${pull.rarity} · ${tier.displayName} · 奖励 ¥${pull.rewardAmount}${pitySuffix}`;
}
