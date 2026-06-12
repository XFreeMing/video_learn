/**
 * In-memory messaging infrastructure for tests.
 *
 * - `InMemoryUnitOfWork` simulates a real transaction: writes go to a staging
 *   copy and are committed only if the work callback resolves; a thrown error
 *   discards everything (true rollback semantics for tests).
 * - It also implements `OutboxReader` so the relay can drain pending events.
 * - `InMemoryProcessedEventStore` backs idempotent consumption.
 */

import type {
  OutboxReader,
  ProcessedEventStore,
  StoredOutboxEvent,
  TxContext,
  UnitOfWork,
} from '#/messaging/types.ts'
import type { TaskRecord } from '#/repositories/types.ts'
import { mapBackedTaskRepository } from './in-memory-repositories.ts'

export class InMemoryUnitOfWork implements UnitOfWork, OutboxReader {
  // Committed state.
  private tasks = new Map<string, TaskRecord>()
  private outbox: StoredOutboxEvent[] = []
  private published = new Set<string>()

  async run<T>(work: (ctx: TxContext) => Promise<T>): Promise<T> {
    // Stage: clone committed task state; buffer outbox appends.
    const staging = new Map(this.tasks)
    const stagedOutbox: StoredOutboxEvent[] = []

    const ctx: TxContext = {
      tasks: mapBackedTaskRepository(staging),
      outbox: {
        async enqueue(events) {
          for (const event of events) stagedOutbox.push({ id: event.id, event })
        },
      },
    }

    // If work throws, nothing below runs → no commit (rollback).
    const result = await work(ctx)

    // Commit atomically.
    this.tasks = staging
    this.outbox.push(...stagedOutbox)
    return result
  }

  // ── OutboxReader ─────────────────────────────────────────────────────

  async pullPending(limit: number): Promise<StoredOutboxEvent[]> {
    return this.outbox.filter((o) => !this.published.has(o.id)).slice(0, limit)
  }

  async markPublished(ids: string[]): Promise<void> {
    for (const id of ids) this.published.add(id)
  }

  // Test introspection helper.
  pendingCount(): number {
    return this.outbox.filter((o) => !this.published.has(o.id)).length
  }
}

export class InMemoryProcessedEventStore implements ProcessedEventStore {
  private seen = new Set<string>()

  private key(consumer: string, eventId: string): string {
    return `${consumer}:${eventId}`
  }

  async isProcessed(consumer: string, eventId: string): Promise<boolean> {
    return this.seen.has(this.key(consumer, eventId))
  }

  async markProcessed(consumer: string, eventId: string): Promise<void> {
    this.seen.add(this.key(consumer, eventId))
  }
}
