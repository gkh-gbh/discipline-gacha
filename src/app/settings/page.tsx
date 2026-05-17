"use client";

import { useEffect, useMemo, useState } from "react";

import { useAppState } from "@/components/app-state-provider";
import { PlaceholderNote, SectionCard } from "@/components/ui";
import { formatOpenDaysLabel, WEEKDAY_OPTIONS } from "@/lib/date";
import {
  simulateGachaPullFrequencies,
  WEEKEND_GACHA_POOL,
} from "@/lib/gacha";
import { difficultyMeta, normalizeTaskRewardSettings } from "@/lib/task-rewards";
import type {
  GachaRewardTier,
  GachaTierSetting,
  RewardRarity,
  TaskDifficulty,
  TaskRewardSettings,
} from "@/types/domain";

type RewardDraftState = Record<TaskDifficulty, { gems: string; dust: string }>;

type GachaSimulationResult = ReturnType<typeof simulateGachaPullFrequencies>;

const GACHA_RARITY_ORDER: RewardRarity[] = ["N", "R", "SR", "SSR", "UR"];

function createRewardDraft(settings: TaskRewardSettings): RewardDraftState {
  return {
    simple: { gems: String(settings.simple.gems), dust: String(settings.simple.dust) },
    normal: { gems: String(settings.normal.gems), dust: String(settings.normal.dust) },
    medium: { gems: String(settings.medium.gems), dust: String(settings.medium.dust) },
    hard: { gems: String(settings.hard.gems), dust: String(settings.hard.dust) },
    breakthrough: {
      gems: String(settings.breakthrough.gems),
      dust: String(settings.breakthrough.dust),
    },
  };
}

function isNonNegativeIntegerString(value: string) {
  return /^\d+$/.test(value.trim());
}

function parseRewardDraft(draft: RewardDraftState) {
  const entries = Object.entries(draft) as Array<[TaskDifficulty, { gems: string; dust: string }]>;

  for (const [difficulty, reward] of entries) {
    if (!isNonNegativeIntegerString(reward.gems) || !isNonNegativeIntegerString(reward.dust)) {
      return {
        ok: false as const,
        message: `${difficultyMeta[difficulty].label} 的宝石和星尘奖励必须是大于等于 0 的整数。`,
      };
    }
  }

  return {
    ok: true as const,
    settings: normalizeTaskRewardSettings({
      simple: { gems: Number(draft.simple.gems), dust: Number(draft.simple.dust) },
      normal: { gems: Number(draft.normal.gems), dust: Number(draft.normal.dust) },
      medium: { gems: Number(draft.medium.gems), dust: Number(draft.medium.dust) },
      hard: { gems: Number(draft.hard.gems), dust: Number(draft.hard.dust) },
      breakthrough: {
        gems: Number(draft.breakthrough.gems),
        dust: Number(draft.breakthrough.dust),
      },
    }),
  };
}

