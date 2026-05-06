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
  addDailyTaskTemplate,
  getInitialAppState,
  getLocalDateKey,
  saveAppState,
  loadAppState,
} from "@/lib/storage";

describe("daily task template auto-generation", () => {
  let state: AppState;

  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
    state = getInitialAppState();
  });

  it("addDailyTaskTemplate creates today's daily task immediately", () => {
    const now = new Date("2026-05-04T10:00:00");
    const result = addDailyTaskTemplate(
      { title: "喝一杯水", difficulty: "simple" },
      state,
      now,
    );

    expect(result.dailyTaskTemplates).toHaveLength(1);
    expect(result.tasks).toHaveLength(1);
    expect(result.tasks[0].type).toBe("daily");
    expect(result.tasks[0].title).toBe("喝一杯水");
    expect(result.tasks[0].date).toBe(getLocalDateKey(now));
    expect(result.tasks[0].templateId).toBe(result.dailyTaskTemplates[0].id);
    expect(result.tasks[0].status).toBe("active");
  });

  it("adding multiple templates creates multiple daily tasks", () => {
    const now = new Date("2026-05-04T10:00:00");

    let result = addDailyTaskTemplate(
      { title: "喝一杯水", difficulty: "simple" },
      state,
      now,
    );
    result = addDailyTaskTemplate(
      { title: "整理桌面", difficulty: "simple" },
      result,
      now,
    );

    expect(result.dailyTaskTemplates).toHaveLength(2);
    expect(result.tasks.filter((t) => t.type === "daily")).toHaveLength(2);
  });

  it("loading state with existing templates generates daily tasks for today", () => {
    const now = new Date("2026-05-04T10:00:00");
    const dateKey = getLocalDateKey(now);

    const stateWithTemplates = addDailyTaskTemplate(
      { title: "模板1", difficulty: "simple" },
      state,
      now,
    );
    const stateWithTemplates2 = addDailyTaskTemplate(
      { title: "模板2", difficulty: "normal" },
      stateWithTemplates,
      now,
    );

    const todayDailies = stateWithTemplates2.tasks.filter(
      (t) => t.type === "daily" && t.date === dateKey,
    );
    expect(todayDailies).toHaveLength(2);
  });

  it("does not create duplicate tasks for same template on same day", () => {
    const now = new Date("2026-05-04T10:00:00");

    const result = addDailyTaskTemplate(
      { title: "喝一杯水", difficulty: "simple" },
      state,
      now,
    );

    const dailyTasks = result.tasks.filter((t) => t.type === "daily");
    expect(dailyTasks).toHaveLength(1);
  });

  it("daily tasks have correct rewards based on difficulty", () => {
    const now = new Date("2026-05-04T10:00:00");
    const result = addDailyTaskTemplate(
      { title: "困难任务", difficulty: "hard" },
      state,
      now,
    );

    expect(result.tasks[0].rewardGems).toBe(100);
    expect(result.tasks[0].rewardDust).toBe(6);
  });

  it("loadAppState generates daily tasks from saved templates", () => {
    const now = new Date("2026-05-04T10:00:00");
    const dateKey = getLocalDateKey(now);

    const stateWithTemplates = addDailyTaskTemplate(
      { title: "喝水", difficulty: "simple" },
      state,
      now,
    );
    saveAppState(stateWithTemplates);

    const loaded = loadAppState();
    const todayDailies = loaded.tasks.filter(
      (t) => t.type === "daily" && t.date === dateKey,
    );
    expect(todayDailies).toHaveLength(1);
    expect(todayDailies[0].title).toBe("喝水");
  });
});
