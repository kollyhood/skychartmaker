'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { SignageRenderer, payloadToAction, useSignage, type SignagePayload } from '@/signage'
import { ControlPanel } from '@/components/control-panel'
import { ShoppingCart } from 'lucide-react'

export default function Home() {
  const { state, dispatch } = useSignage()
  const [wsConnected, setWsConnected] = useState(false)
  const [wsClientCount, setWsClientCount] = useState(0)
  const [log, setLog] = useState<{ ts: number; payload: SignagePayload }[]>([])
  const socketRef = useRef<Socket | null>(null)

  // Wrap dispatch so every action is also logged as a payload (for the JSON tab)
  const dispatchWithLog = useCallback(
    (action: Parameters<typeof dispatch>[0]) => {
      dispatch(action)
      // Reverse-map action → payload for logging
      let payload: SignagePayload
      switch (action.type) {
        case 'add':
          payload = { action: 'add', ...action.actor }
          break
        case 'addMany':
          payload = { action: 'addMany', actors: action.actors }
          break
        case 'update':
          payload = { action: 'update', id: action.id, content: action.content }
          break
        case 'remove':
          payload = { action: 'remove', id: action.id }
          break
        case 'clear':
          payload = { action: 'clear' }
          break
        case 'setGridMode':
          payload = { action: 'setGridMode', modeId: action.modeId }
          break
        case 'setCustomGrid':
          payload = {
            action: 'setCustomGrid',
            rows: action.rows,
            cols: action.cols,
            gap: action.gap,
          }
          break
        case 'setGap':
          payload = { action: 'setGap', gap: action.gap }
          break
        case 'setStageTemplate':
          payload = { action: 'setStageTemplate', templateId: action.templateId }
          break
        case 'setBoxTemplate':
          payload = { action: 'setBoxTemplate', templateId: action.templateId }
          break
        default:
          return
      }
      setLog((prev) => [{ ts: Date.now(), payload }, ...prev].slice(0, 30))
    },
    [dispatch],
  )

  useEffect(() => {
    // Connect to the signage WebSocket mini-service.
    // Must be accessed through Caddy (port 81 / preview URL) — loading
    // directly from port 3000 bypasses Caddy and the socket cannot connect.
    const socket = io('/?XTransformPort=3004', {
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1500,
      timeout: 20000,
    })
    socketRef.current = socket

    socket.on('connect', () => setWsConnected(true))
    socket.on('disconnect', () => {
      setWsConnected(false)
      setWsClientCount(0)
    })
    socket.on('connect_error', () => setWsConnected(false))

    // Live payloads from external systems (via REST /send → WS broadcast)
    socket.on('payload', (payload: SignagePayload) => {
      dispatch(payloadToAction(payload))
      setLog((prev) => [{ ts: Date.now(), payload }, ...prev].slice(0, 30))
    })

    // Server pushes client count periodically so we can show how many
    // renderers are connected (useful for fleet deployments).
    socket.on('client-count', (count: number) => setWsClientCount(count))

    return () => {
      socket.disconnect()
    }
  }, [dispatch])

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      {/* ── Top bar ── */}
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-600 text-white">
              <ShoppingCart className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-sm font-bold leading-tight sm:text-base">
                Signage Renderer — Standalone System
              </h1>
              <p className="text-[11px] text-slate-500 sm:text-xs">
                Pluggable stages · box templates · grid presets · live WS
              </p>
            </div>
          </div>
          <div className="hidden items-center gap-2 text-xs text-slate-500 sm:flex">
            <span className="rounded-md bg-slate-100 px-2 py-1 font-mono">
              stage: {state.stageTemplateId}
            </span>
            <span className="rounded-md bg-slate-100 px-2 py-1 font-mono">
              box: {state.boxTemplateId}
            </span>
            <span className="rounded-md bg-slate-100 px-2 py-1 font-mono">
              grid: {state.gridModeId === 'custom'
                ? `${state.customGrid.rows}×${state.customGrid.cols}`
                : state.gridModeId}
            </span>
            <span className="rounded-md bg-slate-100 px-2 py-1 font-mono">
              actors: {state.actors.length}
            </span>
          </div>
        </div>
      </header>

      {/* ── Main layout ── */}
      <main className="mx-auto max-w-[1600px] px-4 py-4 sm:px-6 sm:py-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_400px] lg:gap-6">
          {/* Renderer — keeps a 9:16 portrait aspect ratio like the original flyer */}
          <div className="order-2 lg:order-1">
            <div className="relative mx-auto aspect-[9/16] w-full max-w-[640px] lg:aspect-[3/4] lg:max-w-none">
              <SignageRenderer state={state} />
            </div>
            <p className="mt-3 text-center text-xs text-slate-500">
              The stage is static. Actors appear/disappear based on{' '}
              <code className="rounded bg-white px-1.5 py-0.5 font-mono">add</code> /{' '}
              <code className="rounded bg-white px-1.5 py-0.5 font-mono">update</code> /{' '}
              <code className="rounded bg-white px-1.5 py-0.5 font-mono">remove</code> payloads.
            </p>
          </div>

          {/* Control panel */}
          <div className="order-1 lg:order-2 lg:h-[calc(100vh-120px)]">
            <ControlPanel
              state={state}
              dispatch={dispatchWithLog}
              log={log}
              wsConnected={wsConnected}
              wsClientCount={wsClientCount}
            />
          </div>
        </div>
      </main>
    </div>
  )
}
