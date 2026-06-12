import { index, jsonb, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core'

/**
 * Transactional outbox.
 *
 * Domain events are inserted here in the SAME transaction that mutates
 * aggregate state. A relay process later publishes them to the event bus
 * and stamps `publishedAt`, guaranteeing at-least-once delivery without
 * dual-write inconsistency.
 */
export const outboxEvents = pgTable(
  'outbox_events',
  {
    id: uuid('id').primaryKey(),
    type: text('type').notNull(),
    aggregateId: uuid('aggregate_id'),
    projectId: uuid('project_id'),
    payload: jsonb('payload').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    publishedAt: timestamp('published_at'),
  },
  (table) => [index('outbox_pending_idx').on(table.publishedAt, table.createdAt)],
)

/**
 * Idempotency ledger for consumers.
 *
 * A `(consumer, event_id)` row marks an event as already handled, so retries
 * (inherent to at-least-once delivery) become no-ops.
 */
export const processedEvents = pgTable(
  'processed_events',
  {
    consumer: text('consumer').notNull(),
    eventId: uuid('event_id').notNull(),
    processedAt: timestamp('processed_at').defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.consumer, table.eventId] })],
)
