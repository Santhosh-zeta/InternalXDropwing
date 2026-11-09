# syntax=docker/dockerfile:1
#
# One image: the Express API plus the static web app it serves.
#
#   docker build -t internalx \
#     --build-arg NEXT_PUBLIC_API_URL=https://internalx.example.com .
#
# NEXT_PUBLIC_* values are inlined into the web bundle at build time, so they are
# build arguments, not runtime environment variables. Everything else (database,
# secrets, SMTP) is runtime configuration: see docs/production-checklist.md.

# ── 1. Web app: Next.js static export ───────────────────────────────────────
FROM node:20-alpine AS web
WORKDIR /web
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
# The public origin of the app (no trailing slash, no /api). Required: there is no safe default.
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_GOOGLE_CLIENT_ID=
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_GOOGLE_CLIENT_ID=$NEXT_PUBLIC_GOOGLE_CLIENT_ID \
    NEXT_TELEMETRY_DISABLED=1
RUN test -n "$NEXT_PUBLIC_API_URL" || (echo "build arg NEXT_PUBLIC_API_URL is required, e.g. https://internalx.example.com" >&2; exit 1)
RUN npm run build

# ── 2. API dependencies: production only ────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

# ── 3. Runtime ──────────────────────────────────────────────────────────────
FROM node:20-alpine
ENV NODE_ENV=production \
    PORT=5000
WORKDIR /app
# tini: proper PID 1, so SIGTERM reaches node and shutdown is graceful.
RUN apk add --no-cache tini
COPY --from=deps /app/node_modules ./node_modules
COPY backend/package.json ./
COPY backend/src ./src
COPY backend/migrations ./migrations
COPY backend/scripts/create-admin.js ./scripts/create-admin.js
COPY --from=web /web/out ./public/frontend-build
# Uploads live on a volume (see docker-compose.yml); the unprivileged `node` user owns them.
RUN mkdir -p uploads/avatars && chown -R node:node /app/uploads
USER node
EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/api/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "src/server.js"]
