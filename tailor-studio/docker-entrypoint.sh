#!/bin/sh
set -e

# Apply the Prisma schema to whatever DATABASE_URL points at. Idempotent —
# safe to run on every container start. This is what lets a fresh Railway
# volume get its Stage table created automatically on first deploy.
echo "[entrypoint] applying Prisma schema to $DATABASE_URL"
bunx prisma db push --skip-generate --accept-data-loss

echo "[entrypoint] starting Tailor Studio"
exec bun run start
