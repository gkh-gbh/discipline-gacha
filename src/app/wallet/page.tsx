"use client";

import { useEffect, useMemo, useState } from "react";

import { useAppState } from "@/components/app-state-provider";
import { FloatingNotice, PlaceholderNote, SectionCard, StatCard, StatGrid } from "@/components/ui";

const spendingCategories = [
  { value: "", label: "未分类" },
  { value: "餐饮", label: "餐饮" },
  { value: "娱乐", label: "娱乐" },
  { value: "饮品", label: "饮品" },
  { value: "购物", label: "购物" },
  { value: "其他", label: "其他" },
];

export default function WalletPage() {
  const { appState, addSpendingRecord, redeemDustReward } = useAppState();
  const { wallet, spendingRecords, userSettings } = appState;
  const redeemOptions = userSettings.redeemOptions;

  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [category, setCategory] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{
    title: string;
    body: string;
  } | null>(null);

  const amountNumber = Number(amount);
  const trimmedNote = note.trim();
  const remainingMonthlyBudget = Math.max(
    userSettings.monthlyBudgetLimit - wallet.monthlyUnlockedAmount,
    0,
  );

  const validationMessage = useMemo(() => {
    if (!amount.trim()) {
      return "请输入消费金额。";
    }

    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      return "消费金额必须大于 0。";
    }

    if (!trimmedNote) {
      return "请输入消费用途。";
    }

    if (amountNumber > wallet.rewardBalance) {
      return "消费金额不能超过当前快乐预算余额。";
    }

    if (wallet.monthlySpentAmount + amountNumber > userSettings.monthlyBudgetLimit) {
      return `本月消费已达预算上限（¥${userSettings.monthlyBudgetLimit}），剩余可用 ¥${Math.max(userSettings.monthlyBudgetLimit - wallet.monthlySpentAmount, 0)}。`;
    }

    return null;
  }, [amount, amountNumber, trimmedNote, wallet.rewardBalance, wallet.monthlySpentAmount, userSettings.monthlyBudgetLimit]);

  useEffect(() => {
    if (!notice) {
      return;
    }

    const timer = window.setTimeout(() => setNotice(null), 2600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (validationMessage) {
      setSubmitError(validationMessage);
      return;
    }

    addSpendingRecord(amountNumber, trimmedNote, category || undefined);
    setAmount("");
    setNote("");
    setCategory("");
    setSubmitError(null);
    setNotice({
      title: "已记录消费",
      body: `${trimmedNote} 已扣除 ¥${amountNumber}。`,
    });
  }

  function handleRedeem(rewardId: string) {
    const option = redeemOptions.find((item) => item.id === rewardId);

    if (!option || wallet.dust < option.dustCost) {
      return;
    }

    const nextState = redeemDustReward(rewardId);

    if (nextState.wallet.dust === wallet.dust) {
      return;
    }

    setNotice({
      title: "兑换成功",
      body: `${option.dustCost} 积分已兑换为 ¥${option.rewardAmount} 快乐预算。`,
    });
  }

  return (
    <div className="space-y-6">
      {notice ? (
        <FloatingNotice
          title={notice.title}
          body={notice.body}
          onClose={() => setNotice(null)}
        />
      ) : null}

      <SectionCard
        eyebrow="Wallet"
        title="钱包页"
        description="这里保留快乐预算的最小闭环：抽卡或兑换解锁预算，再记录消费。"
      >
        <StatGrid className="xl:grid-cols-6">
          <StatCard
            title="快乐预算余额"
            value={`¥${wallet.rewardBalance}`}
            hint="已经解锁、可以安心花掉的余额"
            tone="coral"
          />
          <StatCard
            title="当前积分"
            value={`${wallet.dust}`}
            hint="可用于固定兑换快乐预算"
            tone="gold"
          />
          <StatCard
            title="本月已解锁"
            value={`¥${wallet.monthlyUnlockedAmount}`}
            hint="来自抽卡奖励和积分兑换"
            tone="gold"
          />
          <StatCard
            title="本月已消费"
            value={`¥${wallet.monthlySpentAmount}`}
            hint="记录支出后自动累计"
            tone="stone"
          />
          <StatCard
            title="月预算上限"
            value={`¥${userSettings.monthlyBudgetLimit}`}
            hint="消费不能超过此上限"
            tone="teal"
          />
          <StatCard
            title="剩余可解锁"
            value={`¥${remainingMonthlyBudget}`}
            hint="按上限减去本月已解锁金额"
            tone="stone"
          />
        </StatGrid>
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <SectionCard
          eyebrow="Redeem"
          title="积分兑换"
          description="固定兑换项会直接把快乐预算打进钱包，不限制本月预算上限。"
        >
          <div className="rounded-[24px] border border-[var(--line)] bg-white/65 p-4">
            <div className="mb-4 flex items-center justify-between gap-3 rounded-[20px] bg-stone-100/80 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-stone-700">当前积分</p>
                <p className="mt-1 text-2xl font-semibold text-stone-900">{wallet.dust}</p>
              </div>
              <p className="max-w-[220px] text-right text-sm text-stone-600">
                兑换成功后会增加快乐预算余额和本月已解锁金额。
              </p>
            </div>

            <div className="space-y-3">
              {redeemOptions.map((option) => {
                const canRedeem = wallet.dust >= option.dustCost;

                return (
                  <div
                    key={option.id}
                    className="flex flex-col gap-3 rounded-[22px] border border-[var(--line)] bg-[var(--card-strong)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-medium text-stone-900">{option.label}</p>
                      <p className="muted mt-1 text-sm">
                        消耗 {option.dustCost} 积分，获得 ¥{option.rewardAmount} 快乐预算
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRedeem(option.id)}
                      disabled={!canRedeem}
                      className="rounded-2xl bg-stone-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      {canRedeem ? "立即兑换" : "积分不足"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Spend"
          title="新增消费记录"
          description="金额不能超过当前快乐预算余额，用途不能为空。"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-stone-700">消费金额</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(event) => {
                    setAmount(event.target.value);
                    setSubmitError(null);
                  }}
                  placeholder="例如：18"
                  className="w-full rounded-2xl border border-[var(--line)] bg-[var(--card-strong)] px-4 py-3 outline-none"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-stone-700">消费分类</span>
                <select
                  value={category}
                  onChange={(event) => {
                    setCategory(event.target.value);
                    setSubmitError(null);
                  }}
                  className="w-full rounded-2xl border border-[var(--line)] bg-[var(--card-strong)] px-4 py-3 outline-none"
                >
                  {spendingCategories.map((item) => (
                    <option key={item.value || "empty"} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-stone-700">消费用途</span>
              <input
                value={note}
                onChange={(event) => {
                  setNote(event.target.value);
                  setSubmitError(null);
                }}
                placeholder="例如：买一杯冰咖啡"
                className="w-full rounded-2xl border border-[var(--line)] bg-[var(--card-strong)] px-4 py-3 outline-none"
              />
            </label>

            <div className="rounded-[22px] bg-white/60 px-4 py-4 text-sm text-stone-600">
              当前可用余额：¥{wallet.rewardBalance}
            </div>

            {submitError ? (
              <div className="rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {submitError}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={Boolean(validationMessage)}
              className="rounded-2xl bg-stone-900 px-5 py-3 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-50"
            >
              记录消费
            </button>
          </form>
        </SectionCard>
      </div>

      <SectionCard
        eyebrow="History"
        title="消费记录列表"
        description="消费记录保存在 localStorage，刷新后仍然保留。"
      >
        <div className="space-y-3">
          {spendingRecords.length === 0 ? (
            <PlaceholderNote title="还没有消费记录">
              先记录第一笔快乐预算支出，验证余额会同步扣减并留下可回看的消费明细。
            </PlaceholderNote>
          ) : null}

          {spendingRecords.map((record) => (
            <div
              key={record.id}
              className="flex items-center justify-between gap-3 rounded-[22px] border border-[var(--line)] bg-white/70 px-4 py-4"
            >
              <div>
                <p className="font-medium">{record.note}</p>
                <p className="muted mt-1 text-sm">
                  {record.category ?? "未分类"} · {record.spentAt.replace("T", " ").slice(0, 16)}
                </p>
              </div>
              <span className="rounded-full bg-orange-100 px-3 py-1 text-sm font-medium text-orange-800">
                -¥{record.amount}
              </span>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
