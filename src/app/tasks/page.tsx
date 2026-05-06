"use client";

import { useEffect, useMemo, useState } from "react";

import { useAppState } from "@/components/app-state-provider";
import { FloatingNotice, PlaceholderNote, SectionCard, TaskPreviewList } from "@/components/ui";
import {
  getArchivedTasksByType,
  getCompletedTasksByType,
  getSeriesTaskGroups,
  getTodayDailyTasks,
} from "@/lib/app-state";
import {
  difficultyMeta,
  getRewardPreviewLabel,
  getTaskRewardSettingsFromUserSettings,
} from "@/lib/task-rewards";
import {
  DEFAULT_SERIES_TASK_CATEGORY,
  getSeriesTaskCategoryLabel,
  SERIES_TASK_CATEGORY_OPTIONS,
  taskTypeMeta,
} from "@/lib/task-types";
import type {
  DailyTaskTemplate,
  DailyTaskTemplateCreateInput,
  DailyTaskTemplateUpdateInput,
  Task,
  TaskCreateInput,
  TaskDifficulty,
  TaskUpdateInput,
} from "@/types/domain";

type ManualDraftState = {
  series: {
    title: string;
    difficulty: TaskDifficulty;
    category: string;
    weeklyTarget: number;
  };
  main: {
    title: string;
    difficulty: TaskDifficulty;
  };
};

type EditingTaskDraft = {
  title: string;
  difficulty: TaskDifficulty;
  category?: string;
};

const DEFAULT_MANUAL_DRAFTS: ManualDraftState = {
  series: { title: "", difficulty: "medium", category: DEFAULT_SERIES_TASK_CATEGORY, weeklyTarget: 3 },
  main: { title: "", difficulty: "hard" },
};

