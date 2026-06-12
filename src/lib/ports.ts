/**
 * Infrastructure ports — the seams that make business logic testable.
 *
 * Services depend ONLY on these interfaces, never on concrete infra
 * (Drizzle, Redis, Date, console). Production wiring lives in `deps.ts`;
 * test doubles live in `tests/`.
 */

import type { DomainEvent, EventHandler, EventType } from '#/event/event-types.ts'
import type { UnitOfWork } from '#/messaging/types.ts'
import type { QueryRepositories } from '#/repositories/types.ts'

// ── Clock ──────────────────────────────────────────────────────────────

/** Time + id generation, abstracted for deterministic tests. */
export interface Clock {
  now: () => number
  uuid: () => string
}

// ── Logger ─────────────────────────────────────────────────────────────

export interface Logger {
  info: (msg: string, ctx?: Record<string, unknown>) => void
  warn: (msg: string, ctx?: Record<string, unknown>) => void
  error: (msg: string, ctx?: Record<string, unknown>) => void
}

// ── Event Bus ──────────────────────────────────────────────────────────

export interface EventBus {
  publish: <T>(event: DomainEvent<T>) => Promise<void>
  subscribe: (type: EventType | EventType[] | 'all', handler: EventHandler) => () => void
}

// ── Aggregated Dependencies ────────────────────────────────────────────

/**
 * The full dependency bundle handed to services. A service typically
 * narrows this to the slice it needs in its constructor.
 *
 * CQRS split:
 *  - `uow`      → command/write side (transactional: aggregate + outbox)
 *  - `queries`  → read side (denormalized read models / projections)
 */
export interface Dependencies {
  clock: Clock
  logger: Logger
  eventBus: EventBus
  uow: UnitOfWork
  queries: QueryRepositories
}
