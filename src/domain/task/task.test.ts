import { beforeEach, describe, expect, it } from 'vitest'
import { createMockClock } from '../../../tests/mocks'
import { Task, TaskInvariantError } from './task.ts'

describe('Task aggregate', () => {
  let clock: ReturnType<typeof createMockClock>

  beforeEach(() => {
    clock = createMockClock()
  })

  describe('post', () => {
    it('creates an open task and emits task.posted', () => {
      const task = Task.post(
        {
          projectId: 'proj-1',
          taskType: 'validation',
          title: 'Validate SLA',
          purpose: 'Check support capability',
        },
        clock,
      )

      const snap = task.snapshot
      expect(snap.status).toBe('open')
      expect(snap.projectId).toBe('proj-1')
      expect(snap.claimedBy).toBeNull()

      const events = task.pullEvents()
      expect(events).toHaveLength(1)
      expect(events[0].type).toBe('task.posted')
      expect(events[0].aggregateId).toBe(snap.id)
    })

    it('rejects an empty title', () => {
      expect(() =>
        Task.post(
          { projectId: 'proj-1', taskType: 'validation', title: '  ', purpose: 'x' },
          clock,
        ),
      ).toThrow(TaskInvariantError)
    })

    it('rejects a missing project', () => {
      expect(() =>
        Task.post({ projectId: '', taskType: 'validation', title: 'T', purpose: 'x' }, clock),
      ).toThrow(TaskInvariantError)
    })
  })

  describe('claim', () => {
    it('transitions open -> claimed and emits task.claimed', () => {
      const task = Task.post(
        { projectId: 'proj-1', taskType: 'validation', title: 'T', purpose: 'x' },
        clock,
      )
      task.pullEvents() // drain the posted event

      task.claim('agent-1', clock)

      const snap = task.snapshot
      expect(snap.status).toBe('claimed')
      expect(snap.claimedBy).toBe('agent-1')
      expect(snap.claimedAt).toBe(clock.now())

      const events = task.pullEvents()
      expect(events).toHaveLength(1)
      expect(events[0].type).toBe('task.claimed')
    })

    it('rejects claiming a non-open task', () => {
      const task = Task.post(
        { projectId: 'proj-1', taskType: 'validation', title: 'T', purpose: 'x' },
        clock,
      )
      task.claim('agent-1', clock)

      expect(() => task.claim('agent-2', clock)).toThrow('not claimable')
    })

    it('rejects an empty participantId', () => {
      const task = Task.post(
        { projectId: 'proj-1', taskType: 'validation', title: 'T', purpose: 'x' },
        clock,
      )
      expect(() => task.claim('', clock)).toThrow(TaskInvariantError)
    })
  })

  describe('pullEvents', () => {
    it('clears the buffer after draining', () => {
      const task = Task.post(
        { projectId: 'proj-1', taskType: 'validation', title: 'T', purpose: 'x' },
        clock,
      )
      expect(task.pullEvents()).toHaveLength(1)
      expect(task.pullEvents()).toHaveLength(0)
    })
  })

  describe('fromSnapshot', () => {
    it('rehydrates without emitting events', () => {
      const original = Task.post(
        { projectId: 'proj-1', taskType: 'validation', title: 'T', purpose: 'x' },
        clock,
      )
      const snap = original.snapshot

      const rehydrated = Task.fromSnapshot(snap)
      expect(rehydrated.pullEvents()).toHaveLength(0)
      expect(rehydrated.snapshot).toEqual(snap)
    })
  })
})
