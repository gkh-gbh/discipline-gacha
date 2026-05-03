import { CalendarDays, Compass, Gem, Sparkles, WalletCards } from "lucide-react";
import Link from "next/link";

const navItems = [
  { href: "/", label: "首页", shortLabel: "首页" },
  { href: "/tasks", label: "任务页", shortLabel: "任务" },
  { href: "/pool", label: "卡池页", shortLabel: "卡池" },
  { href: "/wallet", label: "钱包页", shortLabel: "钱包" },
  { href: "/settings", label: "设置页", shortLabel: "设置" },
] as const;

const navIcons = {
  "/": Compass,
  "/tasks": CalendarDays,
  "/pool": Sparkles,
  "/wallet": WalletCards,
  "/settings": Gem,
};

type SiteFrameProps = {
  children: React.ReactNode;
};

export function SiteFrame({ children }: SiteFrameProps) {
  return (
    <div className="app-shell">
      <header className="paper-card mb-6 overflow-hidden px-5 py-4 sm:px-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-teal-800">
              discipline-gacha
            </p>
            <h1 className="section-title mt-2 text-3xl font-semibold sm:text-4xl">
              现实任务抽卡系统
            </h1>
            <p className="muted mt-2 max-w-2xl text-sm sm:text-base">
              个人使用的轻量自律应用。当前已经串起任务奖励、每日模板自动发布、周末抽卡、快乐预算和消费记录的最小闭环。
            </p>
          </div>
          <div className="rounded-full border border-[var(--line)] bg-white/70 px-4 py-2 text-sm text-[var(--muted)]">
            目标闭环：任务 → 资源 → 抽卡 → 快乐预算 → 消费记录
          </div>
        </div>
      </header>

      <main>{children}</main>

      <nav className="paper-card fixed inset-x-3 bottom-3 z-50 mx-auto flex w-auto max-w-3xl items-center justify-between gap-2 px-2 py-2 sm:inset-x-0 sm:bottom-6 sm:px-3">
        {navItems.map((item) => {
          const Icon = navIcons[item.href];

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex min-w-0 flex-1 items-center justify-center gap-2 rounded-2xl px-3 py-3 text-sm font-medium text-[var(--muted)] transition hover:bg-white/70 hover:text-[var(--text)]"
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{item.label}</span>
              <span className="sm:hidden">{item.shortLabel}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
