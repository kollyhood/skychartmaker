import fs from 'fs'
import os from 'os'
import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'

export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * The z-ai-web-dev-sdk looks for a key via ZAI_API_KEY or a .z-ai-config
 * file (cwd, home dir, or /etc). We check the same locations up front so
 * a missing key fails fast with a clear message instead of the SDK
 * throwing a less legible error deep inside chat.completions.
 */
function hasZaiCredentials(): boolean {
  if (process.env.ZAI_API_KEY) return true
  const candidates = [
    './.z-ai-config',
    `${os.homedir()}/.z-ai-config`,
    '/etc/.z-ai-config',
  ]
  return candidates.some((p) => {
    try {
      return fs.existsSync(p)
    } catch {
      return false
    }
  })
}

const FONT_LIBRARY = [
  'Playfair Display',
  'Lora',
  'DM Serif Display',
  'Geist',
  'Inter',
  'Space Grotesk',
  'JetBrains Mono',
  'Caveat',
]

interface RawRegion {
  text?: string
  color?: string
  fontFamily?: string
  weight?: number
  letterSpacing?: string
  confidence?: number
  bbox?:
    | { x?: number; y?: number; w?: number; h?: number }
    | { x?: number; y?: number; x2?: number; y2?: number }
    | { x?: number; y?: number; width?: number; height?: number }
}

/**
 * POST /api/font-hunt
 * Body: { image: dataURL }
 *
 * Runs OCR + typography analysis via the VLM. Returns an array of detected
 * text regions, each with the matched font family, hex color, weight, letter
 * spacing descriptor, confidence, and bounding box (in percentages 0-100).
 */
export async function POST(req: NextRequest) {
  try {
    const { image } = (await req.json()) as { image?: string }
    if (!image || !image.startsWith('data:')) {
      return NextResponse.json({ error: 'Missing image data URL' }, { status: 400 })
    }

    // Decode image dimensions from the data URL so we can normalize
    // bounding boxes regardless of whether the VLM returns pixels or %.
    const { width: imgW, height: imgH } = decodeImageDimensions(image)

    if (!hasZaiCredentials()) {
      // No vision model configured yet. Degrade gracefully — the client
      // already treats an empty regions array as "detected 0 typefaces"
      // and prompts the owner to set fonts manually via the label editor.
      return NextResponse.json({
        regions: [],
        skipped: true,
        message:
          'Font Hunter is not configured (no ZAI_API_KEY / .z-ai-config found). Set typography manually by clicking a text label — automatic detection will resume once a key is added.',
      })
    }

    const zai = await ZAI.create()
    const prompt = `You are a typography analysis engine ("Font Hunter").
Analyze the image and identify all distinct text regions (headlines, subheads, body text, captions, footers — skip tiny watermark text).

For each region, return a JSON object with these EXACT keys:
- "text": the actual text content, max 60 characters
- "color": hex color code of the text itself (e.g. "#1E3A8A")
- "fontFamily": the BEST match from this list ONLY: ${JSON.stringify(FONT_LIBRARY)}
- "weight": estimated CSS font-weight as a number (400, 500, 600, or 700)
- "letterSpacing": one of "tight" | "normal" | "wide"
- "confidence": your confidence in the font match, from 0.0 to 1.0
- "bbox": bounding box as PERCENTAGES of image dimensions (0-100). Use keys "x", "y", "w", "h" where (x+w) <= 100 and (y+h) <= 100. Example: a headline filling the top 12% of the image, full width with 5% left margin, would be { "x": 5, "y": 3, "w": 90, "h": 12 }.

Matching guidance:
- Serif typefaces with high contrast strokes → "Playfair Display" (display) or "DM Serif Display" (display) or "Lora" (body)
- Geometric sans-serif → "Space Grotesk"
- Neutral grotesque / humanist sans-serif → "Geist" or "Inter"
- Monospace → "JetBrains Mono"
- Handwritten / script → "Caveat"

Return STRICT JSON only — no markdown fences, no prose. Schema:
{ "regions": [ { "text": "...", "color": "#...", "fontFamily": "...", "weight": 400, "letterSpacing": "normal", "confidence": 0.9, "bbox": { "x": 5, "y": 3, "w": 90, "h": 12 } } ] }

Maximum 8 regions. Only include regions where you are at least 50% confident.
If you cannot find any text, return { "regions": [] }.`

    const response = await zai.chat.completions.createVision({
      model: 'glm-4.6v',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: image } },
          ],
        },
      ],
      thinking: { type: 'disabled' },
    })

    const content = response.choices[0]?.message?.content ?? ''

    // Parse JSON defensively — strip markdown fences if present.
    const cleaned = content
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim()

    let parsed: { regions?: RawRegion[] }
    try {
      parsed = JSON.parse(cleaned)
    } catch {
      // Try to extract the first {...} block
      const match = cleaned.match(/\{[\s\S]*\}/)
      if (!match) {
        return NextResponse.json(
          { error: 'VLM returned unparseable output', raw: content },
          { status: 502 },
        )
      }
      try {
        parsed = JSON.parse(match[0])
      } catch {
        return NextResponse.json(
          { error: 'VLM returned malformed JSON', raw: content },
          { status: 502 },
        )
      }
    }

    const regions = Array.isArray(parsed.regions) ? parsed.regions : []

    // Sanitize + normalize each region. VLMs sometimes return pixel
    // coordinates (especially in {x, y, x2, y2} form) instead of percentages,
    // so we auto-detect and convert.
    const sanitized = regions
      .filter((r) => r && typeof r === 'object')
      .map((r) => {
        const fontFamily =
          r.fontFamily && FONT_LIBRARY.includes(r.fontFamily)
            ? r.fontFamily
            : 'Geist'
        const color = normalizeHex(r.color) ?? '#111827'
        const bbox = normalizeBbox(r.bbox, imgW, imgH)
        return {
          text: typeof r.text === 'string' ? r.text.slice(0, 60) : '',
          color,
          fontFamily,
          weight: [400, 500, 600, 700].includes(r.weight as number)
            ? (r.weight as number)
            : 400,
          letterSpacing:
            r.letterSpacing === 'tight' ||
            r.letterSpacing === 'normal' ||
            r.letterSpacing === 'wide'
              ? r.letterSpacing
              : 'normal',
          confidence:
            typeof r.confidence === 'number'
              ? Math.max(0, Math.min(1, r.confidence))
              : 0.5,
          bbox,
        }
      })
      .filter((r) => r.bbox.w > 0 && r.bbox.h > 0)

    return NextResponse.json({ regions: sanitized })
  } catch (err) {
    console.error('[font-hunt] error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    )
  }
}

