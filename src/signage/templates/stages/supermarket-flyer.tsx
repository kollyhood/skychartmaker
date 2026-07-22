'use client'

import type { StageTemplate } from '../../types'

/**
 * Supermarket Flyer stage — a recreation of the original flyer's chrome:
 *   - Green header with "SPECIAL PROMO" + discount badge
 *   - White middle area where actors render
 *   - Green footer with contact info
 *
 * The actors layer is rendered inside the white middle band, so the green
 * header/footer stay visible at all times as static stage chrome.
 */
export const SupermarketFlyerStage: StageTemplate = {
  id: 'supermarket-flyer',
  name: 'Flyer (Header+Footer)',
  description: 'Green header + footer with white content area — matches the original flyer',
  swatch: 'linear-gradient(180deg, #16A34A 0%, #16A34A 18%, #FFFFFF 18%, #FFFFFF 82%, #16A34A 82%)',
  render: ({ children }) => (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-white">
      {/* ── Header (static) ── */}
      <header
        className="flex shrink-0 items-center justify-between px-4 py-3 sm:px-6 sm:py-4"
        style={{ backgroundColor: '#16A34A' }}
      >
        <div className="text-white">
          <div className="text-lg font-extrabold leading-tight tracking-tight sm:text-2xl lg:text-3xl">
            SPECIAL PROMO
          </div>
          <div className="text-[10px] font-medium uppercase tracking-wider opacity-90 sm:text-xs">
            Grocery Catalog Discount
          </div>
        </div>
        <div
          className="rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-900 sm:px-3 sm:py-1.5 sm:text-xs"
          style={{ backgroundColor: '#FACC15' }}
        >
          Discount up to 50%
        </div>
      </header>

      {/* ── Actors area ── */}
      <div className="relative flex-1 overflow-hidden p-3 sm:p-4">{children}</div>

      {/* ── Footer (static) ── */}
      <footer
        className="flex shrink-0 flex-col items-center justify-center gap-0.5 px-4 py-2 text-center text-white sm:gap-1 sm:py-3"
        style={{ backgroundColor: '#16A34A' }}
      >
        <div className="text-[10px] font-medium sm:text-xs">+123 456 7890</div>
        <div className="text-[10px] font-medium opacity-90 sm:text-xs">www.grocerycatalog.com</div>
        <div className="text-[10px] opacity-75 sm:text-xs">123 Anywhere St, Any City</div>
      </footer>
    </div>
  ),
}
