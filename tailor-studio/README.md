# Tailor Studio — Module 1: The Desktop Ingestion Workspace

An interactive Next.js 16 prototype of "The Tailor" — a template designer that ingests any flyer, ad, or Pinterest screenshot and turns it into a reusable, blank stage deployed to a paired TV screen network.

Built from the spec:

- **1.1 Split-Pane Horizon** — left pane is a calm chat assistant; right pane is the live canvas. The assistant never advances until the canvas confirms the user's intent.
- **1.2 Extraction of the Blueprint** — *Grid Definer* detects layout "Houses" via **real contour detection** (client-side: grayscale → Gaussian blur → Sobel edges → Otsu threshold → morphological close → connected components → bbox extraction); *Font Hunter* runs **real OCR + font matching** via a vision-language model that returns each text region's font family, hex color, weight, letter spacing, confidence, and bbox.
- **1.3 Manual Override Panel** — drag corner handles to snap geometry, right-click for duplicate / delete / add / mark-as-text-image-spacer, and click any text label to fine-tune font family / size / color / alignment / letter spacing / max-character limit.
- **1.4 Act of Publishing** — strips all text by **really generating a 1920×1080 PNG backdrop** via canvas (samples dominant background color, paints over each text region with its local background color), **commits the coordinate matrix to a real SQLite database** via Prisma, and refreshes the paired TV preview with the real generated backdrop.

## Tech Stack

- **Next.js 16** (App Router, Turbopack)
- **TypeScript 5**
- **Tailwind CSS 4** + **shadcn/ui** (New York style)
- **Zustand** for state
- **Radix UI** primitives (context-menu, popover, slider, switch, toggle-group, etc.)
- **Prisma ORM** + **SQLite** for stage persistence
- **z-ai-web-dev-sdk** for the Font Hunter's vision model (uses the GLM-4.6v vision model under the hood)

## Local Development

```bash
# 1. Install dependencies (bun preferred, npm/pnpm/yarn also work)
bun install

# 2. Set up your environment
cp .env.example .env
# Edit .env — DATABASE_URL is already set to a local SQLite file

cp .z-ai-config.example .z-ai-config
# Edit .z-ai-config — replace YOUR_ZAI_API_KEY with your real z.ai API key
# (Get one at https://z.ai)

# 3. Push the Prisma schema to create the SQLite database
bun run db:push

# 4. Start the dev server on http://localhost:3000
bun run dev
```

Open <http://localhost:3000> in your browser. Drop any image (flyer screenshot, Pinterest ad, magazine clipping) onto the right pane to begin.

### Lint

```bash
bun run lint
```

## How It Works (Real Implementation)

### 1.1 Split-Pane Horizon
- 50/50 desktop layout (stacks on mobile) with a slim brand bar on top.
- Left pane: chat assistant with a 5-step progress rail (Upload → Detect → Refine → Publish → Deployed), live progress strip, and context footer showing real counts.
- Right pane: live canvas with toolbar (Edit mode badge, Houses/Typefaces toggles, Publish button) and a status bar showing source image metadata and paired TV state.
- The assistant never advances stages until the canvas visually confirms the user's intent (e.g., it waits for the upload + analysis to complete before prompting the next step).

### 1.2 Extraction of the Blueprint
**Grid Definer** (`src/lib/tailor/grid-definer.ts`) — runs entirely in the browser via Canvas APIs:
1. Downscale to max 500px on the long side for performance.
2. Convert RGBA → grayscale (Rec. 601 luma).
3. Apply separable 3×3 Gaussian blur to suppress noise.
4. Compute Sobel edge magnitude.
5. Otsu's method to auto-pick a threshold → binary edge map.
6. Morphological close (dilate-then-erode, radius=2) to fuse nearby edges into block-shaped regions.
7. 4-connectivity BFS connected-components labeling.
8. Filter by area (1.2%–85% of image) and aspect ratio (0.07–14).
9. Sort by area desc, cap at 8 houses.
10. Classify each as `text` or `image` using edge density + aspect ratio heuristics.

**Font Hunter** (`src/app/api/font-hunt/route.ts`) — server-side VLM call:
1. Client POSTs the image data URL to `/api/font-hunt`.
2. Server decodes image dimensions from the data URL header (supports PNG/JPEG/GIF/WebP).
3. Server calls `zai.chat.completions.createVision()` with a structured prompt asking for: text content, hex color, font family (matched from a curated 8-font library: Playfair Display, Lora, DM Serif Display, Geist, Inter, Space Grotesk, JetBrains Mono, Caveat), weight, letter spacing, confidence, and bbox as percentages.
4. Server defensively parses the VLM response (handles markdown fences, malformed JSON, and three different bbox formats: `{x,y,w,h}`, `{x,y,width,height}`, and `{x,y,x2,y2}` in pixels).
5. Server auto-detects pixel-vs-percent bboxes and normalizes to percentages using the decoded image dimensions.
6. Client matches each detected text region to a contour-detected House using a cascade of intersection-area → centroid-distance heuristics (handles VLM bbox imprecision).
7. Each matched House inherits the VLM-detected font family, color, weight, and letter spacing.

