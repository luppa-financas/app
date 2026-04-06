# RFC 001 — Stack decisions

## Backend: NestJS + TypeScript

The project owner has a strong background in Node.js/TypeScript. NestJS was chosen for the following reasons:

1. **Familiarity** — faster iteration at MVP stage; cognitive load goes to the product, not the language
2. **Structure** — NestJS's opinionated architecture (modules, controllers, services) scales well across a small team doing code reviews and PRs
3. **Ecosystem** — native integrations with Prisma, JWT auth, job queues, and testing infrastructure

**Key libraries:**
- `@anthropic-ai/sdk` — Claude API for invoice extraction and categorization
- `prisma` — ORM and migrations
- `jest` — test runner (built into NestJS)

## Frontend: Next.js + TypeScript

Owner's primary domain. No strong reason to change — familiar stack reduces cognitive load on the part of the product that needs the most UI iteration.

## Database: PostgreSQL

Standard choice for relational data with no specific requirements pushing toward alternatives. Hosted on Supabase for the free tier during early development.

## LLM: Anthropic Claude API

Used for:
1. **Invoice extraction** — extracting structured transactions from any bank's PDF (RFC 002)
2. **Categorization** — merchant name → category classification (RFC 003)

Cost is managed by the merchant mapping table (RFC 003): once a merchant is categorized, the result is cached and the LLM is not called again for the same merchant.

## Infrastructure

Chosen for lowest possible cost at MVP stage:

| Service | Usage | Cost |
|---|---|---|
| Vercel | Next.js frontend | Free tier |
| Railway | NestJS API | ~$5/mo |
| Supabase | PostgreSQL + file storage | Free tier |

Total: ~$5/month until meaningful user growth.
