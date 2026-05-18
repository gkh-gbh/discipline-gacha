"use client";

import { useEffect, useState } from "react";

import { useAppState } from "@/components/app-state-provider";
import { FloatingNotice, SectionCard, StatCard, StatGrid, TaskPreviewList } from "@/components/ui";
import { getDashboardStats } from "@/lib/app-state";
import { getGachaPoolStatus } from "@/lib/date";
import { taskTypeMeta } from "@/lib/task-types";

export default function HomePage() {
  const { appState, isHydrated, completeTask } = useAppState();
  const stats = getDashboardStats(appState);
  const [notice, setNotice] = useState<{
    title: string;
    body: string;
  } | null>(null);

  const poolStatus = isHydrated
    ? getGachaPoolStatus({
        openDays: appState.userSettings.gachaOpenDays,
      })
    : {
        isOpen: false,
        label: "读取中",
        helperText: "正在同步本地状态。",
      };

  useEffect(() => {
    if (!notice) {
      return;
    }

    const timer = window.setTimeout(() => setNotice(null), 2600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  function handleComplete(taskId: string) {
    const task = appState.tasks.find((item) => item.id === taskId && item.status === "active");

    if (!task) {
      return;
    }

    const prevCount = task.weeklyCompletedCount || 0;
    const nextState = completeTask(taskId);

    if (task.type === "series" && task.weeklyTarget) {
      const updatedTask = nextState.tasks.find((item) => item.id === taskId) ?? task;
      const newCount = updatedTask.weeklyCompletedCount || 0;
      const targetReached = newCount >= task.weeklyTarget && prevCount < task.weeklyTarget;
      const bonusText = targetReached
        ? ` 周目标达成！额外 +${task.weeklyBonusGems || 0} 宝石 / +${task.weeklyBonusDust || 0} 星尘。`
        : "";
      setNotice({
        title: targetReached ? "周目标达成！" : "任务完成",
        body: `${task.title} 本周第 ${newCount}/${task.weeklyTarget} 次，获得 +${task.rewardGems} 宝石 / +${task.rewardDust} 星尘。${bonusText}`,
      });
    } else {
      setNotice({
        title: "任务完成",
        body: `${task.title} 已结算，获得 +${task.rewardGems} 宝石 / +${task.rewardDust} 星尘。`,
      });
    }
  }

  return (
    <div className="space-y-6">
      {notice ? (
        <FloatingNotice
          title={notice.title}
          body={notice.body}
          onClose={() => setNotice(null)}
        />
      ) : null}

      <SectionCard eyebrow="Dashboard" title="执行面板">
        <StatGrid className="lg:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="当前宝石"
            value={`${stats.currentGems}`}
            hint="完成任务后即时增加"
            tone="teal"
          />
          <StatCard
            title="当前星尘"
            value={`${stats.currentDust}`}
            hint="和任务奖励同步结算"
            tone="gold"
          />
          <StatCard
            title="快乐预算"
            value={`¥${stats.rewardBalance}`}
            hint="抽卡奖励会进入这里"
            tone="coral"
          />
          <StatCard
            title="卡池状态"
            value={poolStatus.label}
            hint={poolStatus.helperText}
            tone="stone"
          />
        </StatGrid>
      </SectionCard>

      <SectionCard eyebrow={taskTypeMeta.daily.eyebrow} title={taskTypeMeta.daily.label}>
        <TaskPreviewList
          title="今日每日任务"
          subtitle="首页可以直接完成今天自动发布的每日任务。"
          items={stats.todayDailyTasks}
          emptyMessage="今天没有每日任务。可以去任务页添加每日任务模板。"
          onComplete={handleComplete}
        />
      </SectionCard>

      <SectionCard eyebrow={taskTypeMeta.series.eyebrow} title={taskTypeMeta.series.label}>
        <TaskPreviewList
          title="系列任务"
          subtitle="系列任务会显示分类标签，方便区分长期坚持的方向。"
          items={stats.seriesTasks}
          emptyMessage="还没有系列任务。可以去任务页添加想长期坚持的事情。"
          onComplete={handleComplete}
        />
      </SectionCard>

      <SectionCard eyebrow={taskTypeMeta.main.eyebrow} title={taskTypeMeta.main.label}>
        <TaskPreviewList
          title="主线任务"
          subtitle="把当前最重要的课程、项目或目标放在这里执行。"
          items={stats.mainTasks}
          emptyMessage="还没有主线任务。可以去任务页添加课程、项目或重要目标。"
          onComplete={handleComplete}
        />
      </SectionCard>
    </div>
  );
}
