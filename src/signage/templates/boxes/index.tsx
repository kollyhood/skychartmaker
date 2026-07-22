'use client'

import type { BoxTemplate } from '../../types'
import { ProductCardBox } from './product-card'
import { HeroBannerBox } from './hero-banner'
import { ClearanceCardBox } from './clearance-card'

/**
 * Box (actor) template registry.
 *
 * Each box template defines:
 *   1. A field schema (used by the actor form to render inputs)
 *   2. A render function (how the actor looks)
 *
 * To add a new box template:
 *   1. Create a component in this folder that implements `BoxTemplate`
 *   2. Import and add it to the array below
 *
 * The renderer looks up templates by `id` from this array.
 */
export const BOX_TEMPLATES: BoxTemplate[] = [
  ProductCardBox,
  HeroBannerBox,
  ClearanceCardBox,
]

export function getBoxTemplate(id: string): BoxTemplate {
  return BOX_TEMPLATES.find((t) => t.id === id) ?? BOX_TEMPLATES[0]
}

export type { BoxTemplate, BoxField } from '../../types'
