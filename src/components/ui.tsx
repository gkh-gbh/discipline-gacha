import { CheckCircle2, CircleDashed, Clock3, Gem, Sparkles, Wallet } from "lucide-react";

import { difficultyMeta } from "@/lib/task-rewards";
import { getSeriesTaskCategoryLabel } from "@/lib/task-types";
import type { Task } from "@/types/domain";

export function SectionCard(props: {
  eyebrow?: string;
  title: string;
  description?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`paper-card p-5 sm:p-6 ${props.className ?? ""}`}>
      {props.eyebrow ? (
        <p className="text-xs font-semibold uppercase tracking-[0.26em] text-teal-700">
          {props.eyebrow}
        </p>
      ) : null}
      <div className="mt-2 flex items-start justify-between gap-4">
        <div>
          <h2 className="section-title text-2xl font-semibold">{props.title}</h2>
          {props.description ? <p className="muted mt-1 text-sm">{props.description}</p> : null}
        </div>
      </div>
      <div className="mt-5">{props.children}</div>
    </section>
  );
}

export function StatGrid(props: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`grid gap-4 sm:grid-cols-2 xl:grid-cols-4 ${props.className ?? ""}`}>
      {props.children}
    </div>
  );
}

export function StatCard(props: {
  title: string;
  value: string;
  hint: string;
  tone?: "teal" | "gold" | "coral" | "stone";
}) {
  const iconMap = {
    teal: Gem,
    gold: Sparkles,
    coral: Wallet,
    stone: Clock3,
  };

  const toneMap = {
    teal: "from-teal-100 to-white text-teal-900",
    gold: "from-amber-100 to-white text-amber-900",
    coral: "from-orange-100 to-white text-orange-900",
    stone: "from-stone-100 to-white text-stone-800",
  };

  const tone = props.tone ?? "stone";
  const Icon = iconMap[tone];

  return (
    <div
      className={`value-ring rounded-[26px] border border-[var(--line)] bg-gradient-to-br p-5 ${toneMap[tone]}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium opacity-80">{props.title}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight">{props.value}</p>
        </div>
        <Icon className="mt-1 h-5 w-5 opacity-70" />
      </div>
      <p className="mt-4 text-sm opacity-75">{props.hint}</p>
    </div>
  );
}

export function FloatingNotice(props: {
  title: string;
  body: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-x-3 top-4 z-[70] mx-auto max-w-md rounded-[24px] border border-teal-200 bg-[var(--card-strong)] px-4 py-4 shadow-[0_20px_50px_rgba(15,118,110,0.18)] backdrop-blur sm:inset-x-auto sm:right-6 sm:top-6 sm:w-[360px]">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-teal-700" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-[var(--text)]">{props.title}</p>
          <p className="muted mt-1 text-sm leading-6">{props.body}</p>
        </div>
        <button
          type="button"
          onClick={props.onClose}
          className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-700"
        >
          关闭
        </button>
      </div>
    </div>
  );
}

export function LightModal(props: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  confirmLabel?: string;
  onClose: () => void;
}) {
  if (!props.open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-stone-950/30 p-3 sm:items-center sm:p-6">
      <div className="w-full max-w-md rounded-[28px] border border-[var(--line)] bg-[var(--card-strong)] p-5 shadow-[0_24px_60px_rgba(47,36,23,0.22)]">
        <p className="text-xs font-semibold uppercase tracking-[0.26em] text-teal-700">Result</p>
        <h3 className="section-title mt-3 text-3xl font-semibold">{props.title}</h3>
        <div className="mt-4">{props.children}</div>
        <button
          type="button"
          onClick={props.onClose}
          className="mt-6 w-full rounded-2xl bg-stone-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-stone-700"
        >
          {props.confirmLabel ?? "确认"}
        </button>
      </div>
    </div>
  );
}

function formatTaskTimestamp(value?: string) {
  if (!value) {
    return null;
  }

  return value.replace("T", " ").slice(0, 16);
}

export function TaskPreviewList(props: {
  title: string;
  subtitle: string;
  items: Task[];
  emptyMessage?: string;
  onComplete?: (taskId: string) => void;
}) {
  return (
    <div className="rounded-[24px] border border-[var(--line)] bg-white/65 p-4">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">{props.title}</h3>
          <p className="muted text-sm">{props.subtitle}</p>
        </div>
        <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-700">
          {props.items.length} 项
        </span>
      </div>

      <div className="space-y-3">
        {props.items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--card-strong)] px-4 py-6 text-sm leading-6 text-[var(--muted)]">
            {props.emptyMessage ?? "还没有任务，先从一个最小动作开始。"}
          </div>
        ) : null}

        {props.items.map((item) => {
          const difficulty = difficultyMeta[item.difficulty];
          const isCompleted = item.status === "completed";
          const isWeeklyTargetReached = item.type === "series" && item.weeklyTarget
            && (item.weeklyCompletedCount || 0) >= item.weeklyTarget;
          const remainingSeriesCount = item.type === "series" && item.weeklyTarget
            ? Math.max(item.weeklyTarget - (item.weeklyCompletedCount || 0), 0)
            : null;
          const showCheckIcon = isCompleted || isWeeklyTargetReached;

          return (
            <div
              key={item.id}
              className="rounded-2xl border border-[var(--line)] bg-[var(--card-strong)] px-4 py-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  {showCheckIcon ? (
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-teal-700" />
                  ) : remainingSeriesCount !== null ? (
                    <span
                      aria-label={`剩余 ${remainingSeriesCount} 次`}
                      className="mt-0.5 flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full border border-amber-200 bg-amber-50 px-1.5 text-xs font-semibold text-amber-800"
                    >
                      {remainingSeriesCount}
                    </span>
                  ) : (
                    <CircleDashed className="mt-0.5 h-5 w-5 shrink-0 text-stone-400" />
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-medium">{item.title}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${difficulty.tone}`}
                      >
                        {difficulty.label}
                      </span>
                      <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-700">
                        +{item.rewardGems} 宝石 / +{item.rewardDust} 积分
                      </span>
                      {item.type === "series" ? (
                        <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-medium text-sky-800">
                          {getSeriesTaskCategoryLabel(item.category)}
                        </span>
                      ) : null}
                      {item.type === "series" && item.weeklyTarget ? (
                        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
                          本周 {item.weeklyCompletedCount || 0}/{item.weeklyTarget}
                        </span>
                      ) : null}
                      {item.date ? (
                        <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-700">
                          {item.date}
                        </span>
                      ) : null}
                    </div>
                    <p className="muted mt-2 text-xs">
                      {isCompleted
                        ? `完成时间 ${formatTaskTimestamp(item.completedAt) ?? "-"}`
                        : isWeeklyTargetReached
                          ? "周目标已达成，可继续完成"
                          : `创建时间 ${formatTaskTimestamp(item.createdAt) ?? "-"}`}
                    </p>
                  </div>
                </div>

                {props.onComplete && !isCompleted ? (
                  <button
                    type="button"
                    onClick={() => props.onComplete?.(item.id)}
                    className="shrink-0 rounded-full bg-stone-900 px-4 py-2 text-xs font-medium text-white transition hover:bg-stone-700"
                  >
                    完成
                  </button>
                ) : (
                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                      isCompleted
                        ? "bg-teal-100 text-teal-800"
                        : "bg-stone-100 text-stone-600"
                    }`}
                  >
                    {isCompleted ? "已完成" : "进行中"}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function PlaceholderNote(props: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[24px] border border-dashed border-[var(--line)] bg-white/55 p-4">
      <p className="font-medium">{props.title}</p>
      <p className="muted mt-2 text-sm leading-6">{props.children}</p>
    </div>
  );
}
