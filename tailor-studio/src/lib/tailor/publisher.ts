'use client'

/**
 * Real Publisher — generates a high-resolution blank backdrop PNG by stripping
 * text and dummy items from the source image.
 *
 * Strategy:
 *   1. Downscale source to a working canvas (max 600px long side).
 *   2. Sample the dominant background color across the whole image, ignoring
 *      near-white and near-black outliers so we get the "page color".
 *   3. For every text House, sample the LOCAL background color from the
 *      border just outside the house bbox (so a footer in gray, a headline
 *      in navy on cream, etc., each get inpainted with the right color).
 *   4. Paint a 1920×1080 output canvas:
 *      - Fill with the dominant background color.
 *      - For each text house, fill its rect with the local sampled color.
 *      - Image houses are left as-is (they'll be replaced by user content
 *        later, but the backdrop preserves their slot color).
 *   5. Convert to PNG data URL and return along with the dominant color.
 */

export interface PublishResult {
  backdropUrl: string // PNG data URL, 1920×1080
  dominantColor: string // hex
  width: number
  height: number
}

const OUT_W = 1920
const OUT_H = 1080
const WORK_DIM = 600

export async function generateBlankBackdrop(
  img: HTMLImageElement,
  houses: Array<{
    x: number
    y: number
    w: number
    h: number
    kind: 'text' | 'image' | 'spacer'
  }>,
): Promise<PublishResult> {
  // 1. Working canvas
  const scale = Math.min(1, WORK_DIM / Math.max(img.naturalWidth, img.naturalHeight))
  const w = Math.max(1, Math.round(img.naturalWidth * scale))
  const h = Math.max(1, Math.round(img.naturalHeight * scale))

  const work = document.createElement('canvas')
  work.width = w
  work.height = h
  const wctx = work.getContext('2d', { willReadFrequently: true })!
  wctx.drawImage(img, 0, 0, w, h)
  const imgData = wctx.getImageData(0, 0, w, h)
  const pixels = imgData.data

  // 2. Dominant background color via 4-bit-per-channel histogram, skipping
  //    near-white and near-black outliers.
  const buckets = new Map<string, { count: number; r: number; g: number; b: number }>()
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i]
    const g = pixels[i + 1]
    const b = pixels[i + 2]
    // skip near-white
    if (r > 240 && g > 240 && b > 240) continue
    // skip near-black
    if (r < 24 && g < 24 && b < 24) continue
    const key = `${r >> 4}-${g >> 4}-${b >> 4}`
    const cur = buckets.get(key)
    if (cur) {
      cur.count++
      cur.r += r
      cur.g += g
      cur.b += b
    } else {
      buckets.set(key, { count: 1, r, g, b })
    }
  }
  let dom: [number, number, number] = [240, 240, 240]
  let domCount = 0
  for (const v of buckets.values()) {
    if (v.count > domCount) {
      domCount = v.count
      dom = [Math.round(v.r / v.count), Math.round(v.g / v.count), Math.round(v.b / v.count)]
    }
  }
  const dominantColor = rgbToHex(dom[0], dom[1], dom[2])

  // 3. Sample local background color for each text house by reading pixels
  //    from a thin border just outside the house bbox.
  const localColors = new Map<number, string>()
  houses.forEach((house, i) => {
    if (house.kind !== 'text') return
    const hx = (house.x / 100) * w
    const hy = (house.y / 100) * h
    const hw = (house.w / 100) * w
    const hh = (house.h / 100) * h
    localColors.set(i, sampleLocalBackground(pixels, w, h, hx, hy, hw, hh))
  })

  // 4. Paint the output canvas
  const out = document.createElement('canvas')
  out.width = OUT_W
  out.height = OUT_H
  const octx = out.getContext('2d')!

  // Fill with dominant color
  octx.fillStyle = dominantColor
  octx.fillRect(0, 0, OUT_W, OUT_H)

  // Subtle gradient overlay for visual interest (very faint)
  const grad = octx.createLinearGradient(0, 0, OUT_W, OUT_H)
  grad.addColorStop(0, 'rgba(255,255,255,0.04)')
  grad.addColorStop(1, 'rgba(0,0,0,0.04)')
  octx.fillStyle = grad
  octx.fillRect(0, 0, OUT_W, OUT_H)

  // Paint over text houses with their local background color
  houses.forEach((house, i) => {
    if (house.kind !== 'text') return
    const ox = (house.x / 100) * OUT_W
    const oy = (house.y / 100) * OUT_H
    const ow = (house.w / 100) * OUT_W
    const oh = (house.h / 100) * OUT_H
    octx.fillStyle = localColors.get(i) ?? dominantColor
    octx.fillRect(ox, oy, ow, oh)
  })

  // 5. Encode PNG
  const backdropUrl = out.toDataURL('image/png')
  return { backdropUrl, dominantColor, width: OUT_W, height: OUT_H }
}

/**
 * Sample the local background color by averaging pixels in a thin border
 * just outside the house bbox. Falls back to the dominant color if the
 * border is fully off-canvas.
 */
function sampleLocalBackground(
  pixels: Uint8ClampedArray,
  w: number,
  h: number,
  x: number,
  y: number,
  bw: number,
  bh: number,
): string {
  const margin = Math.max(2, Math.min(bw, bh) * 0.12)
  let r = 0,
    g = 0,
    b = 0,
    n = 0

  const sample = (px: number, py: number) => {
    if (px < 0 || px >= w || py < 0 || py >= h) return
    const idx = (py * w + px) * 4
    r += pixels[idx]
    g += pixels[idx + 1]
    b += pixels[idx + 2]
    n++
  }

  // Top border
  for (let dx = -margin; dx <= bw + margin; dx += Math.max(1, (bw + 2 * margin) / 24)) {
    sample(x + dx, y - margin)
    sample(x + dx, y + bh + margin)
  }
  // Side borders
  for (let dy = -margin; dy <= bh + margin; dy += Math.max(1, (bh + 2 * margin) / 24)) {
    sample(x - margin, y + dy)
    sample(x + bw + margin, y + dy)
  }

  if (n === 0) return '#ffffff'
  return rgbToHex(Math.round(r / n), Math.round(g / n), Math.round(b / n))
}

function rgbToHex(r: number, g: number, b: number): string {
  const h = (v: number) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')
  return `#${h(r)}${h(g)}${h(b)}`
}
