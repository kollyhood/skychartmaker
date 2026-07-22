'use client'

import { motion } from 'framer-motion'
import type { BoxTemplate } from '../../types'

/**
 * Product Card box template.
 *
 * Fields: image/emoji, title, subtitle, badge, accentColor
 *
 *   ┌──────────────────────┐
 *   │  [BADGE]             │
 *   │      🍌  / [img]     │
 *   │   Banana             │
 *   │   $0.7               │
 *   └──────────────────────┘
 *
 * If `badge` is empty, the badge element is omitted entirely (not blank).
 */
export const ProductCardBox: BoxTemplate = {
  id: 'product-card',
  name: 'Product Card',
  description: 'Badge + image/emoji + title + subtitle. Matches the original flyer.',
  fields: [
    { key: 'title', label: 'Title', type: 'text', required: true, placeholder: 'Banana', default: '' },
    { key: 'subtitle', label: 'Subtitle', type: 'text', required: false, placeholder: '$0.7', default: '' },
    { key: 'badge', label: 'Badge', type: 'text', required: false, placeholder: '30% OFF', default: '' },
    { key: 'emoji', label: 'Emoji', type: 'emoji', required: false, placeholder: '🍌', default: '' },
    { key: 'image', label: 'Image URL', type: 'image', required: false, placeholder: 'https://...', default: '' },
    { key: 'accentColor', label: 'Accent Color', type: 'color', required: false, default: '#FACC15' },
  ],
  sampleContent: {
    title: 'Banana',
    subtitle: '$0.7',
    badge: '30% OFF',
    emoji: '🍌',
    accentColor: '#FACC15',
  },
  render: ({ content, mode }) => {
    const title = String(content.title ?? '')
    const subtitle = String(content.subtitle ?? '')
    const badge = String(content.badge ?? '')
    const emoji = String(content.emoji ?? '')
    const image = String(content.image ?? '')
    const accent = String(content.accentColor ?? '#FACC15')
    const isHero = mode === 'full'

    return (
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.85, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.85, y: -12 }}
        transition={{ type: 'spring', stiffness: 280, damping: 26 }}
        className="relative h-full w-full overflow-hidden rounded-2xl bg-white text-slate-900 shadow-xl ring-1 ring-black/5"
      >
        <div className="absolute inset-y-0 left-0 w-1.5" style={{ backgroundColor: accent }} />

        <div
          className={
            isHero
              ? 'flex h-full w-full flex-row items-center gap-6 p-6 sm:gap-10 sm:p-10'
              : 'flex h-full w-full flex-col items-center justify-center gap-2 p-4 sm:gap-3 sm:p-6'
          }
        >
          {badge && (
            <div
              className={
                isHero
                  ? 'order-2 self-start rounded-md px-3 py-1.5 text-xs font-bold uppercase tracking-wider sm:text-sm'
                  : 'order-1 self-start rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider sm:text-xs'
              }
              style={{ backgroundColor: accent, color: '#1F2937' }}
            >
              {badge}
            </div>
          )}

          {image ? (
            <img
              src={image}
              alt={title}
              className={
                isHero
                  ? 'order-1 h-24 w-24 rounded-xl object-cover sm:h-40 sm:w-40'
                  : 'order-2 h-16 w-16 rounded-xl object-cover sm:h-24 sm:w-24'
              }
            />
          ) : emoji ? (
            <div
              className={
                isHero
                  ? 'order-1 flex shrink-0 items-center justify-center text-6xl sm:text-8xl'
                  : 'order-2 flex shrink-0 items-center justify-center text-5xl sm:text-7xl'
              }
            >
              {emoji}
            </div>
          ) : null}

          <div
            className={
              isHero
                ? 'order-3 flex flex-1 flex-col justify-center text-left'
                : 'order-3 flex flex-col items-center text-center'
            }
          >
            {title && (
              <div
                className={
                  isHero
                    ? 'text-3xl font-extrabold leading-tight sm:text-5xl lg:text-6xl'
                    : 'text-base font-extrabold leading-tight sm:text-2xl'
                }
              >
                {title}
              </div>
            )}
            {subtitle && (
              <div
                className={
                  isHero
                    ? 'mt-1 text-base text-slate-600 sm:mt-2 sm:text-2xl'
                    : 'mt-0.5 text-sm font-semibold text-slate-600 sm:text-lg'
                }
              >
                {subtitle}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    )
  },
}
