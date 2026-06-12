import { and, asc, inArray, isNull, sql } from 'drizzle-orm'
import { outboxEvents } from '#/db/schema/messaging.ts'
import type { DbOrTx } from '#/db/types.ts'
import type { DomainEvent } from '#/event/event-types.ts'
import type { OutboxReader, OutboxStore, StoredOutboxEvent } from './types.ts'

type OutboxRow = typeof outboxEvents.$inferSelect

function toStored(row: OutboxRow): StoredOutboxEvent {
  return {
    id: row.id,
    event: {
      id: row.id,
      type: row.type as DomainEvent['type'],
      timestamp: row.createdAt.getTime(),
      aggregateId: row.aggregateId ?? undefined,
      projectId: row.projectId ?? undefined,
      payload: row.payload,
    },
  }
}

/**
 * Write side of the outbox — appends events inside the active transaction.
 * Bind this to the same `tx` as the aggregate repository for atomicity.
 */
export class DrizzleOutboxStore implements OutboxStore {
  constructor(private db: DbOrTx) {}

  async enqueue(events: DomainEvent[]): Promise<void> {
    if (events.length === 0) return
    await this.db.insert(outboxEvents).values(
      events.map((event) => ({
        id: event.id,
        type: event.type,
        aggregateId: event.aggregateId ?? null,
        projectId: event.projectId ?? null,
        payload: event.payload as object,
        createdAt: new Date(event.timestamp),
      })),
    )
  }
}

/**
 * Read side of the outbox — used by the relay loop outside the write
 * transaction. Pulls unpublished events oldest-first and stamps them done.
 */
export class DrizzleOutboxReader implements OutboxReader {
  constructor(private db: DbOrTx) {}

  async pullPending(limit: number): Promise<StoredOutboxEvent[]> {
    const rows = await this.db
      .select()
      .from(outboxEvents)
      .where(isNull(outboxEvents.publishedAt))
      .orderBy(asc(outboxEvents.createdAt))
      .limit(limit)
    return rows.map(toStored)
  }

  async markPublished(ids: string[]): Promise<void> {
    if (ids.length === 0) return
    await this.db
      .update(outboxEvents)
      .set({ publishedAt: sql`now()` })
      .where(and(inArray(outboxEvents.id, ids), isNull(outboxEvents.publishedAt)))
  }
}
