# Signage Renderer — Standalone System

A template-driven signage renderer for supermarket (or any) displays. Splits the screen into a **static Stage** + **dynamic Actors** that arrive via JSON payloads. No database required — persistence is optional via Firestore REST.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       Renderer                              │
│   ├─ Stage Template   (static background + chrome)          │
│   ├─ Grid Mode        (slot geometry — full/2×1/2×2/…)      │
│   └─ Actors[]         (dynamic content)                     │
│       └─ Box Template (per-actor visual schema)             │
└─────────────────────────────────────────────────────────────┘
              ↑ WebSocket (Socket.IO)
              │
┌─────────────────────────────────────────────────────────────┐
│                signage-server mini-service                   │
│   Port 3004 — WS   (renderer browsers connect)              │
│   Port 3005 — REST (external systems POST /send)            │
└─────────────────────────────────────────────────────────────┘

              ↕ (optional, browser-side fetch)
              
┌─────────────────────────────────────────────────────────────┐
│       Firestore (REST API — no SDK, no Prisma)              │
│   Save/load screen snapshots for persistence                │
└─────────────────────────────────────────────────────────────┘
```

**No Prisma. No SQLite. No database server.** The renderer is fully in-memory; persistence is opt-in via Firestore REST.

## Pluggable Templates

### Stage Templates (3)

| ID | Name | Description |
|---|---|---|
| `green-promo` | Green Promo | Bright green background with subtle radial highlights |
| `dark-premium` | Dark Premium | Navy gradient with gold corner accents |
| `supermarket-flyer` | Flyer (Header+Footer) | Green header + footer with white content area — matches the original flyer |

### Box Templates (3)

| ID | Name | Fields | Notes |
|---|---|---|---|
| `product-card` | Product Card | title, subtitle, badge, emoji, image, accentColor | Matches the original flyer |
| `hero-banner` | Hero Banner | title, subtitle, badge, accentColor | Bold full-stage banner with gradient |
| `clearance-card` | Clearance Card | name, description, originalPrice, salePrice, badge, emoji, image | Different schema with struck-through original + red sale price |

### Grid Modes (8)

| ID | Layout | Slots |
|---|---|---|
| `full` | 1×1 | 1 (hero) |
| `2x1` | 2 cols × 1 row | 2 |
| `1x2` | 1 col × 2 rows | 2 |
| `2x2` | 2×2 | 4 |
| `3x2` | 3×2 | 6 (original flyer) |
| `3x3` | 3×3 | 9 |
| `4x2` | 4×2 | 8 |
| `custom` | user-defined | any rows × cols × gap |

## Public API (Action Dispatch)

Single `dispatch(action)` function handles all state mutations. Same shape is used for WebSocket payloads, REST bodies, and the UI.

### Actor actions
```ts
{ action: 'add', id, content, fullStage?, position? }
{ action: 'addMany', actors: [...] }
{ action: 'update', id, content }      // partial content update
{ action: 'remove', id }
{ action: 'clear' }
```

### Grid actions
```ts
{ action: 'setGridMode', modeId }                  // 'full' | '2x1' | '2x2' | '3x2' | …
{ action: 'setCustomGrid', rows, cols, gap }       // switches to custom mode
{ action: 'setGap', gap }                          // gap for preset modes
```

### Template actions
```ts
{ action: 'setStageTemplate', templateId }         // 'green-promo' | 'dark-premium' | 'supermarket-flyer'
{ action: 'setBoxTemplate', templateId }           // 'product-card' | 'hero-banner' | 'clearance-card'
```

## Control Panel (5 tabs)

| Tab | Purpose |
|---|---|
| **Actors** | Add/update/remove actors via a form. Quick demos (6 actors, hero). |
| **Grid** | Visual grid mode picker + custom dimensions. |
| **Style** | Stage + box template pickers with field previews. |
| **Save** | Save/load screen snapshots to Firestore (optional). |
| **JSON** | Paste any payload, with clickable examples. |

## Firestore Setup (optional, for persistence)

The renderer works fully without Firestore — actors live in memory only. To enable save/load:

1. **Create a Firebase project** at https://console.firebase.google.com
2. **Add a Web App** to get the project ID + Web API key
3. **Create a Cloud Firestore database** in **test mode** (allows public R/W for 30 days — perfect for testing)
4. **Set env vars** in `.env` (copy from `.env.example`):

```
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIRESTORE_API_KEY=your-web-api-key      # optional, recommended
NEXT_PUBLIC_FIRESTORE_COLLECTION=screens             # optional, default
```

5. **Restart** the dev server

The "Save" tab will then show a "Firestore Connected" badge and let you:
- Save the current renderer state (templates, grid, actors) under a screen ID
- List all saved screens
- Load any saved screen back into the renderer
- Delete saved screens

All Firestore calls go through the public REST API (`https://firestore.googleapis.com`) — no Firebase SDK, no admin credentials, no Prisma. See `src/lib/firestore.ts`.

### Firestore security rules (test mode)

