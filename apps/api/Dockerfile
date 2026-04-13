# Stage 1: build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

# Stage 2: production
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile --prod
COPY --from=builder /app/dist ./dist

EXPOSE 3333
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3333/health || exit 1

CMD ["node", "dist/main"]
