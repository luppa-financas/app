# syntax=docker/dockerfile:1

# Build context: monorepo root

# Stage 1: build
FROM node:20.19.4-alpine AS builder
WORKDIR /workspace

RUN npm install -g pnpm@10.33.0

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/types/package.json ./packages/types/

RUN pnpm install --frozen-lockfile

COPY apps/api ./apps/api
COPY packages/types ./packages/types

RUN pnpm --filter api exec prisma generate
RUN pnpm --filter api build

# Stage 2: production
FROM node:20.19.4-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001 \
  && npm install -g pnpm@10.33.0

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/types/package.json ./packages/types/

RUN pnpm install --frozen-lockfile --prod --filter api...

COPY --from=builder /workspace/apps/api/dist ./apps/api/dist
COPY --from=builder /workspace/apps/api/prisma ./apps/api/prisma

RUN cd apps/api && pnpm exec prisma generate

RUN chown -R nodejs:nodejs /app
USER nodejs

WORKDIR /app/apps/api
EXPOSE 3333
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3333/health || exit 1

CMD ["node", "dist/main"]
