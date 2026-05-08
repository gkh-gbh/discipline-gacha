"use client";

import { useState } from "react";

import { useAppState } from "@/components/app-state-provider";
import { SectionCard } from "@/components/ui";
import { getLatestGachaPull, getSrPityStatus } from "@/lib/app-state";
import { formatOpenDaysLabel, getGachaPoolStatus } from "@/lib/date";
import {
  formatPullResult,
  getGachaRarityMeta,
  getGachaTierByRarity,
  TEN_PULL_COUNT,
  WEEKEND_GACHA_POOL,
} from "@/lib/gacha";
import type { GachaPull, GachaRewardTier, RewardRarity } from "@/types/domain";

type PullAnimationPhase = "idle" | "charging" | "ready" | "flipping" | "revealed";
type TenPullPhase = "ready" | "flipping" | "revealed";

type TenPullOverlayState = {
  batchId: string;
  pulls: GachaPull[];
  totalRewardAmount: number;
  pityTriggeredCount: number;
  phase: TenPullPhase;
};

const CARD_BACK_SHELL =
  "bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.22),_transparent_46%),linear-gradient(135deg,rgba(28,25,23,0.96),rgba(68,64,60,0.92),rgba(28,25,23,0.96))]";

const SPARKLE_PARTICLES = [
  { top: "8%", left: "18%", delay: "0ms", size: "10px" },
  { top: "16%", left: "76%", delay: "60ms", size: "12px" },
  { top: "36%", left: "8%", delay: "120ms", size: "8px" },
  { top: "34%", left: "84%", delay: "90ms", size: "10px" },
  { top: "70%", left: "14%", delay: "160ms", size: "9px" },
  { top: "74%", left: "80%", delay: "210ms", size: "12px" },
  { top: "56%", left: "50%", delay: "140ms", size: "8px" },
  { top: "22%", left: "48%", delay: "40ms", size: "7px" },
] as const;

const TEN_PULL_RESULT_LINES: Record<RewardRarity, string> = {
  N: "普通奖励，预算 +¥5",
  R: "稀有奖励，预算 +¥15",
  SR: "手气很好，预算 +¥30",
  SSR: "高光时刻，预算 +¥80",
  UR: "传说奖励，预算 +¥200",
};

const TEN_PULL_PREVIEW_PRESETS: Record<"SSR" | "UR", RewardRarity[]> = {
  SSR: ["N", "R", "N", "R", "SR", "N", "R", "N", "SSR", "SR"],
  UR: ["N", "R", "SR", "N", "R", "SSR", "N", "SR", "UR", "R"],
};

