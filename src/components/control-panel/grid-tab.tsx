'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Check } from 'lucide-react'
import {
  DEFAULT_GAP,
  GRID_MODES,
  type RendererState,
  type SignageAction,
} from '@/signage'

interface GridTabProps {
  state: RendererState
  dispatch: (a: SignageAction) => void
}

export function GridTab({ state, dispatch }: GridTabProps) {
  const isCustom = state.gridModeId === 'custom'

  // Local state for the custom grid inputs — initialize from current state
  // (using key trick to force re-render when grid mode changes)
  const customRows = state.customGrid.rows
  const customCols = state.customGrid.cols
  const customGap = state.customGrid.gap

  return (
    <div className="space-y-4">
      {/* ── Grid mode presets ── */}
      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wider text-slate-500">
          Grid Mode
        </Label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {GRID_MODES.map((mode) => {
            const active = state.gridModeId === mode.id
            return (
              <button
                key={mode.id}
                onClick={() => dispatch({ type: 'setGridMode', modeId: mode.id })}
                className={`group relative flex flex-col items-center gap-1.5 rounded-lg border p-3 text-center transition-colors ${
                  active
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className={active ? 'text-primary' : 'text-slate-400 group-hover:text-slate-500'}>
                  {mode.icon}
                </div>
                <div className="text-xs font-semibold">{mode.name}</div>
                <div className="text-[10px] leading-tight text-slate-400">
                  {mode.description}
                </div>
                {active && (
                  <div className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="h-3 w-3" />
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <Separator />

      {/* ── Custom grid controls ── */}
      <div className="space-y-3">
        <Label className="text-xs uppercase tracking-wider text-slate-500">
          Custom Grid
        </Label>
        <p className="text-[11px] text-slate-500">
          Set custom dimensions. Automatically switches to "Custom" mode.
        </p>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label htmlFor="custom-rows" className="text-[10px] text-slate-500">
              Rows
            </Label>
            <Input
              id="custom-rows"
              type="number"
              min={1}
              max={8}
              value={customRows}
              onChange={(e) =>
                dispatch({
                  type: 'setCustomGrid',
                  rows: Number(e.target.value) || 1,
                  cols: customCols,
                  gap: customGap,
                })
              }
            />
          </div>
          <div>
            <Label htmlFor="custom-cols" className="text-[10px] text-slate-500">
              Cols
            </Label>
            <Input
              id="custom-cols"
              type="number"
              min={1}
              max={8}
              value={customCols}
              onChange={(e) =>
                dispatch({
                  type: 'setCustomGrid',
                  rows: customRows,
                  cols: Number(e.target.value) || 1,
                  gap: customGap,
                })
              }
            />
          </div>
          <div>
            <Label htmlFor="custom-gap" className="text-[10px] text-slate-500">
              Gap
            </Label>
            <Input
              id="custom-gap"
              type="number"
              min={0}
              max={48}
              value={customGap}
              onChange={(e) =>
                dispatch({
                  type: 'setCustomGrid',
                  rows: customRows,
                  cols: customCols,
                  gap: Number(e.target.value) || 0,
                })
              }
            />
          </div>
        </div>
        {!isCustom && (
          <p className="text-[11px] text-amber-600">
            Currently using the <strong>{GRID_MODES.find((m) => m.id === state.gridModeId)?.name}</strong> preset.
            Edit any field above to switch to custom.
          </p>
        )}
      </div>

      <Separator />

      {/* ── Gap (for preset modes) ── */}
      {!isCustom && (
        <div className="space-y-3">
          <Label className="text-xs uppercase tracking-wider text-slate-500">
            Gap (presets)
          </Label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={48}
              value={state.gap}
              onChange={(e) => dispatch({ type: 'setGap', gap: Number(e.target.value) })}
              className="flex-1"
            />
            <span className="w-12 text-right text-xs font-mono text-slate-600">
              {state.gap}px
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="w-full"
            onClick={() => dispatch({ type: 'setGap', gap: DEFAULT_GAP })}
          >
            Reset to default ({DEFAULT_GAP}px)
          </Button>
        </div>
      )}
    </div>
  )
}
