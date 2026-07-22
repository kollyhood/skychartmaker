'use client'

import * as React from 'react'
import { useTailor } from '@/lib/tailor/store'
import { cn } from '@/lib/utils'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Slider } from '@/components/ui/slider'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlignLeft, AlignCenter, AlignRight, Type } from 'lucide-react'
import type { House, Typography } from '@/lib/tailor/types'
import { FONT_LIBRARY, PALETTE } from '@/lib/tailor/types'

interface Props {
  house: House
}

export function TextLabelEditor({ house }: Props) {
  const updateTypography = useTailor((s) => s.updateTypography)
  const updateHouse = useTailor((s) => s.updateHouse)
  const selectedHouseId = useTailor((s) => s.selectedHouseId)
  const selectHouse = useTailor((s) => s.selectHouse)
  const showFontPanel = useTailor((s) => s.showFontPanel)

  const typos = house.typography!
  const isSelected = selectedHouseId === house.id

  // Truncate the visible dummy label to maxChars so the rule feels real
  const visibleLabel = typos.maxChars > 0 ? house.label.slice(0, typos.maxChars) : house.label
  const overflow = house.label.length > typos.maxChars

  // Scale font size relative to the house height so it stays readable.
  // The stored fontSize is px on a 1080-tall canvas baseline.
  const displayFontPx = Math.max(8, typos.fontSize * (house.h / 100) * 6)

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          onPointerDown={(e) => {
            // Stop the parent move handler from grabbing pointer focus.
            e.stopPropagation()
            selectHouse(house.id)
          }}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            'absolute inset-0 flex items-center px-2 py-1.5 text-left transition-colors',
            isSelected ? 'cursor-text' : 'cursor-pointer hover:bg-blue-500/5',
          )}
        >
          <div
            className={cn(
              'overflow-hidden text-ellipsis whitespace-pre-wrap leading-tight',
              typos.align === 'center' && 'text-center',
              typos.align === 'right' && 'text-right',
              typos.align === 'left' && 'text-left',
              overflow && 'text-red-500',
            )}
            style={{
              fontFamily: `'${typos.fontFamily}', sans-serif`,
              fontSize: `${displayFontPx}px`,
              color: typos.color,
              letterSpacing: `${typos.letterSpacing}px`,
              lineHeight: typos.lineHeight,
              width: '100%',
            }}
          >
            {visibleLabel}
          </div>
        </button>
      </PopoverTrigger>

      {showFontPanel && (
        <PopoverContent
          className="w-72 p-0"
          onOpenAutoFocus={(e) => e.preventDefault()}
          side="right"
          align="start"
        >
          <TypoPanel
            house={house}
            typos={typos}
            onTypography={(p) => updateTypography(house.id, p)}
            onLabel={(l) => updateHouse(house.id, { label: l })}
          />
        </PopoverContent>
      )}
    </Popover>
  )
}

// ---------------------------------------------------------------------------

function TypoPanel({
  house,
  typos,
  onTypography,
  onLabel,
}: {
  house: House
  typos: Typography
  onTypography: (p: Partial<Typography>) => void
  onLabel: (l: string) => void
}) {
  return (
    <div className="space-y-3 p-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
          <Type className="h-3.5 w-3.5 text-primary" />
          Typography
        </div>
        <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
          {house.label}
        </span>
      </div>

      {/* Label */}
      <div className="space-y-1">
        <Label className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
          Dummy label
        </Label>
        <Input
          value={house.label}
          onChange={(e) => onLabel(e.target.value)}
          className="h-7 text-xs"
        />
      </div>

      {/* Font family */}
      <div className="space-y-1">
        <Label className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
          Font family
        </Label>
        <select
          value={typos.fontFamily}
          onChange={(e) => onTypography({ fontFamily: e.target.value })}
          className="h-7 w-full rounded-md border border-slate-200 bg-white px-2 text-xs"
        >
          {FONT_LIBRARY.map((f) => (
            <option key={f} value={f} style={{ fontFamily: f }}>
              {f}
            </option>
          ))}
        </select>
      </div>

      {/* Size */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Label className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
            Font size
          </Label>
          <span className="text-[10px] font-medium text-slate-700">{typos.fontSize}px</span>
        </div>
        <Slider
          min={8}
          max={96}
          step={1}
          value={[typos.fontSize]}
          onValueChange={(v) => onTypography({ fontSize: v[0] })}
        />
      </div>

      {/* Letter spacing */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Label className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
            Letter spacing
          </Label>
          <span className="text-[10px] font-medium text-slate-700">{typos.letterSpacing}px</span>
        </div>
        <Slider
          min={-2}
          max={10}
          step={0.5}
          value={[typos.letterSpacing]}
          onValueChange={(v) => onTypography({ letterSpacing: v[0] })}
        />
      </div>

      {/* Max char limit */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Label className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
            Max character limit
          </Label>
          <span
            className={cn(
              'rounded-full px-1.5 py-0.5 text-[10px] font-medium',
              house.label.length > typos.maxChars
                ? 'bg-red-100 text-red-700'
                : 'bg-slate-100 text-slate-700',
            )}
          >
            {typos.maxChars} chars
            {house.label.length > typos.maxChars && ' · overflow'}
          </span>
        </div>
        <Slider
          min={0}
          max={140}
          step={1}
          value={[typos.maxChars]}
          onValueChange={(v) => onTypography({ maxChars: v[0] })}
        />
      </div>

      {/* Alignment */}
      <div className="space-y-1">
        <Label className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
          Alignment
        </Label>
        <ToggleGroup
          type="single"
          value={typos.align}
          onValueChange={(v) => v && onTypography({ align: v as Typography['align'] })}
          className="w-full justify-start"
        >
          <ToggleGroupItem value="left" className="h-7 w-9" aria-label="Left">
            <AlignLeft className="h-3.5 w-3.5" />
          </ToggleGroupItem>
          <ToggleGroupItem value="center" className="h-7 w-9" aria-label="Center">
            <AlignCenter className="h-3.5 w-3.5" />
          </ToggleGroupItem>
          <ToggleGroupItem value="right" className="h-7 w-9" aria-label="Right">
            <AlignRight className="h-3.5 w-3.5" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Color palette */}
      <div className="space-y-1">
        <Label className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
          Color · <span className="font-mono text-slate-700">{typos.color}</span>
        </Label>
        <div className="grid grid-cols-8 gap-1">
          {PALETTE.map((c) => (
            <button
              key={c}
              onClick={() => onTypography({ color: c })}
              className={cn(
                'h-5 w-5 rounded-md border transition-transform hover:scale-110',
                typos.color.toLowerCase() === c.toLowerCase()
                  ? 'border-primary ring-2 ring-primary/30'
                  : 'border-slate-200',
              )}
              style={{ backgroundColor: c }}
              aria-label={`Color ${c}`}
            />
          ))}
        </div>
        <div className="mt-2 flex items-center gap-1.5">
          <input
            type="color"
            value={typos.color}
            onChange={(e) => onTypography({ color: e.target.value })}
            className="h-6 w-10 cursor-pointer rounded border border-slate-200 bg-white"
          />
          <span className="text-[10px] text-slate-500">Custom hex</span>
        </div>
      </div>
    </div>
  )
}
