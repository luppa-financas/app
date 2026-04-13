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
  api/          → NestJS backend
  web/          → Next.js frontend
packages/
  types/        → Shared TypeScript types
docs/
  rfcs/         → Architecture decision records
```

## Setup

**Requirements:** Node.js 20+, npm 10+

```bash
git clone https://github.com/luppa-app/app
cd app
npm install
```

## Running locally

```bash
# All apps in dev mode (from root)
npm run dev

# Build all apps
npm run build

# Run all tests
npm run test

# API only
cd apps/api
npm run start:dev

# Web only
cd apps/web
npm run dev
```

## Environment variables

Copy `.env.example` to `.env` in each app directory and fill in the values.

> Invoice PDFs contain personal financial data. Never commit them to git.
> The `apps/api/src/extraction/testdata/` directory is gitignored for this reason.
