/**
 * Mock implementations of infrastructure ports for unit testing.
 *
 * These mocks allow testing business logic without real DB/Redis/etc.
 * All state is in-memory and reset between tests.
 */

import type { DomainEvent, EventHandler, EventType } from '#/event/event-types.ts'
import type { Clock, Dependencies, EventBus, Logger } from '#/lib/ports.ts'
import { makeIdempotent } from '#/messaging/idempotent.ts'
import { relayOnce } from '#/messaging/outbox-relay.ts'
import { createTaskProjection, TASK_PROJECTION_CONSUMER } from '#/projections/task-projection.ts'
import { InMemoryProcessedEventStore, InMemoryUnitOfWork } from './in-memory-messaging.ts'
import { InMemoryTaskReadStore } from './in-memory-repositories.ts'

// ── In-Memory Event Bus Mock ───────────────────────────────────────────

export function createMockEventBus(): EventBus & {
  published: DomainEvent[]
  handlers: Map<string, EventHandler[]>
  reset: () => void
  simulateEvent: (event: DomainEvent) => Promise<void>
} {
  const published: DomainEvent[] = []
  const handlers = new Map<string, EventHandler[]>()

  return {
    published,
    handlers,

    async publish<T>(event: DomainEvent<T>): Promise<void> {
      published.push(event as DomainEvent)
      // Dispatch to subscribers
      const allHandlers = handlers.get('all') || []
      const typeHandlers = handlers.get(event.type) || []
      for (const handler of [...allHandlers, ...typeHandlers]) {
        await handler(event as DomainEvent)
      }
    },

    subscribe(type: EventType | EventType[] | 'all', handler: EventHandler): () => void {
      const types = type === 'all' ? ['all'] : Array.isArray(type) ? type : [type]
      for (const t of types) {
        const arr = handlers.get(t) ?? []
        arr.push(handler)
        handlers.set(t, arr)
      }
      return () => {
        for (const t of types) {
          const arr = handlers.get(t)
          if (arr) {
            const idx = arr.indexOf(handler)
            if (idx >= 0) arr.splice(idx, 1)
          }
        }
      }
    },

    async simulateEvent(event: DomainEvent): Promise<void> {
      const allHandlers = handlers.get('all') || []
      const typeHandlers = handlers.get(event.type) || []
      for (const handler of [...allHandlers, ...typeHandlers]) {
        await handler(event)
      }
    },

    reset() {
      published.length = 0
      handlers.clear()
    },
  }
}

// ── Deterministic Clock Mock ───────────────────────────────────────────

export function createMockClock(startTime = 1700000000000): Clock & {
  advance: (ms: number) => void
  setTime: (ts: number) => void
  generatedIds: string[]
} {
  let currentTime = startTime
  const generatedIds: string[] = []
  let idCounter = 0

  return {
    generatedIds,

    now() {
      return currentTime
    },

    uuid() {
      const id = `test-uuid-${String(++idCounter).padStart(4, '0')}`
      generatedIds.push(id)
      return id
    },

    advance(ms: number) {
      currentTime += ms
    },

    setTime(ts: number) {
      currentTime = ts
    },
  }
}

// ── Logger Mock ────────────────────────────────────────────────────────

export function createMockLogger(): Logger & {
  logs: { level: string; msg: string; ctx?: Record<string, unknown> }[]
  reset: () => void
} {
  const logs: { level: string; msg: string; ctx?: Record<string, unknown> }[] = []

  return {
    logs,
    info(msg, ctx) {
      logs.push({ level: 'info', msg, ctx })
    },
    warn(msg, ctx) {
      logs.push({ level: 'warn', msg, ctx })
    },
    error(msg, ctx) {
      logs.push({ level: 'error', msg, ctx })
    },
    reset() {
      logs.length = 0
    },
  }
}

// ── Full Test Dependencies Bundle ──────────────────────────────────────

export interface TestDeps {
  deps: Dependencies
  eventBus: ReturnType<typeof createMockEventBus>
  clock: ReturnType<typeof createMockClock>
  logger: ReturnType<typeof createMockLogger>
  uow: InMemoryUnitOfWork
  readStore: InMemoryTaskReadStore
  processed: InMemoryProcessedEventStore
  /** Run the outbox relay once: drains the outbox → event bus → projections. */
  flush: () => Promise<number>
  resetAll: () => void
}

/**
 * Create a complete, fully-wired set of test dependencies that exercises the
 * whole CQRS + outbox pipeline in memory:
 *
 *   command → UnitOfWork (aggregate + outbox, atomic)
 *           → flush() → relay → event bus
 *           → idempotent projection → read model → queries
 *
 * Usage:
 *   const t = createTestDeps()
 *   const svc = new TaskBoardService(t.deps)
 *   await svc.postTask(...)
 *   await t.flush()                       // propagate events to the read model
 *   await svc.listOpenTasks('proj-1')     // reads from the projection
 */
export function createTestDeps(options?: { startTime?: number }): TestDeps {
  const eventBus = createMockEventBus()
  const clock = createMockClock(options?.startTime)
  const logger = createMockLogger()

  let uow = new InMemoryUnitOfWork()
  let readStore = new InMemoryTaskReadStore()
  let processed = new InMemoryProcessedEventStore()

  // Wire the read-model projection as an idempotent subscriber.
  const subscribeProjection = () => {
    const projection = makeIdempotent(
      TASK_PROJECTION_CONSUMER,
      processed,
      logger,
      createTaskProjection(readStore, logger),
    )
    eventBus.subscribe('all', projection)
  }
  subscribeProjection()

  const deps: Dependencies = {
    clock,
    logger,
    eventBus,
    get uow() {
      return uow
    },
    queries: {
      get tasks() {
        return readStore
      },
    },
  }

  return {
    deps,
    eventBus,
    clock,
    logger,
    get uow() {
      return uow
    },
    get readStore() {
      return readStore
    },
    get processed() {
      return processed
    },
    flush() {
      return relayOnce(uow, eventBus, logger)
    },
    resetAll() {
      uow = new InMemoryUnitOfWork()
      readStore = new InMemoryTaskReadStore()
      processed = new InMemoryProcessedEventStore()
      eventBus.reset()
      logger.reset()
      subscribeProjection()
    },
  }
}
