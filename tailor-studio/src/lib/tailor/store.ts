'use client'

import { create } from 'zustand'
import { v4 as uuid } from 'uuid'
import type {
  Stage,
  House,
  Typography,
  DetectedFont,
  UploadedImage,
  ChatMessage,
} from './types'
import { DEFAULT_TYPOGRAPHY, FONT_LIBRARY } from './types'
import { detectHouses as runGridDefiner, type DetectedHouse } from './grid-definer'
import { generateBlankBackdrop } from './publisher'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Convert a DetectedHouse (raw geometry from the Grid Definer) into a full
 * House domain object with a stable ID, label, and (for text houses)
 * sensible default typography.
 */
function toHouse(d: DetectedHouse, index: number): House {
  const label = d.kind === 'image' ? `Image ${index + 1}` : `Block ${index + 1}`
  const house: House = {
    id: uuid(),
    label,
    x: d.x,
    y: d.y,
    w: d.w,
    h: d.h,
    kind: d.kind,
    edgeDensity: d.edgeDensity,
    aspectRatio: d.aspectRatio,
  }
  if (d.kind === 'text') {
    // VLM-detected typography will be applied later via applyDetectedFonts.
    // Until then, give the user something reasonable to look at.
    house.typography = {
      ...DEFAULT_TYPOGRAPHY,
      fontFamily: pickFontByAspectRatio(d.aspectRatio),
      fontSize: scaleFontSize(d.h),
      maxChars: Math.max(8, Math.round(d.w * 1.2)),
    }
  }
  return house
}

function pickFontByAspectRatio(ar: number): string {
  // Headlines tend to be tall-and-wide; body text tends to be wide-and-short.
  if (ar > 3) return 'Geist'
  if (ar > 1.5) return 'Space Grotesk'
  return 'Lora'
}

function scaleFontSize(houseHeightPct: number): number {
  // Heuristic: a house that takes 18% of a 1080-tall canvas is a headline
  // (~64px); a 6% house is body text (~22px).
  const baseline = 1080
  return Math.max(14, Math.min(96, Math.round((houseHeightPct / 100) * baseline * 0.55)))
}

/**
 * For each text House, find the best-matching VLM-detected text region and
 * apply its typography to the house. VLM bboxes can be imprecise, so we use
 * a cascade of matching strategies:
 *
 *   1. Highest overlap (intersection area, not IoU) between house bbox and
 *      font bbox.
 *   2. If no overlap, fall back to nearest font region by centroid distance,
 *      weighted by font region size (bigger text blocks win).
 *   3. If still nothing, leave the house's default typography alone.
 *
 * Each font region can only be matched to one house (greedy), so we don't
 * double-assign the same OCR result.
 */
function applyDetectedFonts(houses: House[], fonts: DetectedFont[]): House[] {
  if (!fonts.length) return houses

  // Sort houses by area descending so big headline blocks get first pick
  // of the font region pool.
  const houseOrder = houses
    .map((h, i) => ({ h, i, area: h.w * h.h }))
    .filter((x) => x.h.kind === 'text' && x.h.typography)
    .sort((a, b) => b.area - a.area)

  const usedFontIdx = new Set<number>()
  const updates = new Map<number, DetectedFont>()

  for (const { h, i } of houseOrder) {
    let bestIdx = -1
    let bestScore = -Infinity

    fonts.forEach((f, fi) => {
      if (usedFontIdx.has(fi) || !f.bbox) return
      // Strategy 1: intersection area
      const inter = intersectionArea(
        { x: h.x, y: h.y, w: h.w, h: h.h },
        f.bbox,
      )
      let score = inter * 10 // intersection is the strongest signal

      // Strategy 2: centroid distance (smaller = better)
      if (score === 0) {
        const fCx = f.bbox.x + f.bbox.w / 2
        const fCy = f.bbox.y + f.bbox.h / 2
        const hCx = h.x + h.w / 2
        const hCy = h.y + h.h / 2
        const dist = Math.sqrt((fCx - hCx) ** 2 + (fCy - hCy) ** 2)
        // Convert distance to a score: closer = higher. Max useful distance ~ 80%.
        const distScore = Math.max(0, 80 - dist) / 80
        // Bigger text regions get a bonus (they're more reliable OCR results)
        const sizeBonus = Math.min(2, (f.bbox.w * f.bbox.h) / 50)
        score = distScore * 5 + sizeBonus
      }

      if (score > bestScore) {
        bestScore = score
        bestIdx = fi
      }
    })

    if (bestIdx >= 0 && bestScore > 0) {
      usedFontIdx.add(bestIdx)
      updates.set(i, fonts[bestIdx])
    }
  }

  return houses.map((h, i) => {
    const f = updates.get(i)
    if (!f) return h
    const letterSpacingPx =
      f.letterSpacing === 'tight' ? -0.5 : f.letterSpacing === 'wide' ? 2 : 0
    return {
      ...h,
      label: f.sample || h.label,
      typography: h.typography
        ? {
            ...h.typography,
            fontFamily: f.family,
            color: f.color,
            weight: f.weight,
            letterSpacing: letterSpacingPx,
          }
        : h.typography,
    }
  })
}

