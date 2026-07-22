'use client'

import type { StageTemplate } from '../../types'

/**
 * Dark Premium stage — dark navy background with gold accents.
 * Suits high-end product showcases.
 */
export const DarkPremiumStage: StageTemplate = {
  id: 'dark-premium',
  name: 'Dark Premium',
  description: 'Navy gradient with gold corner accents',
  swatch: '#0F172A',
  render: ({ children }) => (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{
        backgroundColor: '#0F172A',
        backgroundImage:
          'radial-gradient(circle at 50% 0%, rgba(217, 164, 39, 0.18) 0%, transparent 55%), radial-gradient(circle at 50% 100%, rgba(99, 102, 241, 0.12) 0%, transparent 55%)',
      }}
    >
      {/* Decorative gold corner accents */}
      <div className="pointer-events-none absolute left-0 top-0 h-16 w-16 border-l-2 border-t-2 border-amber-400/40" />
      <div className="pointer-events-none absolute right-0 top-0 h-16 w-16 border-r-2 border-t-2 border-amber-400/40" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-16 w-16 border-b-2 border-l-2 border-amber-400/40" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-16 w-16 border-b-2 border-r-2 border-amber-400/40" />

      <div className="pointer-events-none absolute left-4 top-4 z-10 select-none text-xs font-semibold uppercase tracking-widest text-amber-400/50">
        Stage
      </div>
      {children}
    </div>
  ),
}
