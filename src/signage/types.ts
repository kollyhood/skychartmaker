/**
 * Signage Renderer — Core Type Definitions
 * =========================================
 *
 * A standalone, template-driven signage renderer.
 *
 * Architecture:
 *   ┌─────────────────────────────────────────────────────┐
 *   │  Renderer                                           │
 *   │   ├─ Stage Template   (static background + chrome)  │
 *   │   ├─ Grid Mode        (slot geometry)               │
 *   │   └─ Actors[]         (dynamic content)             │
 *   │       └─ Box Template (per-actor visual schema)     │
 *   └─────────────────────────────────────────────────────┘
 *
 * Everything is pluggable: stage artwork, box field schemas, and grid
 * geometry can all be swapped at runtime via the action dispatch API.
 */

import type { ReactNode } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// Stage Templates
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A stage template paints the static background layer.
 *
 * Stage artwork is intentionally separate from actors so the same actors
 * can be displayed against different backdrops (e.g. a green promo stage
 * vs. a dark premium stage) without changing the actor data.
 */
export interface StageTemplate {
  id: string
  name: string
  description: string
  /** Preview swatch shown in the template picker */
  swatch: string
  /**
   * Render the static stage background. Actors are rendered on top by
   * the renderer; the stage just provides the visual frame.
   */
  render: (props: { children: ReactNode }) => ReactNode
}

// ─────────────────────────────────────────────────────────────────────────────
// Box (Actor) Templates
// ─────────────────────────────────────────────────────────────────────────────

/** Field types supported by the actor form UI. */
export type BoxFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'image'
  | 'emoji'
  | 'color'

/** A single field in a box template's content schema. */
export interface BoxField {
  key: string
  label: string
  type: BoxFieldType
  required?: boolean
  default?: string | number
  placeholder?: string
  help?: string
}

/**
 * A box template defines:
 *   1. The schema of an actor's `content` (so the form UI can render inputs)
 *   2. How to render an actor with that content
 *
 * Different box templates can have completely different field schemas —
 * e.g. a product card has price + image, a clearance card has original
 * price + sale price + discount, a text-only card has just title + body.
 */
export interface BoxTemplate {
  id: string
  name: string
  description: string
  /** Fields that appear in the actor form */
  fields: BoxField[]
  /** Sample content used by the "Add demo actor" button */
  sampleContent: Record<string, string | number>
  /**
   * Render an actor with the given content.
   * `mode` is 'full' when the actor fills the entire stage, 'grid' otherwise.
   */
  render: (props: {
    content: Record<string, string | number>
    mode: 'grid' | 'full'
  }) => ReactNode
}

// ─────────────────────────────────────────────────────────────────────────────
// Grid Modes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A grid mode defines the slot geometry of the stage.
 *
 * Preset modes (full, 2x1, 2x2, 3x2, etc.) cover common layouts; a
 * `custom` mode lets the controller set arbitrary rows × cols × gap.
 */
export interface GridMode {
  id: string
  name: string
  description: string
  /** Visual icon shown in the picker (e.g. a mini grid SVG) */
  icon: ReactNode
  rows: number
  cols: number
  /** 'custom' modes are user-editable; presets are not */
  editable?: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// Actors
// ─────────────────────────────────────────────────────────────────────────────

/**
 * One dynamic content box on the stage.
 *
 * `content` is a `Record<string, string | number>` so the same actor type
 * can be used with any box template — the active box template's `fields`
 * array defines which keys are meaningful for the current render.
 */
export interface Actor {
  id: string
  content: Record<string, string | number>
  /**
   * If true, this actor ignores the grid and fills the entire stage.
   * When multiple fullStage actors exist, the most recently added wins.
   */
  fullStage?: boolean
  /** Explicit grid position; if omitted, auto-placed in next free cell */
  position?: GridPosition
  addedAt: number
}

export interface GridPosition {
  row: number
  col: number
  rowSpan?: number
  colSpan?: number
}

/** Actor as it appears in payloads (renderer stamps `addedAt`). */
export interface ActorPayload {
  id: string
  content?: Record<string, string | number>
  fullStage?: boolean
  position?: GridPosition
}

// ─────────────────────────────────────────────────────────────────────────────
// Renderer Config
// ─────────────────────────────────────────────────────────────────────────────

/** Runtime state of the renderer. */
export interface RendererState {
  stageTemplateId: string
  boxTemplateId: string
  gridModeId: string
  /** Only used when gridModeId === 'custom' */
  customGrid: { rows: number; cols: number; gap: number }
  gap: number
  actors: Actor[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Actions (the entire Controller-facing surface)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * All actions are dispatched through a single `dispatch(action)` function.
 * The same shape is used for WebSocket payloads, REST bodies, and the UI.
 */
export type SignageAction =
  | { type: 'add'; actor: ActorPayload }
  | { type: 'addMany'; actors: ActorPayload[] }
  | { type: 'update'; id: string; content: Record<string, string | number> }
  | { type: 'remove'; id: string }
  | { type: 'clear' }
  | { type: 'setGridMode'; modeId: string }
  | { type: 'setCustomGrid'; rows: number; cols: number; gap: number }
  | { type: 'setGap'; gap: number }
  | { type: 'setStageTemplate'; templateId: string }
  | { type: 'setBoxTemplate'; templateId: string }

/**
 * Wire payload format (WebSocket + REST).
 * The `action` field carries the action type; everything else is the
 * action's payload. This keeps the wire format flat and easy to type.
 */
export type SignagePayload =
  | ({ action: 'add' } & ActorPayload)
  | { action: 'addMany'; actors: ActorPayload[] }
  | { action: 'update'; id: string; content: Record<string, string | number> }
  | { action: 'remove'; id: string }
  | { action: 'clear' }
  | { action: 'setGridMode'; modeId: string }
  | { action: 'setCustomGrid'; rows: number; cols: number; gap: number }
  | { action: 'setGap'; gap: number }
  | { action: 'setStageTemplate'; templateId: string }
  | { action: 'setBoxTemplate'; templateId: string }

/** Convert a wire payload into an internal action. */
export function payloadToAction(p: SignagePayload): SignageAction {
  switch (p.action) {
    case 'add':
      // Strip the `action` field, keep the rest as the actor payload
      const { action: _a, ...actor } = p
      return { type: 'add', actor }
    case 'addMany':
      return { type: 'addMany', actors: p.actors }
    case 'update':
      return { type: 'update', id: p.id, content: p.content }
    case 'remove':
      return { type: 'remove', id: p.id }
    case 'clear':
      return { type: 'clear' }
    case 'setGridMode':
      return { type: 'setGridMode', modeId: p.modeId }
    case 'setCustomGrid':
      return { type: 'setCustomGrid', rows: p.rows, cols: p.cols, gap: p.gap }
    case 'setGap':
      return { type: 'setGap', gap: p.gap }
    case 'setStageTemplate':
      return { type: 'setStageTemplate', templateId: p.templateId }
    case 'setBoxTemplate':
      return { type: 'setBoxTemplate', templateId: p.templateId }
  }
}
