# Baiying Channel

基于 **TanStack Start** 的全栈应用，采用「端口 + 仓储（Ports & Repository）」架构，并在写侧落地 **DDD 聚合根 + 事务发件箱（Transactional Outbox）+ CQRS 读模型投影** 的事件驱动管线，将业务逻辑与基础设施彻底解耦，使每个业务功能都能用 TDD 方式快速验证，并可在不同项目间复用。

---

## 一、技术栈

| 层 | 选型 | 说明 |
| --- | --- | --- |
| 全栈框架 | TanStack Start（SSR） | 文件路由、服务端渲染，配置见 `vite.config.ts` |
| ORM | Drizzle ORM + PostgreSQL（`pg`） | Schema 优先，配置见 `drizzle.config.ts` |
| 事件总线 | Redis Pub/Sub（`ioredis`） | 频道 `baiying:events` |
| 实时推送 | WebSocket（`ws`） | 端口 3001（脚手架，尚未接线，见文末） |
| 测试 | Vitest + `@vitest/coverage-v8` | 覆盖率 provider 版本须与 Vitest 主版本一致 |
| 质量 | Biome（lint + format） | 单引号、按需分号、行宽 100 |
| 包管理 | **pnpm**（`packageManager` 锁定） | 硬链接 + 内容寻址存储；overrides 见 `pnpm-workspace.yaml` |
| 钩子 | husky + lint-staged | 提交前自动校验 |

---

## 二、核心思想：依赖只指向抽象

业务服务**只依赖抽象端口（Ports）**，绝不直接 `import` Drizzle、Redis、`Date` 或 `console`。
具体的基础设施只在唯一的一处（`deps.ts`）被装配。

```
   业务服务 Service
        │  依赖
        ▼
   抽象端口 Ports（Clock / Logger / EventBus / Repositories）
        ▲                         ▲
        │ 生产装配                  │ 测试替身
   deps.ts                    mocks + 内存仓储
 （真实 Drizzle/Redis）        （内存实现，无需外部依赖）
```

- **换运行时**：改 `deps.ts` 一行即可。
- **写测试**：注入内存替身，无需数据库 / Redis 即可跑通业务逻辑。

---

## 三、事件驱动管线（DDD + Outbox + CQRS）

写侧与读侧彻底分离，事件作为唯一的真相传播媒介，保证「状态变更」与「事件发布」原子一致、且消费幂等。

```
  命令 Command
     │  ① 一个事务内：聚合状态 + 发件箱（原子提交）
     ▼
  UnitOfWork ──▶ tasks 仓储（写模型）
     │           outbox 发件箱表
     │  ② 中继 Relay（后台轮询）
     ▼
  事件总线 EventBus（Redis Pub/Sub，至少一次投递）
     │  ③ 幂等消费（processed_events 去重）
     ▼
  投影 Projection ──▶ task_read_view（读模型）
     ▲
     │  查询只读这里
  查询 Query（queries.tasks）
```

- **聚合根**（`src/domain/task/task.ts`）：封装不变量与状态机（`open → claimed …`），通过 `pullEvents()` 产出领域事件；构造函数私有，只能经 `post()` / `fromSnapshot()` 创建。
- **事务发件箱**：`UnitOfWork.run()` 在同一事务里写入聚合状态与发件箱行，杜绝「双写不一致」。
- **中继 Relay**（`outbox-relay.ts`）：后台把未发布事件搬运到事件总线，失败留待下轮重试 → **至少一次**。
- **幂等消费**（`idempotent.ts` + `processed_events`）：同一 `(consumer, eventId)` 只处理一次，使重试安全。
- **CQRS**：命令走 `uow`（写），查询走 `queries`（读模型）；二者由投影异步对齐（最终一致）。
- **生产启动**：`startEventWorkers()`（`deps.ts`）一次性挂载「中继循环 + 幂等投影订阅」，返回停止函数用于优雅关闭。

> 测试侧用 `createTestDeps()` 提供同构的内存管线，并暴露 `flush()` 手动驱动中继 —— 命令后调用 `await flush()` 即可让读模型追平，确定性强、无需真实基础设施。

