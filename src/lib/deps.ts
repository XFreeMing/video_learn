/**
 * Production dependency wiring.
 *
 * This is the ONLY place where concrete infrastructure (Drizzle, Redis,
 * system clock, console logger) is assembled into the `Dependencies`
 * bundle that services consume. Swap any line here to change the runtime
 * without touching business logic.
 *
 * CQRS / outbox split:
 *  - `uow`     → command side: aggregate writes + outbox, in one transaction.
 *  - `queries` → read side: denormalized read models maintained by projections.
 *
 * The write path only persists events to the outbox. A background worker
 * (`startEventWorkers`) relays them to the event bus and feeds the
 * idempotent projection that maintains the read model.
 */

import { db } from '#/db/index.ts'
import { makeIdempotent } from '#/messaging/idempotent.ts'
import { DrizzleOutboxReader } from '#/messaging/outbox.drizzle.ts'
import { startOutboxRelay } from '#/messaging/outbox-relay.ts'
import { DrizzleProcessedEventStore } from '#/messaging/processed-events.drizzle.ts'
import { DrizzleUnitOfWork } from '#/messaging/unit-of-work.drizzle.ts'
import { createTaskProjection, TASK_PROJECTION_CONSUMER } from '#/projections/task-projection.ts'
import { DrizzleTaskReadStore } from '#/repositories/task-read.drizzle.ts'
import { systemClock } from './clock.ts'
import { redisEventBus } from './container.ts'
import { consoleLogger } from './logger.ts'
import type { Dependencies } from './ports.ts'

let cached: Dependencies | null = null

/** Build (and memoize) the production dependency bundle. */
export function createProductionDeps(): Dependencies {
  if (cached) return cached
  cached = {
    clock: systemClock,
    logger: consoleLogger,
    eventBus: redisEventBus,
    uow: new DrizzleUnitOfWork(db),
    queries: {
      tasks: new DrizzleTaskReadStore(db),
    },
  }
  return cached
}

/**
 * Start the background event workers for a long-lived process:
 *  1. the outbox relay loop (DB outbox → event bus), and
 *  2. the idempotent read-model projection (event bus → read view).
 *
 * Call once at server startup. Returns a stop function for graceful shutdown.
 */
export function startEventWorkers(): () => void {
  const logger = consoleLogger

  const projection = makeIdempotent(
    TASK_PROJECTION_CONSUMER,
    new DrizzleProcessedEventStore(db),
    logger,
    createTaskProjection(new DrizzleTaskReadStore(db), logger),
  )
  const unsubscribe = redisEventBus.subscribe('all', projection)

  const stopRelay = startOutboxRelay(new DrizzleOutboxReader(db), redisEventBus, logger)

  return () => {
    stopRelay()
    unsubscribe()
  }
}
