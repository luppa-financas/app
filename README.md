# Luppa

Personal finance SaaS focused on credit card spending analysis. Users upload monthly invoice PDFs and the system automatically extracts, categorizes, and visualizes their expenses — no manual transaction input required.

## How it works

1. User uploads a credit card invoice PDF
2. The system extracts all transactions from the PDF
3. Transactions are categorized via LLM + a learned merchant mapping table
4. Spending is presented as analytics broken down by category

## Stack

| Layer | Technology | Reason |
|---|---|---|
| Backend | NestJS + TypeScript | See [RFC 001](docs/rfcs/001-stack.md) |
| Frontend | Next.js 15 + TypeScript | — |
| Database | PostgreSQL | — |
| LLM | Anthropic Claude API | — |
| Infra | Railway + Vercel + Supabase | Low cost to start |

## Project structure

```
apps/
  api/          → NestJS backend (port 3333)
  web/          → Next.js frontend (port 3000)
packages/
  types/        → Shared TypeScript types
docs/
  rfcs/         → Architecture decision records
```

## Setup

**Requirements:** Node.js 20+, pnpm 10+

```bash
git clone https://github.com/luppa-app/app
cd app
pnpm install
```

**Environment variables:**

```bash
cp apps/api/.env.example apps/api/.env
```

## Running locally

### Full stack (two terminals)

```bash
# Terminal 1 — API (http://localhost:3333)
make dev-api

# Terminal 2 — Web (http://localhost:3000)
make dev-web
```

### API only

```bash
make dev-api
# or
cd apps/api && pnpm start:dev
```

### Web only

```bash
make dev-web
# or
cd apps/web && pnpm dev
```

### Via Docker

```bash
docker-compose up
# API available at http://localhost:3333
```

## Useful commands

```bash
make build    # build all apps
make test     # run all tests
make health   # check API health (requires API running)
make migrate  # run database migrations
```

## Health check

```bash
curl http://localhost:3333/health
# { "status": "ok" }
```

> Invoice PDFs contain personal financial data. Never commit them to git.
> The `apps/api/src/extraction/testdata/` directory is gitignored for this reason.
