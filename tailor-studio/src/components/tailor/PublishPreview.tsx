'use client'

import * as React from 'react'
import { useTailor } from '@/lib/tailor/store'
import { cn } from '@/lib/utils'
import { CheckCircle2, Tv, Database, Monitor, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function PublishPreview() {
  const houses = useTailor((s) => s.houses)
  const stageLabel = useTailor((s) => s.publishedStageLabel)
  const backdropUrl = useTailor((s) => s.publishedBackdrop)
  const stageId = useTailor((s) => s.publishedStageId)

  // Simulated "TV preview" — what the paired TV now shows.
  return (
    <div className="grid h-full grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
      {/* Left: pristine blank backdrop with faint house outlines */}
      <div className="relative flex flex-col overflow-hidden rounded-xl bg-white shadow-[0_8px_40px_-12px_rgba(0,0,0,0.15)] ring-1 ring-slate-200">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Blank Backdrop · stripped &amp; deployed
          </span>
          <div className="flex items-center gap-2">
            {backdropUrl && (
              <a
                href={backdropUrl}
                download={`${stageLabel ?? 'stage'}.png`}
                className="flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-slate-600 ring-1 ring-slate-200 hover:text-primary"
              >
                <Download className="h-3 w-3" />
                PNG
              </a>
            )}
            <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-600">
              <CheckCircle2 className="h-3 w-3" />
              Live
            </span>
          </div>
        </div>
        <div className="relative flex-1 bg-slate-50">
          {/* Real generated backdrop PNG */}
          {backdropUrl ? (
            <img
              src={backdropUrl}
              alt="Blank backdrop"
              className="absolute inset-0 h-full w-full object-contain"
              draggable={false}
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-slate-100" />
          )}
          {/* Faint house outlines overlay (no text, no dummy items) */}
          <div className="pointer-events-none absolute inset-0">
            {houses.map((h) => (
              <div
                key={h.id}
                className="absolute rounded-md border border-dashed border-slate-400/40"
                style={{
                  left: `${h.x}%`,
                  top: `${h.y}%`,
                  width: `${h.w}%`,
                  height: `${h.h}%`,
                }}
              >
                <span className="absolute -top-4 left-0 text-[9px] font-medium uppercase tracking-wide text-slate-500/70">
                  {h.label}
                </span>
              </div>
            ))}
          </div>
          {stageLabel && (
            <div className="absolute bottom-2 right-3 font-mono text-[10px] text-slate-400">
              {stageLabel}
            </div>
          )}
        </div>
      </div>

      {/* Right: paired TV preview + DB commit log */}
      <div className="flex flex-col gap-3">
        <TvPreview />
        <CommitLog stageId={stageId} />
      </div>
    </div>
  )
}

function TvPreview() {
  const houses = useTailor((s) => s.houses)
  const stageLabel = useTailor((s) => s.publishedStageLabel)
  const backdropUrl = useTailor((s) => s.publishedBackdrop)

  return (
    <div className="flex flex-col overflow-hidden rounded-xl bg-white shadow-[0_8px_40px_-12px_rgba(0,0,0,0.15)] ring-1 ring-slate-200">
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-1.5">
        <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          <Tv className="h-3 w-3" />
          Paired TV · Screen Network
        </span>
        <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-600">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
          Refreshed
        </span>
      </div>
      <div className="relative aspect-video bg-black">
        {/* TV bezel + screen */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-900 to-black p-2">
          <div className="relative h-full w-full overflow-hidden rounded-sm bg-black animate-tv-flicker">
            {backdropUrl ? (
              <img
                src={backdropUrl}
                alt="TV preview"
                className="absolute inset-0 h-full w-full object-contain"
                draggable={false}
              />
            ) : null}
            {/* Faint outlines only */}
            <div className="pointer-events-none absolute inset-0 p-3">
              {houses.map((h) => (
                <div
                  key={h.id}
                  className="absolute rounded-sm border border-slate-400/30"
                  style={{
                    left: `${h.x}%`,
                    top: `${h.y}%`,
                    width: `${h.w}%`,
                    height: `${h.h}%`,
                  }}
                />
              ))}
            </div>
            <div className="absolute bottom-1 right-2 font-mono text-[8px] text-slate-400/80">
              {stageLabel}
            </div>
          </div>
        </div>
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-2 py-0.5 text-[8px] text-white/70">
          Live Preview
        </div>
      </div>
    </div>
  )
}

function CommitLog({ stageId }: { stageId: string | null }) {
  const houses = useTailor((s) => s.houses)
  const stageLabel = useTailor((s) => s.publishedStageLabel)
  const image = useTailor((s) => s.image)
  const detectedFonts = useTailor((s) => s.detectedFonts)

  const matrix = houses.map((h) => ({
    id: h.id,
    label: h.label,
    kind: h.kind,
    rect: `(${h.x.toFixed(1)}, ${h.y.toFixed(1)}) · ${h.w.toFixed(1)}×${h.h.toFixed(1)}`,
  }))

  return (
    <div className="flex flex-1 flex-col overflow-hidden rounded-xl bg-slate-900 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.2)] ring-1 ring-slate-800">
      <div className="flex items-center justify-between border-b border-slate-800 px-3 py-1.5">
        <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          <Database className="h-3 w-3" />
          Database Commit
        </span>
        <span className="font-mono text-[9px] text-slate-500">
          {stageId ? `id=${stageId.slice(0, 8)}` : stageLabel}
        </span>
      </div>
      <div className="flex-1 overflow-auto p-2 font-mono text-[10px] leading-relaxed text-slate-300">
        <div className="text-emerald-400">✓ stripped all text labels ({houses.filter((h) => h.kind === 'text').length} text houses)</div>
        <div className="text-emerald-400">✓ stripped all dummy image assets ({houses.filter((h) => h.kind === 'image').length} image houses)</div>
        <div className="text-emerald-400">✓ sampled dominant background color</div>
        <div className="text-emerald-400">✓ rendered blank backdrop @ 1920×1080 PNG</div>
        <div className="text-emerald-400">✓ committed coordinate matrix ({houses.length} houses) → stages table</div>
        {detectedFonts.length > 0 && (
          <div className="text-emerald-400">✓ matched {detectedFonts.length} typefaces via Font Hunter</div>
        )}
        <div className="text-emerald-400">✓ deployed stage to screen network</div>
        {image && (
          <div className="mt-2 border-t border-slate-800 pt-2 text-slate-500">
            source: {image.name} · {image.width}×{image.height}
          </div>
        )}
        <div className="mt-2 border-t border-slate-800 pt-2">
          <div className="text-slate-500">-- matrix --</div>
          {matrix.map((m) => (
            <div key={m.id} className="flex justify-between gap-2 py-0.5">
              <span className="truncate text-slate-300">
                <span className="text-slate-500">{m.kind.padEnd(5)}</span> {m.label}
              </span>
              <span className="text-slate-500">{m.rect}</span>
            </div>
          ))}
        </div>
        <div className="mt-2 border-t border-slate-800 pt-2 text-slate-500">
          {detectedFonts.length > 0 && (
            <>
              <div>-- fonts --</div>
              {detectedFonts.map((f, i) => (
                <div key={i} className="flex justify-between gap-2 py-0.5">
                  <span className="text-slate-300">
                    <span
                      className="mr-1 inline-block h-2 w-2 rounded-sm align-middle"
                      style={{ backgroundColor: f.color }}
                    />
                    {f.family} · {f.weight}
                  </span>
                  <span className="text-slate-500">{(f.confidence * 100).toFixed(0)}%</span>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