function clampPct(v: unknown): number {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? parseFloat(v) : NaN
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(100, n))
}

function normalizeHex(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const s = v.trim().startsWith('#') ? v.trim() : `#${v.trim()}`
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(s) ? s : null
}

/**
 * Decode PNG/JPEG/GIF/WEBP dimensions from a data URL without a full image
 * decode. Falls back to {0, 0} if the format is unknown — in that case
 * pixel-based bboxes from the VLM will pass through unchanged.
 */
function decodeImageDimensions(dataUrl: string): { width: number; height: number } {
  try {
    const comma = dataUrl.indexOf(',')
    if (comma < 0) return { width: 0, height: 0 }
    const meta = dataUrl.slice(0, comma)
    const isBase64 = meta.includes(';base64')
    const payload = dataUrl.slice(comma + 1)
    const buf = isBase64
      ? Buffer.from(payload, 'base64')
      : Buffer.from(decodeURIComponent(payload), 'utf-8')

    // PNG: bytes 16-23 are width and height as big-endian uint32
    if (buf.length > 24 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
      return {
        width: buf.readUInt32BE(16),
        height: buf.readUInt32BE(20),
      }
    }
    // JPEG: scan markers for SOF (0xFFC0–0xFFCF, except 0xFFC4/0xFFC8/0xFFCC)
    if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8) {
      let i = 2
      while (i < buf.length - 9) {
        if (buf[i] !== 0xff) {
          i++
          continue
        }
        const marker = buf[i + 1]
        i += 2
        if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
          // SOF marker: height (2 bytes BE) then width (2 bytes BE), after 1 byte precision
          const height = buf.readUInt16BE(i + 3)
          const width = buf.readUInt16BE(i + 5)
          return { width, height }
        }
        const segLen = buf.readUInt16BE(i)
        i += segLen
      }
    }
    // GIF: bytes 6-9 are little-endian width/height
    if (buf.length > 10 && buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) {
      return {
        width: buf.readUInt16LE(6),
        height: buf.readUInt16LE(8),
      }
    }
    // WebP: RIFF header check
    if (buf.length > 30 && buf.slice(0, 4).toString('ascii') === 'RIFF' && buf.slice(8, 12).toString('ascii') === 'WEBP') {
      const chunkType = buf.slice(12, 16).toString('ascii')
      if (chunkType === 'VP8 ') {
        return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff }
      }
      if (chunkType === 'VP8L') {
        const b0 = buf[21],
          b1 = buf[22],
          b2 = buf[23],
          b3 = buf[24]
        return {
          width: 1 + (((b1 & 0x3f) << 8) | b0),
          height: 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6)),
        }
      }
      if (chunkType === 'VP8X') {
        return {
          width: 1 + (buf[24] | (buf[25] << 8) | (buf[26] << 16)),
          height: 1 + (buf[27] | (buf[28] << 8) | (buf[29] << 16)),
        }
      }
    }
  } catch (err) {
    console.warn('[font-hunt] failed to decode image dimensions:', err)
  }
  return { width: 0, height: 0 }
}

