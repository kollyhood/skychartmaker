'use client'

import { motion } from 'framer-motion'
import type { BoxTemplate } from '../../types'

/**
 * Clearance Card box template.
 *
 * Fields: name, description, originalPrice, salePrice, image/emoji, badge
 *
 *   ┌──────────────────────┐
 *   │  [BADGE]             │
 *   │      🍌  / [img]     │
 *   │   Banana             │
 *   │   Fresh from farm    │
 *   │   $5.70  $3.99       │  ← struck-through original + bold sale
 *   └──────────────────────┘
 *
 * Demonstrates a different field schema from ProductCard — has its own
 * price-related fields (originalPrice, salePrice) and a description.
 */
export const ClearanceCardBox: BoxTemplate = {
  id: 'clearance-card',
  name: 'Clearance Card',
  description: 'Product card with original + sale price. Different field schema from Product Card.',
  fields: [
    { key: 'name', label: 'Product Name', type: 'text', required: true, placeholder: 'Banana', default: '' },
    { key: 'description', label: 'Description', type: 'textarea', required: false, placeholder: 'Fresh from the farm', default: '' },
    { key: 'originalPrice', label: 'Original Price', type: 'number', required: false, placeholder: '5.70', default: '' },
    { key: 'salePrice', label: 'Sale Price', type: 'number', required: false, placeholder: '3.99', default: '' },
    { key: 'badge', label: 'Badge', type: 'text', required: false, placeholder: 'CLEARANCE', default: '' },
    { key: 'emoji', label: 'Emoji', type: 'emoji', required: false, placeholder: '🍌', default: '' },
    { key: 'image', label: 'Image URL', type: 'image', required: false, placeholder: 'https://...', default: '' },
  ],
  sampleContent: {
    name: 'Banana',
    description: 'Fresh from the farm — must sell today',
    originalPrice: 5.7,
    salePrice: 3.99,
    badge: 'CLEARANCE',
    emoji: '🍌',
  },
  render: ({ content, mode }) => {
    const name = String(content.name ?? '')
    const description = String(content.description ?? '')
    const originalPrice = content.originalPrice !== '' ? Number(content.originalPrice) : null
    const salePrice = content.salePrice !== '' ? Number(content.salePrice) : null
    const badge = String(content.badge ?? '')
    const emoji = String(content.emoji ?? '')
    const image = String(content.image ?? '')
    const isHero = mode === 'full'

    const fmt = (n: number) =>
      `$${Number.isInteger(n) ? n.toFixed(2) : n.toFixed(2)}`

    return (
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.85, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.85, y: -12 }}
        transition={{ type: 'spring', stiffness: 280, damping: 26 }}
        className="relative h-full w-full overflow-hidden rounded-2xl bg-white text-slate-900 shadow-xl ring-1 ring-red-200"
      >
        {/* Red left bar to signal clearance */}
        <div className="absolute inset-y-0 left-0 w-1.5 bg-red-500" />

        <div
          className={
            isHero
              ? 'flex h-full w-full flex-row items-center gap-6 p-6 sm:gap-10 sm:p-10'
              : 'flex h-full w-full flex-col items-center justify-center gap-1.5 p-4 sm:gap-2 sm:p-5'
          }
        >
          {badge && (
            <div
              className={
                isHero
                  ? 'order-2 self-start rounded-md px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-white sm:text-sm'
                  : 'order-1 self-start rounded-md px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white sm:text-xs'
              }
              style={{ backgroundColor: '#EF4444' }}
            >
              {badge}
            </div>
          )}

          {image ? (
            <img
              src={image}
              alt={name}
              className={
                isHero
                  ? 'order-1 h-24 w-24 rounded-xl object-cover sm:h-40 sm:w-40'
                  : 'order-2 h-14 w-14 rounded-xl object-cover sm:h-20 sm:w-20'
              }
            />
          ) : emoji ? (
            <div
              className={
                isHero
                  ? 'order-1 flex shrink-0 items-center justify-center text-6xl sm:text-8xl'
                  : 'order-2 flex shrink-0 items-center justify-center text-4xl sm:text-6xl'
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
            {name && (
              <div
                className={
                  isHero
                    ? 'text-3xl font-extrabold leading-tight sm:text-5xl'
                    : 'text-sm font-extrabold leading-tight sm:text-xl'
                }
              >
                {name}
              </div>
            )}
            {description && (
              <div
                className={
                  isHero
                    ? 'mt-1 text-base text-slate-600 sm:mt-2 sm:text-lg'
                    : 'mt-0.5 text-[10px] text-slate-500 sm:text-xs'
                }
              >
                {description}
              </div>
            )}
            {(originalPrice !== null || salePrice !== null) && (
              <div
                className={
                  isHero
                    ? 'mt-2 flex items-baseline gap-3 sm:mt-3 sm:gap-4'
                    : 'mt-1 flex items-baseline gap-2 sm:mt-2'
                }
              >
                {originalPrice !== null && (
                  <span
                    className={
                      isHero
                        ? 'text-lg text-slate-400 line-through sm:text-xl'
                        : 'text-xs text-slate-400 line-through sm:text-sm'
                    }
                  >
                    {fmt(originalPrice)}
                  </span>
                )}
                {salePrice !== null && (
                  <span
                    className={
                      isHero
                        ? 'text-3xl font-extrabold text-red-600 sm:text-4xl'
                        : 'text-base font-extrabold text-red-600 sm:text-xl'
                    }
                  >
                    {fmt(salePrice)}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    )
  },
}
