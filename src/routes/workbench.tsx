import { createFileRoute } from '@tanstack/react-router'
import type { TaskStatus, TaskType } from '#/repositories/types.ts'

export const Route = createFileRoute('/workbench')({ component: Workbench })

// ── View models (mock data, typed against the real domain) ─────────────
// 首版工作台为纯布局骨架：数据形态对齐 src/repositories/types.ts 的
// TaskType / TaskStatus，后续直接替换为 TaskBoardService 的查询结果即可。

interface BoardTask {
  id: string
  taskType: TaskType
  title: string
  purpose: string
  linkedHypothesis: string | null
  requiredCapabilities: string[]
  priorityScore: number
  riskLevel: 'low' | 'medium' | 'high'
  status: TaskStatus
  claimedBy: string | null
}

interface Participant {
  id: string
  name: string
  kind: 'agent' | 'human'
  capabilities: string[]
  rating: number
  load: number
}

const TASK_TYPE_LABEL: Record<TaskType, string> = {
  validation: '验证',
  evidence: '证据',
  research: '调研',
  analysis: '分析',
  delivery: '交付',
  review: '审查',
  conflict: '冲突',
  human: '人工',
}

const TASK_TYPE_COLOR: Record<TaskType, string> = {
  validation: '#4fb8b2',
  evidence: '#2f8f97',
  research: '#5c8fd6',
  analysis: '#7e6cd0',
  delivery: '#3fae6a',
  review: '#d6a23f',
  conflict: '#d6603f',
  human: '#9aa3ad',
}

// 公告栏按状态分列（黑板）：open → claimed → submitted → accepted
const BOARD_COLUMNS: { status: TaskStatus; title: string; hint: string }[] = [
  { status: 'open', title: '公告栏 · 待认领', hint: '可执行的验证 / 补证任务' },
  { status: 'claimed', title: '执行中', hint: '已认领并持有租约' },
  { status: 'submitted', title: '待验收', hint: '结构化结果待 Reviewer 合并' },
  { status: 'accepted', title: '已合并', hint: '已写回知识空间 / 假设' },
]

const TASKS: BoardTask[] = [
  {
    id: 'T-1042',
    taskType: 'validation',
    title: '验证「7x24 小时服务能力」可被现有 SLA 支撑',
    purpose: '为标书要求 R-07 生成点对点应答的证据基础',
    linkedHypothesis: 'H-12 现有运维团队可覆盖 7x24',
    requiredCapabilities: ['research', 'sla_review'],
    priorityScore: 92,
    riskLevel: 'high',
    status: 'open',
    claimedBy: null,
  },
  {
    id: 'T-1043',
    taskType: 'evidence',
    title: '补齐本项目服务承诺函与可公开案例',
    purpose: '填补知识缺口 G-03，支撑应答可追溯',
    linkedHypothesis: 'H-12 现有运维团队可覆盖 7x24',
    requiredCapabilities: ['document'],
    priorityScore: 78,
    riskLevel: 'medium',
    status: 'open',
    claimedBy: null,
  },
  {
    id: 'T-1039',
    taskType: 'research',
    title: '召回历史投标中同类服务条款应答',
    purpose: '复用企业知识子图，减少重复撰写',
    linkedHypothesis: null,
    requiredCapabilities: ['research'],
    priorityScore: 64,
    riskLevel: 'low',
    status: 'claimed',
    claimedBy: 'Research Agent #2',
  },
  {
    id: 'T-1031',
    taskType: 'analysis',
    title: '分析服务等级数据是否满足红线要求',
    purpose: '更新假设 H-12 状态：supports / refutes',
    linkedHypothesis: 'H-12 现有运维团队可覆盖 7x24',
    requiredCapabilities: ['data_analysis'],
    priorityScore: 81,
    riskLevel: 'medium',
    status: 'submitted',
    claimedBy: 'Analysis Agent #1',
  },
  {
    id: 'T-1024',
    taskType: 'delivery',
    title: '生成 R-07 点对点应答段落初稿',
    purpose: '产出可评审的标书内容增量',
    linkedHypothesis: 'H-12 现有运维团队可覆盖 7x24',
    requiredCapabilities: ['writing'],
    priorityScore: 70,
    riskLevel: 'medium',
    status: 'submitted',
    claimedBy: 'Human Contributor · 李工',
  },
  {
    id: 'T-1018',
    taskType: 'review',
    title: '审查应答段落与原文要求逐条覆盖',
    purpose: '质量门：内容是否可进入下一阶段',
    linkedHypothesis: null,
    requiredCapabilities: ['bid_review'],
    priorityScore: 58,
    riskLevel: 'low',
    status: 'accepted',
    claimedBy: 'MECE Reviewer',
  },
]