/**
 * Normalize the VLM-returned bbox to {x, y, w, h} in percentages (0-100).
 * Handles three input shapes:
 *   1. { x, y, w, h }                 — preferred (already percentages)
 *   2. { x, y, width, height }        — same, but verbose key names
 *   3. { x, y, x2, y2 }               — pixel corner coordinates
 *
 * For (3), we convert pixels → percentages using the source image dimensions.
 * For (1) and (2), if any value exceeds 100 we assume it's actually pixels
 * and convert to percentages too.
 */
function normalizeBbox(
  bbox: RawRegion['bbox'],
  imgW: number,
  imgH: number,
): { x: number; y: number; w: number; h: number } {
  if (!bbox || typeof bbox !== 'object') {
    return { x: 0, y: 0, w: 0, h: 0 }
  }
  const b = bbox as Record<string, unknown>
  const num = (v: unknown) => (typeof v === 'number' ? v : typeof v === 'string' ? parseFloat(v) : NaN)

  // Form 3: x, y, x2, y2 (corner coordinates, often in pixels)
  if ('x2' in b || 'y2' in b) {
    const x = num(b.x)
    const y = num(b.y)
    const x2 = num(b.x2)
    const y2 = num(b.y2)
    if ([x, y, x2, y2].every(Number.isFinite)) {
      const px = Math.min(x, x2)
      const py = Math.min(y, y2)
      const pw = Math.abs(x2 - x)
      const ph = Math.abs(y2 - y)
      // If values look like pixels (i.e. > 100 OR image dimensions are known)
      // convert to percentages.
      if (imgW > 0 && imgH > 0 && (px > 100 || py > 100 || pw > 100 || ph > 100)) {
        return {
          x: clampPct((px / imgW) * 100),
          y: clampPct((py / imgH) * 100),
          w: clampPct((pw / imgW) * 100),
          h: clampPct((ph / imgH) * 100),
        }
      }
      return {
        x: clampPct(px),
        y: clampPct(py),
        w: clampPct(pw),
        h: clampPct(ph),
      }
    }
  }

  // Form 1 or 2: x, y, w/h, h/height
  const x = num(b.x)
  const y = num(b.y)
  const w = num('w' in b ? b.w : b.width)
  const h = num('h' in b ? b.h : b.height)
  if (![x, y, w, h].every(Number.isFinite)) {
    return { x: 0, y: 0, w: 0, h: 0 }
  }

  // Auto-detect pixel values: if any value > 100 and we know the image
  // dimensions, treat as pixels and convert.
  if (imgW > 0 && imgH > 0 && (x > 100 || y > 100 || w > 100 || h > 100)) {
    return {
      x: clampPct((x / imgW) * 100),
      y: clampPct((y / imgH) * 100),
      w: clampPct((w / imgW) * 100),
      h: clampPct((h / imgH) * 100),
    }
  }

  return { x: clampPct(x), y: clampPct(y), w: clampPct(w), h: clampPct(h) }
}
