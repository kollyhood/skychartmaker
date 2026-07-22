'use client'

/**
 * Grid mode presets — common layouts for supermarket signage.
 *
 * Each preset is a named layout with fixed rows × cols. The `custom` mode
 * lets the controller specify arbitrary rows × cols × gap at runtime.
 *
 * Actors can still override their position with `position: { row, col }`,
 * but for typical use cases the auto-flow layout just works.
 */

import type { GridMode } from './types'

// A small SVG grid icon factory so each preset has a visual preview.
const GridIcon = ({ rows, cols }: { rows: number; cols: number }) => (
  <svg
    width="32"
    height="32"
    viewBox="0 0 32 32"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    className="text-current"
  >
    {Array.from({ length: rows }).map((_, r) =>
      Array.from({ length: cols }).map((_, c) => {
        const cellW = 28 / cols
        const cellH = 28 / rows
        const gap = 2
        return (
          <rect
            key={`${r}-${c}`}
            x={2 + c * (cellW + gap)}
            y={2 + r * (cellH + gap)}
            width={cellW}
            height={cellH}
            rx="1.5"
            fill="currentColor"
            fillOpacity={rows * cols === 1 ? 0.9 : 0.55}
            stroke="none"
          />
        )
      }),
    )}
  </svg>
)

const FullIcon = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" className="text-current">
    <rect x="2" y="2" width="28" height="28" rx="2" fill="currentColor" fillOpacity="0.9" />
  </svg>
)

export const GRID_MODES: GridMode[] = [
  {
    id: 'full',
    name: 'Full Screen',
    description: '1 actor fills the entire stage (hero mode)',
    icon: <FullIcon />,
    rows: 1,
    cols: 1,
  },
  {
    id: '2x1',
    name: '2 × 1',
    description: '2 actors side by side (split-screen)',
    icon: <GridIcon rows={1} cols={2} />,
    rows: 1,
    cols: 2,
  },
  {
    id: '1x2',
    name: '1 × 2',
    description: '2 actors stacked vertically',
    icon: <GridIcon rows={2} cols={1} />,
    rows: 2,
    cols: 1,
  },
  {
    id: '2x2',
    name: '2 × 2',
    description: '4 actors in a square grid',
    icon: <GridIcon rows={2} cols={2} />,
    rows: 2,
    cols: 2,
  },
  {
    id: '3x2',
    name: '3 × 2',
    description: '6 actors — matches the original flyer',
    icon: <GridIcon rows={2} cols={3} />,
    rows: 2,
    cols: 3,
  },
  {
    id: '3x3',
    name: '3 × 3',
    description: '9 actors in a dense grid',
    icon: <GridIcon rows={3} cols={3} />,
    rows: 3,
    cols: 3,
  },
  {
    id: '4x2',
    name: '4 × 2',
    description: '8 actors in a wide grid',
    icon: <GridIcon rows={2} cols={4} />,
    rows: 2,
    cols: 4,
  },
  {
    id: 'custom',
    name: 'Custom',
    description: 'User-defined rows × cols × gap',
    icon: <GridIcon rows={3} cols={4} />,
    rows: 3,
    cols: 4,
    editable: true,
  },
]

export const DEFAULT_GRID_MODE_ID = '3x2'
export const DEFAULT_GAP = 16

export function getGridMode(id: string): GridMode | undefined {
  return GRID_MODES.find((m) => m.id === id)
}
