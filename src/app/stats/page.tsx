"use client";

import { useAppState } from "@/components/app-state-provider";
import { SectionCard, StatCard, StatGrid } from "@/components/ui";
import { getStatsPageData } from "@/lib/app-state";

function formatWeekdayLabel(dateKey: string) {
  const date = new Date(`${dateKey}T12:00:00`);
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    weekday: "short",
  }).format(date);
}

export default function StatsPage() {
  const { appState, isHydrated } = useAppState();

  if (!isHydrated) {
    return (
      <div className="space-y-6">
        <SectionCard eyebrow="Stats" title="数据统计">
          <p className="muted text-sm">正在加载数据...</p>
        </SectionCard>
      </div>
    );
  }

  const stats = getStatsPageData(appState);

  return (
    <div className="space-y-6">
      <SectionCard eyebrow="Overview" title="总览">
        <StatGrid className="lg:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="今日已完成"
            value={`${stats.todayCompleted}`}
            hint="今天完成的任务数"
            tone="teal"
          />
          <StatCard
            title="累计完成"
            value={`${stats.totalCompleted} / ${stats.totalTasks}`}
            hint="已完成 / 总任务数"
            tone="gold"
          />
          <StatCard
            title="快乐预算余额"
            value={`¥${appState.wallet.rewardBalance}`}
            hint="当前可用金额"
            tone="coral"
          />
          <StatCard
            title="本月已解锁"
            value={`¥${appState.wallet.monthlyUnlockedAmount}`}
            hint="本月抽卡+兑换解锁"
            tone="stone"
          />
        </StatGrid>
      </SectionCard>

      <SectionCard eyebrow="Weekly" title="本周数据">
        <StatGrid className="lg:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="本周获得宝石"
            value={`${stats.weekGems}`}
            hint="本周所有来源的宝石"
            tone="teal"
          />
          <StatCard
            title="本周获得积分"
            value={`${stats.weekDust}`}
            hint="本周所有来源的积分"
            tone="gold"
          />
          <StatCard
            title="本周抽卡次数"
            value={`${stats.weekPulls}`}
            hint="本周已完成的抽卡"
            tone="coral"
          />
          <StatCard
            title="当前宝石"
            value={`${appState.wallet.gems}`}
            hint="可用于抽卡"
            tone="stone"
          />
        </StatGrid>
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard eyebrow="Series" title="系列任务周进度">
          {stats.seriesProgress.length === 0 ? (
            <p className="muted text-sm">还没有进行中的系列任务。</p>
          ) : (
            <div className="space-y-3">
              {stats.seriesProgress.map((item) => (
                <div
                  key={item.title}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--line)] bg-[var(--card-strong)] px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{item.title}</p>
                    <p className="muted mt-1 text-xs">
                      {item.completed} / {item.target} 次
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-24 overflow-hidden rounded-full bg-stone-200">
                      <div
                        className={`h-full rounded-full transition-all ${
                          item.reached ? "bg-teal-500" : "bg-amber-400"
                        }`}
                        style={{
                          width: `${Math.min((item.completed / item.target) * 100, 100)}%`,
                        }}
                      />
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        item.reached
                          ? "bg-teal-100 text-teal-800"
                          : "bg-stone-100 text-stone-600"
                      }`}
                    >
                      {item.reached ? "达成" : `${Math.round((item.completed / item.target) * 100)}%`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard eyebrow="Main" title="主线任务进度">
          <div className="mb-4 grid gap-4 sm:grid-cols-2">
            <StatCard
              title="已完成/归档"
              value={`${stats.mainCompleted}`}
              hint="归档主线也计入完成"
              tone="teal"
            />
            <StatCard
              title="总数"
              value={`${stats.mainTotal}`}
              hint="个主线任务（含已完成和归档）"
              tone="stone"
            />
          </div>
          {stats.mainTotal > 0 ? (
            <div className="rounded-2xl border border-[var(--line)] bg-[var(--card-strong)] px-4 py-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-stone-600">完成率</span>
                <span className="font-medium">
                  {Math.round((stats.mainCompleted / stats.mainTotal) * 100)}%
                </span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-stone-200">
                <div
                  className="h-full rounded-full bg-teal-500 transition-all"
                  style={{
                    width: `${Math.round((stats.mainCompleted / stats.mainTotal) * 100)}%`,
                  }}
                />
              </div>
            </div>
          ) : null}
        </SectionCard>
      </div>

      <SectionCard
        eyebrow="Week Tasks"
        title="本周每日任务情况"
        description="显示每天完成的系列/主线任务；每日任务只显示未完成项。"
      >
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-7">
          {stats.weeklyTaskBreakdown.map((day) => (
            <div
              key={day.dateKey}
              className="rounded-[22px] border border-[var(--line)] bg-[var(--card-strong)] px-4 py-4"
            >
              <p className="text-sm font-semibold text-stone-800">
                {formatWeekdayLabel(day.dateKey)}
              </p>
              <div className="mt-3 space-y-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-teal-700">
                    完成
                  </p>
                  <div className="mt-2 space-y-2">
                    {day.completedItems.length === 0 ? (
                      <p className="text-xs text-stone-400">无系列/主线完成</p>
                    ) : null}
                    {day.completedItems.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-2xl bg-white/70 px-3 py-2 text-xs text-stone-700"
                      >
                        <span className="font-medium text-stone-900">{item.title}</span>
                        <span className="ml-2 rounded-full bg-teal-100 px-2 py-0.5 text-[11px] text-teal-800">
                          {item.type === "series" ? "系列" : "主线"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-rose-700">
                    未完成每日
                  </p>
                  <div className="mt-2 space-y-2">
                    {day.unfinishedDailyTasks.length === 0 ? (
                      <p className="text-xs text-stone-400">无未完成每日任务</p>
                    ) : null}
                    {day.unfinishedDailyTasks.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700"
                      >
                        {item.title}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard eyebrow="Wallet" title="钱包汇总">
        <StatGrid className="lg:grid-cols-2 xl:grid-cols-3">
          <StatCard
            title="累计解锁"
            value={`¥${stats.totalUnlocked}`}
            hint="本月抽卡+兑换解锁总额"
            tone="gold"
          />
          <StatCard
            title="累计消费"
            value={`¥${stats.totalSpent}`}
            hint="所有消费记录总和"
            tone="coral"
          />
          <StatCard
            title="当前余额"
            value={`¥${appState.wallet.rewardBalance}`}
            hint="解锁 - 消费"
            tone="teal"
          />
        </StatGrid>
      </SectionCard>
    </div>
  );
}