The default test-mode rules look like this and are fine for development:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.time < timestamp.date(2026, 8, 9);
    }
  }
}
```

For production, lock this down to authenticated users or specific origins.

## Integration Examples

### From an external system via REST

```bash
# Set up a clearance sale on a 2×2 grid
curl -X POST http://<server>:3005/send -H 'Content-Type: application/json' -d '{
  "action": "setStageTemplate", "templateId": "supermarket-flyer"
}'
curl -X POST http://<server>:3005/send -H 'Content-Type: application/json' -d '{
  "action": "setBoxTemplate", "templateId": "clearance-card"
}'
curl -X POST http://<server>:3005/send -H 'Content-Type: application/json' -d '{
  "action": "setGridMode", "modeId": "2x2"
}'
curl -X POST http://<server>:3005/send -H 'Content-Type: application/json' -d '{
  "action": "addMany",
  "actors": [
    { "id": "c1", "content": { "name": "Banana", "originalPrice": 5.70, "salePrice": 3.99, "badge": "CLEARANCE", "emoji": "🍌" } },
    { "id": "c2", "content": { "name": "Apple", "originalPrice": 4.50, "salePrice": 2.99, "badge": "CLEARANCE", "emoji": "🍎" } }
  ]
}'
# Update Banana's sale price live
curl -X POST http://<server>:3005/send -H 'Content-Type: application/json' -d '{
  "action": "update", "id": "c1", "content": { "salePrice": 1.99, "badge": "MEGA DEAL" }
}'
```

### From a Socket.IO client

```js
import { io } from 'socket.io-client'
const socket = io('/?XTransformPort=3004')
socket.emit('payload', { action: 'add', id: 'banana', content: { ... } })
```

## Files

```
src/
├── app/page.tsx                              # Main page (renderer + control panel)
├── signage/                                  # Standalone signage system
│   ├── types.ts                              # All types + payloadToAction helper
│   ├── grid-modes.tsx                        # 8 grid mode presets
│   ├── demo-actors.ts                        # Sample actors for demos
│   ├── index.ts                              # Public API barrel
│   ├── templates/
│   │   ├── stages/                           # 3 stage templates
│   │   │   ├── index.tsx
│   │   │   ├── green-promo.tsx
│   │   │   ├── dark-premium.tsx
│   │   │   └── supermarket-flyer.tsx
│   │   └── boxes/                            # 3 box templates
│   │       ├── index.tsx
│   │       ├── product-card.tsx
│   │       ├── hero-banner.tsx
│   │       └── clearance-card.tsx
│   ├── components/
│   │   └── renderer.tsx                      # Composes stage + grid + actors
│   └── hooks/
│       └── use-signage.ts                    # State machine
├── components/control-panel/                 # Interactive interface
│   ├── index.tsx                             # 5-tab container
│   ├── actors-tab.tsx                        # Add/update/remove actors
│   ├── grid-tab.tsx                          # Grid mode picker
│   ├── templates-tab.tsx                     # Stage + box template pickers
│   ├── storage-tab.tsx                       # Firestore save/load UI
│   └── json-tab.tsx                          # Raw JSON payload input
└── lib/
    ├── firestore.ts                          # Firestore REST API helper
    └── utils.ts                              # cn() helper

mini-services/signage-server/
└── index.ts                                  # WS (3004) + REST (3005) relay

scripts/
└── start-signage-server.sh                   # Restart helper
```

## Adding New Templates

### New stage template

1. Create `src/signage/templates/stages/my-stage.tsx`:
```tsx
'use client'
import type { StageTemplate } from '../../types'
export const MyStage: StageTemplate = {
  id: 'my-stage',
  name: 'My Stage',
  description: 'Custom background',
  swatch: '#FF0000',
  render: ({ children }) => (
    <div className="relative h-full w-full" style={{ backgroundColor: '#FF0000' }}>
      {children}
    </div>
  ),
}
```
2. Add to `src/signage/templates/stages/index.tsx`

### New box template

1. Create `src/signage/templates/boxes/my-box.tsx`:
```tsx
'use client'
import { motion } from 'framer-motion'
import type { BoxTemplate } from '../../types'
export const MyBox: BoxTemplate = {
  id: 'my-box',
  name: 'My Box',
  description: 'Custom actor layout',
  fields: [
    { key: 'title', label: 'Title', type: 'text', required: true },
    { key: 'count', label: 'Count', type: 'number' },
  ],
  sampleContent: { title: 'Hello', count: 42 },
  render: ({ content, mode }) => (
    <motion.div className="h-full w-full rounded-2xl bg-white p-4">
      <h3>{content.title}</h3>
      <p>Count: {content.count}</p>
    </motion.div>
  ),
}
```
2. Add to `src/signage/templates/boxes/index.tsx`

## Running

```bash
# 1. Install dependencies
bun install

# 2. (optional) Configure Firestore persistence
cp .env.example .env
# edit .env and set NEXT_PUBLIC_FIREBASE_PROJECT_ID

# 3. Start the dev server (Next.js on port 3000)
bun run dev

# 4. Start the signage WebSocket/REST server (ports 3004 + 3005)
bash scripts/start-signage-server.sh

# 5. Open http://localhost:81  (through Caddy — required for WS)
```

## Field Types Supported in Box Templates

| Type | UI Input |
|---|---|
| `text` | `<Input type="text">` |
| `textarea` | `<Textarea>` |
| `number` | `<Input type="number">` (stored as `number`) |
| `image` | `<Input type="text">` (URL) |
| `emoji` | `<Input type="text">` (single emoji) |
| `color` | `<input type="color">` + hex input |

## What's NOT included (by design)

- **No Prisma / SQLite / ORM** — removed. The renderer is stateless by default.
- **No Firebase SDK** — Firestore is accessed via plain `fetch()` against the REST API.
- **No authentication** — Firestore rules are expected to handle access control.
- **No multi-tenant fleet management** — one renderer process per screen.
