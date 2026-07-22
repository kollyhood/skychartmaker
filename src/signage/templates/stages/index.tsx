'use client'

import type { StageTemplate } from '../../types'
import { GreenPromoStage } from './green-promo'
import { DarkPremiumStage } from './dark-premium'
import { SupermarketFlyerStage } from './supermarket-flyer'

/**
 * Stage template registry.
 *
 * To add a new stage template:
 *   1. Create a component in this folder that implements `StageTemplate`
 *   2. Import and add it to the array below
 *
 * The renderer looks up templates by `id` from this array.
 */
export const STAGE_TEMPLATES: StageTemplate[] = [
  GreenPromoStage,
  DarkPremiumStage,
  SupermarketFlyerStage,
]

export function getStageTemplate(id: string): StageTemplate {
  return STAGE_TEMPLATES.find((t) => t.id === id) ?? STAGE_TEMPLATES[0]
}

export type { StageTemplate } from '../../types'
