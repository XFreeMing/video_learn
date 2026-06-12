import { and, eq } from 'drizzle-orm'
import { processedEvents } from '#/db/schema/messaging.ts'
import type { DbOrTx } from '#/db/types.ts'
import type { ProcessedEventStore } from './types.ts'

/**
 * Drizzle-backed idempotency ledger. The composite primary key
 * `(consumer, event_id)` makes `markProcessed` naturally conflict-safe.
 */
export class DrizzleProcessedEventStore implements ProcessedEventStore {
  constructor(private db: DbOrTx) {}

  async isProcessed(consumer: string, eventId: string): Promise<boolean> {
    const rows = await this.db
      .select({ eventId: processedEvents.eventId })
      .from(processedEvents)
      .where(and(eq(processedEvents.consumer, consumer), eq(processedEvents.eventId, eventId)))
      .limit(1)
    return rows.length > 0
  }

  async markProcessed(consumer: string, eventId: string): Promise<void> {
    await this.db.insert(processedEvents).values({ consumer, eventId }).onConflictDoNothing()
  }
}
