# syntax=docker/dockerfile:1

# ---- Builder: install all deps and compile TypeScript ----
FROM node:22.22.3-trixie-slim AS builder
WORKDIR /app
# Update corepack first: the version bundled with Node 22.13 has stale signing
# keys and cannot verify recent pnpm releases ("Cannot find matching keyid").
RUN npm install -g corepack@latest && corepack enable
# Install deps first for better layer caching.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

# ---- Runtime: production deps + compiled output only ----
FROM node:22.22.3-trixie-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
# Update corepack first: the version bundled with Node 22.13 has stale signing
# keys and cannot verify recent pnpm releases ("Cannot find matching keyid").
RUN npm install -g corepack@latest && corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --prod && pnpm store prune
COPY --from=builder /app/dist ./dist
# Migrations + drizzle config travel with the image for reference / ops use.
COPY drizzle ./drizzle
COPY drizzle.config.ts ./

# Run as the unprivileged built-in node user.
USER node
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://localhost:'+(process.env.PORT||4000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/src/main.js"]
