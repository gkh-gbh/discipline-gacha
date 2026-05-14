import { describe, it, expect, beforeEach, vi } from "vitest";

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

import type { AppState } from "@/types/domain";
import {
  addTask,
  completeTask,
  getInitialAppState,
  getWeekStartKey,
} from "@/lib/storage";

describe("getWeekStartKey", () => {
  it("returns Monday for any day of the week", () => {
    const monday = new Date("2026-05-04T12:00:00");
    expect(getWeekStartKey(monday)).toBe("2026-05-04");

    const tuesday = new Date("2026-05-05T12:00:00");
    expect(getWeekStartKey(tuesday)).toBe("2026-05-04");

    const sunday = new Date("2026-05-10T12:00:00");
    expect(getWeekStartKey(sunday)).toBe("2026-05-04");
  });

  it("handles week boundary correctly", () => {
    const saturday = new Date("2026-05-02T12:00:00");
    expect(getWeekStartKey(saturday)).toBe("2026-04-27");

    const sunday = new Date("2026-05-03T12:00:00");
    expect(getWeekStartKey(sunday)).toBe("2026-04-27");
  });

  it("uses the previous week before Monday 3 AM", () => {
    const beforeRollover = new Date("2026-05-04T02:59:59");
    expect(getWeekStartKey(beforeRollover)).toBe("2026-04-27");

    const afterRollover = new Date("2026-05-04T03:00:00");
    expect(getWeekStartKey(afterRollover)).toBe("2026-05-04");
  });
});

describe("series task weekly tracking", () => {
  let state: AppState;

  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
    state = getInitialAppState();
  });

  it("creates series task with weekly target", () => {
    const result = addTask(
      { title: "跑步", difficulty: "normal", type: "series", weeklyTarget: 3 },
      state,
    );

    const task = result.tasks[0];
    expect(task.type).toBe("series");
    expect(task.weeklyTarget).toBe(3);
    expect(task.weeklyCompletedCount).toBe(0);
    expect(task.weekPeriodStart).toBeTruthy();
    expect(task.weeklyBonusGems).toBeGreaterThan(0);
  });

  it("defaults weekly target to 3 when not specified", () => {
    const result = addTask(
      { title: "跑步", difficulty: "normal", type: "series" },
      state,
    );

    expect(result.tasks[0].weeklyTarget).toBe(3);
  });

  it("does not set weekly fields for main tasks", () => {
    const result = addTask(
      { title: "写报告", difficulty: "hard", type: "main" },
      state,
    );

    const task = result.tasks[0];
    expect(task.weeklyTarget).toBeUndefined();
    expect(task.weeklyCompletedCount).toBeUndefined();
  });

  it("completing series task increments weekly count", () => {
    let result = addTask(
      { title: "跑步", difficulty: "normal", type: "series", weeklyTarget: 3 },
      state,
    );
    const taskId = result.tasks[0].id;

    result = completeTask(taskId, result);
    expect(result.tasks[0].weeklyCompletedCount).toBe(1);
    expect(result.tasks[0].status).toBe("active");
  });

  it("completing series task awards base reward", () => {
    let result = addTask(
      { title: "跑步", difficulty: "normal", type: "series", weeklyTarget: 3 },
      state,
    );
    const taskId = result.tasks[0].id;
    const baseGems = result.tasks[0].rewardGems;

    result = completeTask(taskId, result);
    expect(result.wallet.gems).toBe(baseGems);
  });

  it("completing series task multiple times increments count", () => {
    let result = addTask(
      { title: "跑步", difficulty: "normal", type: "series", weeklyTarget: 3 },
      state,
    );
    const taskId = result.tasks[0].id;

    result = completeTask(taskId, result);
    result = completeTask(taskId, result);
    expect(result.tasks[0].weeklyCompletedCount).toBe(2);
  });

  it("reaching weekly target awards bonus", () => {
    let result = addTask(
      { title: "跑步", difficulty: "normal", type: "series", weeklyTarget: 2 },
      state,
    );
    const taskId = result.tasks[0].id;
    const baseGems = result.tasks[0].rewardGems;
    const bonusGems = result.tasks[0].weeklyBonusGems!;

    result = completeTask(taskId, result);
    result = completeTask(taskId, result);

    expect(result.tasks[0].weeklyCompletedCount).toBe(2);
    expect(result.wallet.gems).toBe(baseGems * 2 + bonusGems);
  });

  it("bonus only awarded once per week", () => {
    let result = addTask(
      { title: "跑步", difficulty: "normal", type: "series", weeklyTarget: 2 },
      state,
    );
    const taskId = result.tasks[0].id;
    const bonusGems = result.tasks[0].weeklyBonusGems!;

    result = completeTask(taskId, result);
    result = completeTask(taskId, result);
    const gemsAfterTarget = result.wallet.gems;

    result = completeTask(taskId, result);
    expect(result.wallet.gems).toBe(gemsAfterTarget + result.tasks[0].rewardGems);
  });

  it("series task status stays active after completion", () => {
    let result = addTask(
      { title: "跑步", difficulty: "normal", type: "series", weeklyTarget: 3 },
      state,
    );
    const taskId = result.tasks[0].id;

    result = completeTask(taskId, result);
    expect(result.tasks[0].status).toBe("active");
    expect(result.tasks[0].completedAt).toBeUndefined();
  });

  it("resource transaction records weekly count in note", () => {
    let result = addTask(
      { title: "跑步", difficulty: "normal", type: "series", weeklyTarget: 3 },
      state,
    );
    const taskId = result.tasks[0].id;

    result = completeTask(taskId, result);
    const txn = result.resourceTransactions.find((t) => t.relatedTaskId === taskId);
    expect(txn?.note).toContain("1/3");
  });

  it("bonus transaction created when target reached", () => {
    let result = addTask(
      { title: "跑步", difficulty: "normal", type: "series", weeklyTarget: 1 },
      state,
    );
    const taskId = result.tasks[0].id;

    result = completeTask(taskId, result);
    const bonusTxn = result.resourceTransactions.find((t) => t.type === "series_bonus");
    expect(bonusTxn).toBeTruthy();
    expect(bonusTxn?.note).toContain("周目标达成");
  });
});
