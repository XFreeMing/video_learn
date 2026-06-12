import Redis from 'ioredis'
import { v4 as uuidv4 } from 'uuid'
import { env } from '../env.ts'
import type { DomainEvent, EventHandler, EventType } from './event-types.ts'

let redis: Redis | null = null

export function getRedis(): Redis | null {
  if (redis) return redis
  if (!env.REDIS_URL) return null

  redis = new Redis(env.REDIS_URL, {
    retryStrategy: (times) => Math.min(times * 50, 2000),
    maxRetriesPerRequest: 3,
  })

  redis.on('error', (err) => console.error('[redis] error:', err.message))
  redis.on('connect', () => console.log('[redis] connected'))

  return redis
}

const CHANNEL = 'baiying:events'

export async function publishEvent<T>(event: DomainEvent<T>): Promise<void> {
  const client = getRedis()
  if (!client) return

  const serialized = JSON.stringify(event)
  await client.publish(CHANNEL, serialized)
}

export function subscribeEvent(
  type: EventType | EventType[] | 'all',
  handler: EventHandler,
): () => void {
  const client = getRedis()
  if (!client) return () => {}

  const subscriber = client.duplicate()
  const subscribeAll = type === 'all'
  const types = subscribeAll ? [] : Array.isArray(type) ? type : [type]

  subscriber.subscribe(CHANNEL).catch((err) => {
    console.error('[event-bus] subscribe error:', err.message)
  })

  subscriber.on('message', (channel, message) => {
    if (channel !== CHANNEL) return
    try {
      const event: DomainEvent = JSON.parse(message)
      if (subscribeAll || types.includes(event.type)) {
        void handler(event)
      }
    } catch {
      // skip malformed events
    }
  })

  return () => {
    subscriber.unsubscribe(CHANNEL).catch(() => {})
    subscriber.quit()
  }
}

export function createEvent<T>(opts: {
  type: EventType
  payload: T
  projectId?: string
  aggregateId?: string
  correlationId?: string
  causationId?: string
  source?: string
}): DomainEvent<T> {
  return {
    id: uuidv4(),
    type: opts.type,
    timestamp: Date.now(),
    projectId: opts.projectId,
    aggregateId: opts.aggregateId,
    payload: opts.payload,
    metadata: {
      source: opts.source,
      correlationId: opts.correlationId,
      causationId: opts.causationId,
    },
  }
}
