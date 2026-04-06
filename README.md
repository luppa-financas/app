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
| Frontend | Next.js + TypeScript | — |
| Database | PostgreSQL | — |
| LLM | Anthropic Claude API | — |
| Infra | Railway + Vercel + Supabase | Low cost to start |

## Supported banks

- Bradesco (Fatura Mensal PDF) — MVP
- Other banks via LLM-based parsing — next step (see [RFC 005](docs/rfcs/005-parsing-strategy.md))

## Project structure

```
api/              → NestJS backend
web/              → Next.js frontend (not started)
docs/
  rfcs/           → architecture decision records
```

## Setup

**Requirements:** Node.js 20+

```bash
git clone https://github.com/luppa-app/app
cd app/api
npm install
```

## Running the API

```bash
# development
npm run start:dev

# tests
npm run test

# e2e tests
npm run test:e2e
```

> Invoice PDFs contain personal financial data. Never commit them to git.
> The `api/src/parser/testdata/` directory is gitignored for this reason.
