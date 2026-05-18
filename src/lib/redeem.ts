import type { RedeemOptionSetting } from "@/types/domain";

export const DEFAULT_REDEEM_OPTIONS: RedeemOptionSetting[] = [
  {
    id: "dust_10_to_5",
    dustCost: 10,
    rewardAmount: 5,
    label: "10 积分兑换 ¥5",
  },
  {
    id: "dust_25_to_15",
    dustCost: 25,
    rewardAmount: 15,
    label: "25 积分兑换 ¥15",
  },
  {
    id: "dust_50_to_35",
    dustCost: 50,
    rewardAmount: 35,
    label: "50 积分兑换 ¥35",
  },
  {
    id: "dust_100_to_80",
    dustCost: 100,
    rewardAmount: 80,
    label: "100 积分兑换 ¥80",
  },
] as const;

export const DUST_REDEEM_OPTIONS = DEFAULT_REDEEM_OPTIONS;

export type DustRedeemOption = RedeemOptionSetting;
export type DustRedeemOptionId = DustRedeemOption["id"];

export function getDustRedeemOption(optionId: string, options = DEFAULT_REDEEM_OPTIONS) {
  return options.find((item) => item.id === optionId) ?? null;
}

export function formatDustRedeemNote(option: DustRedeemOption) {
  return `积分兑换：${option.dustCost} 积分 → ¥${option.rewardAmount}`;
}
