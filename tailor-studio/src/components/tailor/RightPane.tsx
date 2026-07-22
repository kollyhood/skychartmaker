'use client'

import * as React from 'react'
import { useTailor } from '@/lib/tailor/store'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import {
  Upload,
  Grid3x3,
  Type,
  Rocket,
  Eye,
  Maximize2,
  Copy,
  Trash2,
  PlusSquare,
  ImageOff,
  Monitor,
  Tv,
  CheckCircle2,
} from 'lucide-react'
import type { House } from '@/lib/tailor/types'
import { HouseOverlay } from './HouseOverlay'
import { TextLabelEditor } from './TextLabelEditor'
import { PublishPreview } from './PublishPreview'

export function RightPane() {
  const stage = useTailor((s) => s.stage)
  const image = useTailor((s) => s.image)
  const houses = useTailor((s) => s.houses)
  const selectedHouseId = useTailor((s) => s.selectedHouseId)
  const draftRect = useTailor((s) => s.draftRect)
  const showGridOverlay = useTailor((s) => s.showGridOverlay)
  const showFontPanel = useTailor((s) => s.showFontPanel)
  const toggleGridOverlay = useTailor((s) => s.toggleGridOverlay)
  const toggleFontPanel = useTailor((s) => s.toggleFontPanel)
  const publish = useTailor((s) => s.publish)
  const uploadImage = useTailor((s) => s.uploadImage)

  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const canvasRef = React.useRef<HTMLDivElement>(null)

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const src = reader.result as string
      const img = new window.Image()
      img.onload = () => {
        uploadImage({
          src,
          name: file.name,
          width: img.naturalWidth,
          height: img.naturalHeight,
        })
      }
      img.src = src
    }
    reader.readAsDataURL(file)
    // reset input so the same file can be re-uploaded
    e.target.value = ''
  }

  // Right-click "empty space" handling for duplicating / adding a house.
  const onCanvasContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
    if (stage !== 'override') return
    // We only handle the case where the user right-clicked the bare canvas.
    // Right-clicks on houses are handled by the house overlay itself.
    if ((e.target as HTMLElement).closest('[data-house-id]')) return
    e.preventDefault()
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const xPct = ((e.clientX - rect.left) / rect.width) * 100
    const yPct = ((e.clientY - rect.top) / rect.height) * 100
    useTailor.getState().addHouseAt(xPct, yPct)
  }

  // Click-and-drag to draw a new House from scratch on empty canvas. Once a
  // draft starts, tracking moves to window-level listeners (rather than
  // relying on setPointerCapture) so the drag keeps working even if the
  // pointer momentarily leaves the canvas bounds mid-gesture.
  const isDrafting = useTailor((s) => !!s.draftRect)

  const onCanvasPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (stage !== 'override') return
    if (e.button !== 0) return // left-click only; right-click keeps the quick-add flow
    if ((e.target as HTMLElement).closest('[data-house-id]')) return
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const xPct = ((e.clientX - rect.left) / rect.width) * 100
    const yPct = ((e.clientY - rect.top) / rect.height) * 100
    useTailor.getState().beginDraft(xPct, yPct)
  }

  React.useEffect(() => {
    if (!isDrafting) return
    const toPct = (clientX: number, clientY: number) => {
      const rect = canvasRef.current?.getBoundingClientRect()
      if (!rect) return null
      return {
        xPct: ((clientX - rect.left) / rect.width) * 100,
        yPct: ((clientY - rect.top) / rect.height) * 100,
      }
    }
    const onMove = (e: PointerEvent) => {
      const pct = toPct(e.clientX, e.clientY)
      if (!pct) return
      useTailor.getState().updateDraft(pct.xPct, pct.yPct)
    }
    const onUp = () => {
      useTailor.getState().commitDraft()
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [isDrafting])

  return (
    <div className="flex h-full flex-col bg-slate-100">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Interactive Live Canvas
          </span>
          <Badge variant="outline" className="ml-1 bg-slate-50 text-[10px] font-medium text-slate-500">
            {stage === 'idle' && 'Awaiting upload'}
            {stage === 'uploading' && 'Receiving…'}
            {stage === 'analyzing' && 'Detecting…'}
            {stage === 'override' && 'Edit mode'}
            {stage === 'publishing' && 'Publishing…'}
            {stage === 'published' && 'Deployed'}
          </Badge>
        </div>

        <div className="flex items-center gap-4">
          {(stage === 'override' || stage === 'publishing' || stage === 'published') && (
            <>
              <div className="flex items-center gap-1.5">
                <Grid3x3 className="h-3.5 w-3.5 text-slate-500" />
                <Label htmlFor="grid-toggle" className="cursor-pointer text-[11px] text-slate-600">
                  Houses
                </Label>
                <Switch
                  id="grid-toggle"
                  checked={showGridOverlay}
                  onCheckedChange={(v) => toggleGridOverlay(v)}
                  disabled={stage === 'published'}
                />
              </div>
              <div className="flex items-center gap-1.5">
                <Type className="h-3.5 w-3.5 text-slate-500" />
                <Label htmlFor="font-toggle" className="cursor-pointer text-[11px] text-slate-600">
                  Typefaces
                </Label>
                <Switch
                  id="font-toggle"
                  checked={showFontPanel}
                  onCheckedChange={(v) => toggleFontPanel(v)}
                />
              </div>
            </>
          )}

          <Button
            size="sm"
            className="h-7 gap-1.5 text-xs"
            disabled={stage !== 'override'}
            onClick={publish}
          >
            <Rocket className="h-3.5 w-3.5" />
            Publish Layout
          </Button>
        </div>
      </div>

      {/* Canvas viewport */}
      <div className="relative flex-1 overflow-hidden p-6">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onPickFile}
        />

        {stage === 'idle' ? (
          <EmptyDropZone onPick={() => fileInputRef.current?.click()} />
        ) : stage === 'published' ? (
          <PublishPreview />
        ) : (
          <div
            id="tailor-canvas-shell"
            ref={canvasRef}
            onContextMenu={onCanvasContextMenu}
            onPointerDown={onCanvasPointerDown}
            className={cn(
              'relative mx-auto h-full max-h-full w-full overflow-hidden rounded-xl bg-white shadow-[0_8px_40px_-12px_rgba(0,0,0,0.15)] ring-1 ring-slate-200',
              stage === 'override' && 'cursor-crosshair',
            )}
          >
            {/* Image layer */}
            {image && (
              <img
                src={image.src}
                alt={image.name}
                className="absolute inset-0 h-full w-full object-contain"
                draggable={false}
              />
            )}

            {/* Analyzing shimmer overlay */}
            {stage === 'analyzing' && <AnalyzingShimmer />}

            {/* Houses overlay layer */}
            {showGridOverlay && stage !== 'uploading' && stage !== 'analyzing' && (
              <div className="absolute inset-0">
                {houses.map((h) => (
                  <HouseOverlay
                    key={h.id}
                    house={h}
                    canvasRef={canvasRef}
                    selected={selectedHouseId === h.id}
                  />
                ))}
              </div>
            )}

            {/* Live preview of the House currently being drawn */}
            {draftRect && (
              <div
                className="pointer-events-none absolute z-30 rounded-md border-2 border-dashed border-primary bg-primary/10"
                style={{
                  left: `${draftRect.x}%`,
                  top: `${draftRect.y}%`,
                  width: `${draftRect.w}%`,
                  height: `${draftRect.h}%`,
                }}
              />
            )}
          </div>
        )}

        {/* Right-click hint banner */}
        {stage === 'override' && (
          <div className="pointer-events-none absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-full bg-slate-900/85 px-3 py-1.5 text-[11px] font-medium text-white shadow-lg backdrop-blur">
            Click and drag to draw a House · Right-click for a quick fixed-size add · Right-click a house to duplicate / delete
          </div>
        )}
      </div>

      {/* Footer status bar */}
      <div className="border-t border-slate-200 bg-white px-4 py-2 text-[11px] text-slate-500">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Monitor className="h-3 w-3" />
            {image
              ? `${image.name} · ${image.width}×${image.height}`
              : 'No image uploaded'}
          </span>
          <span className="flex items-center gap-1.5">
            <Tv className="h-3 w-3" />
            {stage === 'published'
              ? <span className="text-primary">Screen network refreshed</span>
              : 'Paired TV idle'}
          </span>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------

function EmptyDropZone({ onPick }: { onPick: () => void }) {
  const [dragOver, setDragOver] = React.useState(false)
  const uploadImage = useTailor((s) => s.uploadImage)

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = () => {
      const src = reader.result as string
      const img = new window.Image()
      img.onload = () => {
        uploadImage({
          src,
          name: file.name,
          width: img.naturalWidth,
          height: img.naturalHeight,
        })
      }
      img.src = src
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="flex h-full items-center justify-center">
      <button
        onClick={onPick}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={cn(
          'flex w-full max-w-md flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed bg-white px-8 py-14 text-center transition-all',
          dragOver
            ? 'border-primary bg-primary/5 ring-4 ring-primary/10'
            : 'border-slate-300 hover:border-primary/60 hover:bg-slate-50',
        )}
      >
        <div
          className={cn(
            'flex h-14 w-14 items-center justify-center rounded-2xl transition-colors',
            dragOver ? 'bg-primary text-primary-foreground' : 'bg-slate-100 text-slate-500',
          )}
        >
          <Upload className="h-6 w-6" />
        </div>
        <div>
          <div className="text-sm font-semibold text-slate-900">
            Drop a flyer, ad, or Pinterest screenshot
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Raw and uncropped is fine — you&rsquo;ll draw the House boxes by hand.
          </div>
        </div>
        <div className="mt-2 flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-[11px] text-slate-500">
          <Eye className="h-3 w-3" />
          Right pane confirms intent · left pane never advances without you
        </div>
      </button>
    </div>
  )
}

function AnalyzingShimmer() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5" />
      <div className="absolute inset-0 bg-[length:200%_100%] animate-[shimmer_1.8s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-primary/15 to-transparent" />
      <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-3">
        <div className="flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-xs font-medium text-slate-700 shadow-md ring-1 ring-slate-200 backdrop-blur">
          <Grid3x3 className="h-3.5 w-3.5 text-primary" />
          Contour-detecting layout Houses…
        </div>
        <div className="flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-xs font-medium text-slate-700 shadow-md ring-1 ring-slate-200 backdrop-blur">
          <Type className="h-3.5 w-3.5 text-primary" />
          Matching typefaces against web-font library…
        </div>
      </div>
    </div>
  )
}
