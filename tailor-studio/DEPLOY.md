# Deploying Tailor Studio to Railway

This repo now includes a `Dockerfile` + `docker-entrypoint.sh`, so Railway
will build it automatically — no Nixpacks/buildpack config needed.

## 1. Push to GitHub
Railway deploys from a repo. Push this project (with the new `Dockerfile`,
`.dockerignore`, `docker-entrypoint.sh`) to a GitHub repo.

## 2. Create the Railway project
1. https://railway.app/new → **Deploy from GitHub repo** → pick this repo.
2. Railway detects the `Dockerfile` and builds from it — leave build settings default.

## 3. Add a persistent volume (required)
SQLite writes to a file. Without a volume, every redeploy wipes it.
1. In the service → **Settings → Volumes** → **New Volume**.
2. Mount path: `/data`
3. Any size is fine to start (1 GB is plenty for a single shop's stages).

## 4. Set environment variables
In the service → **Variables**:
| Key | Value |
|---|---|
| `DATABASE_URL` | `file:/data/dev.db` |
| `ZAI_API_KEY` | *(leave unset until you have a z.ai key — Font Hunter degrades gracefully, see below)* |

## 5. Deploy
Railway builds the Dockerfile, then runs `docker-entrypoint.sh`, which:
- runs `prisma db push` against `/data/dev.db` (creates the `Stage` table on
  first boot, no-ops safely on every boot after)
- starts `next start` on `$PORT`

Railway assigns a public URL automatically (Settings → Networking →
**Generate Domain**). That's your live tool.

## About the Font Hunter (vision/OCR) step
Without `ZAI_API_KEY` set, `/api/font-hunt` now returns immediately with
`{ regions: [] }` and a clear message instead of erroring — the app already
handles this by letting you set each text label's font, color, size, and
alignment manually via the popover editor after upload. Grid Definer
(the layout/contour detection) is unaffected — it runs entirely client-side
and needs no key at all.

When you get a z.ai key later: add `ZAI_API_KEY` in Railway's Variables tab
and redeploy — no code changes needed, automatic font detection turns back on.

## No access control (by design, for now)
There's currently no login/password on this app — anyone with the Railway
URL can open it and publish stages. That's fine for a single-operator
internal tool with an unguessable Railway subdomain; worth revisiting with
a simple password gate if the URL ever gets shared more widely.

## Updating later
Every `git push` to the connected branch triggers a new Railway build.
The `/data` volume persists across deploys, so published stages survive.
