/**
 * Outbox relay — drains persisted outbox events and publishes them to the
 * event bus, then marks them published. This is the second half of the
 * Transactional Outbox pattern: writes commit events atomically with state,
 * and the relay reliably forwards them (at-least-once).
 *
 * Run `relayOnce` from a background loop/cron in production. Because delivery
 * is at-least-once, consumers MUST be idempotent (see `idempotent.ts`).
 */

import type { EventBus, Logger } from '#/lib/ports.ts'
import type { OutboxReader } from './types.ts'

export interface RelayOptions {
  batchSize?: number
}

/** Publish one batch of pending outbox events. Returns the count published. */
export async function relayOnce(
  outbox: OutboxReader,
  eventBus: EventBus,
  logger: Logger,
  options: RelayOptions = {},
): Promise<number> {
  const batchSize = options.batchSize ?? 100
  const pending = await outbox.pullPending(batchSize)
  if (pending.length === 0) return 0

  const publishedIds: string[] = []
  for (const row of pending) {
    try {
      await eventBus.publish(row.event)
      publishedIds.push(row.id)
    } catch (err) {
      // Leave it pending; it will be retried on the next pass.
      logger.error('[outbox] publish failed, will retry', {
        outboxId: row.id,
        eventType: row.event.type,
        error: (err as Error).message,
      })
    }
  }

  if (publishedIds.length > 0) {
    await outbox.markPublished(publishedIds)
  }
  return publishedIds.length
}

/**
 * Start a polling relay loop. Returns a stop function. Intended for a
 * long-lived process; uses a simple setInterval-free recursive timer so a
 * slow batch never overlaps the next tick.
 */
export function startOutboxRelay(
  outbox: OutboxReader,
  eventBus: EventBus,
  logger: Logger,
  options: RelayOptions & { intervalMs?: number } = {},
): () => void {
  const intervalMs = options.intervalMs ?? 1000
  let stopped = false
  let timer: ReturnType<typeof setTimeout> | undefined

  const tick = async () => {
    if (stopped) return
    try {
      await relayOnce(outbox, eventBus, logger, options)
    } catch (err) {
      logger.error('[outbox] relay tick failed', { error: (err as Error).message })
    }
    if (!stopped) timer = setTimeout(tick, intervalMs)
  }

  timer = setTimeout(tick, intervalMs)

  return () => {
    stopped = true
    if (timer) clearTimeout(timer)
  }
}
