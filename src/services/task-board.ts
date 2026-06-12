/**
 * TaskBoardService — application/command service for the task bulletin board.
 *
 * Write side: loads/creates the `Task` aggregate, lets it enforce invariants
 * and emit domain events, then persists the aggregate snapshot AND its events
 * to the outbox inside a single `UnitOfWork` transaction (Transactional
 * Outbox — no dual-write).
 *
 * Read side: queries go through the denormalized read model (`queries.tasks`),
 * never the write store (CQRS).
 */

import { Task } from '#/domain/task/task.ts'
import type { Dependencies } from '#/lib/ports.ts'
import type { TaskRecord, TaskType, TaskView } from '#/repositories/types.ts'

export type { TaskRecord }

export interface PostTaskInput {
  projectId: string
  taskType: TaskType
  title: string
  purpose: string
  linkedHypothesisId?: string
  requiredCapabilities?: string[]
  priorityScore?: number
}

export interface ClaimTaskInput {
  taskId: string
  participantId: string
}

export class TaskBoardService {
  constructor(private deps: Dependencies) {}

  // ── Commands (write side) ────────────────────────────────────────────

  async postTask(input: PostTaskInput): Promise<TaskRecord> {
    const { clock, uow } = this.deps

    return uow.run(async (ctx) => {
      const task = Task.post(
        {
          projectId: input.projectId,
          taskType: input.taskType,
          title: input.title,
          purpose: input.purpose,
          linkedHypothesisId: input.linkedHypothesisId ?? null,
          requiredCapabilities: input.requiredCapabilities,
          priorityScore: input.priorityScore,
        },
        clock,
      )

      await ctx.tasks.insert(task.snapshot)
      await ctx.outbox.enqueue(task.pullEvents())
      return task.snapshot
    })
  }

  async claimTask(input: ClaimTaskInput): Promise<TaskRecord> {
    const { clock, uow } = this.deps

    return uow.run(async (ctx) => {
      const snapshot = await ctx.tasks.findById(input.taskId)
      if (!snapshot) {
        throw new Error(`Task not found: ${input.taskId}`)
      }

      const task = Task.fromSnapshot(snapshot)
      task.claim(input.participantId, clock)

      await ctx.tasks.save(task.snapshot)
      await ctx.outbox.enqueue(task.pullEvents())
      return task.snapshot
    })
  }

  // ── Queries (read side / CQRS) ───────────────────────────────────────

  async listOpenTasks(projectId: string): Promise<TaskView[]> {
    return this.deps.queries.tasks.findOpenByProject(projectId)
  }
}
