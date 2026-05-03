const WEEKDAY_LABELS: Record<number, string> = {
  0: "周日",
  1: "周一",
  2: "周二",
  3: "周三",
  4: "周四",
  5: "周五",
  6: "周六",
};

export const WEEKDAY_OPTIONS = Object.entries(WEEKDAY_LABELS).map(([value, label]) => ({
  value: Number(value),
  label,
}));

export const DEFAULT_GACHA_OPEN_DAYS = [0, 6];

export function normalizeGachaOpenDays(openDays: number[]) {
  const normalized = [...new Set(openDays)]
    .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
    .sort((left, right) => left - right);

  return normalized.length > 0 ? normalized : [...DEFAULT_GACHA_OPEN_DAYS];
}

export function formatShortDate(date: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    weekday: "short",
  }).format(date);
}

export function formatOpenDaysLabel(openDays: number[]) {
  return normalizeGachaOpenDays(openDays)
    .map((day) => WEEKDAY_LABELS[day])
    .join(" / ");
}

export function isGachaOpenDate(date: Date, openDays: number[]) {
  return normalizeGachaOpenDays(openDays).includes(date.getDay());
}

export function getDaysUntilNextOpenDay(date: Date, openDays: number[]) {
  const normalized = normalizeGachaOpenDays(openDays);
  const today = date.getDay();

  for (let offset = 0; offset < 7; offset += 1) {
    const day = (today + offset) % 7;
    if (normalized.includes(day)) {
      return offset;
    }
  }

  return 0;
}

export function getNextOpenDate(date: Date, openDays: number[]) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  next.setDate(next.getDate() + getDaysUntilNextOpenDay(date, openDays));
  return next;
}

export function getGachaPoolStatus(options?: {
  now?: Date;
  forceOpen?: boolean;
  openDays?: number[];
}) {
  const now = options?.now ?? new Date();
  const forceOpen = options?.forceOpen ?? false;
  const openDays = normalizeGachaOpenDays(options?.openDays ?? DEFAULT_GACHA_OPEN_DAYS);
  const isOpenDay = isGachaOpenDate(now, openDays);
  const isOpen = forceOpen || isOpenDay;
  const nextOpenDate = getNextOpenDate(now, openDays);
  const daysUntilNextOpen = getDaysUntilNextOpenDay(now, openDays);
  const openDaysLabel = formatOpenDaysLabel(openDays);

  if (isOpen) {
    return {
      isOpen: true,
      label: "卡池开放中",
      helperText: forceOpen
        ? `测试模式已强制开启卡池。当前配置的开放日：${openDaysLabel}。`
        : `当前命中开放日：${openDaysLabel}。`,
      daysUntilNextOpen: 0,
      nextOpenLabel: formatShortDate(nextOpenDate),
      openDays,
      openDaysLabel,
      forceOpen,
    };
  }

  return {
    isOpen: false,
    label: "卡池未开放",
    helperText:
      daysUntilNextOpen === 0
        ? `当前配置的开放日：${openDaysLabel}。`
        : `当前配置的开放日：${openDaysLabel}。距离下次开放还有 ${daysUntilNextOpen} 天，开放日是 ${formatShortDate(nextOpenDate)}。`,
    daysUntilNextOpen,
    nextOpenLabel: formatShortDate(nextOpenDate),
    openDays,
    openDaysLabel,
    forceOpen,
  };
}
