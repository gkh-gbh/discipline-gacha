import { describe, it, expect } from "vitest";
import {
  normalizeGachaOpenDays,
  isGachaOpenDate,
  getDaysUntilNextOpenDay,
  getGachaPoolStatus,
  DEFAULT_GACHA_OPEN_DAYS,
} from "@/lib/date";

describe("normalizeGachaOpenDays", () => {
  it("returns defaults for empty array", () => {
    expect(normalizeGachaOpenDays([])).toEqual(DEFAULT_GACHA_OPEN_DAYS);
  });

  it("deduplicates and sorts", () => {
    expect(normalizeGachaOpenDays([6, 0, 6, 0])).toEqual([0, 6]);
  });

  it("filters out invalid values", () => {
    expect(normalizeGachaOpenDays([0, -1, 7, 6])).toEqual([0, 6]);
  });

  it("filters out non-integers", () => {
    expect(normalizeGachaOpenDays([0, 1.5, 6])).toEqual([0, 6]);
  });

  it("falls back to defaults when all values are invalid", () => {
    expect(normalizeGachaOpenDays([-1, 7, 1.5])).toEqual(DEFAULT_GACHA_OPEN_DAYS);
  });
});

describe("isGachaOpenDate", () => {
  it("returns true for Saturday (day 6) with default open days", () => {
    const saturday = new Date("2026-05-02T12:00:00");
    expect(isGachaOpenDate(saturday, DEFAULT_GACHA_OPEN_DAYS)).toBe(true);
  });

  it("returns true for Sunday (day 0) with default open days", () => {
    const sunday = new Date("2026-05-03T12:00:00");
    expect(isGachaOpenDate(sunday, DEFAULT_GACHA_OPEN_DAYS)).toBe(true);
  });

  it("returns false for Monday (day 1) with default open days", () => {
    const monday = new Date("2026-05-04T12:00:00");
    expect(isGachaOpenDate(monday, DEFAULT_GACHA_OPEN_DAYS)).toBe(false);
  });
});

describe("getDaysUntilNextOpenDay", () => {
  it("returns 0 when today is an open day", () => {
    const saturday = new Date("2026-05-02T12:00:00");
    expect(getDaysUntilNextOpenDay(saturday, DEFAULT_GACHA_OPEN_DAYS)).toBe(0);
  });

  it("returns 1 when tomorrow is an open day", () => {
    const friday = new Date("2026-05-01T12:00:00");
    expect(getDaysUntilNextOpenDay(friday, DEFAULT_GACHA_OPEN_DAYS)).toBe(1);
  });

  it("returns correct days for midweek", () => {
    const wednesday = new Date("2026-04-29T12:00:00");
    const days = getDaysUntilNextOpenDay(wednesday, DEFAULT_GACHA_OPEN_DAYS);
    expect(days).toBe(3);
  });
});

describe("getGachaPoolStatus", () => {
  it("reports open on Saturday", () => {
    const saturday = new Date("2026-05-02T12:00:00");
    const status = getGachaPoolStatus({ now: saturday });
    expect(status.isOpen).toBe(true);
    expect(status.label).toBe("卡池开放中");
  });

  it("reports closed on Monday", () => {
    const monday = new Date("2026-05-04T12:00:00");
    const status = getGachaPoolStatus({ now: monday });
    expect(status.isOpen).toBe(false);
    expect(status.label).toBe("卡池未开放");
  });

  it("reports open when forceOpen is true regardless of day", () => {
    const monday = new Date("2026-05-04T12:00:00");
    const status = getGachaPoolStatus({ now: monday, forceOpen: true });
    expect(status.isOpen).toBe(true);
  });

  it("uses custom open days", () => {
    const wednesday = new Date("2026-04-29T12:00:00");
    const status = getGachaPoolStatus({ now: wednesday, openDays: [3] });
    expect(status.isOpen).toBe(true);
  });
});
