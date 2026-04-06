# RFC 005 — Infrastructure and deployment

## Overview

Low-cost initial setup designed to scale without requiring rewrites. Every decision includes an explicit migration path for when the product outgrows its current tier.

---

## Repository

**Turborepo monorepo** with two apps and one shared package:

```
/
├── apps/
│   ├── api/          (NestJS)
│   └── web/          (Next.js)
├── packages/
│   └── types/        (shared TypeScript types: RawTransaction, Category, etc.)
├── turbo.json
└── package.json
```

Turborepo caches builds and runs tasks in parallel across apps. Adding shared types in `packages/types` avoids duplication and drift between frontend and backend contracts.

---

## Services

| Concern | Service | Cost (MVP) |
|---|---|---|
| Frontend hosting | Vercel | Free |
| API hosting | Railway | ~$5/mo |
| Database | Supabase (PostgreSQL) | Free tier |
| File storage | Supabase Storage | Free tier |
| Auth | Clerk | Free (up to 10k MAU) |
| LLM | Anthropic Claude API | ~$2–10/mo |
| Error tracking | Sentry | Free tier |
| **Total** | | **~$7–15/mo** |

---

## API — Docker from day one

The NestJS API is containerized with Docker from the start. This is the key decision that makes all future migrations (Railway → Fly.io → AWS ECS) a configuration change, not a code change.

Principles that guarantee portability:
- All configuration via environment variables (12-factor)
- No hardcoded infrastructure references in application code
- `GET /health` endpoint required for container orchestration

---

## Auth — Clerk

Clerk handles authentication for both web and API.

- Next.js: `@clerk/nextjs` middleware protects routes
- NestJS: JWT validation centralized in a single `AuthGuard`

The `AuthGuard` is the only file in the codebase that has a direct dependency on Clerk's JWT format. Migrating to another provider (Cognito, Supabase Auth) means changing this file and the Next.js middleware — nothing else.

```typescript
// All auth logic lives here. Swapping providers = changing this file only.
@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const token = extractTokenFromHeader(context);
    const payload = verifyClerkJwt(token);
    context.switchToHttp().getRequest().user = payload;
    return true;
  }
}
```

---

## Invoice processing — async from day one

LLM extraction takes 10–30 seconds. Synchronous HTTP would risk browser and gateway timeouts. The upload endpoint returns a job ID immediately; the frontend polls for status.

```
POST /invoices         → 202 Accepted  { jobId }
GET  /invoices/:jobId  → { status: "pending" | "done" | "failed", data? }
```

For the MVP, this is implemented as an in-process async operation (no external queue). The service interface is queue-ready by design: the controller calls `invoiceService.enqueue(file)` and does not wait for extraction to complete. Adding BullMQ + Redis later requires only an infrastructure change to the service layer.

---

## Rate limiting

Upload endpoint is rate-limited via `@nestjs/throttler` to prevent runaway LLM costs from bugs or abuse. Limit to be calibrated after initial testing (starting point: 10 uploads per user per hour).

---

## CI/CD — GitHub Actions

Two triggers:

**On every pull request:**
```
install → lint → typecheck → test (api + web in parallel via turbo)
```
PR cannot be merged unless all checks pass.

**On merge to main:**
```
[same checks] → prisma migrate deploy → deploy api (Railway) → deploy web (Vercel)
```

`prisma migrate deploy` runs as an explicit step before the new container goes live. Migrations are never applied manually in production.

Preview deployments: Vercel creates a preview URL automatically for every PR (web only).

---

## Database migrations

Prisma is the ORM. Migration flow:

- Development: `prisma migrate dev` (creates and applies migrations locally)
- CI/CD: `prisma migrate deploy` runs in the pipeline before deploy
- Never run migrations manually in production

---

## Observability

**Error tracking:** Sentry on both API and web from day one. Free tier covers the MVP. Without this, production errors are invisible.

**Logs:** Railway's built-in log viewer is sufficient for the MVP.

---

## Backups

Skipped for the initial phase (close circle of users who accept the MVP nature of the product). When opening to the public, upgrade to Supabase Pro — daily backups with 7-day retention are included in the plan.

---

## LGPD

Invoice PDFs contain sensitive personal financial data. Minimum compliance for MVP:

1. **Consent on signup**: checkbox linking to the privacy policy
2. **Privacy policy page**: explains what data is collected, that invoices are sent to Anthropic's API for processing, and how data is stored
3. **Account deletion endpoint**: permanently deletes all user transactions, invoices, and stored PDFs

The Anthropic API usage must be explicitly disclosed because invoice data (a third party's personal financial data) is sent to an external processor.

---

## Scaling path

The architecture is designed so that each layer can be upgraded independently.

### API
| Scale | Service | Action |
|---|---|---|
| 0–5k users | Railway | No change |
| 5k–20k users | Fly.io | Redeploy same Docker image, multi-region |
| 20k+ users | AWS ECS Fargate | Redeploy same Docker image, add ALB + auto-scaling |

### Database
| Scale | Service | Action |
|---|---|---|
| 0–500 users | Supabase free | No change |
| 500–10k users | Supabase Pro ($25/mo) | Upgrade plan, enable backups |
| 10k–100k users | Supabase Team or AWS RDS | pg_dump → restore, update connection string in Prisma |

### Auth
| Scale | Service | Action |
|---|---|---|
| 0–10k MAU | Clerk free | No change |
| 10k–50k MAU | Clerk ($25/mo) | Upgrade plan |
| 50k+ MAU | Cognito or self-hosted | Swap AuthGuard + Next.js middleware, migrate user IDs in DB |

### Processing queue
| Scale | Action |
|---|---|
| MVP | In-process async (no queue) |
| When needed | Add BullMQ + Redis (Railway managed), no changes to business logic |
