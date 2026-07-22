'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import {
  Plus,
  Pencil,
  Trash2,
  Send,
  Eraser,
  Zap,
  Maximize2,
  Copy,
} from 'lucide-react'
import {
  BOX_TEMPLATES,
  DEMO_ACTORS,
  DEMO_HERO,
  getBoxTemplate,
  type BoxField,
  type RendererState,
  type SignageAction,
} from '@/signage'

interface ActorsTabProps {
  state: RendererState
  dispatch: (a: SignageAction) => void
}

export function ActorsTab({ state, dispatch }: ActorsTabProps) {
  const boxTemplate = getBoxTemplate(state.boxTemplateId)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  // Use the boxTemplateId as the form "key" — when it changes, useState
  // re-initializes with the new template's defaults. This avoids the
  // "setState in effect" warning while still resetting the form on template switch.
  const [formBoxTemplateId, setFormBoxTemplateId] = useState(state.boxTemplateId)
  const [formValues, setFormValues] = useState<Record<string, string>>(() => {
    const defaults: Record<string, string> = {}
    for (const f of boxTemplate.fields) {
      defaults[f.key] = String(f.default ?? '')
    }
    return defaults
  })
  const [formFullStage, setFormFullStage] = useState(false)

  // Detect box template change between renders and reset form synchronously
  if (formBoxTemplateId !== state.boxTemplateId) {
    setFormBoxTemplateId(state.boxTemplateId)
    const defaults: Record<string, string> = {}
    for (const f of boxTemplate.fields) {
      defaults[f.key] = String(f.default ?? '')
    }
    setFormValues(defaults)
    setFormFullStage(false)
    setEditingId(null)
  }

  const openAddDialog = () => {
    const defaults: Record<string, string> = {}
    for (const f of boxTemplate.fields) {
      defaults[f.key] = String(f.default ?? '')
    }
    setFormValues(defaults)
    setFormFullStage(false)
    setEditingId(null)
    setDialogOpen(true)
  }

  const openEditDialog = (actorId: string) => {
    const actor = state.actors.find((a) => a.id === actorId)
    if (!actor) return
    // Pre-fill the form with whatever fields the actor currently has
    const values: Record<string, string> = {}
    for (const f of boxTemplate.fields) {
      values[f.key] = actor.content[f.key] !== undefined ? String(actor.content[f.key]) : String(f.default ?? '')
    }
    setFormValues(values)
    setFormFullStage(actor.fullStage ?? false)
    setEditingId(actorId)
    setDialogOpen(true)
  }

  const submitForm = () => {
    // Build content from form values, skipping empty optional fields
    const content: Record<string, string | number> = {}
    for (const f of boxTemplate.fields) {
      const v = formValues[f.key]
      if (v === undefined || v === '') continue
      content[f.key] = f.type === 'number' ? Number(v) : v
    }

    if (editingId) {
      dispatch({ type: 'update', id: editingId, content })
    } else {
      const id = `actor-${Date.now()}`
      dispatch({
        type: 'add',
        actor: { id, content, fullStage: formFullStage },
      })
    }
    setDialogOpen(false)
  }

  const quickFillDemo = async () => {
    dispatch({ type: 'clear' })
    for (const a of DEMO_ACTORS) {
      await new Promise((r) => setTimeout(r, a.delay))
      const { delay, ...actor } = a
      dispatch({ type: 'add', actor })
    }
  }

  const addHero = () => {
    dispatch({ type: 'add', actor: { ...DEMO_HERO } })
  }

  return (
    <div className="space-y-4">
      {/* ── Quick actions ── */}
      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wider text-slate-500">
          Quick Actions
        </Label>
        <div className="grid grid-cols-2 gap-2">
          <Button size="sm" variant="secondary" onClick={quickFillDemo}>
            <Zap className="h-4 w-4" /> 6 Actors
          </Button>
          <Button size="sm" variant="secondary" onClick={addHero}>
            <Maximize2 className="h-4 w-4" /> Hero
          </Button>
        </div>
        <Button size="sm" variant="outline" className="w-full" onClick={() => dispatch({ type: 'clear' })}>
          <Eraser className="h-4 w-4" /> Clear all
        </Button>
      </div>

      <Separator />

      {/* ── Add new actor ── */}
      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wider text-slate-500">
          New Actor ({boxTemplate.name})
        </Label>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="w-full" onClick={openAddDialog}>
              <Plus className="h-4 w-4" /> Add Actor
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingId ? `Edit Actor: ${editingId}` : `Add Actor (${boxTemplate.name})`}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              {boxTemplate.fields.map((field) => (
                <FieldInput
                  key={field.key}
                  field={field}
                  value={formValues[field.key] ?? ''}
                  onChange={(v) => setFormValues((prev) => ({ ...prev, [field.key]: v }))}
                />
              ))}
              <Separator />
              <Label className="flex items-center gap-2 text-sm font-normal">
                <input
                  type="checkbox"
                  checked={formFullStage}
                  onChange={(e) => setFormFullStage(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                Fill entire stage (full-stage mode)
              </Label>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button onClick={submitForm}>
                {editingId ? 'Update' : 'Add'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Separator />

      {/* ── Actor list ── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs uppercase tracking-wider text-slate-500">
            Actors ({state.actors.length})
          </Label>
        </div>
        {state.actors.length === 0 ? (
          <div className="rounded-md border border-dashed bg-slate-50 p-6 text-center text-xs text-slate-400">
            No actors on stage. Add one above or use a quick action.
          </div>
        ) : (
          <ScrollArea className="max-h-72 pr-2">
            <div className="space-y-1.5">
              {state.actors.map((actor) => {
                const title =
                  actor.content.title ??
                  actor.content.name ??
                  actor.id
                const subtitle =
                  actor.content.subtitle ??
                  (actor.content.salePrice !== undefined
                    ? `$${actor.content.salePrice}`
                    : '')
                return (
                  <div
                    key={actor.id}
                    className="flex items-center gap-2 rounded-md border bg-white p-2"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-slate-100 text-base">
                      {actor.content.emoji ?? (actor.fullStage ? '🎬' : '📦')}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="truncate text-xs font-semibold">
                        {String(title)}
                        {actor.fullStage && (
                          <span className="ml-1 rounded bg-amber-100 px-1 py-0.5 text-[9px] font-bold uppercase text-amber-700">
                            Full
                          </span>
                        )}
                      </div>
                      <div className="truncate text-[10px] text-slate-500">
                        {actor.id}
                        {subtitle ? ` · ${subtitle}` : ''}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      onClick={() => openEditDialog(actor.id)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                      onClick={() => dispatch({ type: 'remove', id: actor.id })}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  )
}

// ── Field input component ───────────────────────────────────────────────────

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: BoxField
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={field.key} className="text-xs">
        {field.label}
        {field.required && <span className="ml-1 text-red-500">*</span>}
      </Label>
      {field.type === 'textarea' ? (
        <Textarea
          id={field.key}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className="min-h-[60px] text-sm"
        />
      ) : field.type === 'color' ? (
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={value || '#000000'}
            onChange={(e) => onChange(e.target.value)}
            className="h-9 w-12 rounded border border-slate-300"
          />
          <Input
            id={field.key}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            className="flex-1 text-sm"
          />
        </div>
      ) : (
        <Input
          id={field.key}
          type={field.type === 'number' ? 'number' : 'text'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className="text-sm"
        />
      )}
      {field.help && <p className="text-[10px] text-slate-400">{field.help}</p>}
    </div>
  )
}
