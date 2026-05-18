import { describe, it, expect } from "vitest";
import {
  DUST_REDEEM_OPTIONS,
  getDustRedeemOption,
  formatDustRedeemNote,
} from "@/lib/redeem";

describe("getDustRedeemOption", () => {
  it("finds option by id", () => {
    const option = getDustRedeemOption("dust_10_to_5");
    expect(option).not.toBeNull();
    expect(option!.dustCost).toBe(10);
    expect(option!.rewardAmount).toBe(5);
  });

  it("returns null for unknown id", () => {
    expect(getDustRedeemOption("nonexistent")).toBeNull();
  });

  it("finds all defined options", () => {
    for (const opt of DUST_REDEEM_OPTIONS) {
      expect(getDustRedeemOption(opt.id)).toEqual(opt);
    }
  });
});

describe("formatDustRedeemNote", () => {
  it("formats note correctly", () => {
    const option = DUST_REDEEM_OPTIONS[0];
    const note = formatDustRedeemNote(option);
    expect(note).toContain("10");
    expect(note).toContain("5");
    expect(note).toContain("积分兑换");
  });
});
