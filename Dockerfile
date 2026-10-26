# ==============================================================================
# SiteIntel Pulse — Production Multi-Stage Dockerfile
# Runtime: Node.js 22 LTS (Debian Bookworm) with native node:sqlite
# ==============================================================================

# 1. Base stage with Playwright Chromium OS dependencies and curl
FROM node:22-bookworm-slim AS base
WORKDIR /app
ENV NODE_ENV=production
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# Install system dependencies required for Playwright headless Chromium & health check
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpango-1.0-0 \
    libcairo2 \
    libxshmfence1 \
    fonts-liberation \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# 2. Dependencies installation stage
FROM base AS deps
WORKDIR /app
ENV NODE_ENV=development
COPY package.json package-lock.json* ./
RUN mkdir -p /ms-playwright && npm ci && npx playwright install chromium

# 3. Next.js production build stage
FROM deps AS builder
WORKDIR /app
ENV NODE_ENV=production
COPY . .
RUN mkdir -p public && npm run build

# 4. Lean runtime runner stage
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
ENV DATABASE_PATH=/app/data/siteintel.db
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# Create non-root system user and groups
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 nextjs && \
    mkdir -p /app/data /app/backups /app/test-results /ms-playwright && \
    chown -R nextjs:nodejs /app/data /app/backups /app/test-results /ms-playwright

# Copy Chromium browser from deps with correct permissions
COPY --chown=nextjs:nodejs --from=deps /ms-playwright /ms-playwright
RUN chmod -R 755 /ms-playwright

# Copy node_modules and built assets
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.mjs ./next.config.mjs
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/src ./src

# Ensure non-root ownership
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

# Declare persistent volume mount points for durable SQLite persistence and backups
VOLUME ["/app/data", "/app/backups"]

# Healthcheck probe using internal Node.js fetch against /api/health
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["npm", "start"]
