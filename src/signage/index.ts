/**
 * Signage Renderer — Public API
 * =============================
 *
 * Import everything you need from here:
 *
 *   import { useSignage, SignageRenderer, GRID_MODES, STAGE_TEMPLATES,
 *            BOX_TEMPLATES, payloadToAction, type SignagePayload } from '@/signage'
 */

// State hook
export { useSignage } from './hooks/use-signage'

// Renderer component
export { SignageRenderer } from './components/renderer'

// Registries
export { GRID_MODES, getGridMode, DEFAULT_GRID_MODE_ID, DEFAULT_GAP } from './grid-modes'
export { STAGE_TEMPLATES, getStageTemplate } from './templates/stages'
export { BOX_TEMPLATES, getBoxTemplate } from './templates/boxes'

// Types + helpers
export {
  payloadToAction,
  type StageTemplate,
  type BoxTemplate,
  type BoxField,
  type BoxFieldType,
  type GridMode,
  type Actor,
  type ActorPayload,
  type GridPosition,
  type RendererState,
  type SignageAction,
  type SignagePayload,
} from './types'

// Sample actors for demos
export { DEMO_ACTORS, DEMO_HERO } from './demo-actors'