const PARTICIPANTS: Participant[] = [
  {
    id: 'p1',
    name: 'Research Agent',
    kind: 'agent',
    capabilities: ['research'],
    rating: 4.6,
    load: 2,
  },
  {
    id: 'p2',
    name: 'Analysis Agent',
    kind: 'agent',
    capabilities: ['data_analysis'],
    rating: 4.8,
    load: 1,
  },
  {
    id: 'p3',
    name: 'Decision Agent',
    kind: 'agent',
    capabilities: ['writing'],
    rating: 4.4,
    load: 0,
  },
  {
    id: 'p4',
    name: '李工',
    kind: 'human',
    capabilities: ['document', 'sla_review'],
    rating: 4.9,
    load: 1,
  },
  { id: 'p5', name: '王总监', kind: 'human', capabilities: ['bid_review'], rating: 5.0, load: 0 },
]

const ACTIVITY: { id: string; at: string; text: string }[] = [
  { id: 'e5', at: '10:42', text: 'TaskPosted · T-1042 发布到公告栏（high risk）' },
  { id: 'e4', at: '10:39', text: 'TaskClaimed · Research Agent #2 认领 T-1039' },
  { id: 'e3', at: '10:35', text: 'ResultSubmitted · T-1031 提交验证结论（supports）' },
  { id: 'e2', at: '10:28', text: 'ResultSubmitted · T-1024 提交应答初稿' },
  { id: 'e1', at: '10:15', text: 'TaskAccepted · T-1018 已写回项目知识空间' },
]

// ── Page ───────────────────────────────────────────────────────────────

function Workbench() {
  const counts = BOARD_COLUMNS.map((c) => ({
    ...c,
    count: TASKS.filter((t) => t.status === c.status).length,
  }))

  return (
    <main className="page-wrap px-4 pb-12 pt-10">
      <HeroStrip />

      <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {counts.map((c) => (
          <article
            key={c.status}
            className="island-shell feature-card rise-in rounded-2xl px-5 py-4"
          >
            <p className="island-kicker mb-1">{c.title}</p>
            <p className="m-0 text-3xl font-bold text-[var(--sea-ink)]">{c.count}</p>
            <p className="m-0 mt-1 text-xs text-[var(--sea-ink-soft)]">{c.hint}</p>
          </article>
        ))}
      </section>

      <div className="mt-6 grid gap-4 lg:grid-cols-[260px_1fr]">
        <Sidebar />
        <Board />
      </div>

      <ActivityFeed />
    </main>
  )
}

function HeroStrip() {
  return (
    <section className="island-shell rise-in relative overflow-hidden rounded-[2rem] px-6 py-8 sm:px-10">
      <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(79,184,178,0.28),transparent_66%)]" />
      <p className="island-kicker mb-2">协作执行工会 · Task Bulletin Board</p>
      <h1 className="display-title mb-3 max-w-3xl text-3xl leading-tight font-bold tracking-tight text-[var(--sea-ink)] sm:text-5xl">
        投标项目工作台
      </h1>
      <p className="m-0 max-w-2xl text-sm text-[var(--sea-ink-soft)] sm:text-base">
        围绕逻辑树与假设验证协作：节点 → 假设 → 证据需求 → 验证任务 → 公告栏。人与 Agent
        按能力认领，提交结构化结果后写回知识空间。
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full border border-[var(--chip-line)] bg-[var(--chip-bg)] px-3 py-1 text-[var(--sea-ink)]">
          MVP · 单条要求点对点闭环
        </span>
        <span className="rounded-full border border-[var(--chip-line)] bg-[var(--chip-bg)] px-3 py-1 text-[var(--sea-ink-soft)]">
          阶段：制定工作计划 → 分析问题
        </span>
      </div>
    </section>
  )
}

