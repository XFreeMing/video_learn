/**
 * Dependency surface for services.
 *
 * Services depend on the abstract ports defined in `ports.ts` (Clock,
 * Logger, EventBus) plus the Repositories bag. Production wiring lives in
 * `deps.ts`; test doubles live under `tests/`.
 *
 * This module re-exports the port types for ergonomic imports and provides
 * the EventBus adapter over the Redis-backed event-bus module.
 */

import { publishEvent, subscribeEvent } from '#/event/event-bus.ts'
import type { Clock, Dependencies, EventBus, Logger } from './ports.ts'

export type { Clock, Dependencies, EventBus, Logger }

/** EventBus adapter over the Redis pub/sub implementation. */
export const redisEventBus: EventBus = {
  publish: publishEvent,
  subscribe: subscribeEvent,
}
