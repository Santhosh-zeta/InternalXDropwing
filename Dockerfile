# syntax=docker/dockerfile:1
#
# One image: the Express API plus the static web app it serves.
#
#   docker build -t internalx .
#
# No build arguments are needed: the web app calls the API on its own origin and gets the
# Google client id from the API at runtime. All configuration (database, secrets, SMTP,
# public URL) is runtime environment: see docs/production-checklist.md.
# Optional build arg: NEXT_PUBLIC_CURRENCY (ISO code used to display money, default USD).

# ── 1. Web app: Next.js static export ───────────────────────────────────────
FROM node:20-alpine AS web
WORKDIR /web
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
ARG NEXT_PUBLIC_CURRENCY=USD
ENV NEXT_PUBLIC_CURRENCY=$NEXT_PUBLIC_CURRENCY \
    NEXT_TELEMETRY_DISABLED=1
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