function Sidebar() {
  return (
    <aside className="flex flex-col gap-4">
      <section className="island-shell feature-card rise-in rounded-2xl p-4">
        <p className="island-kicker mb-3">任务类型</p>
        <ul className="m-0 grid list-none grid-cols-2 gap-y-2 p-0 text-sm">
          {(Object.keys(TASK_TYPE_LABEL) as TaskType[]).map((t) => (
            <li key={t} className="flex items-center gap-2 text-[var(--sea-ink-soft)]">
              <span
                className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                style={{ backgroundColor: TASK_TYPE_COLOR[t] }}
              />
              {TASK_TYPE_LABEL[t]}
            </li>
          ))}
        </ul>
      </section>

      <section className="island-shell feature-card rise-in rounded-2xl p-4">
        <p className="island-kicker mb-3">参与者</p>
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {PARTICIPANTS.map((p) => (
            <li key={p.id} className="flex items-center gap-3">
              <span
                className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                  p.kind === 'agent'
                    ? 'bg-[rgba(79,184,178,0.16)] text-[var(--lagoon-deep)]'
                    : 'bg-[rgba(126,108,208,0.16)] text-[#7e6cd0]'
                }`}
              >
                {p.kind === 'agent' ? 'AI' : '人'}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-[var(--sea-ink)]">
                  {p.name}
                </span>
                <span className="block truncate text-xs text-[var(--sea-ink-soft)]">
                  {p.capabilities.join(' · ')} · ★{p.rating.toFixed(1)} · 负载 {p.load}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </aside>
  )
}

function Board() {
  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {BOARD_COLUMNS.map((col) => {
        const items = TASKS.filter((t) => t.status === col.status)
        return (
          <div key={col.status} className="flex flex-col gap-3">
            <header className="flex items-baseline justify-between px-1">
              <h2 className="m-0 text-sm font-semibold text-[var(--sea-ink)]">{col.title}</h2>
              <span className="text-xs text-[var(--sea-ink-soft)]">{items.length}</span>
            </header>
            <div className="flex flex-col gap-3">
              {items.length === 0 ? (
                <p className="rounded-xl border border-dashed border-[var(--line)] px-3 py-6 text-center text-xs text-[var(--sea-ink-soft)]">
                  暂无任务
                </p>
              ) : (
                items.map((t) => <TaskCard key={t.id} task={t} />)
              )}
            </div>
          </div>
        )
      })}
    </section>
  )
}

function TaskCard({ task }: { task: BoardTask }) {
  return (
    <article className="island-shell feature-card rise-in rounded-2xl p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
          style={{
            backgroundColor: `${TASK_TYPE_COLOR[task.taskType]}22`,
            color: TASK_TYPE_COLOR[task.taskType],
          }}
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: TASK_TYPE_COLOR[task.taskType] }}
          />
          {TASK_TYPE_LABEL[task.taskType]}
        </span>
        <span className="font-mono text-xs text-[var(--sea-ink-soft)]">{task.id}</span>
      </div>

      <h3 className="m-0 mb-1 text-sm font-semibold leading-snug text-[var(--sea-ink)]">
        {task.title}
      </h3>
      <p className="m-0 mb-3 text-xs leading-relaxed text-[var(--sea-ink-soft)]">{task.purpose}</p>

      {task.linkedHypothesis && (
        <p className="m-0 mb-3 truncate text-xs text-[var(--lagoon-deep)]">
          ⊶ {task.linkedHypothesis}
        </p>
      )}

      <div className="mb-3 flex flex-wrap gap-1.5">
        {task.requiredCapabilities.map((cap) => (
          <span
            key={cap}
            className="rounded-md border border-[var(--chip-line)] bg-[var(--chip-bg)] px-1.5 py-0.5 text-[10px] text-[var(--sea-ink-soft)]"
          >
            {cap}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-[var(--line)] pt-2.5 text-xs">
        <span className="flex items-center gap-2 text-[var(--sea-ink-soft)]">
          <RiskDot level={task.riskLevel} />P{task.priorityScore}
        </span>
        {task.status === 'open' ? (
          <button
            type="button"
            className="rounded-lg bg-[var(--lagoon)] px-2.5 py-1 text-xs font-semibold text-white"
          >
            认领
          </button>
        ) : (
          <span className="truncate text-[var(--sea-ink-soft)]">{task.claimedBy}</span>
        )}
      </div>
    </article>
  )
}

function RiskDot({ level }: { level: BoardTask['riskLevel'] }) {
  const color = level === 'high' ? '#d6603f' : level === 'medium' ? '#d6a23f' : '#3fae6a'
  return (
    <span className="inline-flex items-center gap-1">
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
    </span>
  )
}

function ActivityFeed() {
  return (
    <section className="island-shell rise-in mt-6 rounded-2xl p-5">
      <p className="island-kicker mb-3">事件流 · Outbox → Event Bus</p>
      <ol className="m-0 flex list-none flex-col gap-2.5 p-0">
        {ACTIVITY.map((e) => (
          <li key={e.id} className="flex items-start gap-3 text-sm">
            <span className="mt-0.5 font-mono text-xs text-[var(--sea-ink-soft)]">{e.at}</span>
            <span className="text-[var(--sea-ink)]">{e.text}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}