---

## 四、目录结构

```
src/
├─ db/
│  ├─ index.ts            # Drizzle 实例（读取校验后的 env）
│  ├─ types.ts            # DbOrTx：连接或事务句柄（仓储可在事务内复用）
│  └─ schema/             # 表定义：knowledge / project / task / agent
│     ├─ messaging.ts     # outbox_events / processed_events（发件箱 + 幂等台账）
│     └─ task-read-view.ts# task_read_view（CQRS 读模型表）
├─ domain/
│  └─ task/task.ts        # ★ Task 聚合根（不变量 + 状态机 + 领域事件）
├─ messaging/
│  ├─ types.ts            # ★ 消息端口：UnitOfWork / Outbox / ProcessedEvent
│  ├─ outbox-relay.ts     # 发件箱中继（relayOnce / startOutboxRelay）
│  ├─ idempotent.ts       # 幂等消费包装器 makeIdempotent
│  ├─ unit-of-work.drizzle.ts        # Drizzle 事务 UoW（聚合 + 发件箱原子提交）
│  ├─ outbox.drizzle.ts              # 发件箱写入/读取实现
│  └─ processed-events.drizzle.ts    # 幂等台账实现
├─ projections/
│  └─ task-projection.ts  # ★ CQRS 投影：领域事件 → 读模型
├─ event/
│  ├─ event-types.ts      # 领域事件类型 DomainEvent / EventType
│  └─ event-bus.ts        # Redis Pub/Sub 实现
├─ lib/
│  ├─ ports.ts            # ★ 抽象端口：Clock / Logger / EventBus / Dependencies
│  ├─ clock.ts            # 生产实现：systemClock
│  ├─ logger.ts           # 生产实现：consoleLogger
│  ├─ container.ts        # EventBus 适配器 redisEventBus
│  └─ deps.ts             # ★ 生产装配 createProductionDeps() + startEventWorkers()
├─ repositories/
│  ├─ types.ts            # ★ 写仓储 + 读仓储（TaskView/TaskReadStore）+ 领域记录
│  ├─ task-repository.drizzle.ts   # Drizzle 写仓储实现
│  └─ task-read.drizzle.ts         # Drizzle 读模型仓储实现
├─ services/
│  ├─ task-board.ts       # 业务服务（命令走 uow，查询走 queries）
│  └─ task-board.test.ts  # 端到端切片 TDD 示例
├─ integrations/tanstack-query/    # SSR 安全的 QueryClient
└─ websocket/server.ts    # 实时推送（脚手架）

tests/
├─ mocks.ts                    # createTestDeps（全管线内存装配）+ flush()
├─ in-memory-repositories.ts   # 内存写/读仓储替身
├─ in-memory-messaging.ts      # 内存 UnitOfWork / 幂等台账替身
├─ factories.ts                # 测试数据工厂 Factory
└─ setup.ts                    # 测试环境变量
```

★ 标记的是架构的关键接缝。

---

## 五、关键映射表

| 关注点 | 抽象端口 | 生产实现 | 测试替身 |
| --- | --- | --- | --- |
| 时间 / ID | `Clock`（`ports.ts`） | `systemClock`（`clock.ts`） | `createMockClock` |
| 日志 | `Logger`（`ports.ts`） | `consoleLogger`（`logger.ts`） | `createMockLogger` |
| 事件 | `EventBus`（`ports.ts`） | `redisEventBus`（`container.ts`） | `createMockEventBus` |
| 事务边界（写） | `UnitOfWork`（`messaging/types.ts`） | `DrizzleUnitOfWork` | `InMemoryUnitOfWork` |
| 发件箱 | `OutboxStore/Reader`（`messaging/types.ts`） | `DrizzleOutbox*` | `InMemoryUnitOfWork` |
| 幂等台账 | `ProcessedEventStore` | `DrizzleProcessedEventStore` | `InMemoryProcessedEventStore` |
| 读模型（查询） | `TaskReadStore`（`repositories/types.ts`） | `DrizzleTaskReadStore` | `InMemoryTaskReadStore` |
| 依赖装配 | `Dependencies`（`ports.ts`） | `createProductionDeps`（`deps.ts`） | `createTestDeps`（`mocks.ts`） |

