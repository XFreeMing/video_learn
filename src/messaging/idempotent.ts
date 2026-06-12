/**
 * Idempotent consumption — wraps an event handler so each event is processed
 * at most once per named consumer, even under at-least-once delivery from the
 * outbox relay. The processed-event record and the handler's side effects
 * should ideally commit together; here we record AFTER a successful handle so
 * a failed handler is retried (at-least-once), and a duplicate is skipped.
 */

import type { DomainEvent, EventHandler } from '#/event/event-types.ts'
import type { Logger } from '#/lib/ports.ts'
import type { ProcessedEventStore } from './types.ts'

/**
 * Decorate a handler with idempotency keyed by `(consumer, event.id)`.
 *
 * @param consumer  Stable name of the consumer (e.g. 'task-read-projection').
 */
export function makeIdempotent(
  consumer: string,
  store: ProcessedEventStore,
  logger: Logger,
  handler: EventHandler,
): EventHandler {
  return async (event: DomainEvent) => {
    if (await store.isProcessed(consumer, event.id)) {
      logger.info('[idempotent] skip duplicate', { consumer, eventId: event.id })
      return
    }
    await handler(event)
    await store.markProcessed(consumer, event.id)
  }
}
