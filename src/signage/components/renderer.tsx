'use client'

import { AnimatePresence } from 'framer-motion'
import { Actor, GridMode, RendererState } from '../types'
import { getGridMode } from '../grid-modes'
import { getStageTemplate } from '../templates/stages'
import { getBoxTemplate } from '../templates/boxes'

/**
 * The Signage Renderer — the standalone rendering surface.
 *
 * Composes:
 *   1. The active Stage Template (static background)
 *   2. The active Grid Mode (slot geometry)
 *   3. The actor list, each rendered by the active Box Template
 *
 * The renderer is "dumb" — it just reads `state` and renders. All
 * mutations happen through `dispatch` in the parent.
 *
 * Rules:
 *   - If any actor has `fullStage: true`, the most recent one fills the
 *     whole stage and all others are hidden.
 *   - Otherwise, actors flow into the active grid mode's slots.
 *   - Actors with an explicit `position` are placed there; the rest auto-flow.
 */
export function SignageRenderer({ state }: { state: RendererState }) {
  const stageTemplate = getStageTemplate(state.stageTemplateId)
  const boxTemplate = getBoxTemplate(state.boxTemplateId)
  const gridMode = getGridMode(state.gridModeId)

  // Find the most recent full-stage actor (if any)
  const fullStageActor = state.actors
    .filter((a) => a.fullStage)
    .sort((a, b) => b.addedAt - a.addedAt)[0]

  const gridActors: Actor[] = fullStageActor ? [] : state.actors

  // Resolve grid geometry (custom mode uses customGrid; presets use rows/cols)
  const rows =
    gridMode?.id === 'custom' ? state.customGrid.rows : gridMode?.rows ?? 2
  const cols =
    gridMode?.id === 'custom' ? state.customGrid.cols : gridMode?.cols ?? 3
  const gap =
    gridMode?.id === 'custom' ? state.customGrid.gap : state.gap

  return (
    <>
      {stageTemplate.render({
        children: (
          <div className="absolute inset-0 p-3 sm:p-4">
            {fullStageActor ? (
              // ── Full-stage mode: single actor fills the stage ──
              <AnimatePresence mode="popLayout">
                <div key={fullStageActor.id} className="h-full w-full">
                  {boxTemplate.render({
                    content: fullStageActor.content,
                    mode: 'full',
                  })}
                </div>
              </AnimatePresence>
            ) : gridActors.length === 0 ? (
              // ── Empty stage — show a hint ──
              <div className="flex h-full w-full items-center justify-center">
                <div className="pointer-events-none text-center text-white/60">
                  <div className="text-5xl">🛒</div>
                  <div className="mt-3 text-sm font-medium uppercase tracking-wider">
                    Waiting for actors…
                  </div>
                  <div className="mt-1 text-xs text-white/40">
                    Add an actor from the control panel
                  </div>
                </div>
              </div>
            ) : (
              // ── Grid mode: actors arranged in rows × cols ──
              <div
                className="grid h-full w-full"
                style={{
                  gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
                  gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                  gap: `${gap}px`,
                }}
              >
                <AnimatePresence mode="popLayout">
                  {gridActors.map((actor) => {
                    const style = actor.position
                      ? {
                          gridRow: `${actor.position.row + 1} / span ${actor.position.rowSpan ?? 1}`,
                          gridColumn: `${actor.position.col + 1} / span ${actor.position.colSpan ?? 1}`,
                        }
                      : undefined
                    return (
                      <div key={actor.id} style={style}>
                        {boxTemplate.render({ content: actor.content, mode: 'grid' })}
                      </div>
                    )
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>
        ),
      })}
    </>
  )
}