> 约定：领域记录中的时间戳统一用 **epoch 毫秒**，由 Drizzle 仓储负责与 `Date` 互转。

---

## 六、新增一个业务能力（标准流程）

1. 在 `src/db/schema/` 新增写表 + 读模型表，并在 schema 索引中导出。
2. 在 `src/domain/<name>/` 写聚合根：封装不变量与状态机，变更时 `raise()` 领域事件。
3. 在 `src/repositories/types.ts` 中加入领域记录 + 写仓储接口 + 读模型（`*View`/`*ReadStore`）。
4. 实现 Drizzle 写/读仓储（生产）与内存替身（测试）；如需新事务参与者，扩展 `TxContext`。
5. 在 `src/projections/` 写投影：把领域事件落到读模型。
6. 编写服务：命令经 `uow.run()`（聚合 + `outbox.enqueue(pullEvents())`），查询走 `queries`。
7. 用 `createTestDeps()` + `Factory` 做 TDD：命令后 `await flush()` 让读模型追平（参考 `src/services/task-board.test.ts`）。
8. 在 `src/lib/deps.ts` 装配生产实现，并确保投影已在 `startEventWorkers()` 中订阅。

---

## 七、环境变量

复制 `.env.example` 为 `.env.local` 并填写：

```bash
DATABASE_URL="postgres://用户:密码@主机:端口/数据库"
REDIS_URL="redis://:密码@主机:端口"   # 可选，未设置时事件总线静默
WS_PORT=3001
VITE_APP_TITLE="Baiying Channel"
```

环境变量经 `src/env.ts`（T3Env）做类型校验后再使用。

---

## 八、常用命令

```bash
pnpm install            # 安装（React 18/19 peer 冲突已由 pnpm-workspace.yaml 处理，无需额外参数）
pnpm dev                # 开发
pnpm build              # 构建
pnpm check              # 类型检查 + Lint + 测试（CI 同款门禁）
pnpm test               # 运行测试
pnpm test:watch         # 监听测试
pnpm test:coverage      # 覆盖率
pnpm db:generate        # Drizzle：生成迁移
pnpm db:migrate         # Drizzle：执行迁移
pnpm db:push            # Drizzle：推送 schema
pnpm db:studio          # Drizzle Studio
```

> CI 见 `.github/workflows/ci.yml`，使用 `pnpm/action-setup` + `pnpm install --frozen-lockfile`，执行 `typecheck + lint + test`。

---

## 九、SSR 缓存安全

`src/integrations/tanstack-query/root-provider.tsx` 中，服务端**每个请求新建独立的 `QueryClient`**（避免跨用户串数据），浏览器端复用单例；Provider 通过 `useRouteContext` 取用与路由同一个客户端，保证 SSR 脱水 / 客户端注水一致。

---

## 十、路由

使用 [TanStack Router](https://tanstack.com/router) 文件路由，路由文件位于 `src/routes`。新增文件即新增路由；根布局位于 `src/routes/__root.tsx`，其内容会出现在所有页面中。

---

## 十一、已知待办（诚实声明，未静默跳过）

- **数据库迁移**：新表 `outbox_events` / `processed_events` / `task_read_view` 的迁移 SQL 已由 `pnpm db:generate` 生成于 `drizzle/`，并已对远端 shadow 库执行 `pnpm db:migrate` 落库（已验证建表）。
- **后台 worker**：生产端须在服务启动处调用一次 `startEventWorkers()`（`src/lib/deps.ts`）以启动「发件箱中继 + 幂等投影订阅」；目前仅在测试管线中通过 `createTestDeps()` 接线。
- **实时推送**：`/api/events`（SSE）与 `src/websocket/server.ts` 已搭好脚手架但**尚未接线**。当前 TanStack Start 版本的 SSE 处理器 API 需在真实服务端验证后再启用，故暂缓而非贸然实现。
- 脚手架演示代码仍在：`src/routes/demo/*`、博客路由、`src/lib/demo-store*`，可按需清理。
