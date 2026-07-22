# Signage Renderer — Quick Start

## 1. Install dependencies

```bash
bun install
cd mini-services/signage-server && bun install && cd ../..
```

## 2. (Optional) Configure Firestore persistence

The renderer works fully without Firestore (in-memory only). To enable save/load:

```bash
cp .env.example .env
# Edit .env and set NEXT_PUBLIC_FIREBASE_PROJECT_ID
# (See download/README.md for full Firestore setup)
```

## 3. Start the dev server

```bash
bun run dev
```

This runs Next.js on port 3000.

## 4. Start the signage WebSocket/REST server

```bash
bash scripts/start-signage-server.sh
```

This runs:
- WS server on port 3004 (renderer browsers connect)
- REST server on port 3005 (external systems POST `/send`)

## 5. Open the renderer

Open `http://localhost:81` (through Caddy — required for WebSocket to work).

If you don't have Caddy, open `http://localhost:3000` — the renderer works, but the WebSocket "Live" badge will show "Local" instead.

## 6. Try it out

- **Actors tab** → click "6 Actors" to populate the stage with sample products
- **Grid tab** → switch between Full / 2×2 / 3×2 / Custom
- **Style tab** → swap stage templates (Green Promo / Dark Premium / Flyer) and box templates (Product Card / Hero Banner / Clearance Card)
- **Save tab** → save/load screen snapshots to Firestore (requires step 2)
- **JSON tab** → paste any action payload, with clickable examples

## 7. Drive from external systems

```bash
# Add an actor via REST
curl -X POST http://localhost:3005/send \
  -H 'Content-Type: application/json' \
  -d '{"action":"add","id":"banana","content":{"title":"Banana","subtitle":"$0.7","badge":"30% OFF","emoji":"🍌","accentColor":"#FACC15"}}'

# Switch to full-screen hero mode
curl -X POST http://localhost:3005/send \
  -H 'Content-Type: application/json' \
  -d '{"action":"setGridMode","modeId":"full"}'

# Clear all actors
curl -X POST http://localhost:3005/send \
  -H 'Content-Type: application/json' \
  -d '{"action":"clear"}'
```

See `download/README.md` for the full action reference.

## Project structure

```
src/signage/               ← standalone renderer module
  types.ts                 ← all types + payloadToAction
  grid-modes.tsx           ← 8 grid mode presets
  templates/stages/        ← 3 stage templates (pluggable)
  templates/boxes/         ← 3 box templates (pluggable)
  components/renderer.tsx  ← composes stage + grid + actors
  hooks/use-signage.ts     ← state machine
  
src/components/control-panel/  ← 5-tab interactive interface
  actors-tab.tsx
  grid-tab.tsx
  templates-tab.tsx
  storage-tab.tsx          ← Firestore save/load UI
  json-tab.tsx

src/lib/firestore.ts       ← Firestore REST API helper (no SDK)

mini-services/signage-server/index.ts  ← WS + REST relay
```

## Tech stack

- Next.js 16 + TypeScript + Tailwind CSS 4 + shadcn/ui
- Framer Motion (actor animations)
- Socket.IO (live updates)
- Firestore via REST API (optional persistence — no Prisma, no SDK)

## What's NOT included (by design)

- No Prisma / SQLite / ORM
- No Firebase SDK (Firestore accessed via plain `fetch()`)
- No authentication
