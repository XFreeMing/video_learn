/**
 * Repository contracts — the persistence seam for the domain.
 *
 * Each aggregate gets a repository interface here. Production uses the
 * Drizzle implementations (`*.drizzle.ts`); tests use in-memory doubles
 * (`tests/in-memory-repositories.ts`). Services depend on these
 * interfaces, never on Drizzle directly.
 */

import type { taskStatusEnum, taskTypeEnum } from '#/db/schema/task.ts'

export type TaskType = (typeof taskTypeEnum.enumValues)[number]
export type TaskStatus = (typeof taskStatusEnum.enumValues)[number]

/** Domain view of a task (timestamps as epoch ms for portability). */
export interface TaskRecord {
  id: string
  projectId: string
  taskType: TaskType
  title: string
  purpose: string
  linkedHypothesisId: string | null
  requiredCapabilities: string[]
  priorityScore: number
  status: TaskStatus
  claimedBy: string | null
  claimedAt: number | null
  createdAt: number
}

export interface TaskRepository {
  insert: (task: TaskRecord) => Promise<void>
  findById: (id: string) => Promise<TaskRecord | null>
  findOpenByProject: (projectId: string) => Promise<TaskRecord[]>
  save: (task: TaskRecord) => Promise<void>
}

// ── Read side (CQRS) ───────────────────────────────────────────────────

/** Denormalized read model of a task, optimized for queries. */
export interface TaskView {
  id: string
  projectId: string
  taskType: TaskType
  title: string
  status: TaskStatus
  claimedBy: string | null
  priorityScore: number
  createdAt: number
}

/** Query side: services read from here, never from the write repository. */
export interface TaskReadRepository {
  findById: (id: string) => Promise<TaskView | null>
  findOpenByProject: (projectId: string) => Promise<TaskView[]>
}

/** Write side of the read model, used only by projections. */
export interface TaskReadStore extends TaskReadRepository {
  upsert: (view: TaskView) => Promise<void>
}

// ── Aggregated repository bag ──────────────────────────────────────────

/** All repositories, injected as one unit into the dependency bundle. */
export interface Repositories {
  tasks: TaskRepository
}

/** Read-model repositories for the query side of CQRS. */
export interface QueryRepositories {
  tasks: TaskReadRepository
}
