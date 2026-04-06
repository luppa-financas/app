# Luppa

SaaS for personal financial control. Users upload monthly credit card invoice PDFs, the system sends them to Claude for transaction extraction, categorizes them via LLM, and provides spending analytics.

## Stack

- **Backend**: NestJS + TypeScript
- **Frontend**: Next.js + TypeScript
- **Database**: PostgreSQL
- **Infra**: Vercel (frontend) + Railway (API) + Supabase (DB + Storage)

## Project structure

```
api/                  -> NestJS backend
  src/
    invoices/         -> invoice upload and processing module
    extraction/       -> LLM-based transaction extraction from PDFs
    categorization/   -> merchant table + LLM classification
    transactions/     -> transaction querying and review
  test/               -> e2e tests
web/                  -> Next.js frontend
docs/
  rfcs/               -> architecture decision records
```

## TypeScript conventions

- Errors: throw with descriptive message, catch and wrap at service boundaries
- Interfaces defined in the consuming module, not in the implementor
- Tests: Jest, one `*.spec.ts` per file, colocated with source
- No unhandled promise rejections
- All code, comments, and variable names in English

## Fixed categories (MVP)

Food, Transport, Housing, Health, Entertainment, Shopping, Education, Finance, Other
Each with subcategories — see `api/src/categorization/categories.ts` when created.

## Architectural decisions

- **LLM extraction**: PDFs are sent directly to Claude via native document blocks — no bank-specific parsers
- **Merchant table**: learned `merchant_pattern → category` mapping to reduce LLM calls over time
- **Confidence threshold**: low-confidence categorization results go to a manual review queue
- No HTTP dependencies inside extraction or categorization modules (channel-agnostic pipeline)

## Development workflow

**Before each task:**
- Explain the approach in plain text — wait for approval before coding

**TDD rhythm:**
1. Propose test cases in text — wait for approval
2. Write the tests only — confirm they are red
3. Write the minimal implementation to make them pass
4. Show green results — check together before moving on

**Task size:**
- One task = one function or one specific behavior
- If a task feels big, break it down first

**Decisions belong to the user:**
- Names, structure, approach — propose, don't assume

## Useful commands

```bash
# API
cd api
npm run test          # run all tests
npm run test:watch    # watch mode
npm run test:e2e      # e2e tests
npm run start:dev     # dev server with hot reload
npm run build         # production build

# Web
cd web
npm run dev           # dev server
npm run build         # production build
```

## Gitignored sensitive files

- `api/src/extraction/testdata/*.pdf` — real invoice PDFs (sensitive data, never commit)
