import { describe, it, expect, beforeEach, vi } from "vitest";
import type { AppState } from "@/types/domain";

const store: Record<string, string> = {};

const localStorageMock = {
  getItem: vi.fn((key: string) => store[key] ?? null),
  setItem: vi.fn((key: string, value: string) => {
    store[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete store[key];
  }),
  clear: vi.fn(() => {
    for (const key of Object.keys(store)) delete store[key];
  }),
  get length() {
    return Object.keys(store).length;
  },
  key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
};

vi.stubGlobal("localStorage", localStorageMock);
vi.stubGlobal("window", { localStorage: localStorageMock });

import {
  getLocalDateKey,
  createUserSettingsTemplate,
  getInitialAppState,
  loadAppState,
  saveAppState,
  addTask,
  archiveTask,
  restoreTask,
  deleteTask,
  APP_STATE_STORAGE_KEY,
} from "@/lib/storage";

beforeEach(() => {
  localStorageMock.clear();
  vi.clearAllMocks();
});

describe("getLocalDateKey", () => {
  it("formats date as YYYY-MM-DD", () => {
    const date = new Date(2026, 4, 4, 12);
    expect(getLocalDateKey(date)).toBe("2026-05-04");
  });

  it("pads single-digit months and days", () => {
    const date = new Date(2026, 0, 9, 12);
    expect(getLocalDateKey(date)).toBe("2026-01-09");
  });

  it("keeps after-midnight usage on previous day before 3 AM", () => {
    const date = new Date("2026-05-05T02:59:59");
    expect(getLocalDateKey(date)).toBe("2026-05-04");
  });

  it("rolls over to the new day at 3 AM", () => {
    const date = new Date("2026-05-05T03:00:00");
    expect(getLocalDateKey(date)).toBe("2026-05-05");
  });
});

describe("createUserSettingsTemplate", () => {
  it("creates settings with defaults", () => {
    const settings = createUserSettingsTemplate();
    expect(settings.monthlyBudgetLimit).toBe(500);
    expect(settings.gachaCost).toBe(100);
    expect(settings.gachaOpenDays).toEqual([0, 6]);
    expect(settings.enablePity).toBe(true);
    expect(settings.srPityThreshold).toBe(10);
    expect(settings.urPityThreshold).toBe(100);
  });

  it("uses provided date for timestamps", () => {
    const date = new Date("2026-01-15T12:00:00.000Z");
    const settings = createUserSettingsTemplate(date);
    expect(settings.createdAt).toBe(date.toISOString());
    expect(settings.updatedAt).toBe(date.toISOString());
  });
});

describe("getInitialAppState", () => {
  it("returns a valid empty state", () => {
    const state = getInitialAppState();
    expect(state.tasks).toEqual([]);
    expect(state.dailyTaskTemplates).toEqual([]);
    expect(state.wallet.gems).toBe(0);
    expect(state.wallet.dust).toBe(0);
    expect(state.wallet.rewardBalance).toBe(0);
  });
});

describe("loadAppState / saveAppState", () => {
  it("round-trips state through localStorage", () => {
    const initial = getInitialAppState();
    saveAppState(initial);

    const loaded = loadAppState();
    expect(loaded.wallet.gems).toBe(0);
    expect(loaded.tasks).toEqual([]);
  });

  it("returns initial state when localStorage is empty", () => {
    const state = loadAppState();
    expect(state.tasks).toEqual([]);
    expect(state.wallet.gems).toBe(0);
  });

  it("returns initial state when localStorage has invalid JSON", () => {
    localStorage.setItem(APP_STATE_STORAGE_KEY, "not-json");
    const state = loadAppState();
    expect(state.tasks).toEqual([]);
  });
});

describe("addTask", () => {
  it("adds a task with correct rewards", () => {
    const initial = getInitialAppState();
    const next = addTask(
      { title: "测试任务", difficulty: "medium", type: "main" },
      initial,
    );

    expect(next.tasks).toHaveLength(1);
    expect(next.tasks[0].title).toBe("测试任务");
    expect(next.tasks[0].difficulty).toBe("medium");
    expect(next.tasks[0].rewardGems).toBe(60);
    expect(next.tasks[0].rewardDust).toBe(3);
    expect(next.tasks[0].status).toBe("active");
  });

  it("ignores empty title", () => {
    const initial = getInitialAppState();
    const next = addTask(
      { title: "   ", difficulty: "simple", type: "main" },
      initial,
    );
    expect(next.tasks).toHaveLength(0);
  });

  it("sets category for series tasks", () => {
    const initial = getInitialAppState();
    const next = addTask(
      { title: "跑步", difficulty: "normal", type: "series", category: "健康" },
      initial,
    );
    expect(next.tasks[0].category).toBe("健康");
  });

  it("falls back to 其他 for unknown series category", () => {
    const initial = getInitialAppState();
    const next = addTask(
      { title: "未知分类", difficulty: "normal", type: "series", category: "不存在" },
      initial,
    );
    expect(next.tasks[0].category).toBe("其他");
  });
});

describe("archiveTask / restoreTask", () => {
  function stateWithTask() {
    const initial = getInitialAppState();
    return addTask(
      { title: "待归档任务", difficulty: "simple", type: "main" },
      initial,
    );
  }

  it("archives an active task", () => {
    const state = stateWithTask();
    const taskId = state.tasks[0].id;
    const archived = archiveTask(taskId, state);

    expect(archived.tasks[0].status).toBe("archived");
  });

  it("restores an archived task", () => {
    const state = stateWithTask();
    const taskId = state.tasks[0].id;
    const archived = archiveTask(taskId, state);
    const restored = restoreTask(taskId, archived);

    expect(restored.tasks[0].status).toBe("active");
  });

  it("ignores non-existent task", () => {
    const state = stateWithTask();
    const result = archiveTask("nonexistent", state);
    expect(result).toBe(state);
  });
});

describe("deleteTask", () => {
  it("removes a non-daily task", () => {
    const initial = getInitialAppState();
    const state = addTask(
      { title: "要删除的任务", difficulty: "simple", type: "main" },
      initial,
    );
    const taskId = state.tasks[0].id;
    const result = deleteTask(taskId, state);

    expect(result.tasks).toHaveLength(0);
  });

  it("ignores non-existent task", () => {
    const initial = getInitialAppState();
    const result = deleteTask("nonexistent", initial);
    expect(result.tasks).toHaveLength(0);
  });
});
