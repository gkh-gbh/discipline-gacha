export const DUST_REDEEM_OPTIONS = [
  {
    id: "dust_10_to_5",
    dustCost: 10,
    rewardAmount: 5,
    label: "10 星尘兑换 ¥5",
  },
  {
    id: "dust_25_to_15",
    dustCost: 25,
    rewardAmount: 15,
    label: "25 星尘兑换 ¥15",
  },
  {
    id: "dust_50_to_35",
    dustCost: 50,
    rewardAmount: 35,
    label: "50 星尘兑换 ¥35",
  },
  {
    id: "dust_100_to_80",
    dustCost: 100,
    rewardAmount: 80,
    label: "100 星尘兑换 ¥80",
  },
] as const;

export type DustRedeemOption = (typeof DUST_REDEEM_OPTIONS)[number];
export type DustRedeemOptionId = DustRedeemOption["id"];

export function getDustRedeemOption(optionId: string) {
  return DUST_REDEEM_OPTIONS.find((item) => item.id === optionId) ?? null;
}

export function formatDustRedeemNote(option: DustRedeemOption) {
  return `星尘兑换：${option.dustCost} 星尘 → ¥${option.rewardAmount}`;
}
