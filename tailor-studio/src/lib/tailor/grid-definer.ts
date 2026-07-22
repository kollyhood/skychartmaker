'use client'

/**
 * Real Grid Definer — client-side contour-detection pipeline.
 *
 * Pipeline:
 *   1. Downscale to max ~500px on long side for performance.
 *   2. Grayscale (Rec. 601 luma).
 *   3. Gaussian blur (3x3) to suppress noise.
 *   4. Sobel edge magnitude.
 *   5. Otsu threshold → binary edge map.
 *   6. Morphological close (dilate-then-erode) to fuse nearby edges into blocks.
 *   7. Connected-components labeling (4-connectivity).
 *   8. Filter by size + aspect ratio; sort by area desc; cap at 8.
 *   9. Classify each as 'text' | 'image' using edge density + aspect ratio.
 *
 *  All coordinates returned as percentages of the source image so they
 *  survive canvas resizing on the right pane.
 */

export interface DetectedHouse {
  x: number // %
  y: number // %
  w: number // %
  h: number // %
  kind: 'text' | 'image'
  edgeDensity: number
  aspectRatio: number
  area: number // %² of source image
}

const MAX_DIM = 500
const MIN_AREA_RATIO = 0.012 // drop blocks < 1.2% of image
const MAX_AREA_RATIO = 0.85  // drop blocks > 85% of image (whole image)
const MAX_ASPECT = 14
const MIN_ASPECT = 0.07
const MAX_HOUSES = 8

export async function detectHouses(
  img: HTMLImageElement,
  onProgress?: (msg: string) => void,
): Promise<DetectedHouse[]> {
  onProgress?.('Scaling image to working resolution…')
  const scale = Math.min(1, MAX_DIM / Math.max(img.naturalWidth, img.naturalHeight))
  const w = Math.max(1, Math.round(img.naturalWidth * scale))
  const h = Math.max(1, Math.round(img.naturalHeight * scale))

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(img, 0, 0, w, h)
  const { data } = ctx.getImageData(0, 0, w, h)

  onProgress?.('Converting to grayscale…')
  const gray = toGray(data, w, h)

  onProgress?.('Applying Gaussian blur…')
  const blurred = gaussianBlur(gray, w, h)

  onProgress?.('Running Sobel edge detection…')
  const edges = sobelMagnitude(blurred, w, h)

  onProgress?.('Thresholding edges (Otsu)…')
  const threshold = otsuThreshold(edges)
  const binary = new Uint8Array(w * h)
  for (let i = 0; i < edges.length; i++) {
    binary[i] = edges[i] > threshold ? 1 : 0
  }

  onProgress?.('Closing morphological gaps…')
  const dilated = dilate(binary, w, h, 2)
  const closed = erode(dilated, w, h, 2)

  onProgress?.('Finding connected components…')
  const components = findConnectedComponents(closed, w, h)

  onProgress?.('Filtering layout blocks…')
  const totalArea = w * h
  const houses = components
    .filter((c) => {
      const area = c.w * c.h
      if (area < totalArea * MIN_AREA_RATIO) return false
      if (area > totalArea * MAX_AREA_RATIO) return false
      const ar = c.w / c.h
      if (ar > MAX_ASPECT || ar < MIN_ASPECT) return false
      return true
    })
    .sort((a, b) => b.w * b.h - a.w * a.h)
    .slice(0, MAX_HOUSES)
    .map((c) => {
      const edgeDensity = computeEdgeDensity(edges, c, w)
      const ar = c.w / c.h
      const kind: 'text' | 'image' =
        edgeDensity > 0.14 || ar > 3.5 || ar < 0.28 ? 'text' : 'image'
      return {
        x: (c.x / w) * 100,
        y: (c.y / h) * 100,
        w: (c.w / w) * 100,
        h: (c.h / h) * 100,
        kind,
        edgeDensity,
        aspectRatio: ar,
        area: ((c.w * c.h) / totalArea) * 100,
      }
    })

  onProgress?.(`Detected ${houses.length} houses.`)
  return houses
}

// ---------------------------------------------------------------------------
// Image-processing primitives
// ---------------------------------------------------------------------------

function toGray(rgba: Uint8ClampedArray, _w: number, _h: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(rgba.length / 4)
  for (let i = 0, j = 0; i < rgba.length; i += 4, j++) {
    // Rec. 601 luma
    out[j] = (rgba[i] * 0.299 + rgba[i + 1] * 0.587 + rgba[i + 2] * 0.114) | 0
  }
  return out
}

function gaussianBlur(src: Uint8ClampedArray, w: number, h: number): Uint8ClampedArray {
  // Separable 3x3 Gaussian: kernel = [1,2,1] / 4
  const tmp = new Uint8ClampedArray(w * h)
  const out = new Uint8ClampedArray(w * h)
  // Horizontal pass
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const left = src[y * w + Math.max(0, x - 1)]
      const mid = src[y * w + x]
      const right = src[y * w + Math.min(w - 1, x + 1)]
      tmp[y * w + x] = (left + 2 * mid + right) >> 2
    }
  }
  // Vertical pass
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const top = tmp[Math.max(0, y - 1) * w + x]
      const mid = tmp[y * w + x]
      const bot = tmp[Math.min(h - 1, y + 1) * w + x]
      out[y * w + x] = (top + 2 * mid + bot) >> 2
    }
  }
  return out
}

