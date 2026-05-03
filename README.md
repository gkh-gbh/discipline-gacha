# discipline-gacha

个人自律抽卡系统 — 用游戏化方式激励完成现实任务。

完成任务 → 获得宝石 → 周末抽卡 → 解锁快乐预算 → 无负罪感消费

## 技术栈

- Next.js 15 (App Router) + React 19 + TypeScript
- Tailwind CSS 4
- 数据存储：localStorage

## 开发

```bash
npm install
npm run dev        # http://localhost:43017
npm run build      # 生产构建
npm run lint       # ESLint
```

## 页面

| 路由 | 功能 |
|------|------|
| `/` | 今日面板 — 任务概览、资源状态、卡池倒计时 |
| `/tasks` | 任务管理 — 每日/系列/主线任务的创建和管理 |
| `/pool` | 卡池 — 周末抽卡（100宝石/次，10抽保底SR+） |
| `/wallet` | 快乐预算 — 抽卡奖励余额和消费记录 |
| `/settings` | 设置 — 预算上限、卡池开放日、数值调整 |

## 任务类型

- **每日任务**：模板自动生成，每天刷新，低门槛启动
- **系列任务**：长期习惯追踪，周目标 + 阶段奖励
- **主线任务**：一次性重要任务，高奖励
