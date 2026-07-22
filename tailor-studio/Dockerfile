FROM oven/bun:1 AS app
WORKDIR /app

# --- install deps (cached layer) ---
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# --- build ---
COPY . .
RUN bunx prisma generate
ENV NEXT_TELEMETRY_DISABLED=1
RUN bun run build

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

RUN chmod +x docker-entrypoint.sh
CMD ["./docker-entrypoint.sh"]
