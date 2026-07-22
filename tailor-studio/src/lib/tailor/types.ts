// Core domain types for The Tailor (Module 1: Desktop Ingestion Workspace)

export type Stage = 'idle' | 'uploading' | 'analyzing' | 'override' | 'publishing' | 'published'

export interface House {
  id: string
  // All coordinates are expressed as percentages (0-100) of the canvas
  // so they survive canvas resizing and image aspect changes.
  x: number
  y: number
  w: number
  h: number
  // Optional styling metadata so the publish step knows what to strip.
  label: string
  // Whether this house is intended to hold text (vs. just a layout cell).
  kind: 'text' | 'image' | 'spacer'
  // What downstream renderer data this house is bound to.
  fieldRole: FieldRole
  // Per-house typographic settings (for text houses).
  typography?: Typography
  // Edge density (0-1) captured by the Grid Definer at detection time —
  // useful for debugging and for the user to understand the classification.
  edgeDensity?: number
  aspectRatio?: number
}

export type FieldRole =
  | 'product_image'
  | 'product_name'
  | 'unit'
  | 'price'
  | 'offer'
  | 'decorative'

export const FIELD_ROLE_LABELS: Record<FieldRole, string> = {
  product_image: 'Product Image',
  product_name: 'Product Name',
  unit: 'Unit',
  price: 'Price',
  offer: 'Offer / Badge',
  decorative: 'Decorative (no data)',
}

export interface Typography {
  fontFamily: string
  fontSize: number // px, relative to a 1080p stage baseline
  color: string // hex
  align: 'left' | 'center' | 'right'
  maxChars: number
  letterSpacing: number // px
  lineHeight: number // multiplier
  weight: number // 400 | 500 | 600 | 700
}

export interface DetectedFont {
  family: string
  confidence: number // 0-1
  weight: number
  color: string // hex
  sample: string
  letterSpacing: 'tight' | 'normal' | 'wide'
  bbox?: { x: number; y: number; w: number; h: number }
}

export interface UploadedImage {
  src: string
  name: string
  width: number
  height: number
}

export interface ChatMessage {
  id: string
  role: 'assistant' | 'user'
  content: string
  timestamp: number
  // optional CTA chip the assistant is suggesting
  cta?: { label: string; action: string }
}

export const DEFAULT_TYPOGRAPHY: Typography = {
  fontFamily: 'Geist',
  fontSize: 32,
  color: '#111827',
  align: 'left',
  maxChars: 24,
  letterSpacing: 0,
  lineHeight: 1.2,
  weight: 400,
}

export const FONT_LIBRARY = [
  'Geist',
  'Inter',
  'Playfair Display',
  'Lora',
  'DM Serif Display',
  'Space Grotesk',
  'JetBrains Mono',
  'Caveat',
]

export const PALETTE = [
  '#111827', '#374151', '#6B7280', '#9CA3AF',
  '#1E3A8A', '#2563EB', '#3B82F6', '#0EA5E9',
  '#059669', '#10B981', '#DC2626', '#F59E0B',
  '#7C3AED', '#DB2777', '#FFFFFF', '#F3F4F6',
]