export default function SettingsPage() {
  const { resetAppState, addDevGems, updateUserSettings, appState, isHydrated } = useAppState();
  const [monthlyBudgetLimit, setMonthlyBudgetLimit] = useState("");
  const [gachaCost, setGachaCost] = useState("");
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [showDevTools, setShowDevTools] = useState(true);
  const [enablePity, setEnablePity] = useState(true);
  const [srPityThreshold, setSrPityThreshold] = useState("10");
  const [urPityThreshold, setUrPityThreshold] = useState("100");
  const [seriesWeeklyTarget, setSeriesWeeklyTarget] = useState("3");
  const [seriesWeeklyBonusMultiplier, setSeriesWeeklyBonusMultiplier] = useState("0.5");
  const [gachaTiers, setGachaTiers] = useState<GachaTierSetting[]>(
    appState.userSettings.gachaRewardTiers.map((t) => ({ ...t })),
  );
  const [rewardDraft, setRewardDraft] = useState<RewardDraftState>(
    createRewardDraft(appState.userSettings.taskRewardSettings),
  );
  const [simulationPullCount, setSimulationPullCount] = useState("1000");
  const [simulationResult, setSimulationResult] = useState<GachaSimulationResult | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const shouldShowDevTools = appState.userSettings.showDevTools;

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    setMonthlyBudgetLimit(String(appState.userSettings.monthlyBudgetLimit));
    setGachaCost(String(appState.userSettings.gachaCost));
    setSelectedDays(appState.userSettings.gachaOpenDays);
    setShowDevTools(appState.userSettings.showDevTools);
    setEnablePity(appState.userSettings.enablePity);
    setSrPityThreshold(String(appState.userSettings.srPityThreshold));
    setUrPityThreshold(String(appState.userSettings.urPityThreshold));
    setSeriesWeeklyTarget(String(appState.userSettings.seriesWeeklyTarget));
    setSeriesWeeklyBonusMultiplier(String(appState.userSettings.seriesWeeklyBonusMultiplier));
    setGachaTiers(appState.userSettings.gachaRewardTiers.map((t) => ({ ...t })));
    setRewardDraft(createRewardDraft(appState.userSettings.taskRewardSettings));
  }, [appState.userSettings, isHydrated]);

  const monthlyBudgetNumber = Number(monthlyBudgetLimit);
  const gachaCostNumber = Number(gachaCost);
  const parsedRewardDraft = useMemo(() => parseRewardDraft(rewardDraft), [rewardDraft]);

  const validationMessage = useMemo(() => {
    if (
      !monthlyBudgetLimit.trim() ||
      !Number.isFinite(monthlyBudgetNumber) ||
      monthlyBudgetNumber <= 0
    ) {
      return "每月快乐预算上限必须大于 0。";
    }

    if (!gachaCost.trim() || !Number.isFinite(gachaCostNumber) || gachaCostNumber <= 0) {
      return "单抽消耗宝石必须大于 0。";
    }

    if (selectedDays.length === 0) {
      return "至少选择一个卡池开放日。";
    }

    const weeklyTargetNum = Number(seriesWeeklyTarget);
    if (!seriesWeeklyTarget.trim() || !Number.isFinite(weeklyTargetNum) || weeklyTargetNum < 1 || weeklyTargetNum > 30) {
      return "每周目标次数必须在 1-30 之间。";
    }

    const bonusMultNum = Number(seriesWeeklyBonusMultiplier);
    if (!seriesWeeklyBonusMultiplier.trim() || !Number.isFinite(bonusMultNum) || bonusMultNum < 0 || bonusMultNum > 5) {
      return "阶段奖励倍率必须在 0-5 之间。";
    }

    const srPityThresholdNum = Number(srPityThreshold);
    if (
      !srPityThreshold.trim() ||
      !Number.isFinite(srPityThresholdNum) ||
      srPityThresholdNum < 1
    ) {
      return "SR 保底阈值必须是大于等于 1 的整数。";
    }

    const urPityThresholdNum = Number(urPityThreshold);
    if (
      !urPityThreshold.trim() ||
      !Number.isFinite(urPityThresholdNum) ||
      urPityThresholdNum < 1
    ) {
      return "UR 保底阈值必须是大于等于 1 的整数。";
    }

    const totalProb = gachaTiers.reduce((sum, t) => sum + t.probability, 0);
    if (Math.abs(totalProb - 1) > 0.001) {
      return `抽卡概率总和必须为 100%，当前为 ${Math.round(totalProb * 100)}%。`;
    }

    for (const tier of gachaTiers) {
      if (tier.rewardAmount < 0 || !Number.isFinite(tier.rewardAmount)) {
        return `${tier.displayName}的奖励金额不能为负数。`;
      }
    }

    if (!parsedRewardDraft.ok) {
      return parsedRewardDraft.message;
    }

    return null;
  }, [
    gachaCost,
    gachaCostNumber,
    gachaTiers,
    monthlyBudgetLimit,
    monthlyBudgetNumber,
    parsedRewardDraft,
    selectedDays.length,
    srPityThreshold,
    urPityThreshold,
    seriesWeeklyTarget,
    seriesWeeklyBonusMultiplier,
  ]);

  function toggleOpenDay(day: number) {
    setSelectedDays((current) =>
      current.includes(day) ? current.filter((item) => item !== day) : [...current, day].sort(),
    );
    setActionMessage(null);
  }

  function handleRewardChange(
    difficulty: TaskDifficulty,
    field: "gems" | "dust",
    value: string,
  ) {
    setRewardDraft((current) => ({
      ...current,
      [difficulty]: {
        ...current[difficulty],
        [field]: value,
      },
    }));
    setActionMessage(null);
  }

  function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (validationMessage || !parsedRewardDraft.ok) {
      setActionMessage(validationMessage ?? "设置无效。");
      return;
    }

    updateUserSettings({
      monthlyBudgetLimit: monthlyBudgetNumber,
      gachaCost: gachaCostNumber,
      gachaOpenDays: selectedDays,
      taskRewardSettings: parsedRewardDraft.settings,
      gachaRewardTiers: gachaTiers,
      showDevTools,
      enablePity,
      srPityThreshold: Number(srPityThreshold),
      urPityThreshold: Number(urPityThreshold),
      seriesWeeklyTarget: Number(seriesWeeklyTarget),
      seriesWeeklyBonusMultiplier: Number(seriesWeeklyBonusMultiplier),
    });
    setActionMessage("设置已保存到本地。");
  }

  function handleReset() {
    const confirmed = window.confirm(
      "这会清空任务、抽卡、钱包、消费记录和个人设置。确认重置测试数据吗？",
    );

    if (!confirmed) {
      return;
    }

    resetAppState();
    setActionMessage("测试数据已重置。");
  }

  function handleAddDevGems() {
    addDevGems(500);
    setActionMessage("已增加 500 宝石。");
  }

  function handleRunGachaSimulation() {
    const count = Number(simulationPullCount);

    if (!simulationPullCount.trim() || !Number.isInteger(count) || count < 1) {
      setActionMessage("抽卡测试次数必须是大于等于 1 的整数。");
      return;
    }

    const customTiers: GachaRewardTier[] = appState.userSettings.gachaRewardTiers.map((tier) => ({
      id: `tier_${tier.rarity.toLowerCase()}`,
      poolId: WEEKEND_GACHA_POOL.id,
      ...tier,
    }));

    setSimulationResult(
      simulateGachaPullFrequencies({
        count,
        pityState: appState.pityState,
        enablePity: appState.userSettings.enablePity,
        customTiers,
        srPityThreshold: appState.userSettings.srPityThreshold,
        urPityThreshold: appState.userSettings.urPityThreshold,
      }),
    );
    setActionMessage(`已完成 ${count.toLocaleString("zh-CN")} 次无记录抽卡测试。`);
  }

  function handleExportData() {
    const data = localStorage.getItem("discipline-gacha-state");
    if (!data) {
      setActionMessage("没有可导出的数据。");
      return;
    }
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `discipline-gacha-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setActionMessage("数据已导出为 JSON 文件。");
  }

  function handleImportData() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          JSON.parse(text);
          localStorage.setItem("discipline-gacha-state", text);
          window.location.reload();
        } catch {
          setActionMessage("导入失败：文件格式不正确。");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  const remainingMonthlyBudget = Math.max(
    appState.userSettings.monthlyBudgetLimit - appState.wallet.monthlyUnlockedAmount,
    0,
  );

  return (
    <div className="space-y-6">
      <SectionCard
        eyebrow="Settings"
        title="个人配置"
        description="把卡池开放日、单抽成本、保底开关、月度预算和任务奖励都切换成可保存的个人设置。"
      >
        <div className="grid gap-4 md:grid-cols-5">
          <SummaryCard
            label="当前月度预算上限"
            value={`¥${appState.userSettings.monthlyBudgetLimit}`}
          />
          <SummaryCard label="当前单抽消耗" value={`${appState.userSettings.gachaCost} 宝石`} />
          <SummaryCard
            label="当前开放日"
            value={formatOpenDaysLabel(appState.userSettings.gachaOpenDays)}
          />
          <SummaryCard
            label="SR 保底"
            value={appState.userSettings.enablePity ? `${appState.userSettings.srPityThreshold} 抽` : "已关闭"}
          />
          <SummaryCard
            label="UR 保底"
            value={`${appState.userSettings.urPityThreshold} 抽`}
          />
        </div>

        <form onSubmit={handleSave} className="mt-6 space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <InputField
              label="每月快乐预算上限"
              value={monthlyBudgetLimit}
              onChange={(value) => {
                setMonthlyBudgetLimit(value);
                setActionMessage(null);
              }}
            />
            <InputField
              label="单抽消耗宝石"
              value={gachaCost}
              onChange={(value) => {
                setGachaCost(value);
                setActionMessage(null);
              }}
            />
          </div>

          <div className="rounded-[24px] border border-[var(--line)] bg-white/70 p-5">
            <p className="text-sm font-medium text-stone-700">卡池开放日</p>
            <p className="muted mt-2 text-sm">
              至少选择一个开放日。`0` 表示周日，`6` 表示周六。
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              {WEEKDAY_OPTIONS.map((day) => {
                const checked = selectedDays.includes(day.value);

                return (
                  <label
                    key={day.value}
                    className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-sm transition ${
                      checked
                        ? "border-teal-300 bg-teal-50 text-teal-900"
                        : "border-[var(--line)] bg-[var(--card-strong)] text-stone-700"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleOpenDay(day.value)}
                      className="h-4 w-4"
                    />
                    <span>{day.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <ToggleCard
            title="开启 SR 保底"
            description="开启后，每 10 抽至少获得 1 个 SR 或以上。关闭后完全按概率抽取。"
            checked={enablePity}
            onChange={(checked) => {
              setEnablePity(checked);
              setActionMessage(null);
            }}
          />

          <div className="rounded-[24px] border border-[var(--line)] bg-white/70 p-5">
            <p className="text-sm font-medium text-stone-700">SR 保底设置</p>
            <p className="muted mt-2 text-sm">
              达到阈值后，下一抽至少获得 1 个 SR 或以上。
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <InputField
                label="SR 保底阈值"
                value={srPityThreshold}
                min="1"
                onChange={(value) => {
                  setSrPityThreshold(value);
                  setActionMessage(null);
                }}
              />
              <div className="rounded-[22px] bg-white/65 px-4 py-4 text-sm text-stone-700">
                <p className="font-medium">当前规则</p>
                <p className="muted mt-1">{srPityThreshold || "?"} 抽内至少出 1 个 SR+。</p>
              </div>
            </div>
          </div>

          <div className="rounded-[24px] border border-[var(--line)] bg-white/70 p-5">
            <p className="text-sm font-medium text-stone-700">UR 保底设置</p>
            <p className="muted mt-2 text-sm">
              与 SR 保底独立计算。达到阈值后，下一抽必定获得 1 个 UR。
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <InputField
                label="UR 保底阈值"
                value={urPityThreshold}
                min="1"
                onChange={(value) => {
                  setUrPityThreshold(value);
                  setActionMessage(null);
                }}
              />
              <div className="rounded-[22px] bg-white/65 px-4 py-4 text-sm text-stone-700">
                <p className="font-medium">当前规则</p>
                <p className="muted mt-1">{urPityThreshold || "?"} 抽内必出 1 个 UR。</p>
              </div>
            </div>
          </div>

          <div className="rounded-[24px] border border-[var(--line)] bg-white/70 p-5">
            <p className="text-sm font-medium text-stone-700">抽卡概率与奖励设置</p>
            <p className="muted mt-2 text-sm">
              调整各稀有度的概率和奖励金额。概率总和必须为 100%。
            </p>
            {(() => {
              const totalProb = gachaTiers.reduce((sum, t) => sum + t.probability, 0);
              const probOk = Math.abs(totalProb - 1) < 0.001;
              return (
                <div className={`mt-3 rounded-[20px] px-4 py-2 text-sm ${probOk ? "bg-teal-50 text-teal-800" : "bg-rose-50 text-rose-700"}`}>
                  概率总和：{Math.round(totalProb * 100)}%{probOk ? " ✓" : "（必须为 100%）"}
                </div>
              );
            })()}
            <div className="mt-4 space-y-3">
              {gachaTiers.map((tier, index) => (
                <div
                  key={tier.rarity}
                  className="grid gap-3 rounded-2xl border border-[var(--line)] bg-[var(--card-strong)] px-4 py-4 sm:grid-cols-[80px_1fr_1fr_1fr]"
                >
                  <div className="flex items-center">
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                      tier.rarity === "N" ? "bg-stone-200 text-stone-700" :
                      tier.rarity === "R" ? "bg-sky-100 text-sky-800" :
                      tier.rarity === "SR" ? "bg-violet-100 text-violet-800" :
                      tier.rarity === "SSR" ? "bg-amber-100 text-amber-800" :
                      "bg-rose-100 text-rose-800"
                    }`}>
                      {tier.rarity}
                    </span>
                  </div>
                  <label className="block">
                    <span className="mb-1 block text-xs text-stone-500">概率（%）</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={Math.round(tier.probability * 100)}
                      onChange={(event) => {
                        const newTiers = [...gachaTiers];
                        newTiers[index] = { ...tier, probability: Number(event.target.value) / 100 };
                        setGachaTiers(newTiers);
                        setActionMessage(null);
                      }}
                      className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm outline-none"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs text-stone-500">奖励金额（¥）</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={tier.rewardAmount}
                      onChange={(event) => {
                        const newTiers = [...gachaTiers];
                        newTiers[index] = { ...tier, rewardAmount: Number(event.target.value) };
                        setGachaTiers(newTiers);
                        setActionMessage(null);
                      }}
                      className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm outline-none"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs text-stone-500">显示名称</span>
                    <input
                      type="text"
                      value={tier.displayName}
                      onChange={(event) => {
                        const newTiers = [...gachaTiers];
                        newTiers[index] = { ...tier, displayName: event.target.value };
                        setGachaTiers(newTiers);
                        setActionMessage(null);
                      }}
                      className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm outline-none"
                    />
                  </label>
                </div>
              ))}
            </div>
            <div className="mt-3 rounded-[22px] bg-white/65 px-4 py-3 text-sm text-stone-700">
              {gachaTiers.map((t) => `${t.rarity} ${Math.round(t.probability * 100)}% ¥${t.rewardAmount}`).join(" · ")}
            </div>
          </div>

          <div className="rounded-[24px] border border-[var(--line)] bg-white/70 p-5">
            <p className="text-sm font-medium text-stone-700">系列任务默认设置</p>
            <p className="muted mt-2 text-sm">
              新建系列任务时的默认周目标和阶段奖励倍率。已有任务不受影响。
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-stone-700">默认每周目标次数</span>
                <select
                  value={seriesWeeklyTarget}
                  onChange={(event) => {
                    setSeriesWeeklyTarget(event.target.value);
                    setActionMessage(null);
                  }}
                  className="w-full rounded-2xl border border-[var(--line)] bg-[var(--card-strong)] px-4 py-3 outline-none"
                >
                  {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                    <option key={n} value={n}>
                      每周 {n} 次
                    </option>
                  ))}
                </select>
              </label>
              <div>
                <span className="mb-2 block text-sm font-medium text-stone-700">阶段奖励倍率</span>
                <div className="mb-2 flex flex-wrap gap-2">
                  {[
                    { value: "0", label: "无" },
                    { value: "0.3", label: "0.3" },
                    { value: "0.5", label: "0.5" },
                    { value: "0.8", label: "0.8" },
                    { value: "1", label: "1" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setSeriesWeeklyBonusMultiplier(opt.value);
                        setActionMessage(null);
                      }}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                        seriesWeeklyBonusMultiplier === opt.value
                          ? "bg-stone-900 text-white"
                          : "border border-[var(--line)] bg-white text-stone-700 hover:bg-stone-50"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <span className="shrink-0 text-xs text-stone-500">自定义：</span>
                  <input
                    type="number"
                    min="0"
                    max="5"
                    step="0.1"
                    value={["0", "0.3", "0.5", "0.8", "1"].includes(seriesWeeklyBonusMultiplier) ? "" : seriesWeeklyBonusMultiplier}
                    onChange={(event) => {
                      setSeriesWeeklyBonusMultiplier(event.target.value);
                      setActionMessage(null);
                    }}
                    placeholder="如 0.7"
                    className="w-full rounded-2xl border border-[var(--line)] bg-white px-3 py-2 text-sm outline-none"
                  />
                </div>
              </div>
            </div>
            <div className="mt-3 rounded-[22px] bg-white/65 px-4 py-3 text-sm text-stone-700">
              示例：难度普通（30 宝石/1 星尘），每周目标 {seriesWeeklyTarget} 次，倍率 {seriesWeeklyBonusMultiplier}，
              阶段奖励 = {Math.round(30 * Number(seriesWeeklyTarget) * Number(seriesWeeklyBonusMultiplier))} 宝石 / {Math.round(1 * Number(seriesWeeklyTarget) * Number(seriesWeeklyBonusMultiplier))} 星尘
            </div>
          </div>

          <div className="rounded-[24px] border border-[var(--line)] bg-white/70 p-5">
            <p className="text-sm font-medium text-stone-700">任务奖励设置</p>
            <p className="muted mt-2 text-sm">
              修改后只影响未来新建任务和新建每日模板，已有任务和模板会保留原奖励。
            </p>

            <div className="mt-4 space-y-3">
              {(Object.keys(difficultyMeta) as TaskDifficulty[]).map((difficulty) => (
                <div
                  key={difficulty}
                  className="grid gap-3 rounded-2xl border border-[var(--line)] bg-[var(--card-strong)] px-4 py-4 sm:grid-cols-[140px_1fr_1fr]"
                >
                  <div className="flex items-center">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${difficultyMeta[difficulty].tone}`}
                    >
                      {difficultyMeta[difficulty].label}
                    </span>
                  </div>

                  <InputField
                    label="宝石奖励"
                    value={rewardDraft[difficulty].gems}
                    min="0"
                    onChange={(value) => handleRewardChange(difficulty, "gems", value)}
                  />

                  <InputField
                    label="星尘奖励"
                    value={rewardDraft[difficulty].dust}
                    min="0"
                    onChange={(value) => handleRewardChange(difficulty, "dust", value)}
                  />
                </div>
              ))}
            </div>
          </div>

          <ToggleCard
            title="显示开发测试工具"
            description="开启后会显示加宝石和抽卡动画测试按钮。"
            checked={showDevTools}
            onChange={(checked) => {
              setShowDevTools(checked);
              setActionMessage(null);
            }}
          />

          {actionMessage ? (
            <div className="rounded-[20px] border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800">
              {actionMessage}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={Boolean(validationMessage)}
            className="rounded-2xl bg-stone-900 px-5 py-3 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-50"
          >
            保存设置
          </button>
        </form>
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <SectionCard
          eyebrow="Budget"
          title="月预算提示"
          description="本月消费达到上限后，无法继续记录消费。抽卡奖励不受影响。"
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <SummaryCard label="本月上限" value={`¥${appState.userSettings.monthlyBudgetLimit}`} />
            <SummaryCard label="本月已解锁" value={`¥${appState.wallet.monthlyUnlockedAmount}`} />
            <SummaryCard label="剩余可解锁预算" value={`¥${remainingMonthlyBudget}`} />
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Tools"
          title="测试与重置"
          description="重置会清空当前浏览器中的本地状态。导出/导入用于备份和迁移数据。"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <button
              type="button"
              onClick={handleReset}
              className="rounded-2xl bg-rose-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-rose-500"
            >
              重置测试数据
            </button>

            {shouldShowDevTools ? (
              <button
                type="button"
                onClick={handleAddDevGems}
                className="rounded-2xl bg-stone-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-stone-700"
              >
                增加 500 宝石
              </button>
            ) : (
              <div className="rounded-2xl border border-dashed border-[var(--line)] bg-white/55 px-4 py-3 text-sm text-[var(--muted)]">
                当前未显示开发测试工具。
              </div>
            )}

            <button
              type="button"
              onClick={handleExportData}
              className="rounded-2xl border border-[var(--line)] bg-white px-5 py-3 text-sm font-medium text-stone-700 transition hover:bg-stone-50"
            >
              导出数据 (JSON)
            </button>

            <button
              type="button"
              onClick={handleImportData}
              className="rounded-2xl border border-[var(--line)] bg-white px-5 py-3 text-sm font-medium text-stone-700 transition hover:bg-stone-50"
            >
              导入数据 (JSON)
            </button>
          </div>

          {shouldShowDevTools ? (
            <div className="mt-5 rounded-[24px] border border-[var(--line)] bg-white/70 p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-sm font-medium text-stone-700">抽卡概率快速测试</p>
                  <p className="muted mt-2 text-sm leading-6">
                    按当前概率和保底配置连续模拟抽卡；不扣宝石，不写入抽卡记录，也不播放动画。
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <InputField
                    label="测试抽数"
                    value={simulationPullCount}
                    min="1"
                    onChange={(value) => {
                      setSimulationPullCount(value);
                      setActionMessage(null);
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleRunGachaSimulation}
                    className="rounded-2xl bg-stone-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-stone-700"
                  >
                    开始测试
                  </button>
                </div>
              </div>

              {simulationResult ? (
                <div className="mt-5 space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                    {GACHA_RARITY_ORDER.map((rarity) => (
                      <div
                        key={rarity}
                        className="rounded-2xl border border-[var(--line)] bg-[var(--card-strong)] px-4 py-4"
                      >
                        <p className="text-xs font-semibold text-stone-500">{rarity}</p>
                        <p className="mt-2 text-2xl font-semibold text-stone-900">
                          {simulationResult.counts[rarity].toLocaleString("zh-CN")} 次
                        </p>
                        <p className="muted mt-1 text-sm">
                          {(simulationResult.frequencies[rarity] * 100).toFixed(2)}%
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-[20px] bg-stone-100 px-4 py-3 text-sm text-stone-700">
                    共模拟 {simulationResult.count.toLocaleString("zh-CN")} 抽；保底触发 {simulationResult.pityTriggeredCount.toLocaleString("zh-CN")} 次。
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </SectionCard>
      </div>

      <PlaceholderNote title="存储说明">
        所有设置仍然只保存在 localStorage。刷新页面会保留；切换浏览器或清空站点数据后会回到默认值。
      </PlaceholderNote>
    </div>
  );
}

function SummaryCard(props: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-[var(--line)] bg-white/70 p-5">
      <p className="text-sm text-stone-500">{props.label}</p>
      <p className="mt-2 text-2xl font-semibold">{props.value}</p>
    </div>
  );
}

function InputField(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-stone-700">{props.label}</span>
      <input
        type="number"
        min={props.min ?? "1"}
        step="1"
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
        className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3 outline-none"
      />
    </label>
  );
}

function ToggleCard(props: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="rounded-[24px] border border-[var(--line)] bg-white/70 p-5">
      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={props.checked}
          onChange={(event) => props.onChange(event.target.checked)}
          className="mt-1 h-4 w-4"
        />
        <div>
          <p className="text-sm font-medium text-stone-700">{props.title}</p>
          <p className="muted mt-2 text-sm leading-6">{props.description}</p>
        </div>
      </label>
    </div>
  );
}
