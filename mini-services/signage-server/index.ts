import { createServer, IncomingMessage, ServerResponse } from 'http'
import { Server, Socket } from 'socket.io'
import { SignagePayload } from '../../src/signage/types'

/**
 * Signage Server — standalone relay between external systems and renderers.
 *
 * Two listeners, one process:
 *
 *   1. WS   (port 3004) — Socket.IO with path '/', as required by Caddy.
 *                          Renderer browsers connect here to receive payloads.
 *
 *   2. REST (port 3005) — Plain HTTP server that accepts `POST /send`
 *                          from external systems (POS, back-office, curl, …)
 *                          and forwards payloads to all connected renderers.
 *
 * Both interfaces accept the same SignagePayload shape:
 *
 *   { action: 'add' | 'addMany' | 'update' | 'remove' | 'clear' |
 *              'setGridMode' | 'setCustomGrid' | 'setGap' |
 *              'setStageTemplate' | 'setBoxTemplate', ... }
 *
 * The server is intentionally stateless — the renderer is the single
 * source of truth for visual state; the server is just a relay.
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. WebSocket server (port 3004)
// ─────────────────────────────────────────────────────────────────────────────

const wsHttpServer = createServer()
const io = new Server(wsHttpServer, {
  path: '/',
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 60000,
  pingInterval: 25000,
})

io.on('connection', (socket: Socket) => {
  console.log(`[WS] client connected: ${socket.id} (total: ${io.engine.clientsCount})`)

  // Broadcast current client count to all renderers (so they can display it)
  io.emit('client-count', io.engine.clientsCount)

  // A browser can also push payloads through the WS — useful for debugging
  socket.on('payload', (payload: SignagePayload) => {
    console.log(`[WS] payload from ${socket.id}: action=${payload.action}`)
    io.emit('payload', payload)
  })

  socket.on('disconnect', () => {
    console.log(`[WS] client disconnected: ${socket.id} (total: ${io.engine.clientsCount})`)
    io.emit('client-count', io.engine.clientsCount)
  })

  socket.on('error', (err) => {
    console.error(`[WS] socket error (${socket.id}):`, err)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 2. REST server (port 3005)
// ─────────────────────────────────────────────────────────────────────────────

const restHttpServer = createServer(
  async (req: IncomingMessage, res: ServerResponse) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    if (req.method === 'OPTIONS') {
      res.writeHead(204)
      res.end()
      return
    }

    if (req.method === 'GET' && req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(
        JSON.stringify({
          ok: true,
          wsClients: io.engine.clientsCount,
          wsPort: 3004,
          restPort: 3005,
        }),
      )
      return
    }

    if (req.method === 'POST' && req.url === '/send') {
      let body = ''
      for await (const chunk of req) body += chunk
      try {
        const payload = JSON.parse(body) as SignagePayload
        console.log(`[REST /send] broadcasting action=${payload.action}`)
        io.emit('payload', payload)
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(
          JSON.stringify({
            ok: true,
            broadcast: true,
            wsClients: io.engine.clientsCount,
          }),
        )
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: false, error: (e as Error).message }))
      }
      return
    }

    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ok: false, error: 'Not found' }))
  },
)

// ─────────────────────────────────────────────────────────────────────────────
// 3. Start both servers
// ─────────────────────────────────────────────────────────────────────────────

const WS_PORT = 3004
const REST_PORT = 3005

wsHttpServer.listen(WS_PORT, () => {
  console.log(`\n[signage-server] WS   on port ${WS_PORT}   (browser connects here)`)
  console.log(`                 io('/?XTransformPort=${WS_PORT}')`)
})

restHttpServer.listen(REST_PORT, () => {
  console.log(`[signage-server] REST on port ${REST_PORT}   (external systems POST here)`)
  console.log(`                 POST /send   (any SignagePayload)`)
  console.log(`                 GET  /health\n`)
})

// ─────────────────────────────────────────────────────────────────────────────
// 4. Resilience
// ─────────────────────────────────────────────────────────────────────────────

process.on('uncaughtException', (err) => {
  console.error('[FATAL] uncaughtException:', err)
})
process.on('unhandledRejection', (reason) => {
  console.error('[FATAL] unhandledRejection:', reason)
})

process.on('SIGTERM', () => {
  console.log('[SIGTERM] shutting down...')
  wsHttpServer.close()
  restHttpServer.close(() => process.exit(0))
})
process.on('SIGINT', () => {
  console.log('[SIGINT] shutting down...')
  wsHttpServer.close()
  restHttpServer.close(() => process.exit(0))
})

setInterval(() => {
  console.log(
    `[heartbeat] wsClients=${io.engine.clientsCount} uptime=${Math.round(process.uptime())}s`,
  )
}, 30000)