export default function PoolPage() {
  const { appState, isHydrated, singleGachaPull, performTenPull } = useAppState();
  const [phase, setPhase] = useState<PullAnimationPhase>("idle");
  const [animatedPull, setAnimatedPull] = useState<GachaPull | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [tenPullOverlay, setTenPullOverlay] = useState<TenPullOverlayState | null>(null);

  const showDevTools = appState.userSettings.showDevTools;
  const gachaCost = appState.userSettings.gachaCost;
  const tenPullCost = gachaCost * TEN_PULL_COUNT;
  const rewardTiers: GachaRewardTier[] = appState.userSettings.gachaRewardTiers.map((t) => ({
    id: `tier_${t.rarity.toLowerCase()}`,
    poolId: WEEKEND_GACHA_POOL.id,
    ...t,
  }));
  const pullNarration: Record<RewardRarity, string> = {
    N: `普通奖励，预算 +¥${rewardTiers.find((t) => t.rarity === "N")?.rewardAmount ?? 5}`,
    R: `不错，预算 +¥${rewardTiers.find((t) => t.rarity === "R")?.rewardAmount ?? 15}`,
    SR: `手气很好，预算 +¥${rewardTiers.find((t) => t.rarity === "SR")?.rewardAmount ?? 30}`,
    SSR: `高光时刻，预算 +¥${rewardTiers.find((t) => t.rarity === "SSR")?.rewardAmount ?? 80}`,
    UR: `传说奖励，预算 +¥${rewardTiers.find((t) => t.rarity === "UR")?.rewardAmount ?? 200}`,
  };
  const latestPull = getLatestGachaPull(appState);
  const pityStatus = getSrPityStatus(appState);
  const openDaysLabel = formatOpenDaysLabel(appState.userSettings.gachaOpenDays);
  const poolStatus = isHydrated
    ? getGachaPoolStatus({
        openDays: appState.userSettings.gachaOpenDays,
      })
    : {
        isOpen: false,
        label: "读取中",
        helperText: "正在同步本地状态。",
        openDaysLabel,
      };

  const canSinglePull = isHydrated && poolStatus.isOpen && appState.wallet.gems >= gachaCost;
  const canTenPull = isHydrated && poolStatus.isOpen && appState.wallet.gems >= tenPullCost;
  const isBusy = phase !== "idle" || tenPullOverlay !== null;

  const pullButtonLabel = !isHydrated
    ? "读取中"
    : isBusy
      ? "抽卡进行中"
      : !poolStatus.isOpen
        ? "当前不可抽卡"
        : appState.wallet.gems < gachaCost
          ? "宝石不足"
          : "单抽";

  const tenPullButtonLabel = !isHydrated
    ? "读取中"
    : isBusy
      ? "十连抽进行中"
      : !poolStatus.isOpen
        ? "当前不可十连"
        : appState.wallet.gems < tenPullCost
          ? "宝石不足"
          : "十连抽";

  function handleSinglePull() {
    if (!canSinglePull || isBusy) {
      return;
    }

    const previousPullId = appState.gachaPulls[0]?.id;
    const nextState = singleGachaPull();
    const nextPull = nextState.gachaPulls[0];

    if (!nextPull || nextPull.id === previousPullId) {
      return;
    }

    setAnimatedPull(nextPull);
    setIsPreviewMode(false);
    setPhase("charging");

    window.setTimeout(() => {
      setPhase("ready");
    }, 520);
  }

  function handleRevealCard() {
    if (phase !== "ready") {
      return;
    }

    setPhase("flipping");
    window.setTimeout(() => {
      setPhase("revealed");
    }, 760);
  }

  function handleTenPull() {
    if (!canTenPull || isBusy) {
      return;
    }

    const previousCount = appState.gachaPulls.length;
    const nextState = performTenPull();

    if (nextState.gachaPulls.length === previousCount) {
      return;
    }

    const batchId = nextState.gachaPulls[0]?.batchId;

    if (!batchId) {
      return;
    }

    const pulls = nextState.gachaPulls
      .filter((pull) => pull.batchId === batchId)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt));

    if (pulls.length === 0) {
      return;
    }

    setTenPullOverlay({
      batchId,
      pulls,
      totalRewardAmount: pulls.reduce((total, pull) => total + pull.rewardAmount, 0),
      pityTriggeredCount: pulls.filter((pull) => pull.pityTriggered).length,
      phase: "ready",
    });
  }

  function openPreviewByRarity(rarity: RewardRarity) {
    if (!showDevTools || isBusy) {
      return;
    }

    const tier = getGachaTierByRarity(rarity);
    setAnimatedPull({
      id: `preview_${rarity}_${Date.now()}`,
      poolId: WEEKEND_GACHA_POOL.id,
      pullType: "single",
      costGems: 0,
      rarity,
      rewardAmount: tier.rewardAmount,
      pityTriggered: false,
      createdAt: new Date().toISOString(),
    });
    setIsPreviewMode(true);
    setPhase("charging");

    window.setTimeout(() => {
      setPhase("ready");
    }, 520);
  }

  function openTenPullPreview(targetRarity: "SSR" | "UR") {
    if (!showDevTools || isBusy) {
      return;
    }

    const batchSeed = Date.now();
    const batchId = `preview_batch_${targetRarity}_${batchSeed}`;
    const pulls: GachaPull[] = TEN_PULL_PREVIEW_PRESETS[targetRarity].map((rarity, index) => {
      const tier = getGachaTierByRarity(rarity);

      return {
        id: `preview_ten_${targetRarity}_${index}_${batchSeed}`,
        poolId: WEEKEND_GACHA_POOL.id,
        batchId,
        pullType: "ten",
        costGems: gachaCost,
        rarity,
        rewardAmount: tier.rewardAmount,
        pityTriggered: false,
        createdAt: new Date(batchSeed + index).toISOString(),
      };
    });

    setTenPullOverlay({
      batchId,
      pulls,
      totalRewardAmount: pulls.reduce((total, pull) => total + pull.rewardAmount, 0),
      pityTriggeredCount: 0,
      phase: "ready",
    });
  }

  function closeAnimatedResult() {
    setPhase("idle");
    setAnimatedPull(null);
    setIsPreviewMode(false);
  }

  function revealTenPullResults() {
    if (!tenPullOverlay || tenPullOverlay.phase !== "ready") {
      return;
    }

    setTenPullOverlay({
      ...tenPullOverlay,
      phase: "flipping",
    });

    window.setTimeout(() => {
      setTenPullOverlay((current) =>
        current && current.batchId === tenPullOverlay.batchId
          ? {
              ...current,
              phase: "revealed",
            }
          : current,
      );
    }, 880);
  }

  function closeTenPullOverlay() {
    setTenPullOverlay(null);
  }

  const resultMeta = animatedPull ? getGachaRarityMeta(animatedPull.rarity, animatedPull.rewardAmount) : null;
  const resultTier = animatedPull ? getGachaTierByRarity(animatedPull.rarity) : null;

  return (
    <div className="space-y-6">
      <GachaRevealOverlay
        open={phase !== "idle" && animatedPull !== null}
        phase={phase}
        pull={animatedPull}
        isPreviewMode={isPreviewMode}
        onReveal={handleRevealCard}
        onClose={closeAnimatedResult}
      />

      <TenPullRevealOverlay
        state={tenPullOverlay}
        onRevealAll={revealTenPullResults}
        onClose={closeTenPullOverlay}
      />

      <SectionCard
        eyebrow="Pool"
        title="卡池页"
        description="单抽和十连共用同一套概率与保底逻辑，十连按逐抽顺序结算。"
      >
        <div className="rounded-[24px] bg-stone-900 p-5 text-stone-100">
          <p className="text-xs uppercase tracking-[0.26em] text-stone-300">Reward Pool</p>
          <h3 className="section-title mt-3 text-3xl font-semibold">{WEEKEND_GACHA_POOL.name}</h3>
          <p className="mt-3 text-sm leading-6 text-stone-300">{WEEKEND_GACHA_POOL.description}</p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <InfoCapsule label="当前状态" value={poolStatus.label} />
            <InfoCapsule label="单抽消耗" value={`${gachaCost} 宝石`} />
            <InfoCapsule label="十连消耗" value={`${tenPullCost} 宝石`} />
            <InfoCapsule label="当前宝石" value={`${appState.wallet.gems}`} />
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <InfoCapsule label="开放日" value={openDaysLabel} />
            <InfoCapsule label="快乐预算" value={`¥${appState.wallet.rewardBalance}`} />
            <InfoCapsule
              label="SR 保底"
              value={
                pityStatus.enabled
                  ? `${Math.min(pityStatus.pullsSinceLastSR, pityStatus.threshold - 1)} / ${pityStatus.threshold}`
                  : "已关闭"
              }
            />
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <InfoCapsule
              label="UR 保底"
              value={
                pityStatus.enabled
                  ? `${Math.min(pityStatus.pullsSinceLastUr, pityStatus.urThreshold - 1)} / ${pityStatus.urThreshold}`
                  : "已关闭"
              }
            />
          </div>

          <div className="mt-4 space-y-2 text-sm text-stone-300">
            <p>{poolStatus.helperText}</p>
            {pityStatus.enabled ? (
              <>
                <p>距离 SR 保底还差 {pityStatus.remainingPulls} 抽。</p>
                <p>距离 UR 保底还差 {pityStatus.remainingUrPulls} 抽。</p>
              </>
            ) : (
              <p>保底已关闭，当前完全按概率抽取。</p>
            )}
          </div>

          {animatedPull && resultMeta && resultTier ? (
            <div
              className={`mt-4 rounded-[22px] border border-white/10 bg-white/8 px-4 py-4 transition ${resultMeta.haloClassName}`}
            >
              <div className="flex items-center justify-between gap-3">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${resultMeta.badgeClassName}`}
                >
                  {animatedPull.rarity}
                </span>
                <span className="text-sm text-stone-300">
                  {isPreviewMode ? "当前预览" : "最近结果"}：{resultTier.displayName}
                </span>
              </div>
              <p className={`mt-3 text-sm ${resultMeta.accentClassName}`}>{resultMeta.resultLine}</p>
              {animatedPull.pityTriggered ? (
                <p className="mt-2 text-xs font-medium text-amber-200">保底触发</p>
              ) : null}
            </div>
          ) : null}

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={handleSinglePull}
              disabled={!canSinglePull || isBusy}
              className="rounded-2xl bg-amber-300 px-5 py-3 text-sm font-semibold text-stone-900 transition disabled:cursor-not-allowed disabled:bg-stone-700 disabled:text-stone-300"
            >
              {pullButtonLabel}
            </button>
            <button
              type="button"
              onClick={handleTenPull}
              disabled={!canTenPull || isBusy}
              className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/16 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {tenPullButtonLabel}
            </button>
          </div>

          {showDevTools ? (
            <div className="mt-4 rounded-[22px] border border-white/10 bg-white/6 px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-stone-100">动画测试</p>
                <span className="text-xs text-stone-400">不扣宝石，不入账</span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
                {rewardTiers.map((tier) => (
                  <button
                    key={tier.id}
                    type="button"
                    onClick={() => openPreviewByRarity(tier.rarity)}
                    disabled={isBusy}
                    className="rounded-2xl border border-white/10 bg-white/8 px-3 py-2 text-xs font-semibold text-stone-100 transition hover:bg-white/14 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {tier.rarity}
                  </button>
                ))}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => openTenPullPreview("SSR")}
                  disabled={isBusy}
                  className="rounded-2xl border border-amber-200/20 bg-amber-100/10 px-3 py-2 text-xs font-semibold text-amber-100 transition hover:bg-amber-100/16 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  SSR 十连测试
                </button>
                <button
                  type="button"
                  onClick={() => openTenPullPreview("UR")}
                  disabled={isBusy}
                  className="rounded-2xl border border-rose-200/20 bg-rose-100/10 px-3 py-2 text-xs font-semibold text-rose-100 transition hover:bg-rose-100/16 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  UR 十连测试
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <SectionCard
          eyebrow="Rarity"
          title="奖励概率"
          description="十连不会引入额外折扣或新大保底，只是把 10 次单抽按顺序一起执行。"
        >
          <div className="space-y-3">
            {rewardTiers.map((tier) => (
              <div
                key={tier.id}
                className="flex items-center justify-between gap-3 rounded-[22px] border border-[var(--line)] bg-white/70 px-4 py-4"
              >
                <div>
                  <p className="font-medium">
                    {tier.rarity} · {tier.displayName}
                  </p>
                  <p className="muted mt-1 text-sm">命中后增加 ¥{tier.rewardAmount}</p>
                </div>
                <span className="rounded-full bg-stone-100 px-3 py-1 text-sm font-medium text-stone-700">
                  {(tier.probability * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Recent"
          title="最近一次结果"
          description="这里只显示最新一条抽卡记录，十连的 10 条结果会全部进入历史。"
        >
          {latestPull ? (
            <div className="rounded-[24px] border border-[var(--line)] bg-white/70 p-5">
              <p className="text-xs uppercase tracking-[0.26em] text-teal-700">Latest Pull</p>
              <h3 className="section-title mt-3 text-3xl font-semibold">
                {formatPullResult(latestPull)}
              </h3>
              <p className="muted mt-3 text-sm">
                来源：{latestPull.pullType === "ten" ? "十连抽" : "单抽"}，奖励已经计入快乐预算。
              </p>
              {latestPull.pityTriggered ? (
                <p className="mt-2 text-sm font-medium text-amber-700">本次结果由保底触发。</p>
              ) : null}
            </div>
          ) : (
            <div className="rounded-[24px] border border-dashed border-[var(--line)] bg-white/55 p-5 text-sm text-[var(--muted)]">
              还没有抽卡记录。先攒够宝石，再在开放日进行第一抽。
            </div>
          )}
        </SectionCard>
      </div>

      <SectionCard
        eyebrow="History"
        title="抽卡历史列表"
        description="单抽和十连结果都会保存在 localStorage，刷新后不会丢失。"
      >
        <div className="space-y-3">
          {appState.gachaPulls.length === 0 ? (
            <div className="rounded-[22px] border border-dashed border-[var(--line)] bg-white/55 px-4 py-6 text-sm text-[var(--muted)]">
              还没有抽卡历史。先完成任务拿到宝石，再把奖励转进快乐预算。
            </div>
          ) : null}

          {appState.gachaPulls.map((pull) => {
            const tier = getGachaTierByRarity(pull.rarity);

            return (
              <div
                key={pull.id}
                className="flex items-center justify-between gap-3 rounded-[22px] border border-[var(--line)] bg-white/70 px-4 py-4"
              >
                <div>
                  <p className="font-medium">
                    {pull.rarity} · {tier.displayName} · 奖励 ¥{pull.rewardAmount}
                    {pull.pityTriggered ? " · 保底触发" : ""}
                  </p>
                  <p className="muted mt-1 text-sm">
                    {pull.pullType === "ten" ? "十连抽" : "单抽"} ·{" "}
                    {pull.createdAt.replace("T", " ").slice(0, 16)}
                  </p>
                </div>
                <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-medium text-teal-800">
                  -{pull.costGems} 宝石
                </span>
              </div>
            );
          })}
        </div>
      </SectionCard>
    </div>
  );
}

function InfoCapsule(props: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] bg-white/10 px-4 py-4">
      <p className="text-sm text-stone-400">{props.label}</p>
      <p className="mt-1 text-xl font-semibold">{props.value}</p>
    </div>
  );
}

function GachaRevealOverlay(props: {
  open: boolean;
  phase: PullAnimationPhase;
  pull: GachaPull | null;
  isPreviewMode: boolean;
  onReveal: () => void;
  onClose: () => void;
}) {
  if (!props.open || !props.pull) {
    return null;
  }

  const meta = getGachaRarityMeta(props.pull.rarity, props.pull.rewardAmount);
  const tier = getGachaTierByRarity(props.pull.rarity);
  const isReady = props.phase === "ready";
  const isRevealed = props.phase === "revealed";
  const canFlip = props.phase === "ready";
  const showFlash = props.phase === "flipping" || props.phase === "revealed";
  const showRareFx =
    showFlash &&
    (props.pull.rarity === "SR" || props.pull.rarity === "SSR" || props.pull.rarity === "UR");
  const flashStrengthClassName =
    props.pull.rarity === "UR"
      ? "gacha-flash-legendary"
      : props.pull.rarity === "SR"
        ? "gacha-flash-epic"
        : props.pull.rarity === "SSR"
          ? "gacha-flash-strong"
          : "";
  const shineStrengthClassName =
    props.pull.rarity === "UR"
      ? "gacha-shine-legendary"
      : props.pull.rarity === "SR"
        ? "gacha-shine-epic"
        : props.pull.rarity === "SSR"
          ? "gacha-shine-strong"
          : "";
  const impactStrengthClassName =
    props.pull.rarity === "UR"
      ? "gacha-impact-legendary"
      : props.pull.rarity === "SSR"
        ? "gacha-impact-strong"
        : props.pull.rarity === "SR"
          ? "gacha-impact-epic"
          : "";
  const ringStrengthClassName =
    props.pull.rarity === "UR"
      ? "gacha-burst-ring-legendary"
      : props.pull.rarity === "SSR"
        ? "gacha-burst-ring-strong"
        : props.pull.rarity === "SR"
          ? "gacha-burst-ring-epic"
          : "";
  const sparkleStrengthClassName =
    props.pull.rarity === "UR"
      ? "gacha-sparkle-legendary"
      : props.pull.rarity === "SSR"
        ? "gacha-sparkle-strong"
        : "gacha-sparkle-epic";
  const sparkleCount =
    props.pull.rarity === "UR" ? 8 : props.pull.rarity === "SSR" ? 6 : 4;
  const cardShakeClassName =
    showFlash && props.pull.rarity === "UR"
      ? "gacha-card-shake"
      : showFlash && props.pull.rarity === "SSR"
        ? "gacha-card-shake-soft"
        : "";
  const rarityPulseClassName =
    isRevealed && props.pull.rarity === "UR"
      ? "gacha-rarity-pulse"
      : isRevealed && props.pull.rarity === "SSR"
        ? "gacha-rarity-pulse-soft"
        : "";
  const panelPulseClassName =
    showFlash && props.pull.rarity === "UR" ? "gacha-panel-pulse-legendary" : "";

  function handleCardKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (!canFlip) {
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      props.onReveal();
    }
  }

  return (
    <div className="fixed inset-0 z-[90] overflow-y-auto bg-stone-950/72 px-4 py-6 backdrop-blur-sm">
      <div className="mx-auto flex min-h-full max-w-3xl items-center justify-center">
        <div
          className={`w-full max-w-xl rounded-[32px] border border-white/10 bg-[rgba(28,25,23,0.86)] p-5 text-white shadow-[0_24px_80px_rgba(0,0,0,0.35)] sm:p-7 ${panelPulseClassName}`}
        >
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-stone-300">
              {props.phase === "charging"
                ? "Summoning"
                : props.phase === "ready"
                  ? "Tap To Reveal"
                  : props.phase === "flipping"
                    ? "Reveal"
                    : "Result"}
            </p>
            <h3 className="mt-3 text-3xl font-semibold">
              {props.phase === "charging"
                ? "抽卡启动中"
                : props.phase === "ready"
                  ? "点击卡牌翻开"
                  : props.phase === "flipping"
                    ? "卡面正在翻转"
                    : `${props.pull.rarity} 奖励揭晓`}
            </h3>
          </div>

          <div className="mt-6 flex justify-center">
            <div
              className={`relative h-[320px] w-full max-w-[240px] [perspective:1200px] sm:h-[360px] sm:max-w-[260px] ${cardShakeClassName}`}
            >
              {showRareFx ? (
                <>
                  <div
                    className={`pointer-events-none absolute inset-[-14%] rounded-full gacha-impact ${impactStrengthClassName}`}
                  />
                  <div
                    className={`pointer-events-none absolute inset-[-10%] rounded-full border gacha-burst-ring ${ringStrengthClassName}`}
                  />
                  <div className="pointer-events-none absolute inset-[-8%]">
                    {SPARKLE_PARTICLES.slice(0, sparkleCount).map((particle, index) => (
                      <span
                        key={`${props.pull?.id ?? "sparkle"}_${index}`}
                        className={`absolute rounded-full gacha-sparkle ${sparkleStrengthClassName}`}
                        style={{
                          top: particle.top,
                          left: particle.left,
                          width: particle.size,
                          height: particle.size,
                          animationDelay: particle.delay,
                        }}
                      />
                    ))}
                  </div>
                </>
              ) : null}

              {showFlash ? (
                <>
                  <div
                    className={`pointer-events-none absolute inset-0 rounded-[30px] ${meta.flashClassName} gacha-flash ${flashStrengthClassName}`}
                  />
                  <div
                    className={`pointer-events-none absolute inset-0 rounded-[30px] gacha-shine ${shineStrengthClassName}`}
                  />
                </>
              ) : null}

              <div
                role={canFlip ? "button" : undefined}
                tabIndex={canFlip ? 0 : -1}
                aria-label={canFlip ? "点击翻开卡牌" : undefined}
                onClick={canFlip ? props.onReveal : undefined}
                onKeyDown={handleCardKeyDown}
                className={`relative h-full w-full rounded-[30px] transition-transform duration-700 [transform-style:preserve-3d] ${
                  props.phase === "flipping" || isRevealed ? "[transform:rotateY(180deg)]" : ""
                } ${canFlip ? "cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-300/80" : ""}`}
              >
                <div
                  className={`absolute inset-0 rounded-[30px] border border-white/10 px-6 py-7 [backface-visibility:hidden] ${CARD_BACK_SHELL} ${
                    props.phase === "charging" ? "animate-pulse" : ""
                  }`}
                >
                  <div className="flex h-full flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-stone-200">
                        {props.isPreviewMode ? "动画测试" : "单抽仪式"}
                      </span>
                      <span className="text-xs text-stone-300">
                        {props.isPreviewMode ? tier.displayName : `Cost ${props.pull.costGems}`}
                      </span>
                    </div>
                    <div className="space-y-4 text-center">
                      <div className="mx-auto h-20 w-20 rounded-full border border-white/10 bg-white/5" />
                      <p className="text-lg font-semibold text-stone-100">
                        {isReady ? "点击翻牌" : "正在揭晓"}
                      </p>
                      <p className="text-sm leading-6 text-stone-300">
                        {props.phase === "charging" ? "结果已经锁定。" : "点击卡牌查看结果。"}
                      </p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs text-stone-300">
                      <span className="rounded-2xl bg-white/5 px-3 py-2">
                        {props.isPreviewMode ? "预览中" : "已扣费"}
                      </span>
                      <span className="rounded-2xl bg-white/5 px-3 py-2">已锁定</span>
                      <span className="rounded-2xl bg-white/5 px-3 py-2">
                        {isReady ? "待翻牌" : "揭晓中"}
                      </span>
                    </div>
                  </div>
                </div>

                <div
                  className={`absolute inset-0 rounded-[30px] border border-white/25 bg-gradient-to-br px-6 py-7 [backface-visibility:hidden] [transform:rotateY(180deg)] transition duration-500 ${meta.shellClassName} ${meta.haloClassName}`}
                >
                  <div className="flex h-full flex-col text-center">
                    <div className="flex items-center justify-end">
                      <span className={`text-sm font-medium ${meta.accentClassName}`}>
                        {tier.displayName}
                      </span>
                    </div>

                    <div
                      className={`flex flex-1 flex-col items-center justify-center gap-5 transition ${
                        isRevealed ? "scale-100 opacity-100" : "scale-95 opacity-0"
                      }`}
                    >
                      <p
                        className={`text-7xl font-black tracking-[0.12em] ${meta.accentClassName} ${rarityPulseClassName}`}
                      >
                        {props.pull.rarity}
                      </p>
                      <p className="text-5xl font-black tracking-tight">¥{props.pull.rewardAmount}</p>
                      <p className={`text-sm font-medium leading-6 ${meta.accentClassName}`}>
                        {meta.resultLine}
                      </p>
                      {props.pull.pityTriggered ? (
                        <p className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
                          保底触发
                        </p>
                      ) : null}
                    </div>

                    <div className="mt-4 rounded-[22px] bg-white/45 px-4 py-3 text-sm text-stone-700">
                      {props.isPreviewMode ? "仅测试动画，不影响余额。" : "已计入快乐预算。"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-center">
            {isRevealed ? (
              <button
                type="button"
                onClick={props.onClose}
                className="w-full max-w-sm rounded-2xl bg-amber-300 px-5 py-3 text-base font-semibold text-stone-900 transition hover:bg-amber-200"
              >
                确认结果
              </button>
            ) : (
              <div className="rounded-2xl bg-white/8 px-4 py-3 text-sm text-stone-300">
                {isReady ? "点击卡牌翻开。" : "揭晓中，请稍候。"}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TenPullRevealOverlay(props: {
  state: TenPullOverlayState | null;
  onRevealAll: () => void;
  onClose: () => void;
}) {
  if (!props.state) {
    return null;
  }

  const state = props.state;
  const hasRarePull = state.pulls.some(
    (pull) => pull.rarity === "SR" || pull.rarity === "SSR" || pull.rarity === "UR",
  );

  return (
    <div className="fixed inset-0 z-[90] overflow-y-auto bg-stone-950/72 px-4 py-6 backdrop-blur-sm">
      <div className="mx-auto flex min-h-full max-w-7xl items-center justify-center">
        <div className="w-full max-w-6xl rounded-[32px] border border-white/10 bg-[rgba(28,25,23,0.88)] p-5 text-white shadow-[0_24px_80px_rgba(0,0,0,0.35)] sm:p-7">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-stone-300">
              {state.phase === "ready"
                ? "Ten Pull"
                : state.phase === "flipping"
                  ? "Reveal"
                  : "Ten Pull Result"}
            </p>
            <h3 className="mt-3 text-3xl font-semibold">
              {state.phase === "ready"
                ? "十连已锁定，点击全部翻开"
                : state.phase === "flipping"
                  ? "卡面正在翻开"
                  : "十连结果揭晓"}
            </h3>
            <p className="mt-3 text-sm text-stone-300">
              {state.phase === "ready"
                ? "这一批会按逐抽逻辑结算保底，结果已经写入本地状态。"
                : state.phase === "flipping"
                  ? "结果已经锁定，正在揭示这一批奖励。"
                : `本次共获得 ¥${state.totalRewardAmount} 快乐预算。`}
            </p>
          </div>

          <div className="mt-7 grid grid-cols-2 gap-4 sm:grid-cols-5 sm:gap-6">
            {state.pulls.map((pull, index) => (
              <TenPullResultCard
                key={pull.id}
                pull={pull}
                index={index}
                hasRarePull={hasRarePull}
                phase={state.phase}
              />
            ))}
          </div>

          <div className="mt-6 rounded-[24px] border border-white/10 bg-white/8 px-4 py-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <OverlayInfo label="总奖励" value={`¥${state.totalRewardAmount}`} />
              <OverlayInfo label="保底触发" value={`${state.pityTriggeredCount} 次`} />
              <OverlayInfo
                label="结果数量"
                value={`${state.pulls.length} / ${TEN_PULL_COUNT}`}
              />
            </div>
          </div>

          <div className="mt-6 flex justify-center">
            {state.phase === "ready" ? (
              <button
                type="button"
                onClick={props.onRevealAll}
                className="w-full max-w-sm rounded-2xl bg-amber-300 px-5 py-3 text-base font-semibold text-stone-900 transition hover:bg-amber-200"
              >
                全部翻开
              </button>
            ) : state.phase === "flipping" ? (
              <div className="rounded-2xl bg-white/8 px-4 py-3 text-sm text-stone-300">
                正在翻开整组卡牌，请稍候。
              </div>
            ) : (
              <button
                type="button"
                onClick={props.onClose}
                className="w-full max-w-sm rounded-2xl bg-amber-300 px-5 py-3 text-base font-semibold text-stone-900 transition hover:bg-amber-200"
              >
                确认结果
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TenPullResultCard(props: {
  pull: GachaPull;
  index: number;
  hasRarePull: boolean;
  phase: TenPullPhase;
}) {
  const meta = getGachaRarityMeta(props.pull.rarity, props.pull.rewardAmount);
  const tier = getGachaTierByRarity(props.pull.rarity);
  const isRare =
    props.pull.rarity === "SR" || props.pull.rarity === "SSR" || props.pull.rarity === "UR";
  const isSsrOrAbove = props.pull.rarity === "SSR" || props.pull.rarity === "UR";
  const haloClassName = isRare ? meta.haloClassName : "";
  const isRevealed = props.phase === "revealed";
  const isFlipping = props.phase === "flipping" || props.phase === "revealed";
  const showRareFx = isRare && isFlipping;
  const flipDelay = `${props.index * 70}ms`;
  const impactStrengthClassName =
    props.pull.rarity === "UR"
      ? "gacha-impact-legendary"
      : props.pull.rarity === "SSR"
        ? "gacha-impact-strong"
        : "gacha-impact-epic";
  const ringStrengthClassName =
    props.pull.rarity === "UR"
      ? "gacha-burst-ring-legendary"
      : props.pull.rarity === "SSR"
        ? "gacha-burst-ring-strong"
        : "gacha-burst-ring-epic";
  const sparkleStrengthClassName =
    props.pull.rarity === "UR"
      ? "gacha-sparkle-legendary"
      : props.pull.rarity === "SSR"
        ? "gacha-sparkle-strong"
        : "gacha-sparkle-epic";
  const sparkleCount =
    props.pull.rarity === "UR" ? 6 : props.pull.rarity === "SSR" ? 5 : 3;
  const compactResultLine = TEN_PULL_RESULT_LINES[props.pull.rarity];
  const rarityShellFxClassName =
    props.pull.rarity === "UR"
      ? "gacha-ten-ur-shell"
      : props.pull.rarity === "SSR"
        ? "gacha-ten-ssr-shell"
        : "";
  const amountPulseClassName =
    props.pull.rarity === "UR"
      ? "gacha-ten-amount-pulse"
      : props.pull.rarity === "SSR"
        ? "gacha-ten-amount-pulse-soft"
        : "";
  const scaleBurstClassName =
    props.pull.rarity === "UR"
      ? "gacha-ten-card-burst"
      : props.pull.rarity === "SSR"
        ? "gacha-ten-card-burst-soft"
        : "";

  return (
    <div
      className={`relative h-48 [perspective:1200px] sm:h-56 ${
        showRareFx && props.pull.rarity === "UR"
          ? "gacha-card-shake"
          : showRareFx && props.pull.rarity === "SSR"
            ? "gacha-card-shake-soft"
            : ""
      }`}
      style={{ perspectiveOrigin: "center center" }}
    >
      <div
        className={`relative h-full w-full rounded-[24px] transition-transform duration-700 [transform-style:preserve-3d] ${
          isFlipping ? "[transform:rotateY(180deg)]" : ""
        } ${showRareFx && isSsrOrAbove ? scaleBurstClassName : ""}`}
        style={{ transitionDelay: flipDelay }}
      >
        <div
          className={`absolute inset-0 rounded-[24px] border border-white/10 px-5 py-5 text-center [backface-visibility:hidden] ${CARD_BACK_SHELL}`}
        >
          <div className="flex h-full flex-col items-center justify-between">
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-stone-200">
              第 {props.index + 1} 抽
            </span>
            <div className="h-14 w-14 rounded-full border border-white/10 bg-white/5" />
            <p className="text-sm text-stone-300">
              {props.phase === "ready" ? "等待翻开" : "翻页中"}
            </p>
          </div>
        </div>

        <div
          className={`absolute inset-0 overflow-hidden rounded-[24px] border border-white/20 bg-gradient-to-br px-5 py-5 text-center [backface-visibility:hidden] [transform:rotateY(180deg)] ${meta.shellClassName} ${haloClassName} ${
            props.pull.rarity === "UR" ? "gacha-panel-pulse-legendary" : ""
          }`}
        >
          {showRareFx ? (
            <>
              {isSsrOrAbove ? (
                <div
                  className={`pointer-events-none absolute inset-[-10px] rounded-[30px] ${
                    props.pull.rarity === "UR" ? "gacha-ten-ur-aura" : "gacha-ten-ssr-aura"
                  }`}
                />
              ) : null}
              {isSsrOrAbove ? (
                <div
                  className={`pointer-events-none absolute inset-[-3px] rounded-[26px] ${
                    props.pull.rarity === "UR"
                      ? "gacha-ten-ur-border"
                      : "gacha-ten-ssr-border"
                  }`}
                />
              ) : null}
              <div
                className={`pointer-events-none absolute inset-[-12%] rounded-full gacha-impact ${impactStrengthClassName}`}
              />
              <div
                className={`pointer-events-none absolute inset-[-8%] rounded-full border gacha-burst-ring ${ringStrengthClassName}`}
              />
              <div className="pointer-events-none absolute inset-[-6%]">
                {SPARKLE_PARTICLES.slice(0, sparkleCount).map((particle, particleIndex) => (
                  <span
                    key={`${props.pull.id}_ten_sparkle_${particleIndex}`}
                    className={`absolute rounded-full gacha-sparkle ${sparkleStrengthClassName}`}
                    style={{
                      top: particle.top,
                      left: particle.left,
                      width: particle.size,
                      height: particle.size,
                      animationDelay: particle.delay,
                    }}
                  />
                ))}
              </div>
              <div className={`pointer-events-none absolute inset-0 ${meta.flashClassName} opacity-60`} />
              <div
                className={`pointer-events-none absolute inset-0 gacha-shine ${
                  props.pull.rarity === "UR"
                    ? "gacha-shine-legendary"
                    : props.pull.rarity === "SSR"
                      ? "gacha-shine-strong"
                      : "gacha-shine-epic"
                }`}
              />
              {isSsrOrAbove ? (
                <div
                  className={`pointer-events-none absolute inset-0 rounded-[24px] ${rarityShellFxClassName}`}
                />
              ) : null}
            </>
          ) : null}

          <div className="relative flex h-full flex-col justify-between">
            <div className="flex items-start justify-between gap-2">
              <span
                className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${meta.badgeClassName}`}
              >
                第 {props.index + 1} 抽
              </span>
              <span className="rounded-full bg-white/45 px-3 py-1 text-xs font-semibold leading-none text-stone-700">
                {tier.displayName}
              </span>
            </div>

            <div
              className={`space-y-3 py-3 transition ${
                isRevealed ? "scale-100 opacity-100" : "scale-95 opacity-0"
              }`}
              style={{ transitionDelay: flipDelay }}
            >
              <p
                className={`text-6xl font-black tracking-[0.08em] ${
                  props.pull.rarity === "UR"
                    ? "gacha-rarity-pulse"
                    : props.pull.rarity === "SSR"
                      ? "gacha-rarity-pulse-soft"
                      : ""
                } ${meta.accentClassName}`}
              >
                {props.pull.rarity}
              </p>
              <p
                className={`whitespace-nowrap text-[2.4rem] font-black tracking-tight text-stone-900 ${amountPulseClassName} ${
                  isSsrOrAbove ? "drop-shadow-[0_4px_14px_rgba(255,255,255,0.38)]" : ""
                }`}
              >
                ¥{props.pull.rewardAmount}
              </p>
            </div>

            <div
              className={`space-y-2 transition ${
                isRevealed ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
              }`}
              style={{ transitionDelay: flipDelay }}
            >
              <p
                className={`min-h-[2.5rem] text-[11px] font-medium leading-[1.15rem] ${meta.accentClassName}`}
              >
                {compactResultLine}
              </p>
              {props.pull.pityTriggered ? (
                <p className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
                  保底触发
                </p>
              ) : props.pull.rarity === "UR" ? (
                <p className="rounded-full bg-rose-100/90 px-3 py-1 text-xs font-semibold text-rose-900 shadow-[0_0_24px_rgba(244,114,182,0.28)]">
                  传说结果
                </p>
              ) : props.pull.rarity === "SSR" ? (
                <p className="rounded-full bg-amber-100/90 px-3 py-1 text-xs font-semibold text-amber-900 shadow-[0_0_20px_rgba(251,191,36,0.24)]">
                  高光结果
                </p>
              ) : props.hasRarePull && isRare ? (
                <p
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    isSsrOrAbove
                      ? "bg-white/70 text-stone-900"
                      : "bg-white/55 text-stone-800"
                  }`}
                >
                  {isSsrOrAbove ? "高光结果" : "高稀有度"}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function OverlayInfo(props: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] bg-white/8 px-4 py-4 text-center">
      <p className="text-sm text-stone-300">{props.label}</p>
      <p className="mt-1 text-xl font-semibold text-white">{props.value}</p>
    </div>
  );
}