### 1.3 Manual Override Panel
- **Click any house** to select it (4 corner handles appear).
- **Drag the body** to move; **drag a corner handle** to resize (NW/NE/SW/SE, with min-size constraints and 0.5% snapping).
- **Right-click empty canvas space** to add a new house at the cursor.
- **Right-click a house** for a Radix context menu: Duplicate / Snap to full canvas / **Mark as: Text block / Image slot / Spacer** / Delete.
- **Click any text label inside a house** to open a Popover with: dummy label input, font family dropdown (8 web fonts), font size slider, letter spacing slider, max character limit slider (with red overflow indicator when the label exceeds the limit), alignment toggle (left/center/right), 16-color palette + custom hex picker. Live preview renders inside the house with the chosen typography.

### 1.4 Act of Publishing
**Publisher** (`src/lib/tailor/publisher.ts`) — client-side canvas generation:
1. Downscale source to working canvas (max 600px).
2. Sample dominant background color via 4-bit-per-channel histogram, skipping near-white and near-black outliers.
3. For each text House, sample the LOCAL background color from a thin border just outside the house bbox (so a footer in gray, a headline in navy on cream, etc., each get inpainted with the right color).
4. Paint a 1920×1080 output canvas: fill with dominant color, add subtle gradient overlay, then fill each text house's rect with its local background color.
5. Encode as PNG data URL.

**Database Commit** (`src/app/api/stages/route.ts`) — real Prisma/SQLite persistence:
- `POST /api/stages` — receives `{label, matrix, backdrop, width, height, sourceName, sourceWidth, sourceHeight}`, persists to the `Stage` table, returns the created row's ID and label.
- `GET /api/stages` — returns the most recently published stage (or `{stage: null}` if none).

**Deployment to screen network** — the right pane transitions to a published view showing:
- The real generated backdrop PNG (not a CSS gradient) with faint dashed house outlines + a downloadable PNG link.
- A "Paired TV" preview panel with a TV bezel + flicker animation showing the same backdrop.
- A dark "Database Commit" log panel with green checkmarks for each step and the full coordinate matrix dump, plus the matched typefaces list with color swatches and confidence percentages.

Click **Reset** in the header to start over.

## Project Structure

```
src/
├─ app/
│  ├─ api/
│  │  ├─ font-hunt/route.ts     # POST: VLM OCR + font matching
│  │  └─ stages/route.ts        # POST: commit stage; GET: latest stage
│  ├─ globals.css               # theme tokens + custom keyframes
│  ├─ layout.tsx                # root layout with Geist fonts
│  └─ page.tsx                  # split-pane root (50/50 on desktop)
├─ components/
│  └─ tailor/
│     ├─ LeftPane.tsx           # chat assistant with 5-step progress rail
│     ├─ RightPane.tsx          # canvas viewport (upload, analyzing, edit states)
│     ├─ HouseOverlay.tsx       # draggable/resizable house + Radix context menu
│     ├─ TextLabelEditor.tsx    # Popover typography panel
│     └─ PublishPreview.tsx     # post-publish blank backdrop + TV + commit log
├─ lib/
│  └─ tailor/
│     ├─ types.ts               # House, Typography, DetectedFont, FONT_LIBRARY, PALETTE
│     ├─ store.ts               # Zustand store + font-matching heuristics
│     ├─ grid-definer.ts        # real client-side contour detection
│     └─ publisher.ts           # real canvas-based backdrop generation
└─ components/ui/               # shadcn/ui component library
prisma/
└─ schema.prisma                # Stage model for published stage persistence
```

## Deployment

### Vercel (recommended)

1. Push this repo to GitHub.
2. Go to <https://vercel.com/new> and import the repo.
3. Vercel auto-detects Next.js — keep the default build settings.
4. The z-ai-web-dev-sdk reads its config from `.z-ai-config` (in the project root), `~/.z-ai-config`, or `/etc/.z-ai-config`. For Vercel, you have two options:
   - **Option A (simpler):** Commit a `.z-ai-config` file with your API key to the repo (not recommended for public repos).
   - **Option B (recommended):** Set `ZAI_API_KEY` and `ZAI_BASE_URL` as Vercel env vars and modify `src/app/api/font-hunt/route.ts` to read them instead of using the config file (the SDK supports env-var-based config in newer versions — see the SDK docs).
5. For the database:
   - The default `DATABASE_URL=file:./dev.db` uses SQLite, which works locally but does NOT persist on Vercel's serverless functions (the file is ephemeral).
   - For production, swap `prisma/schema.prisma`'s `provider = "sqlite"` to `provider = "postgresql"` and use Vercel Postgres / Neon / Supabase. Run `bun run db:push` to create the table.
6. Click **Deploy**.

### Other hosts (Netlify, Render, Railway, self-hosted)

```bash
bun run build       # produces .next/
bun run start       # starts the production server
```

Make sure the host provides:
- `.z-ai-config` (or env-var equivalents) with your z.ai API key
- `DATABASE_URL` pointing to a writable database
- `PORT=3000` (or whatever your platform expects)

## License

MIT — do whatever you want.
