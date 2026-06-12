import { beforeEach, describe, expect, it } from 'vitest'
import type { DomainEvent } from '#/event/event-types.ts'
import { InMemoryProcessedEventStore, InMemoryUnitOfWork } from '../../tests/in-memory-messaging'
import { createMockClock, createMockEventBus, createMockLogger } from '../../tests/mocks'
import { makeIdempotent } from './idempotent.ts'
import { relayOnce } from './outbox-relay.ts'

function makeEvent(id: string): DomainEvent {
  return {
    id,
    type: 'task.posted',
    timestamp: 1700000000000,
    projectId: 'proj-1',
    aggregateId: 't-1',
    payload: { taskId: 't-1', title: 'T', taskType: 'validation' },
  }
}

describe('Transactional outbox', () => {
  let uow: InMemoryUnitOfWork
  let eventBus: ReturnType<typeof createMockEventBus>
  let logger: ReturnType<typeof createMockLogger>

  beforeEach(() => {
    uow = new InMemoryUnitOfWork()
    eventBus = createMockEventBus()
    logger = createMockLogger()
  })

  it('commits aggregate state and outbox events atomically', async () => {
    const clock = createMockClock()
    await uow.run(async (ctx) => {
      await ctx.tasks.insert({
        id: 't-1',
        projectId: 'proj-1',
        taskType: 'validation',
        title: 'T',
        purpose: 'x',
        linkedHypothesisId: null,
        requiredCapabilities: [],
        priorityScore: 50,
        status: 'open',
        claimedBy: null,
        claimedAt: null,
        createdAt: clock.now(),
      })
      await ctx.outbox.enqueue([makeEvent('e-1')])
    })

    expect(uow.pendingCount()).toBe(1)
    const stored = await uow.run(async (ctx) => ctx.tasks.findById('t-1'))
    expect(stored?.id).toBe('t-1')
  })

  it('rolls back BOTH state and events when the command throws', async () => {
    await expect(
      uow.run(async (ctx) => {
        await ctx.tasks.insert({
          id: 't-2',
          projectId: 'proj-1',
          taskType: 'validation',
          title: 'T',
          purpose: 'x',
          linkedHypothesisId: null,
          requiredCapabilities: [],
          priorityScore: 50,
          status: 'open',
          claimedBy: null,
          claimedAt: null,
          createdAt: 0,
        })
        await ctx.outbox.enqueue([makeEvent('e-2')])
        throw new Error('boom')
      }),
    ).rejects.toThrow('boom')

    // Nothing committed: no pending events and no persisted task.
    expect(uow.pendingCount()).toBe(0)
    const stored = await uow.run(async (ctx) => ctx.tasks.findById('t-2'))
    expect(stored).toBeNull()
  })

  it('relayOnce publishes pending events and marks them published', async () => {
    await uow.run(async (ctx) => {
      await ctx.outbox.enqueue([makeEvent('e-3'), makeEvent('e-4')])
    })

    const count = await relayOnce(uow, eventBus, logger)
    expect(count).toBe(2)
    expect(eventBus.published).toHaveLength(2)

    // Second pass finds nothing left.
    const again = await relayOnce(uow, eventBus, logger)
    expect(again).toBe(0)
  })

  it('leaves events pending if publish fails (retry on next pass)', async () => {
    await uow.run(async (ctx) => {
      await ctx.outbox.enqueue([makeEvent('e-5')])
    })

    // Force the first publish to fail.
    let failNext = true
    const flakyBus = {
      ...eventBus,
      publish: async (e: DomainEvent) => {
        if (failNext) {
          failNext = false
          throw new Error('network')
        }
        await eventBus.publish(e)
      },
    }

    expect(await relayOnce(uow, flakyBus, logger)).toBe(0)
    expect(uow.pendingCount()).toBe(1)

    // Recovered on retry.
    expect(await relayOnce(uow, flakyBus, logger)).toBe(1)
    expect(uow.pendingCount()).toBe(0)
  })
})

describe('Idempotent consumption', () => {
  it('processes an event once and skips duplicates', async () => {
    const store = new InMemoryProcessedEventStore()
    const logger = createMockLogger()
    let handled = 0
    const handler = makeIdempotent('test-consumer', store, logger, async () => {
      handled += 1
    })

    const event = makeEvent('e-dup')
    await handler(event)
    await handler(event) // duplicate delivery
    await handler(event) // duplicate delivery

    expect(handled).toBe(1)
  })

  it('retries (does not mark processed) when the handler throws', async () => {
    const store = new InMemoryProcessedEventStore()
    const logger = createMockLogger()
    let attempts = 0
    const handler = makeIdempotent('test-consumer', store, logger, async () => {
      attempts += 1
      if (attempts === 1) throw new Error('transient')
    })

    const event = makeEvent('e-retry')
    await expect(handler(event)).rejects.toThrow('transient')
    await handler(event) // retry succeeds
    expect(attempts).toBe(2)

    // Now it is marked processed; a third delivery is skipped.
    await handler(event)
    expect(attempts).toBe(2)
  })
})
