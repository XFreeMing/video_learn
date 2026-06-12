/**
 * Task read-model projection.
 *
 * Subscribes to task domain events and maintains the denormalized
 * `TaskReadStore` that the query side reads from. This is the "Q" in CQRS:
 * the write model (aggregate + outbox) and the read model evolve
 * independently, connected only by events.
 */

import type { DomainEvent, EventHandler } from '#/event/event-types.ts'
import type { Logger } from '#/lib/ports.ts'
import type { TaskReadStore, TaskStatus, TaskType } from '#/repositories/types.ts'

interface TaskPostedPayload {
  taskId: string
  title: string
  taskType: TaskType
}

interface TaskClaimedPayload {
  taskId: string
  participantId: string
}

/** The consumer name used for idempotency bookkeeping. */
export const TASK_PROJECTION_CONSUMER = 'task-read-projection'

/** Build the projection handler that updates the task read model. */
export function createTaskProjection(readStore: TaskReadStore, logger: Logger): EventHandler {
  return async (event: DomainEvent) => {
    switch (event.type) {
      case 'task.posted': {
        const p = event.payload as TaskPostedPayload
        await readStore.upsert({
          id: p.taskId,
          projectId: event.projectId ?? '',
          taskType: p.taskType,
          title: p.title,
          status: 'open',
          claimedBy: null,
          priorityScore: 0,
          createdAt: event.timestamp,
        })
        break
      }
      case 'task.claimed': {
        const p = event.payload as TaskClaimedPayload
        const existing = await readStore.findById(p.taskId)
        if (!existing) {
          logger.warn('[projection] claimed event for unknown task', { taskId: p.taskId })
          return
        }
        await readStore.upsert({
          ...existing,
          status: 'claimed' satisfies TaskStatus,
          claimedBy: p.participantId,
        })
        break
      }
      default:
        // Not a task event this projection cares about.
        break
    }
  }
}
