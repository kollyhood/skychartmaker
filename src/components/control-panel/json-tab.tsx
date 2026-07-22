'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Send, Copy } from 'lucide-react'
import {
  payloadToAction,
  type SignageAction,
  type SignagePayload,
} from '@/signage'

interface JsonTabProps {
  dispatch: (a: SignageAction) => void
  log: { ts: number; payload: SignagePayload }[]
}

const EXAMPLE_PAYLOADS: { label: string; payload: SignagePayload }[] = [
  {
    label: 'Add actor',
    payload: {
      action: 'add',
      id: 'banana',
      content: { title: 'Banana', subtitle: '$0.7', badge: '30% OFF', emoji: '🍌', accentColor: '#FACC15' },
    },
  },
  {
    label: 'Add full-stage hero',
    payload: {
      action: 'add',
      id: 'hero',
      fullStage: true,
      content: { title: 'SPECIAL PROMO', subtitle: 'up to 50% OFF', accentColor: '#F97316' },
    },
  },
  {
    label: 'Update actor',
    payload: {
      action: 'update',
      id: 'banana',
      content: { subtitle: '$0.5', badge: '50% OFF' },
    },
  },
  {
    label: 'Set grid 2×2',
    payload: { action: 'setGridMode', modeId: '2x2' },
  },
  {
    label: 'Set grid full',
    payload: { action: 'setGridMode', modeId: 'full' },
  },
  {
    label: 'Switch stage',
    payload: { action: 'setStageTemplate', templateId: 'dark-premium' },
  },
  {
    label: 'Switch box template',
    payload: { action: 'setBoxTemplate', templateId: 'clearance-card' },
  },
  {
    label: 'Clear all',
    payload: { action: 'clear' },
  },
]

export function JsonTab({ dispatch, log }: JsonTabProps) {
  const [jsonInput, setJsonInput] = useState(
    JSON.stringify(EXAMPLE_PAYLOADS[0].payload, null, 2),
  )
  const [jsonError, setJsonError] = useState<string | null>(null)

  const sendJson = () => {
    setJsonError(null)
    try {
      const parsed = JSON.parse(jsonInput) as SignagePayload
      dispatch(payloadToAction(parsed))
    } catch (e) {
      setJsonError(e instanceof Error ? e.message : 'Invalid JSON')
    }
  }

  return (
    <div className="space-y-4">
      {/* ── Example payloads ── */}
      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wider text-slate-500">
          Examples (click to load)
        </Label>
        <div className="flex flex-wrap gap-1.5">
          {EXAMPLE_PAYLOADS.map((ex) => (
            <button
              key={ex.label}
              onClick={() => setJsonInput(JSON.stringify(ex.payload, null, 2))}
              className="flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700 hover:border-slate-300 hover:bg-slate-50"
            >
              <Copy className="h-3 w-3" />
              {ex.label}
            </button>
          ))}
        </div>
      </div>

      <Separator />

      {/* ── JSON input ── */}
      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wider text-slate-500">
          Payload
        </Label>
        <Textarea
          value={jsonInput}
          onChange={(e) => setJsonInput(e.target.value)}
          className="min-h-[180px] font-mono text-xs"
          spellCheck={false}
        />
        {jsonError && (
          <div className="rounded-md bg-red-50 px-2 py-1 text-xs text-red-700">
            {jsonError}
          </div>
        )}
        <Button size="sm" onClick={sendJson} className="w-full">
          <Send className="h-4 w-4" /> Dispatch
        </Button>
      </div>

      <Separator />

      {/* ── Recent payloads log ── */}
      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wider text-slate-500">
          Recent Payloads ({log.length})
        </Label>
        <ScrollArea className="max-h-48 pr-2">
          {log.length === 0 ? (
            <div className="text-xs text-slate-400">No payloads yet</div>
          ) : (
            <div className="space-y-1">
              {log.map((entry, i) => (
                <div
                  key={i}
                  className="rounded-md bg-slate-50 px-2 py-1 font-mono text-[10px] text-slate-700"
                >
                  <span className="text-slate-400">
                    {new Date(entry.ts).toLocaleTimeString()} ·
                  </span>{' '}
                  <span className="font-semibold text-primary">
                    {entry.payload.action}
                  </span>
                  {'id' in entry.payload ? ` · ${entry.payload.id}` : ''}
                  {'modeId' in entry.payload ? ` · ${entry.payload.modeId}` : ''}
                  {'templateId' in entry.payload ? ` · ${entry.payload.templateId}` : ''}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  )
}
