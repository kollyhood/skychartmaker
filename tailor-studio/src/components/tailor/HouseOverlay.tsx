'use client'

import * as React from 'react'
import { useTailor } from '@/lib/tailor/store'
import { cn } from '@/lib/utils'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import { Copy, Trash2, Maximize2 } from 'lucide-react'
import type { House } from '@/lib/tailor/types'
import { TextLabelEditor } from './TextLabelEditor'

interface Props {
  house: House
  selected: boolean
  canvasRef: React.RefObject<HTMLDivElement | null>
}

type DragMode = 'move' | 'nw' | 'ne' | 'sw' | 'se' | null

export function HouseOverlay({ house, selected, canvasRef }: Props) {
  const selectHouse = useTailor((s) => s.selectHouse)
  const updateHouse = useTailor((s) => s.updateHouse)
  const duplicateHouse = useTailor((s) => s.duplicateHouse)
  const deleteHouse = useTailor((s) => s.deleteHouse)
  const stage = useTailor((s) => s.stage)

  const dragRef = React.useRef<{
    mode: DragMode
    startX: number
    startY: number
    startHouse: House
  } | null>(null)

  const onPointerDown = (e: React.PointerEvent, mode: DragMode) => {
    if (stage !== 'override') return
    e.stopPropagation()
    e.preventDefault()
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    selectHouse(house.id)
    dragRef.current = {
      mode,
      startX: e.clientX,
      startY: e.clientY,
      startHouse: { ...house },
    }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current
    if (!d || !d.mode) return
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const dxPct = ((e.clientX - d.startX) / rect.width) * 100
    const dyPct = ((e.clientY - d.startY) / rect.height) * 100

    let { x, y, w, h } = d.startHouse
    const MIN_W = 4
    const MIN_H = 3

    if (d.mode === 'move') {
      x = clamp(x + dxPct, 0, 100 - w)
      y = clamp(y + dyPct, 0, 100 - h)
    } else if (d.mode === 'nw') {
      const newX = clamp(x + dxPct, 0, x + w - MIN_W)
      const newY = clamp(y + dyPct, 0, y + h - MIN_H)
      w = w + (x - newX)
      h = h + (y - newY)
      x = newX
      y = newY
    } else if (d.mode === 'ne') {
      const newY = clamp(y + dyPct, 0, y + h - MIN_H)
      w = clamp(w + dxPct, MIN_W, 100 - x)
      h = h + (y - newY)
      y = newY
    } else if (d.mode === 'sw') {
      const newX = clamp(x + dxPct, 0, x + w - MIN_W)
      w = w + (x - newX)
      h = clamp(h + dyPct, MIN_H, 100 - y)
      x = newX
    } else if (d.mode === 'se') {
      w = clamp(w + dxPct, MIN_W, 100 - x)
      h = clamp(h + dyPct, MIN_H, 100 - y)
    }

    // Round to 0.5% increments for a "snapped" feel
    const snap = (v: number) => Math.round(v * 2) / 2
    updateHouse(house.id, {
      x: snap(x),
      y: snap(y),
      w: snap(w),
      h: snap(h),
    })
  }

  const onPointerUp = (e: React.PointerEvent) => {
    if (dragRef.current) {
      ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
    }
    dragRef.current = null
  }

  const style: React.CSSProperties = {
    left: `${house.x}%`,
    top: `${house.y}%`,
    width: `${house.w}%`,
    height: `${house.h}%`,
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          data-house-id={house.id}
          style={style}
          onPointerDown={(e) => onPointerDown(e, 'move')}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          className={cn(
            'group absolute cursor-move select-none',
            'rounded-md transition-shadow',
            selected ? 'z-20 ring-2 ring-primary' : 'z-10 ring-1 ring-blue-500/40',
          )}
        >
          {/* translucent blue overlay */}
          <div
            className={cn(
              'pointer-events-none absolute inset-0 rounded-md',
              selected
                ? 'bg-blue-500/15 ring-2 ring-inset ring-blue-500/70'
                : 'bg-blue-500/10 ring-1 ring-inset ring-blue-500/50',
            )}
          />

          {/* label chip */}
          <div
            className={cn(
              'pointer-events-none absolute -top-5 left-0 flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
              selected
                ? 'bg-primary text-primary-foreground'
                : 'bg-blue-500/90 text-white',
            )}
          >
            {house.label}
            {house.kind === 'image' && <span className="opacity-70">· img</span>}
            {house.kind === 'spacer' && <span className="opacity-70">· spc</span>}
          </div>

          {/* text dummy label inside (for text houses) */}
          {house.kind === 'text' && house.typography && (
            <TextLabelEditor house={house} />
          )}

          {/* image houses get a cross-hatch to indicate "image slot" */}
          {house.kind === 'image' && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div
                className="rounded border border-dashed border-blue-500/40 bg-blue-500/5 p-1 text-[10px] font-medium text-blue-700/70"
                style={{ width: '60%' }}
              >
                image
              </div>
            </div>
          )}

          {/* spacer houses get a diagonal stripe pattern */}
          {house.kind === 'spacer' && (
            <div
              className="pointer-events-none absolute inset-0 rounded-md opacity-50"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(45deg, transparent 0, transparent 4px, rgba(59,130,246,0.15) 4px, rgba(59,130,246,0.15) 6px)',
              }}
            />
          )}

          {/* resize corner handles */}
          {selected && stage === 'override' && (
            <>
              <CornerHandle className="left-0 top-0 cursor-nwse-resize" onDown={(e) => onPointerDown(e, 'nw')} />
              <CornerHandle className="right-0 top-0 cursor-nesw-resize" onDown={(e) => onPointerDown(e, 'ne')} />
              <CornerHandle className="left-0 bottom-0 cursor-nesw-resize" onDown={(e) => onPointerDown(e, 'sw')} />
              <CornerHandle className="right-0 bottom-0 cursor-nwse-resize" onDown={(e) => onPointerDown(e, 'se')} />
            </>
          )}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-52">
        <ContextMenuItem onClick={() => duplicateHouse(house.id)}>
          <Copy className="mr-2 h-3.5 w-3.5" />
          Duplicate house
        </ContextMenuItem>
        <ContextMenuItem
          onClick={() => {
            updateHouse(house.id, {
              x: 0,
              y: 0,
              w: 100,
              h: 100,
            })
          }}
        >
          <Maximize2 className="mr-2 h-3.5 w-3.5" />
          Snap to full canvas
        </ContextMenuItem>
        <div className="my-1 h-px bg-slate-200" />
        <div className="px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-slate-400">
          Mark as
        </div>
        {(['text', 'image', 'spacer'] as const).map((k) => (
          <ContextMenuItem
            key={k}
            onClick={() =>
              updateHouse(house.id, {
                kind: k,
                typography: k === 'text' && !house.typography ? {
                  fontFamily: 'Geist',
                  fontSize: 22,
                  color: '#111827',
                  align: 'left',
                  maxChars: 24,
                  letterSpacing: 0,
                  lineHeight: 1.2,
                  weight: 400,
                } : house.typography,
              })
            }
          >
            <span className="mr-2 h-3.5 w-3.5">
              {house.kind === k && '✓'}
            </span>
            {k === 'text' && 'Text block'}
            {k === 'image' && 'Image slot'}
            {k === 'spacer' && 'Spacer / divider'}
          </ContextMenuItem>
        ))}
        <div className="my-1 h-px bg-slate-200" />
        <ContextMenuItem
          onClick={() => deleteHouse(house.id)}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="mr-2 h-3.5 w-3.5" />
          Delete house
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}

function CornerHandle({
  className,
  onDown,
}: {
  className: string
  onDown: (e: React.PointerEvent) => void
}) {
  return (
    <div
      onPointerDown={onDown}
      className={cn(
        'absolute h-3 w-3 rounded-sm border-2 border-primary bg-white shadow-sm',
        className,
      )}
      style={{ transform: 'translate(50%, -50%)' }}
    />
  )
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}
