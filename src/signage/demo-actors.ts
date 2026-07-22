/**
 * Sample actors matching the original flyer image (Banana, Watermelon, etc.)
 * Used by the "Quick Fill" demo button and the auto-demo.
 */
import type { ActorPayload } from './types'

export const DEMO_ACTORS: (ActorPayload & { delay: number })[] = [
  {
    id: 'banana',
    delay: 0,
    content: { title: 'Banana', subtitle: '$0.7', badge: '30% OFF', emoji: '🍌', accentColor: '#FACC15' },
  },
  {
    id: 'watermelon',
    delay: 350,
    content: { title: 'Watermelon', subtitle: '$0.7', badge: '30% OFF', emoji: '🍉', accentColor: '#FACC15' },
  },
  {
    id: 'mango',
    delay: 700,
    content: { title: 'Mango', subtitle: '$0.7', badge: '30% OFF', emoji: '🥭', accentColor: '#FACC15' },
  },
  {
    id: 'peppers',
    delay: 1050,
    content: { title: 'Peppers', subtitle: '$0.7', badge: '30% OFF', emoji: '🫑', accentColor: '#FACC15' },
  },
  {
    id: 'carrot',
    delay: 1400,
    content: { title: 'Carrot', subtitle: '$0.7', badge: '30% OFF', emoji: '🥕', accentColor: '#FACC15' },
  },
  {
    id: 'cabbage',
    delay: 1750,
    content: { title: 'Cabbage', subtitle: '$0.5', badge: '30% OFF', emoji: '🥬', accentColor: '#FACC15' },
  },
]

export const DEMO_HERO: ActorPayload = {
  id: 'hero',
  fullStage: true,
  content: {
    title: 'SPECIAL PROMO',
    subtitle: 'Grocery Catalog Discount — up to 50% OFF',
    badge: 'DISCOUNT UP TO 50%',
    accentColor: '#FACC15',
  },
}
