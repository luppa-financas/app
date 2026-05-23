# RFC 007 — Local development environment

## Overview

Decisions made when setting up the local development environment in issue #70. The goal was to let any developer clone the repo, copy `.env.example`, run `make dev`, and have a working stack — without touching production infrastructure.

---

## Docker Compose strategy

**Decision:** only PostgreSQL and the NestJS API run inside Docker. The Next.js web app runs on the host.

**Rationale:**

- Next.js hot-reload inside a Docker container on macOS/ARM64 requires polling (`CHOKIDAR_USEPOLLING=true`), adds volume mount latency, and makes the dev experience noticeably slower than running on the host directly.
- The API and the database must be containerized together so that `DATABASE_URL` can use Docker's internal DNS (`postgres:5432`) without exposing credentials or requiring manual host configuration.
- The web only needs to know the API's host port (`localhost:3333`) — no container-level networking required.

**`docker-compose.yml` key decisions:**

```
postgres → api (depends_on: service_healthy)
```

- `context: .` (monorepo root) — same build context as the production Dockerfile on Railway; prevents "works locally, breaks in CI" divergence.
- Named volumes for `node_modules` — prevents native binding conflicts between macOS binaries and the Alpine Linux container (critical for Prisma's query engine).
- `DATABASE_URL` injected via `environment:` block, overriding `env_file` — ensures the API always uses the local postgres, not a developer's accidentally-pasted Supabase URL.

---

## STORAGE_PREFIX — environment isolation in Supabase Storage

**Decision:** use a single Supabase Storage bucket (`invoices`) across all environments, isolated by a path prefix controlled by the `STORAGE_PREFIX` environment variable.

**Path structure:**

```
invoices/
├── prod/{userId}/{timestamp}-{filename}    ← Railway (STORAGE_PREFIX=prod/)
├── dev/{userId}/{timestamp}-{filename}     ← staging (STORAGE_PREFIX=dev/)  [future]
└── local/{userId}/{timestamp}-{filename}   ← local dev (STORAGE_PREFIX=local/)
```

**Rationale:**

- A separate bucket per environment would require provisioning new Supabase buckets and distributing new credentials whenever a new environment is created.
- The prefix approach is zero-config: same `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` everywhere; only `STORAGE_PREFIX` changes.
- No data migration required: `upload()` prepends the prefix; `download()` and `delete()` receive the full path from the database (already contains the prefix baked in at upload time).

**Implementation:**

`StorageService` reads `STORAGE_PREFIX` once in its constructor via `ConfigService.getOrThrow()`. The API will not start if the variable is missing — this prevents silent uploads to the wrong prefix.

Only `upload()` prepends the prefix. `download()` and `delete()` receive the exact `storagePath` stored in the `Invoice` record.

**Alternatives considered:**

- *Separate bucket per environment*: more isolation, but requires bucket provisioning and credential rotation. Overkill for the current team size.
- *Prefix baked into the bucket name (e.g. `invoices-local`)*: same operational cost as separate buckets.

---

## User auto-creation on first authenticated request

**Decision:** `GET /users/me` upserts the user (creates if not found, returns existing otherwise) instead of throwing `404 Not Found`.

**Context:**

User creation was originally webhook-only: Clerk fires `user.created` → `POST /webhooks/clerk` → `INSERT INTO User`. This works in production (Railway has a public URL Clerk can reach) but not locally (Clerk cannot reach `localhost:3333`), causing every developer's first login to result in a 404 and a redirect to the waitlist.

**Rationale:**

- The Clerk webhook is an implementation detail of user provisioning, not a contract the application should depend on.
- Upsert is idempotent: if the webhook fires after the auto-creation (e.g. in a future tunneled local environment), it is a no-op.
- The alternative (ngrok / Cloudflare Tunnel to receive webhooks locally) adds external tooling to the required dev setup and is fragile across network changes.

**What this means in practice:**

On first login, `GET /users/me` creates a `User` record with `roles: []`. The user lands on the waitlist page. An admin manually sets `roles: ['mvp']` via SQL. Subsequent logins go directly to the dashboard.

This is acceptable for the current user base (close circle, ~5 users). If self-serve role assignment is needed later, a separate provisioning flow should be designed explicitly.

---

## PDF upload size limit

**Decision:** maximum upload size is 24 MB.

**Rationale:**

The Anthropic API has a 32 MB maximum request size. PDFs are sent as base64-encoded document blocks, which inflates the payload by ~33%. A 24 MB PDF produces a ~32 MB API request, which is at the Anthropic limit.

Setting the upload limit to 24 MB ensures that any PDF that passes validation can also be processed. A higher upload limit would produce a misleading experience: the file uploads successfully but fails at extraction.

The practical implication: scanned PDFs (camera photos exported as PDF) tend to be 20–50 MB and may exceed this limit. Native PDFs generated by bank apps are typically 200 KB–5 MB and are well within the limit.
