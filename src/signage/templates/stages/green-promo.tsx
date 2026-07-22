'use client'

import type { StageTemplate } from '../../types'

/**
 * Green Promo stage — the original supermarket signage background.
 * Solid green with subtle radial highlights. Minimal chrome.
 */
export const GreenPromoStage: StageTemplate = {
  id: 'green-promo',
  name: 'Green Promo',
  description: 'Bright green background with subtle highlights',
  swatch: '#16A34A',
  render: ({ children }) => (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{
        backgroundColor: '#16A34A',
        backgroundImage:
          'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.10) 0%, transparent 45%), radial-gradient(circle at 80% 80%, rgba(0,0,0,0.10) 0%, transparent 45%)',
      }}
    >
      <div className="pointer-events-none absolute left-4 top-4 z-10 select-none text-xs font-semibold uppercase tracking-widest text-white/40">
        Stage
      </div>
      {children}
    </div>
  ),
}
