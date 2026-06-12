/**
 * End-to-end slice test for the task board.
 *
 * Exercises the whole architecture in memory:
 *   command → aggregate + outbox (atomic) → flush/relay → event bus
 *           → idempotent projection → read model → query
 */

import { beforeEach, describe, expect, it } from 'vitest'
import { TaskBoardService } from '#/services/task-board.ts'
import { createTestDeps, type TestDeps } from '../../tests/mocks'

describe('TaskBoardService', () => {
  let t: TestDeps
  let service: TaskBoardService

  beforeEach(() => {
    t = createTestDeps()
    service = new TaskBoardService(t.deps)
  })

  describe('postTask', () => {
    it('creates an open task', async () => {
      const result = await service.postTask({
        projectId: 'proj-1',
        taskType: 'validation',
        title: 'Validate 7x24 service',
        purpose: 'Verify hypothesis about support capability',
      })

      expect(result.status).toBe('open')
      expect(result.projectId).toBe('proj-1')
      expect(result.taskType).toBe('validation')
      expect(result.claimedBy).toBeNull()
    })

    it('enqueues a task.posted event in the outbox (not yet published)', async () => {
      await service.postTask({
        projectId: 'proj-1',
        taskType: 'research',
        title: 'Find SLA templates',
        purpose: 'Gather evidence for SLA commitment',
      })

      // Committed to the outbox, but not relayed until flush.
      expect(t.uow.pendingCount()).toBe(1)
      expect(t.eventBus.published).toHaveLength(0)

      const count = await t.flush()
      expect(count).toBe(1)
      expect(t.eventBus.published[0].type).toBe('task.posted')
    })

    it('projects the task into the read model after flush', async () => {
      await service.postTask({
        projectId: 'proj-1',
        taskType: 'evidence',
        title: 'Collect case studies',
        purpose: 'Support service capability claim',
      })

      // Before flush the read model is empty (write/read are decoupled).
      expect(await service.listOpenTasks('proj-1')).toHaveLength(0)

      await t.flush()

      const views = await service.listOpenTasks('proj-1')
      expect(views).toHaveLength(1)
      expect(views[0].title).toBe('Collect case studies')
    })
  })

  describe('claimTask', () => {
    it('transitions task from open to claimed', async () => {
      const task = await service.postTask({
        projectId: 'proj-1',
        taskType: 'validation',
        title: 'Test task',
        purpose: 'Test',
      })

      const claimed = await service.claimTask({
        taskId: task.id,
        participantId: 'agent-1',
      })

      expect(claimed.status).toBe('claimed')
      expect(claimed.claimedBy).toBe('agent-1')
      expect(claimed.claimedAt).toBe(t.clock.now())
    })

    it('rejects claim on non-open task', async () => {
      const task = await service.postTask({
        projectId: 'proj-1',
        taskType: 'validation',
        title: 'Test task',
        purpose: 'Test',
      })

      await service.claimTask({ taskId: task.id, participantId: 'agent-1' })

      await expect(
        service.claimTask({ taskId: task.id, participantId: 'agent-2' }),
      ).rejects.toThrow('not claimable')
    })

    it('enqueues a task.claimed event', async () => {
      const task = await service.postTask({
        projectId: 'proj-1',
        taskType: 'validation',
        title: 'Test task',
        purpose: 'Test',
      })
      await t.flush() // drain the posted event

      await service.claimTask({ taskId: task.id, participantId: 'agent-1' })
      await t.flush()

      const claimedEvents = t.eventBus.published.filter((e) => e.type === 'task.claimed')
      expect(claimedEvents).toHaveLength(1)
    })

    it('throws on non-existent task', async () => {
      await expect(
        service.claimTask({ taskId: 'non-existent', participantId: 'agent-1' }),
      ).rejects.toThrow('Task not found')
    })
  })

  describe('listOpenTasks (read model)', () => {
    it('returns only open tasks for the given project', async () => {
      await service.postTask({
        projectId: 'proj-1',
        taskType: 'validation',
        title: 'Task A',
        purpose: 'Test',
      })
      await service.postTask({
        projectId: 'proj-1',
        taskType: 'research',
        title: 'Task B',
        purpose: 'Test',
      })
      await service.postTask({
        projectId: 'proj-2',
        taskType: 'analysis',
        title: 'Task C',
        purpose: 'Other project',
      })
      await t.flush()

      const openTasks = await service.listOpenTasks('proj-1')
      expect(openTasks).toHaveLength(2)
      expect(openTasks.every((task) => task.projectId === 'proj-1')).toBe(true)
    })

    it('excludes claimed tasks once the projection catches up', async () => {
      const task = await service.postTask({
        projectId: 'proj-1',
        taskType: 'validation',
        title: 'Task A',
        purpose: 'Test',
      })
      await service.claimTask({ taskId: task.id, participantId: 'agent-1' })
      await t.flush()

      const openTasks = await service.listOpenTasks('proj-1')
      expect(openTasks).toHaveLength(0)
    })
  })

  describe('idempotent projection', () => {
    it('does not double-apply when the same event is delivered twice', async () => {
      await service.postTask({
        projectId: 'proj-1',
        taskType: 'validation',
        title: 'Task A',
        purpose: 'Test',
      })
      await t.flush()
      // Re-delivering the same events must be a no-op for the read model.
      for (const e of t.eventBus.published) await t.eventBus.simulateEvent(e)

      const openTasks = await service.listOpenTasks('proj-1')
      expect(openTasks).toHaveLength(1)
    })
  })
})