export default function TasksPage() {
  const {
    appState,
    addTask,
    addDailyTaskTemplate,
    updateDailyTaskTemplate,
    toggleDailyTaskTemplate,
    deleteDailyTaskTemplate,
    updateTask,
    archiveTask,
    restoreTask,
    deleteTask,
    completeTask,
  } = useAppState();

  const [dailyTemplateTitle, setDailyTemplateTitle] = useState("");
  const [dailyTemplateDifficulty, setDailyTemplateDifficulty] = useState<TaskDifficulty>("simple");
  const [manualDrafts, setManualDrafts] = useState<ManualDraftState>(DEFAULT_MANUAL_DRAFTS);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [editingTemplateDraft, setEditingTemplateDraft] =
    useState<DailyTaskTemplateUpdateInput | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskDraft, setEditingTaskDraft] = useState<EditingTaskDraft | null>(null);
  const [showArchivedTasks, setShowArchivedTasks] = useState(false);
  const [notice, setNotice] = useState<{
    title: string;
    body: string;
  } | null>(null);

  const rewardSettings = getTaskRewardSettingsFromUserSettings(appState.userSettings);
  const todayDailyTasks = getTodayDailyTasks(appState);
  const todayDailyActiveTasks = todayDailyTasks.filter((task) => task.status === "active");
  const todayDailyCompletedTasks = todayDailyTasks.filter((task) => task.status === "completed");
  const allDailyTemplates = appState.dailyTaskTemplates;
  const seriesTaskGroups = getSeriesTaskGroups(appState);
  const archivedSeriesTasks = getArchivedTasksByType(appState, "series");
  const mainActiveTasks = appState.tasks.filter(
    (task) => task.type === "main" && task.status === "active",
  );
  const mainCompletedTasks = getCompletedTasksByType(appState, "main");
  const mainArchivedTasks = getArchivedTasksByType(appState, "main");
  const archivedTaskCount = archivedSeriesTasks.length + mainArchivedTasks.length;

  useEffect(() => {
    if (!notice) {
      return;
    }

    const timer = window.setTimeout(() => setNotice(null), 2600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const dailyRewardLabel = getRewardPreviewLabel(dailyTemplateDifficulty, rewardSettings);
  const seriesRewardLabel = getRewardPreviewLabel(manualDrafts.series.difficulty, rewardSettings);
  const mainRewardLabel = getRewardPreviewLabel(manualDrafts.main.difficulty, rewardSettings);

  const editingRewardLabel = useMemo(() => {
    if (!editingTaskDraft) {
      return null;
    }

    return getRewardPreviewLabel(editingTaskDraft.difficulty, rewardSettings);
  }, [editingTaskDraft, rewardSettings]);

  function pushNotice(title: string, body: string) {
    setNotice({ title, body });
  }

  function handleDailyTemplateSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const input: DailyTaskTemplateCreateInput = {
      title: dailyTemplateTitle.trim(),
      difficulty: dailyTemplateDifficulty,
    };

    if (!input.title) {
      return;
    }

    addDailyTaskTemplate(input);
    setDailyTemplateTitle("");
    setDailyTemplateDifficulty("simple");
    pushNotice("模板已创建", `${input.title} 会参与后续每日任务自动发布。`);
  }

  function updateSeriesDraft(patch: Partial<ManualDraftState["series"]>) {
    setManualDrafts((current) => ({
      ...current,
      series: {
        ...current.series,
        ...patch,
      },
    }));
  }

  function handleWeeklyTargetChange(value: string) {
    const num = parseInt(value, 10);
    if (Number.isFinite(num) && num >= 1 && num <= 7) {
      updateSeriesDraft({ weeklyTarget: num });
    }
  }

  function updateMainDraft(patch: Partial<ManualDraftState["main"]>) {
    setManualDrafts((current) => ({
      ...current,
      main: {
        ...current.main,
        ...patch,
      },
    }));
  }

  function handleSeriesTaskSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const draft = manualDrafts.series;
    const input: TaskCreateInput = {
      title: draft.title.trim(),
      difficulty: draft.difficulty,
      type: "series",
      category: draft.category,
      weeklyTarget: draft.weeklyTarget,
    };

    if (!input.title) {
      return;
    }

    addTask(input);
    updateSeriesDraft({ title: "", category: DEFAULT_SERIES_TASK_CATEGORY });
    pushNotice("系列任务已创建", `${input.title} 已加入 ${input.category}，每周目标 ${input.weeklyTarget} 次。`);
  }

  function handleMainTaskSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const draft = manualDrafts.main;
    const input: TaskCreateInput = {
      title: draft.title.trim(),
      difficulty: draft.difficulty,
      type: "main",
    };

    if (!input.title) {
      return;
    }

    addTask(input);
    updateMainDraft({ title: "" });
    pushNotice("主线任务已创建", `${input.title} 已加入主线任务。`);
  }

  function handleComplete(taskId: string) {
    const task = appState.tasks.find((item) => item.id === taskId && item.status === "active");

    if (!task) {
      return;
    }

    const prevCount = task.weeklyCompletedCount || 0;
    completeTask(taskId);

    if (task.type === "series" && task.weeklyTarget) {
      const newCount = prevCount + 1;
      const targetReached = newCount >= task.weeklyTarget && prevCount < task.weeklyTarget;
      const bonusText = targetReached
        ? ` 周目标达成！额外 +${task.weeklyBonusGems || 0} 宝石 / +${task.weeklyBonusDust || 0} 星尘。`
        : "";
      pushNotice(
        targetReached ? "周目标达成！" : "任务完成",
        `${task.title} 本周第 ${newCount}/${task.weeklyTarget} 次，获得 +${task.rewardGems} 宝石 / +${task.rewardDust} 星尘。${bonusText}`,
      );
    } else {
      pushNotice(
        "任务完成",
        `${task.title} 已结算，获得 +${task.rewardGems} 宝石 / +${task.rewardDust} 星尘。`,
      );
    }
  }

  function startTemplateEdit(template: DailyTaskTemplate) {
    setEditingTemplateId(template.id);
    setEditingTemplateDraft({
      title: template.title,
      difficulty: template.difficulty,
    });
  }

  function cancelTemplateEdit() {
    setEditingTemplateId(null);
    setEditingTemplateDraft(null);
  }

  function saveTemplateEdit(templateId: string) {
    if (!editingTemplateDraft?.title.trim()) {
      return;
    }

    updateDailyTaskTemplate(templateId, {
      title: editingTemplateDraft.title.trim(),
      difficulty: editingTemplateDraft.difficulty,
    });
    cancelTemplateEdit();
    pushNotice("模板已更新", "修改后的模板只会影响之后生成的每日任务实例。");
  }

  function handleDeleteTemplate(template: DailyTaskTemplate) {
    const confirmed = window.confirm(`确认删除模板“${template.title}”吗？之后将不再自动生成新实例。`);

    if (!confirmed) {
      return;
    }

    deleteDailyTaskTemplate(template.id);
    if (editingTemplateId === template.id) {
      cancelTemplateEdit();
    }
    pushNotice("模板已删除", `${template.title} 不会再参与后续自动发布。`);
  }

  function startTaskEdit(task: Task) {
    setEditingTaskId(task.id);
    setEditingTaskDraft({
      title: task.title,
      difficulty: task.difficulty,
      category: task.type === "series" ? getSeriesTaskCategoryLabel(task.category) : undefined,
    });
  }

  function cancelTaskEdit() {
    setEditingTaskId(null);
    setEditingTaskDraft(null);
  }

  function saveTaskEdit(task: Task) {
    if (!editingTaskDraft?.title.trim()) {
      return;
    }

    const input: TaskUpdateInput = {
      title: editingTaskDraft.title.trim(),
      difficulty: editingTaskDraft.difficulty,
      category: task.type === "series" ? editingTaskDraft.category : undefined,
    };

    updateTask(task.id, input);
    cancelTaskEdit();
    pushNotice("任务已更新", task.status === "active" ? "未完成任务的奖励已同步更新。" : "已完成任务保留原奖励，不会重复结算。");
  }

  function handleArchiveTask(task: Task) {
    archiveTask(task.id);
    if (editingTaskId === task.id) {
      cancelTaskEdit();
    }
    pushNotice("任务已归档", `${task.title} 已从首页执行面板移除。`);
  }

  function handleDeleteTask(task: Task) {
    const confirmed = window.confirm(`确认删除任务“${task.title}”吗？删除后不会出现在当前任务列表。`);

    if (!confirmed) {
      return;
    }

    deleteTask(task.id);
    if (editingTaskId === task.id) {
      cancelTaskEdit();
    }
    pushNotice("任务已删除", `${task.title} 已从任务列表移除。`);
  }

  function handleRestoreTask(task: Task) {
    restoreTask(task.id);
    if (editingTaskId === task.id) {
      cancelTaskEdit();
    }
    pushNotice("任务已恢复", `${task.title} 已回到当前任务列表。`);
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

      <SectionCard
        eyebrow="Daily Templates"
        title="每日任务模板"
        description="任务页负责维护模板：编辑、停用、删除都只影响之后自动发布的每日任务，不会改写已经生成的实例。"
      >
        <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
          <form
            onSubmit={handleDailyTemplateSubmit}
            className="rounded-[24px] border border-[var(--line)] bg-white/70 p-4 sm:p-5"
          >
            <div className="mb-4">
              <h3 className="text-lg font-semibold">新增每日任务模板</h3>
              <p className="muted mt-1 text-sm">表单仍然只保留任务名和难度。</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-[1fr_220px_auto]">
              <input
                value={dailyTemplateTitle}
                onChange={(event) => setDailyTemplateTitle(event.target.value)}
                placeholder="例如：喝一杯水"
                className="rounded-2xl border border-[var(--line)] bg-[var(--card-strong)] px-4 py-3 outline-none ring-0"
              />
              <select
                value={dailyTemplateDifficulty}
                onChange={(event) =>
                  setDailyTemplateDifficulty(event.target.value as TaskDifficulty)
                }
                className="rounded-2xl border border-[var(--line)] bg-[var(--card-strong)] px-4 py-3 outline-none"
              >
                {(Object.keys(difficultyMeta) as TaskDifficulty[]).map((difficulty) => (
                  <option key={difficulty} value={difficulty}>
                    {difficultyMeta[difficulty].label}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                disabled={!dailyTemplateTitle.trim()}
                className="rounded-2xl bg-stone-900 px-5 py-3 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-50"
              >
                添加模板
              </button>
            </div>

            <div className="mt-4 rounded-[22px] bg-white/65 px-4 py-4 text-sm text-stone-700">
              <p className="font-medium">
                当前选择：{difficultyMeta[dailyTemplateDifficulty].label}
              </p>
              <p className="muted mt-1">奖励：{dailyRewardLabel}</p>
            </div>
          </form>

          <div className="rounded-[24px] border border-[var(--line)] bg-white/70 p-4 sm:p-5">
            <div className="mb-4">
              <h3 className="text-lg font-semibold">模板列表</h3>
              <p className="muted mt-1 text-sm">停用和删除都不会影响今天已经生成的实例。</p>
            </div>

            <div className="space-y-3">
              {allDailyTemplates.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--card-strong)] px-4 py-6 text-sm leading-6 text-[var(--muted)]">
                  还没有每日任务模板。先加一个最小模板，今天的实例就会自动出现。
                </div>
              ) : null}

              {allDailyTemplates.map((template) => {
                const isEditing = editingTemplateId === template.id && editingTemplateDraft !== null;

                return (
                  <div
                    key={template.id}
                    className="rounded-2xl border border-[var(--line)] bg-[var(--card-strong)] px-4 py-4"
                  >
                    {isEditing ? (
                      <div className="space-y-3">
                        <input
                          value={editingTemplateDraft.title}
                          onChange={(event) =>
                            setEditingTemplateDraft((current) =>
                              current
                                ? {
                                    ...current,
                                    title: event.target.value,
                                  }
                                : current,
                            )
                          }
                          className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3 outline-none"
                        />
                        <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
                          <select
                            value={editingTemplateDraft.difficulty}
                            onChange={(event) =>
                              setEditingTemplateDraft((current) =>
                                current
                                  ? {
                                      ...current,
                                      difficulty: event.target.value as TaskDifficulty,
                                    }
                                  : current,
                              )
                            }
                            className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3 outline-none"
                          >
                            {(Object.keys(difficultyMeta) as TaskDifficulty[]).map((difficulty) => (
                              <option key={difficulty} value={difficulty}>
                                {difficultyMeta[difficulty].label}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => saveTemplateEdit(template.id)}
                            className="rounded-2xl bg-stone-900 px-4 py-3 text-sm font-medium text-white"
                          >
                            保存
                          </button>
                          <button
                            type="button"
                            onClick={cancelTemplateEdit}
                            className="rounded-2xl border border-[var(--line)] px-4 py-3 text-sm font-medium text-stone-700"
                          >
                            取消
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium">{template.title}</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-medium ${difficultyMeta[template.difficulty].tone}`}
                            >
                              {difficultyMeta[template.difficulty].label}
                            </span>
                            <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-700">
                              +{template.rewardGems} 宝石 / +{template.rewardDust} 星尘
                            </span>
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-medium ${
                                template.isActive
                                  ? "bg-teal-100 text-teal-800"
                                  : "bg-stone-100 text-stone-700"
                              }`}
                            >
                              {template.isActive ? "启用中" : "已停用"}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => startTemplateEdit(template)}
                            className="rounded-full border border-[var(--line)] px-3 py-1 text-xs font-medium text-stone-700"
                          >
                            编辑
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleDailyTaskTemplate(template.id)}
                            className="rounded-full border border-[var(--line)] px-3 py-1 text-xs font-medium text-stone-700"
                          >
                            {template.isActive ? "停用" : "启用"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteTemplate(template)}
                            className="rounded-full border border-rose-200 px-3 py-1 text-xs font-medium text-rose-700"
                          >
                            删除
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        eyebrow={taskTypeMeta.daily.eyebrow}
        title="今天自动发布的每日任务"
        description={`当前有 ${allDailyTemplates.filter((template) => template.isActive).length} 个启用模板，今天已发布 ${todayDailyTasks.length} 条每日任务实例。`}
      >
        <div className="grid gap-6 xl:grid-cols-2">
          <TaskPreviewList
            title="每日任务 · 进行中"
            subtitle="日常执行仍然可以在这里完成，但维护入口只保留在模板列表。"
            items={todayDailyActiveTasks}
            emptyMessage={taskTypeMeta.daily.activeEmptyMessage}
            onComplete={handleComplete}
          />
          <TaskPreviewList
            title="每日任务 · 已完成"
            subtitle="已生成的实例会保留，不因为模板停用或删除而消失。"
            items={todayDailyCompletedTasks}
            emptyMessage={taskTypeMeta.daily.completedEmptyMessage}
          />
        </div>
      </SectionCard>

      <SectionCard
        eyebrow={taskTypeMeta.series.eyebrow}
        title={taskTypeMeta.series.label}
        description="系列任务支持编辑标题、难度、分类，也可以归档或删除。"
      >
        <TaskComposer
          title={manualDrafts.series.title}
          difficulty={manualDrafts.series.difficulty}
          rewardLabel={seriesRewardLabel}
          onTitleChange={(value) => updateSeriesDraft({ title: value })}
          onDifficultyChange={(value) => updateSeriesDraft({ difficulty: value })}
          placeholder="例如：整理房间"
          onSubmit={handleSeriesTaskSubmit}
          actionLabel="添加系列任务"
          category={manualDrafts.series.category}
          onCategoryChange={(value) => updateSeriesDraft({ category: value })}
          weeklyTarget={manualDrafts.series.weeklyTarget}
          onWeeklyTargetChange={handleWeeklyTargetChange}
        />

        <div className="mt-5 space-y-5">
          {seriesTaskGroups.length === 0 ? (
            <PlaceholderNote title="系列任务">
              还没有系列任务。可以先加一件想长期坚持的事情。
            </PlaceholderNote>
          ) : null}

          {seriesTaskGroups.map((group) => (
            <ManagedTaskList
              key={group.category}
              title={group.category}
              subtitle="同一分类下会同时显示进行中和已完成任务。"
              tasks={group.items}
              emptyMessage={taskTypeMeta.series.emptyMessage}
              editingTaskId={editingTaskId}
              editingTaskDraft={editingTaskDraft}
              editingRewardLabel={editingRewardLabel}
              onEditStart={startTaskEdit}
              onEditCancel={cancelTaskEdit}
              onEditDraftChange={setEditingTaskDraft}
              onEditSave={saveTaskEdit}
              onArchive={handleArchiveTask}
              onRestore={handleRestoreTask}
              onDelete={handleDeleteTask}
              onComplete={handleComplete}
            />
          ))}

        </div>
      </SectionCard>

      <SectionCard
        eyebrow={taskTypeMeta.main.eyebrow}
        title={taskTypeMeta.main.label}
        description="主线任务支持编辑标题和难度，也可以归档或删除。"
      >
        <TaskComposer
          title={manualDrafts.main.title}
          difficulty={manualDrafts.main.difficulty}
          rewardLabel={mainRewardLabel}
          onTitleChange={(value) => updateMainDraft({ title: value })}
          onDifficultyChange={(value) => updateMainDraft({ difficulty: value })}
          placeholder="例如：完成课程作业第一部分"
          onSubmit={handleMainTaskSubmit}
          actionLabel="添加主线任务"
        />

        <div className="mt-5 space-y-5">
          <ManagedTaskList
            title="主线任务 · 进行中"
            subtitle="未完成时修改难度会同步更新奖励。"
            tasks={mainActiveTasks}
            emptyMessage={taskTypeMeta.main.activeEmptyMessage}
            editingTaskId={editingTaskId}
            editingTaskDraft={editingTaskDraft}
            editingRewardLabel={editingRewardLabel}
            onEditStart={startTaskEdit}
            onEditCancel={cancelTaskEdit}
            onEditDraftChange={setEditingTaskDraft}
            onEditSave={saveTaskEdit}
            onArchive={handleArchiveTask}
            onRestore={handleRestoreTask}
            onDelete={handleDeleteTask}
            onComplete={handleComplete}
          />

          <ManagedTaskList
            title="主线任务 · 已完成"
            subtitle="已完成任务可以改标题，但不会重新结算奖励。"
            tasks={mainCompletedTasks}
            emptyMessage={taskTypeMeta.main.completedEmptyMessage}
            editingTaskId={editingTaskId}
            editingTaskDraft={editingTaskDraft}
            editingRewardLabel={editingRewardLabel}
            onEditStart={startTaskEdit}
            onEditCancel={cancelTaskEdit}
            onEditDraftChange={setEditingTaskDraft}
            onEditSave={saveTaskEdit}
            onArchive={handleArchiveTask}
            onRestore={handleRestoreTask}
            onDelete={handleDeleteTask}
            onComplete={handleComplete}
          />

        </div>
      </SectionCard>

      <SectionCard
        eyebrow="Archived"
        title="已归档任务"
        description="默认收起，避免归档任务占据主要空间。需要时再展开恢复或删除。"
      >
        <button
          type="button"
          onClick={() => setShowArchivedTasks((current) => !current)}
          className="flex w-full items-center justify-between rounded-[22px] border border-[var(--line)] bg-white/70 px-4 py-4 text-left"
        >
          <div>
            <p className="font-medium">已归档任务（{archivedTaskCount}）</p>
            <p className="muted mt-1 text-sm">
              {showArchivedTasks ? "点击收起归档列表。" : "点击展开归档的系列任务和主线任务。"}
            </p>
          </div>
          <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-700">
            {showArchivedTasks ? "收起" : "展开"}
          </span>
        </button>

        {showArchivedTasks ? (
          <div className="mt-5 space-y-5">
            {archivedTaskCount === 0 ? (
              <PlaceholderNote title="已归档任务">
                当前没有已归档任务。
              </PlaceholderNote>
            ) : null}

            {archivedSeriesTasks.length > 0 ? (
              <ManagedTaskList
                title="已归档的系列任务"
                subtitle="可以恢复到当前任务列表，或直接删除。"
                tasks={archivedSeriesTasks}
                emptyMessage="暂无已归档系列任务。"
                editingTaskId={editingTaskId}
                editingTaskDraft={editingTaskDraft}
                editingRewardLabel={editingRewardLabel}
                onEditStart={startTaskEdit}
                onEditCancel={cancelTaskEdit}
                onEditDraftChange={setEditingTaskDraft}
                onEditSave={saveTaskEdit}
                onArchive={handleArchiveTask}
                onRestore={handleRestoreTask}
                onDelete={handleDeleteTask}
                onComplete={handleComplete}
              />
            ) : null}

            {mainArchivedTasks.length > 0 ? (
              <ManagedTaskList
                title="已归档的主线任务"
                subtitle="恢复后会重新出现在首页执行面板。"
                tasks={mainArchivedTasks}
                emptyMessage="暂无已归档主线任务。"
                editingTaskId={editingTaskId}
                editingTaskDraft={editingTaskDraft}
                editingRewardLabel={editingRewardLabel}
                onEditStart={startTaskEdit}
                onEditCancel={cancelTaskEdit}
                onEditDraftChange={setEditingTaskDraft}
                onEditSave={saveTaskEdit}
                onArchive={handleArchiveTask}
                onRestore={handleRestoreTask}
                onDelete={handleDeleteTask}
                onComplete={handleComplete}
              />
            ) : null}
          </div>
        ) : null}
      </SectionCard>

      <PlaceholderNote title="这轮边界">
        这次只补任务维护能力，不做首页维护入口、复杂详情页、拖拽排序、多级分类或历史每日任务深度管理。
      </PlaceholderNote>
    </div>
  );
}

function TaskComposer(props: {
  title: string;
  difficulty: TaskDifficulty;
  rewardLabel: string;
  placeholder: string;
  actionLabel: string;
  onTitleChange: (value: string) => void;
  onDifficultyChange: (value: TaskDifficulty) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  category?: string;
  onCategoryChange?: (value: string) => void;
  weeklyTarget?: number;
  onWeeklyTargetChange?: (value: string) => void;
}) {
  return (
    <form
      onSubmit={props.onSubmit}
      className="rounded-[24px] border border-[var(--line)] bg-white/70 p-4 sm:p-5"
    >
      <div
        className={`grid gap-3 ${
          props.category && props.onCategoryChange
            ? "md:grid-cols-[1fr_180px_160px_auto]"
            : "sm:grid-cols-[1fr_200px_auto]"
        }`}
      >
        <input
          value={props.title}
          onChange={(event) => props.onTitleChange(event.target.value)}
          placeholder={props.placeholder}
          className="rounded-2xl border border-[var(--line)] bg-[var(--card-strong)] px-4 py-3 outline-none ring-0"
        />
        <select
          value={props.difficulty}
          onChange={(event) => props.onDifficultyChange(event.target.value as TaskDifficulty)}
          className="rounded-2xl border border-[var(--line)] bg-[var(--card-strong)] px-4 py-3 outline-none"
        >
          {(Object.keys(difficultyMeta) as TaskDifficulty[]).map((difficulty) => (
            <option key={difficulty} value={difficulty}>
              {difficultyMeta[difficulty].label}
            </option>
          ))}
        </select>
        {props.category && props.onCategoryChange ? (
          <select
            value={props.category}
            onChange={(event) => props.onCategoryChange?.(event.target.value)}
            className="rounded-2xl border border-[var(--line)] bg-[var(--card-strong)] px-4 py-3 outline-none"
          >
            {SERIES_TASK_CATEGORY_OPTIONS.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        ) : null}
        <button
          type="submit"
          disabled={!props.title.trim()}
          className="rounded-2xl bg-stone-900 px-5 py-3 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-50"
        >
          {props.actionLabel}
        </button>
      </div>

      {props.weeklyTarget !== undefined && props.onWeeklyTargetChange ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr]">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-stone-700">每周目标次数</span>
            <select
              value={props.weeklyTarget}
              onChange={(event) => props.onWeeklyTargetChange?.(event.target.value)}
              className="w-full rounded-2xl border border-[var(--line)] bg-[var(--card-strong)] px-4 py-3 outline-none"
            >
              {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                <option key={n} value={n}>
                  每周 {n} 次
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end">
            <div className="rounded-[22px] bg-white/65 px-4 py-3 text-sm text-stone-700">
              <p className="font-medium">阶段奖励</p>
              <p className="muted mt-1">达成目标后额外获得周奖励</p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mt-4 rounded-[22px] bg-white/65 px-4 py-4 text-sm text-stone-700">
        <p className="font-medium">
          当前选择：{difficultyMeta[props.difficulty].label}
          {props.category ? ` / ${props.category}` : ""}
          {props.weeklyTarget !== undefined ? ` / 每周 ${props.weeklyTarget} 次` : ""}
        </p>
        <p className="muted mt-1">奖励：{props.rewardLabel}</p>
      </div>
    </form>
  );
}

function ManagedTaskList(props: {
  title: string;
  subtitle: string;
  tasks: Task[];
  emptyMessage: string;
  editingTaskId: string | null;
  editingTaskDraft: EditingTaskDraft | null;
  editingRewardLabel: string | null;
  onEditStart: (task: Task) => void;
  onEditCancel: () => void;
  onEditDraftChange: React.Dispatch<React.SetStateAction<EditingTaskDraft | null>>;
  onEditSave: (task: Task) => void;
  onArchive: (task: Task) => void;
  onRestore: (task: Task) => void;
  onDelete: (task: Task) => void;
  onComplete: (taskId: string) => void;
}) {
  return (
    <div className="rounded-[24px] border border-[var(--line)] bg-white/65 p-4">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">{props.title}</h3>
          <p className="muted text-sm">{props.subtitle}</p>
        </div>
        <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-700">
          {props.tasks.length} 项
        </span>
      </div>

      <div className="space-y-3">
        {props.tasks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--card-strong)] px-4 py-6 text-sm leading-6 text-[var(--muted)]">
            {props.emptyMessage}
          </div>
        ) : null}

        {props.tasks.map((task) => {
          const isEditing = props.editingTaskId === task.id && props.editingTaskDraft !== null;
          const isCompleted = task.status === "completed";
          const isArchived = task.status === "archived";
          const draft = isEditing ? props.editingTaskDraft : null;

          return (
            <div
              key={task.id}
              className="rounded-2xl border border-[var(--line)] bg-[var(--card-strong)] px-4 py-4"
            >
              {draft ? (
                <div className="space-y-3">
                  <input
                    value={draft.title}
                    onChange={(event) =>
                      props.onEditDraftChange((current) =>
                        current
                          ? {
                              ...current,
                              title: event.target.value,
                            }
                          : current,
                      )
                    }
                    className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3 outline-none"
                  />

                  <div
                    className={`grid gap-3 ${
                      task.type === "series" ? "md:grid-cols-[1fr_160px_auto_auto]" : "sm:grid-cols-[1fr_auto_auto]"
                    }`}
                  >
                    <select
                      value={draft.difficulty}
                      onChange={(event) =>
                        props.onEditDraftChange((current) =>
                          current
                            ? {
                                ...current,
                                difficulty: event.target.value as TaskDifficulty,
                              }
                            : current,
                        )
                      }
                      disabled={isCompleted}
                      className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3 outline-none disabled:bg-stone-100 disabled:text-stone-500"
                    >
                      {(Object.keys(difficultyMeta) as TaskDifficulty[]).map((difficulty) => (
                        <option key={difficulty} value={difficulty}>
                          {difficultyMeta[difficulty].label}
                        </option>
                      ))}
                    </select>

                    {task.type === "series" ? (
                      <select
                        value={draft.category ?? DEFAULT_SERIES_TASK_CATEGORY}
                        onChange={(event) =>
                          props.onEditDraftChange((current) =>
                            current
                              ? {
                                  ...current,
                                  category: event.target.value,
                                }
                              : current,
                          )
                        }
                        className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3 outline-none"
                      >
                        {SERIES_TASK_CATEGORY_OPTIONS.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => props.onEditSave(task)}
                      className="rounded-2xl bg-stone-900 px-4 py-3 text-sm font-medium text-white"
                    >
                      保存
                    </button>
                    <button
                      type="button"
                      onClick={props.onEditCancel}
                      className="rounded-2xl border border-[var(--line)] px-4 py-3 text-sm font-medium text-stone-700"
                    >
                      取消
                    </button>
                  </div>

                  <p className="text-xs text-stone-500">
                    {isCompleted
                      ? "已完成任务保留原奖励，不会重复发放。"
                      : `保存后会更新当前奖励：${props.editingRewardLabel ?? "-"}`}
                  </p>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">{task.title}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${difficultyMeta[task.difficulty].tone}`}
                      >
                        {difficultyMeta[task.difficulty].label}
                      </span>
                      {task.type === "series" ? (
                        <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-medium text-sky-800">
                          {getSeriesTaskCategoryLabel(task.category)}
                        </span>
                      ) : null}
                      <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-700">
                        +{task.rewardGems} 宝石 / +{task.rewardDust} 星尘
                      </span>
                      {task.type === "series" && task.weeklyTarget ? (
                        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
                          本周 {task.weeklyCompletedCount || 0}/{task.weeklyTarget}
                        </span>
                      ) : null}
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          isArchived
                            ? "bg-stone-200 text-stone-700"
                            : isCompleted
                              ? "bg-teal-100 text-teal-800"
                              : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {isArchived ? "已归档" : isCompleted ? "已完成" : "进行中"}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap justify-end gap-2">
                    {task.status === "active" ? (
                      <button
                        type="button"
                        onClick={() => props.onComplete(task.id)}
                        className="rounded-full bg-stone-900 px-3 py-1 text-xs font-medium text-white"
                      >
                        完成
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => props.onEditStart(task)}
                      className="rounded-full border border-[var(--line)] px-3 py-1 text-xs font-medium text-stone-700"
                    >
                      编辑
                    </button>
                    {!isArchived ? (
                      <button
                        type="button"
                        onClick={() => props.onArchive(task)}
                        className="rounded-full border border-[var(--line)] px-3 py-1 text-xs font-medium text-stone-700"
                      >
                        归档
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => props.onRestore(task)}
                        className="rounded-full border border-[var(--line)] px-3 py-1 text-xs font-medium text-stone-700"
                      >
                        恢复
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => props.onDelete(task)}
                      className="rounded-full border border-rose-200 px-3 py-1 text-xs font-medium text-rose-700"
                    >
                      删除
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
