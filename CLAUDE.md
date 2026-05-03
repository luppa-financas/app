# Luppa

SaaS for personal financial control. Users upload monthly credit card invoice PDFs, the system sends them to Claude for transaction extraction, categorizes them via LLM, and provides spending analytics.

## Stack

- **Backend**: NestJS + TypeScript
- **Frontend**: Next.js + TypeScript
- **Database**: PostgreSQL
- **Infra**: Vercel (frontend) + Railway (API) + Supabase (DB + Storage)

## Project structure

```
apps/
  api/                -> NestJS backend
    src/
      health/         -> health check endpoint
      prisma/         -> global PrismaService (database access)
    test/             -> e2e tests
  web/                -> Next.js frontend
packages/
  types/              -> shared TypeScript types (@luppa/types)
docs/
  rfcs/               -> architecture decision records
```

### Planned modules (not yet implemented)

```
apps/api/src/
  auth/               -> AuthGuard + @CurrentUser() + Clerk JWT validation
  storage/            -> Supabase Storage upload/download (infra module)
  invoices/           -> invoice upload, create PENDING, emit event
  extraction/         -> pure service: PDF → Claude API → transactions array
  transactions/       -> repository + listener for invoice.created event
  shared/             -> global exception filters, pipes, common decorators
```

Sequence: auth → storage → invoices → extraction → transactions (issues #11–#16)

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

## Auth

- **Provider**: Clerk (JWT validation only — no Clerk SDK beyond `@clerk/backend`)
- **AuthGuard**: global via `APP_GUARD`, validates JWT and injects `userId` into request
- **`@CurrentUser()` decorator**: exposes `userId` in controllers
- **`@Public()` decorator**: opt-out for public routes (e.g., health check)
- `auth/` is a feature module at `src/auth/`, not inside `shared/`

## Processing flow

- **Async from day 1**: `POST /invoices` uploads PDF → creates Invoice PENDING → emits `invoice.created` → returns `{ invoiceId }`
- **EventEmitter** (not BullMQ): no Redis dependency for MVP (~100 users)
- **Listener** reacts to event → calls ExtractionService → saves transactions → updates Invoice to DONE/FAILED
- Risk accepted: if API crashes mid-processing, invoice stays PENDING (acceptable for MVP)

## Multi-tenancy

- Row-level isolation, single DB, every query filtered by `userId`
- Enforcement at application layer (NestJS services), no Supabase RLS for MVP
- Every service method receives `userId` — no exceptions

## NestJS patterns (aligned with `nestjs-best-practices` skill)

| Skill rule | Project decision |
|------------|-----------------|
| `arch-feature-modules` | Modules by feature at `src/` root — no `domain/` wrapper |
| `arch-use-repository-pattern` | Prisma never leaks into services; repositories abstract DB access |
| `arch-use-events` | EventEmitter for decoupling: invoices → (event) → transactions → extraction |
| `arch-single-responsibility` | One service per concern, no god services |
| `security-use-guards` | AuthGuard global via APP_GUARD + @Public() for opt-out |
| `di-prefer-constructor-injection` | Always constructor injection |
| `devops-use-config-module` | NestJS ConfigModule for env vars |
| `security-rate-limiting` | @nestjs/throttler on upload endpoint |

## Code quality skills

These skills must be invoked using the Skill tool — not just referenced mentally:

- **`nestjs-best-practices`**: invoke before proposing architecture or writing any code in `apps/api`
- **`next-best-practices`**: invoke before writing any code in `apps/web`
- **`vercel-plugin:react-best-practices`**: invoke before writing or editing TSX components in `apps/web`
- **`simplify`**: invoke after implementing any feature, before committing

## Development workflow

**Branch strategy:**
- Every GitHub issue gets its own feature branch: `feat/issue-N-short-description`
- Branch is created at the start of the issue, before any code
- Work is committed to the branch throughout the issue
- At the end, a PR is opened against `main` and the issue is closed via the PR

**Before each task:**
- Create the feature branch for the issue
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
# From root (via Turborepo)
pnpm build            # build all apps
pnpm test             # run all tests

# Makefile shortcuts (from root)
make dev-api          # API dev server (port 3333)
make dev-web          # Web dev server (port 3000)
make test             # run all tests
make health           # check API health

# API (apps/api)
pnpm test             # unit tests
pnpm test:watch       # watch mode
pnpm test:e2e         # e2e tests
pnpm start:dev        # dev server with hot reload

# Web (apps/web)
pnpm dev              # dev server
pnpm build            # production build
```

## Gitignored sensitive files

- `apps/api/src/extraction/testdata/*.pdf` — real invoice PDFs (sensitive data, never commit)
