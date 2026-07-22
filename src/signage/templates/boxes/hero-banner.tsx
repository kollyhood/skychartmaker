'use client'

import { motion } from 'framer-motion'
import type { BoxTemplate } from '../../types'

/**
 * Hero Banner box template.
 *
 * Fields: title, subtitle, badge, accentColor
 *
 * A bold text-only banner suited for full-stage hero placement. Has a
 * large gradient background that uses the accent color, big headline,
 * and a centered badge. Designed for `mode === 'full'` but renders
 * in grid cells too (scaled down).
 */
export const HeroBannerBox: BoxTemplate = {
  id: 'hero-banner',
  name: 'Hero Banner',
  description: 'Large bold banner — ideal for full-stage placement',
  fields: [
    { key: 'title', label: 'Headline', type: 'text', required: true, placeholder: 'SPECIAL PROMO', default: '' },
    { key: 'subtitle', label: 'Sub-headline', type: 'text', required: false, placeholder: 'up to 50% OFF', default: '' },
    { key: 'badge', label: 'Badge', type: 'text', required: false, placeholder: 'LIMITED TIME', default: '' },
    { key: 'accentColor', label: 'Accent Color', type: 'color', required: false, default: '#F97316' },
  ],
  sampleContent: {
    title: 'FLASH SALE',
    subtitle: 'Today only — up to 50% off fresh produce',
    badge: 'LIMITED TIME',
    accentColor: '#F97316',
  },
  render: ({ content, mode }) => {
    const title = String(content.title ?? '')
    const subtitle = String(content.subtitle ?? '')
    const badge = String(content.badge ?? '')
    const accent = String(content.accentColor ?? '#F97316')
    const isHero = mode === 'full'

    return (
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.92 }}
        transition={{ type: 'spring', stiffness: 240, damping: 28 }}
        className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-2xl text-center text-white shadow-xl"
        style={{
          background: `linear-gradient(135deg, ${accent} 0%, #0F172A 100%)`,
        }}
      >
        {/* Decorative concentric rings */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div
            className="rounded-full border-2 border-white/10"
            style={{ width: isHero ? '60%' : '80%', height: isHero ? '60%' : '80%' }}
          />
          <div
            className="absolute rounded-full border border-white/10"
            style={{ width: isHero ? '80%' : '100%', height: isHero ? '80%' : '100%' }}
          />
        </div>

        <div
          className={
            isHero
              ? 'relative z-10 flex flex-col items-center gap-3 p-8 sm:gap-5 sm:p-12'
              : 'relative z-10 flex flex-col items-center gap-1.5 p-4 sm:gap-2 sm:p-5'
          }
        >
          {badge && (
            <div
              className={
                isHero
                  ? 'rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-slate-900 sm:text-sm'
                  : 'rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-slate-900 sm:text-[10px]'
              }
              style={{ backgroundColor: '#FFFFFF' }}
            >
              {badge}
            </div>
          )}
          {title && (
            <div
              className={
                isHero
                  ? 'text-4xl font-black uppercase leading-none tracking-tight drop-shadow-lg sm:text-6xl lg:text-7xl'
                  : 'text-xl font-black uppercase leading-none tracking-tight sm:text-2xl'
              }
            >
              {title}
            </div>
          )}
          {subtitle && (
            <div
              className={
                isHero
                  ? 'max-w-2xl text-base font-medium text-white/90 sm:text-xl'
                  : 'max-w-prose text-[11px] font-medium text-white/85 sm:text-xs'
              }
            >
              {subtitle}
            </div>
          )}
        </div>
      </motion.div>
    )
  },
}
