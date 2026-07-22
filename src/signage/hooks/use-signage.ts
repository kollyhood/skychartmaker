'use client'

import { useCallback, useState } from 'react'
import {
  Actor,
  ActorPayload,
  RendererState,
  SignageAction,
} from '../types'
import { DEFAULT_GAP, DEFAULT_GRID_MODE_ID } from '../grid-modes'

const DEFAULT_STATE: RendererState = {
  stageTemplateId: 'green-promo',
  boxTemplateId: 'product-card',
  gridModeId: DEFAULT_GRID_MODE_ID,
  customGrid: { rows: 3, cols: 4, gap: DEFAULT_GAP },
  gap: DEFAULT_GAP,
  actors: [],
}

/**
 * State machine for the signage renderer.
 *
 * Single `dispatch(action)` function handles all state mutations:
 *   - Actor CRUD: add / addMany / update / remove / clear
 *   - Grid:       setGridMode / setCustomGrid / setGap
 *   - Templates:  setStageTemplate / setBoxTemplate
 *
 * The same dispatch flow is driven by:
 *   - The interactive control panel (UI buttons)
 *   - WebSocket payloads (live updates from external systems)
 *   - Pasted JSON (power users)
 */
export function useSignage() {
  const [state, setState] = useState<RendererState>(DEFAULT_STATE)

  const dispatch = useCallback((action: SignageAction) => {
    setState((prev) => {
      switch (action.type) {
        case 'add': {
          const actor: Actor = {
            id: action.actor.id,
            content: action.actor.content ?? {},
            fullStage: action.actor.fullStage ?? false,
            position: action.actor.position,
            addedAt: Date.now(),
          }
          // Upsert: replace if id already exists, else append
          const without = prev.actors.filter((a) => a.id !== actor.id)
          return { ...prev, actors: [...without, actor] }
        }

        case 'addMany': {
          const incoming = action.actors.map((a: ActorPayload): Actor => ({
            id: a.id,
            content: a.content ?? {},
            fullStage: a.fullStage ?? false,
            position: a.position,
            addedAt: Date.now(),
          }))
          // Merge by id
          const ids = new Set(incoming.map((a) => a.id))
          const kept = prev.actors.filter((a) => !ids.has(a.id))
          return { ...prev, actors: [...kept, ...incoming] }
        }

        case 'update': {
          return {
            ...prev,
            actors: prev.actors.map((a) =>
              a.id === action.id
                ? { ...a, content: { ...a.content, ...action.content } }
                : a,
            ),
          }
        }

        case 'remove':
          return { ...prev, actors: prev.actors.filter((a) => a.id !== action.id) }

        case 'clear':
          return { ...prev, actors: [] }

        case 'setGridMode':
          return { ...prev, gridModeId: action.modeId }

        case 'setCustomGrid':
          return {
            ...prev,
            gridModeId: 'custom',
            customGrid: {
              rows: action.rows,
              cols: action.cols,
              gap: action.gap,
            },
            gap: action.gap,
          }

        case 'setGap':
          return { ...prev, gap: action.gap }

        case 'setStageTemplate':
          return { ...prev, stageTemplateId: action.templateId }

        case 'setBoxTemplate':
          return { ...prev, boxTemplateId: action.templateId }

        default:
          return prev
      }
    })
  }, [])

  return { state, dispatch }
}
