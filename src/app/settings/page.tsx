"use client";

import { useEffect, useMemo, useState } from "react";

import { useAppState } from "@/components/app-state-provider";
import { PlaceholderNote, SectionCard } from "@/components/ui";
import { formatOpenDaysLabel, WEEKDAY_OPTIONS } from "@/lib/date";
import { difficultyMeta, normalizeTaskRewardSettings } from "@/lib/task-rewards";
import type { TaskDifficulty, TaskRewardSettings } from "@/types/domain";

type RewardDraftState = Record<TaskDifficulty, { gems: string; dust: string }>;

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
  const [rewardDraft, setRewardDraft] = useState<RewardDraftState>(
    createRewardDraft(appState.userSettings.taskRewardSettings),
  );
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const isDevelopment = process.env.NODE_ENV !== "production";
  const shouldShowDevTools = isDevelopment && appState.userSettings.showDevTools;

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    setMonthlyBudgetLimit(String(appState.userSettings.monthlyBudgetLimit));
    setGachaCost(String(appState.userSettings.gachaCost));
    setSelectedDays(appState.userSettings.gachaOpenDays);
    setShowDevTools(appState.userSettings.showDevTools);
    setEnablePity(appState.userSettings.enablePity);
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

    if (!parsedRewardDraft.ok) {
      return parsedRewardDraft.message;
    }

    return null;
  }, [
    gachaCost,
    gachaCostNumber,
    monthlyBudgetLimit,
    monthlyBudgetNumber,
    parsedRewardDraft,
    selectedDays.length,
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
      showDevTools,
      enablePity,
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
        <div className="grid gap-4 md:grid-cols-4">
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
            value={appState.userSettings.enablePity ? "已开启" : "已关闭"}
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
            description="只在开发环境下生效。关闭后会隐藏加宝石和抽卡动画测试按钮。"
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
          description="当前仅用于提示，不会阻止抽卡奖励继续入账。"
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
          description="重置会清空当前浏览器中的本地状态。"
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
          </div>
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
