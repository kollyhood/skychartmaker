'use client'

import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Check } from 'lucide-react'
import {
  BOX_TEMPLATES,
  STAGE_TEMPLATES,
  type RendererState,
  type SignageAction,
} from '@/signage'

interface TemplatesTabProps {
  state: RendererState
  dispatch: (a: SignageAction) => void
}

export function TemplatesTab({ state, dispatch }: TemplatesTabProps) {
  return (
    <div className="space-y-4">
      {/* ── Stage templates ── */}
      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wider text-slate-500">
          Stage Template
        </Label>
        <p className="text-[11px] text-slate-500">
          Static background artwork. Switching does not affect actors.
        </p>
        <div className="space-y-2">
          {STAGE_TEMPLATES.map((tpl) => {
            const active = state.stageTemplateId === tpl.id
            return (
              <button
                key={tpl.id}
                onClick={() => dispatch({ type: 'setStageTemplate', templateId: tpl.id })}
                className={`group flex w-full items-center gap-3 rounded-lg border p-2.5 text-left transition-colors ${
                  active
                    ? 'border-primary bg-primary/5'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div
                  className="h-12 w-16 shrink-0 rounded-md border border-slate-200"
                  style={{ background: tpl.swatch }}
                />
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className={`text-sm font-semibold ${active ? 'text-primary' : 'text-slate-700'}`}>
                    {tpl.name}
                  </div>
                  <div className="text-[11px] text-slate-500">{tpl.description}</div>
                </div>
                {active && (
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="h-3 w-3" />
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <Separator />

      {/* ── Box templates ── */}
      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wider text-slate-500">
          Box (Actor) Template
        </Label>
        <p className="text-[11px] text-slate-500">
          Defines the field schema + visual style for new actors. Existing
          actors keep their data but will re-render with the new style.
        </p>
        <div className="space-y-2">
          {BOX_TEMPLATES.map((tpl) => {
            const active = state.boxTemplateId === tpl.id
            return (
              <button
                key={tpl.id}
                onClick={() => dispatch({ type: 'setBoxTemplate', templateId: tpl.id })}
                className={`group flex w-full items-start gap-3 rounded-lg border p-2.5 text-left transition-colors ${
                  active
                    ? 'border-primary bg-primary/5'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className={`text-sm font-semibold ${active ? 'text-primary' : 'text-slate-700'}`}>
                    {tpl.name}
                  </div>
                  <div className="text-[11px] text-slate-500">{tpl.description}</div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {tpl.fields.map((f) => (
                      <span
                        key={f.key}
                        className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-medium text-slate-600"
                      >
                        {f.label}
                        {f.required && <span className="ml-0.5 text-red-500">*</span>}
                      </span>
                    ))}
                  </div>
                </div>
                {active && (
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="h-3 w-3" />
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
