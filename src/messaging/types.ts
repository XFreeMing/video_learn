/**
 * Messaging ports — the seams for reliable, transactional event delivery.
 *
 * These abstractions implement the **Transactional Outbox** pattern (events
 * are persisted atomically with aggregate state, then relayed) and
 * **idempotent consumption** (each event is handled at most once).
 *
 * Production uses Drizzle-backed stores; tests use in-memory doubles.
 */

import type { DomainEvent } from '#/event/event-types.ts'
import type { TaskRepository } from '#/repositories/types.ts'

// ── Outbox (write side, inside a transaction) ──────────────────────────

/** Appends domain events to the outbox within the current transaction. */
export interface OutboxStore {
  enqueue: (events: DomainEvent[]) => Promise<void>
}

/** A persisted outbox row awaiting relay to the event bus. */
export interface StoredOutboxEvent {
  id: string
  event: DomainEvent
}

/** Read side of the outbox, used by the relay (outside the write transaction). */
export interface OutboxReader {
  pullPending: (limit: number) => Promise<StoredOutboxEvent[]>
  markPublished: (ids: string[]) => Promise<void>
}

// ── Idempotency (consumer side) ────────────────────────────────────────

/** Tracks which events have already been processed by a given consumer. */
export interface ProcessedEventStore {
  isProcessed: (consumer: string, eventId: string) => Promise<boolean>
  markProcessed: (consumer: string, eventId: string) => Promise<void>
}

// ── Unit of Work (transactional boundary) ──────────────────────────────

/**
 * The transactional context handed to a command. Repository writes and
 * outbox appends performed here commit (or roll back) atomically.
 */
export interface TxContext {
  tasks: TaskRepository
  outbox: OutboxStore
}

/** Runs a command's writes inside a single atomic transaction. */
export interface UnitOfWork {
  run: <T>(work: (ctx: TxContext) => Promise<T>) => Promise<T>
}