function sobelMagnitude(src: Uint8ClampedArray, w: number, h: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(w * h)
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const tl = src[(y - 1) * w + (x - 1)]
      const tc = src[(y - 1) * w + x]
      const tr = src[(y - 1) * w + (x + 1)]
      const ml = src[y * w + (x - 1)]
      const mr = src[y * w + (x + 1)]
      const bl = src[(y + 1) * w + (x - 1)]
      const bc = src[(y + 1) * w + x]
      const br = src[(y + 1) * w + (x + 1)]
      const gx = -tl - 2 * ml - bl + tr + 2 * mr + br
      const gy = -tl - 2 * tc - tr + bl + 2 * bc + br
      const mag = Math.sqrt(gx * gx + gy * gy)
      out[y * w + x] = Math.min(255, mag | 0)
    }
  }
  return out
}

function otsuThreshold(hist: Uint8ClampedArray): number {
  // Build histogram
  const counts = new Array(256).fill(0)
  for (let i = 0; i < hist.length; i++) counts[hist[i]]++
  const total = hist.length
  let sum = 0
  for (let i = 0; i < 256; i++) sum += i * counts[i]
  let sumB = 0
  let wB = 0
  let maxVar = 0
  let threshold = 128
  for (let i = 0; i < 256; i++) {
    wB += counts[i]
    if (wB === 0) continue
    const wF = total - wB
    if (wF === 0) break
    sumB += i * counts[i]
    const mB = sumB / wB
    const mF = (sum - sumB) / wF
    const between = wB * wF * (mB - mF) * (mB - mF)
    if (between > maxVar) {
      maxVar = between
      threshold = i
    }
  }
  // Clamp to a sensible range for natural images
  return Math.max(40, Math.min(180, threshold))
}

function dilate(src: Uint8Array, w: number, h: number, radius: number): Uint8Array {
  const out = new Uint8Array(w * h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let v = 0
      for (let dy = -radius; dy <= radius && !v; dy++) {
        for (let dx = -radius; dx <= radius && !v; dx++) {
          const yy = y + dy
          const xx = x + dx
          if (yy < 0 || yy >= h || xx < 0 || xx >= w) continue
          if (src[yy * w + xx]) v = 1
        }
      }
      out[y * w + x] = v
    }
  }
  return out
}

function erode(src: Uint8Array, w: number, h: number, radius: number): Uint8Array {
  const out = new Uint8Array(w * h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let v = 1
      for (let dy = -radius; dy <= radius && v; dy++) {
        for (let dx = -radius; dx <= radius && v; dx++) {
          const yy = y + dy
          const xx = x + dx
          if (yy < 0 || yy >= h || xx < 0 || xx >= w) {
            v = 0
            continue
          }
          if (!src[yy * w + xx]) v = 0
        }
      }
      out[y * w + x] = v
    }
  }
  return out
}

interface RawBox {
  x: number
  y: number
  w: number
  h: number
}

function findConnectedComponents(binary: Uint8Array, w: number, h: number): RawBox[] {
  const labels = new Int32Array(w * h)
  const components: RawBox[] = []
  let nextLabel = 1

  // 4-connectivity BFS
  const queue: number[] = []
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x
      if (!binary[idx] || labels[idx]) continue
      const label = nextLabel++
      labels[idx] = label
      queue.push(idx)
      let minX = x,
        maxX = x,
        minY = y,
        maxY = y
      while (queue.length) {
        const cur = queue.shift()!
        const cx = cur % w
        const cy = (cur / w) | 0
        if (cx < minX) minX = cx
        if (cx > maxX) maxX = cx
        if (cy < minY) minY = cy
        if (cy > maxY) maxY = cy
        // 4 neighbors
        const neighbors = [
          cy > 0 ? cur - w : -1,
          cy < h - 1 ? cur + w : -1,
          cx > 0 ? cur - 1 : -1,
          cx < w - 1 ? cur + 1 : -1,
        ]
        for (const n of neighbors) {
          if (n < 0) continue
          if (binary[n] && !labels[n]) {
            labels[n] = label
            queue.push(n)
          }
        }
      }
      components.push({
        x: minX,
        y: minY,
        w: maxX - minX + 1,
        h: maxY - minY + 1,
      })
    }
  }
  return components
}

function computeEdgeDensity(
  edges: Uint8ClampedArray,
  box: RawBox,
  w: number,
): number {
  let sum = 0
  for (let y = box.y; y < box.y + box.h; y++) {
    for (let x = box.x; x < box.x + box.w; x++) {
      sum += edges[y * w + x]
    }
  }
  // Normalize: 255 (max edge magnitude) * box area = max possible sum
  const maxSum = 255 * box.w * box.h
  return sum / maxSum
}
