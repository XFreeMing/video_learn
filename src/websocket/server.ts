import { WebSocket, WebSocketServer } from 'ws'
import { env } from '../env.ts'
import { subscribeEvent } from '../event/event-bus.ts'
import type { DomainEvent, EventType } from '../event/event-types.ts'

const subscriptions = new Map<WebSocket, Set<EventType>>()

export function startWebSocketServer(): { close: () => void } {
  const wss = new WebSocketServer({ port: env.WS_PORT })

  wss.on('connection', (ws: WebSocket, req) => {
    console.log('[ws] client connected', req.socket.remoteAddress)
    subscriptions.set(ws, new Set())

    ws.on('message', (raw: string) => {
      try {
        const msg = JSON.parse(raw.toString())
        if (msg.type === 'subscribe') {
          const types: EventType[] = msg.events || []
          const set = subscriptions.get(ws)
          set?.clear()
          for (const t of types) set?.add(t)
          ws.send(JSON.stringify({ type: 'subscribed', events: types }))
        }
      } catch {
        // ignore malformed messages
      }
    })

    ws.on('close', () => {
      subscriptions.delete(ws)
    })

    ws.on('error', (err) => {
      console.error('[ws] error:', err.message)
    })
  })

  // Bridge: event-bus -> ws clients
  const unsubscribe = subscribeEvent('all', (event: DomainEvent) => {
    const data = JSON.stringify(event)
    for (const [ws, types] of subscriptions) {
      if (ws.readyState === WebSocket.OPEN) {
        if (types.size === 0 || types.has(event.type)) {
          ws.send(data)
        }
      }
    }
  })

  console.log(`[ws] server started on port ${env.WS_PORT}`)

  return {
    close: () => {
      unsubscribe()
      wss.close()
      console.log('[ws] server closed')
    },
  }
}
