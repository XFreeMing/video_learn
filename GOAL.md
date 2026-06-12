# GOAL: Baiying Channel - 多智能体事件驱动复杂问题解决系统

## 项目定位

基于 TanStack Start 全栈框架，构建一个**事件驱动的多智能体协作系统**，实现：

- 知识空间与动态知识图谱（核心域）
- 假设驱动的复杂问题解决（核心域）
- 任务公告栏与多智能体协作（支撑域）
- 场景化可验证交付生成（如标书应答）

## 技术栈

- **前端/全栈**: TanStack Start + React + TanStack Router
- **状态管理**: TanStack Query + TanStack Store
- **数据库**: PostgreSQL + Drizzle ORM
- **事件总线**: Redis Pub/Sub
- **实时通信**: WebSocket
- **UI**: Shadcn UI + Tailwind CSS v4
- **类型安全**: Zod + T3Env

## MVP 目标（Sprint 1）

实现单条标书要求的点对点响应闭环：

```
识别标书要求
-> 召回企业知识
-> 发现知识缺口
-> 创建补齐任务
-> 生成应答内容
-> 自检覆盖率
```

## 架构原则

- **事件驱动**: 所有状态变更通过事件总线传播
- **DDD**: 按业务域划分边界（知识空间、问题解决、任务公告栏、项目）
- **知识网关**: 所有知识读写经过统一网关
- **可追溯**: 每个交付物都有依据引用和风险提示