function intersectionArea(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
): number {
  const ax2 = a.x + a.w
  const ay2 = a.y + a.h
  const bx2 = b.x + b.w
  const by2 = b.y + b.h
  const ix = Math.max(0, Math.min(ax2, bx2) - Math.max(a.x, b.x))
  const iy = Math.max(0, Math.min(ay2, by2) - Math.max(a.y, b.y))
  return ix * iy
}

// ---------------------------------------------------------------------------
// Font Hunter client (calls /api/font-hunt)
// ---------------------------------------------------------------------------

async function callFontHunter(
  imageSrc: string,
  onProgress?: (msg: string) => void,
): Promise<DetectedFont[]> {
  onProgress?.('Sending image to Font Hunter (VLM OCR)…')
  const res = await fetch('/api/font-hunt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: imageSrc }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`Font Hunter failed: ${(err as any).error ?? res.statusText}`)
  }
  const data = await res.json()
  const regions: Array<{
    text: string
    color: string
    fontFamily: string
    weight: number
    letterSpacing: 'tight' | 'normal' | 'wide'
    confidence: number
    bbox: { x: number; y: number; w: number; h: number }
  }> = data.regions ?? []

  onProgress?.(`Font Hunter matched ${regions.length} text regions.`)

  // Map VLM regions to our DetectedFont shape.
  return regions.map((r) => ({
    family: r.fontFamily,
    confidence: r.confidence,
    weight: r.weight,
    color: r.color,
    sample: r.text,
    letterSpacing: r.letterSpacing,
    bbox: r.bbox,
  }))
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

interface TailorState {
  stage: Stage
  image: UploadedImage | null
  imageElement: HTMLImageElement | null
  houses: House[]
  detectedFonts: DetectedFont[]
  selectedHouseId: string | null
  showGridOverlay: boolean
  showFontPanel: boolean
  chat: ChatMessage[]
  publishedBackdrop: string | null // PNG data URL after publish
  publishedStageId: string | null
  publishedStageLabel: string | null
  // real-time progress text shown in the chat pane during analyze/publish
  progress: string | null
  // right-click context menu state
  contextMenu: { x: number; y: number; open: boolean; houseId: string | null }

  // actions
  uploadImage: (img: UploadedImage) => Promise<void>
  analyze: () => Promise<void>
  enterOverride: () => void
  selectHouse: (id: string | null) => void
  updateHouse: (id: string, patch: Partial<House>) => void
  updateTypography: (id: string, patch: Partial<Typography>) => void
  duplicateHouse: (id: string) => void
  deleteHouse: (id: string) => void
  addHouseAt: (xPct: number, yPct: number) => void
  toggleGridOverlay: (v?: boolean) => void
  toggleFontPanel: (v?: boolean) => void
  setContextMenu: (c: Partial<TailorState['contextMenu']>) => void
  publish: () => Promise<void>
  reset: () => void
  pushChat: (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => void
  setProgress: (p: string | null) => void
}

export const useTailor = create<TailorState>((set, get) => ({
  stage: 'idle',
  image: null,
  imageElement: null,
  houses: [],
  detectedFonts: [],
  selectedHouseId: null,
  showGridOverlay: true,
  showFontPanel: true,
  chat: [
    {
      id: uuid(),
      role: 'assistant',
      content:
        "Welcome to The Tailor. I'll guide you through capturing a stage from any flyer, ad, or Pinterest screenshot you have on hand.",
      timestamp: Date.now(),
    },
    {
      id: uuid(),
      role: 'assistant',
      content:
        'Step 1 — drop a raw, uncropped image of the layout you want to mimic into the canvas on the right. The Grid Definer will run contour detection and the Font Hunter will run real OCR + font matching.',
      timestamp: Date.now(),
      cta: { label: 'Upload an image →', action: 'focus-upload' },
    },
  ],
  publishedBackdrop: null,
  publishedStageId: null,
  publishedStageLabel: null,
  progress: null,
  contextMenu: { x: 0, y: 0, open: false, houseId: null },

  uploadImage: async (img) => {
    set({ stage: 'uploading', image: img })
    get().pushChat({
      role: 'user',
      content: `Uploaded "${img.name}" (${img.width}×${img.height}).`,
    })

    // Build an HTMLImageElement so the Grid Definer can rasterize it.
    const el = new window.Image()
    el.crossOrigin = 'anonymous'
    await new Promise<void>((resolve, reject) => {
      el.onload = () => resolve()
      el.onerror = () => reject(new Error('Failed to load image'))
      el.src = img.src
    })
    set({ imageElement: el })

    get().pushChat({
      role: 'assistant',
      content:
        'Got it. Running the ingestion engine now — contour detection first, then VLM-based font matching. Watch the canvas for the translucent blue Houses to appear.',
    })
    await get().analyze()
  },

  analyze: async () => {
    set({ stage: 'analyzing', progress: 'Starting ingestion engine…' })
    const img = get().imageElement
    if (!img) {
      get().pushChat({
        role: 'assistant',
        content: '⚠️ I could not load that image. Please try another file.',
      })
      set({ stage: 'idle', progress: null })
      return
    }

    // ---- Grid Definer (real contour detection, client-side) ----
    let detected: DetectedHouse[] = []
    try {
      detected = await runGridDefiner(img, (msg) => {
        get().setProgress(msg)
      })
    } catch (err) {
      get().pushChat({
        role: 'assistant',
        content: `⚠️ Grid Definer failed: ${err instanceof Error ? err.message : 'unknown error'}. You can still add Houses manually via right-click.`,
      })
      detected = []
    }

    const baseHouses = detected.map((d, i) => toHouse(d, i))
    set({ houses: baseHouses })

    // ---- Font Hunter (real OCR + font match via VLM, server-side) ----
    let fonts: DetectedFont[] = []
    try {
      fonts = await callFontHunter(get().image!.src, (msg) => {
        get().setProgress(msg)
      })
      const enriched = applyDetectedFonts(baseHouses, fonts)
      set({ houses: enriched, detectedFonts: fonts })
    } catch (err) {
      get().pushChat({
        role: 'assistant',
        content: `⚠️ Font Hunter failed: ${err instanceof Error ? err.message : 'unknown error'}. You can still set typography manually by clicking any text label.`,
      })
    }

    set({
      stage: 'override',
      progress: null,
    })

    const houseCount = get().houses.length
    const fontCount = fonts.length
    get().pushChat({
      role: 'assistant',
      content:
        houseCount === 0
          ? 'I couldn\u2019t detect any layout blocks in this image. Right-click the canvas to add Houses manually, then drag their corners to size them.'
          : `I detected ${houseCount} houses via contour detection and matched ${fontCount} typeface${fontCount === 1 ? '' : 's'} against the web-font library. Drag any corner to snap geometry, right-click for duplicate/delete, or click a text label to fine-tune its typography.`,
      cta: houseCount > 0 ? { label: 'Looks good — Publish →', action: 'focus-publish' } : undefined,
    })
  },

  enterOverride: () => set({ stage: 'override' }),

  selectHouse: (id) => set({ selectedHouseId: id }),

  updateHouse: (id, patch) =>
    set((s) => ({
      houses: s.houses.map((h) => (h.id === id ? { ...h, ...patch } : h)),
    })),

  updateTypography: (id, patch) =>
    set((s) => ({
      houses: s.houses.map((h) =>
        h.id === id
          ? { ...h, typography: { ...(h.typography || DEFAULT_TYPOGRAPHY), ...patch } }
          : h,
      ),
    })),

  duplicateHouse: (id) => {
    const src = get().houses.find((h) => h.id === id)
    if (!src) return
    const copy: House = {
      ...src,
      id: uuid(),
      x: Math.min(src.x + src.w * 0.08, 99 - src.w),
      y: Math.min(src.y + src.h * 0.08, 99 - src.h),
      typography: src.typography ? { ...src.typography } : undefined,
    }
    set((s) => ({ houses: [...s.houses, copy], selectedHouseId: copy.id }))
  },

  deleteHouse: (id) =>
    set((s) => ({
      houses: s.houses.filter((h) => h.id !== id),
      selectedHouseId: s.selectedHouseId === id ? null : s.selectedHouseId,
    })),

  addHouseAt: (xPct, yPct) => {
    const w = 22
    const h = 14
    const x = Math.max(0, Math.min(xPct - w / 2, 100 - w))
    const y = Math.max(0, Math.min(yPct - h / 2, 100 - h))
    const newHouse: House = {
      id: uuid(),
      label: 'New Block',
      x,
      y,
      w,
      h,
      kind: 'text',
      typography: { ...DEFAULT_TYPOGRAPHY, fontFamily: 'Geist', fontSize: 22 },
    }
    set((s) => ({ houses: [...s.houses, newHouse], selectedHouseId: newHouse.id }))
  },

  toggleGridOverlay: (v) =>
    set((s) => ({ showGridOverlay: v ?? !s.showGridOverlay })),

  toggleFontPanel: (v) =>
    set((s) => ({ showFontPanel: v ?? !s.showFontPanel })),

  setContextMenu: (c) =>
    set((s) => ({ contextMenu: { ...s.contextMenu, ...c } })),

  publish: async () => {
    const img = get().imageElement
    const houses = get().houses
    if (!img || !houses.length) {
      get().pushChat({
        role: 'assistant',
        content: '⚠️ Nothing to publish yet. Upload an image and define at least one House first.',
      })
      return
    }
    set({ stage: 'publishing', progress: 'Stripping text from canvas…' })
    get().pushChat({ role: 'user', content: 'Publish Layout' })

    try {
      get().setProgress('Sampling dominant background color…')
      const result = await generateBlankBackdrop(img, houses)
      get().setProgress('Committing coordinate matrix to database…')

      const label = `STAGE-${new Date().toISOString().slice(5, 10).replace('-', '')}-${Math.floor(Math.random() * 900 + 100)}`

      const res = await fetch('/api/stages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label,
          matrix: houses,
          backdrop: result.backdropUrl,
          width: result.width,
          height: result.height,
          sourceName: get().image?.name ?? null,
          sourceWidth: get().image?.width ?? null,
          sourceHeight: get().image?.height ?? null,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as any).error ?? res.statusText)
      }
      const created = await res.json()

      get().setProgress('Refreshing paired TV screen…')
      await new Promise((r) => setTimeout(r, 600))

      set({
        stage: 'published',
        publishedBackdrop: result.backdropUrl,
        publishedStageId: created.id,
        publishedStageLabel: created.label,
        selectedHouseId: null,
        showGridOverlay: false,
        progress: null,
      })

      get().pushChat({
        role: 'assistant',
        content: `Stage published as ${created.label}. I stripped every text label and dummy asset, generated a 1920×1080 blank backdrop, committed the coordinate matrix (${houses.length} houses) to the database, and refreshed the paired TV screen — it now shows only the silent, empty backdrop you designed.`,
      })
    } catch (err) {
      get().pushChat({
        role: 'assistant',
        content: `⚠️ Publish failed: ${err instanceof Error ? err.message : 'unknown error'}. Your layout is preserved — fix the issue and try again.`,
      })
      set({ stage: 'override', progress: null })
    }
  },

  reset: () => {
    set({
      stage: 'idle',
      image: null,
      imageElement: null,
      houses: [],
      detectedFonts: [],
      selectedHouseId: null,
      showGridOverlay: true,
      publishedBackdrop: null,
      publishedStageId: null,
      publishedStageLabel: null,
      progress: null,
      contextMenu: { x: 0, y: 0, open: false, houseId: null },
      chat: [
        {
          id: uuid(),
          role: 'assistant',
          content: 'Welcome back. Drop another flyer to begin a new stage.',
          timestamp: Date.now(),
        },
      ],
    })
  },

  pushChat: (msg) =>
    set((s) => ({
      chat: [...s.chat, { ...msg, id: uuid(), timestamp: Date.now() }],
    })),

  setProgress: (p) => set({ progress: p }),
}))
