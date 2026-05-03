import type { Task, TaskType } from "@/types/domain";

export const TASK_TYPE_ORDER: TaskType[] = ["daily", "series", "main"];

export const SERIES_TASK_CATEGORY_OPTIONS = [
  "生活",
  "学习",
  "开发",
  "健康",
  "创作",
  "其他",
] as const;

export const DEFAULT_SERIES_TASK_CATEGORY = "生活";
export const FALLBACK_SERIES_TASK_CATEGORY = "其他";

export function isSeriesTaskCategory(value: string): value is (typeof SERIES_TASK_CATEGORY_OPTIONS)[number] {
  return SERIES_TASK_CATEGORY_OPTIONS.includes(value as (typeof SERIES_TASK_CATEGORY_OPTIONS)[number]);
}

export function normalizeSeriesTaskCategory(category?: string) {
  const trimmed = category?.trim();

  if (!trimmed) {
    return FALLBACK_SERIES_TASK_CATEGORY;
  }

  return isSeriesTaskCategory(trimmed) ? trimmed : FALLBACK_SERIES_TASK_CATEGORY;
}

export function getSeriesTaskCategoryLabel(category?: string) {
  return normalizeSeriesTaskCategory(category);
}

export function groupSeriesTasksByCategory(tasks: Task[]) {
  const groups = new Map<string, Task[]>();

  tasks
    .filter((task) => task.type === "series")
    .forEach((task) => {
      const category = getSeriesTaskCategoryLabel(task.category);
      const items = groups.get(category) ?? [];
      items.push(task);
      groups.set(category, items);
    });

  return SERIES_TASK_CATEGORY_OPTIONS.map((category) => ({
    category,
    items: groups.get(category) ?? [],
  })).filter((group) => group.items.length > 0);
}

export const taskTypeMeta: Record<
  TaskType,
  {
    label: string;
    shortLabel: string;
    eyebrow: string;
    emptyMessage: string;
    activeEmptyMessage: string;
    completedEmptyMessage: string;
    createHint: string;
  }
> = {
  daily: {
    label: "每日任务",
    shortLabel: "每日",
    eyebrow: "Daily",
    emptyMessage: "今天没有每日任务。可以去任务页添加每日任务模板。",
    activeEmptyMessage: "今天没有进行中的每日任务。",
    completedEmptyMessage: "今天还没有完成的每日任务。",
    createHint: "模板只需要任务名和难度，保存后今天会自动生成对应任务。",
  },
  series: {
    label: "系列任务",
    shortLabel: "系列",
    eyebrow: "Series",
    emptyMessage: "还没有系列任务。可以去任务页添加想长期坚持的事情。",
    activeEmptyMessage: "当前没有进行中的系列任务。",
    completedEmptyMessage: "还没有完成过的系列任务。",
    createHint: "适合长期坚持、反复推进的事情。",
  },
  main: {
    label: "主线任务",
    shortLabel: "主线",
    eyebrow: "Main",
    emptyMessage: "还没有主线任务。可以去任务页添加课程、项目或重要目标。",
    activeEmptyMessage: "当前没有进行中的主线任务。",
    completedEmptyMessage: "还没有完成过的主线任务。",
    createHint: "适合当前最重要、最想推进的目标。",
  },
};
