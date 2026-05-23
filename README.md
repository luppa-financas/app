# Luppa

SaaS de controle financeiro pessoal. Usuários fazem upload de PDFs de fatura de cartão de crédito, o sistema extrai as transações via Claude, categoriza automaticamente e apresenta analytics de gastos.

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Backend | NestJS + TypeScript (Railway) |
| Frontend | Next.js 15 + TypeScript (Vercel) |
| Banco | PostgreSQL (Supabase) |
| Storage | Supabase Storage |
| Auth | Clerk |
| LLM | Anthropic Claude API |

---

## Pré-requisitos

- Docker Desktop (com Docker Compose v2)
- Node.js 22+ (para rodar a web no host)
- pnpm 10+
- Acesso aos serviços externos (ver seção de acessos abaixo)

---

## Acessos necessários

Peça ao responsável do projeto acesso a:

| Serviço | O que você precisa |
|---------|-------------------|
| **Supabase** | Convite para o projeto — você obtém `DATABASE_URL`, `DIRECT_URL`, `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` em Settings → API |
| **Clerk** | Convite para o app — você obtém `CLERK_SECRET_KEY` e `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` em API Keys |
| **Anthropic** | Acesso à API — você obtém `ANTHROPIC_API_KEY` em console.anthropic.com |
| **GitHub** | Acesso ao repositório `luppa-financas/app` |

---

## Setup inicial

```bash
git clone git@github.com:luppa-financas/app.git
cd app
pnpm install
```

### Variáveis de ambiente — API

```bash
cp apps/api/.env.example apps/api/.env
```

Preencha `apps/api/.env` com os valores reais. As chaves obrigatórias estão comentadas no `.env.example`:

- `CLERK_SECRET_KEY` / `CLERK_AUTHORIZED_PARTIES` — dashboard.clerk.com → API Keys (instância dev)
- `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` — Supabase → Settings → API
- `ANTHROPIC_API_KEY` — console.anthropic.com → API Keys
- `STORAGE_PREFIX=local/` — isola seus uploads dos arquivos de prod no mesmo bucket

> `DATABASE_URL` e `DIRECT_URL` são sobrescritos pelo `docker-compose.yml` apontando para o postgres local. Você só precisa de valores válidos aqui se for rodar a API fora do Docker (`make dev-api`).

### Variáveis de ambiente — Web

```bash
cp apps/web/.env.example apps/web/.env.local
```

Edite `apps/web/.env.local` com os valores reais:

```env
# Clerk — dashboard.clerk.com → API Keys
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

NEXT_PUBLIC_MAINTENANCE_MODE=false
```

---

## Rodando localmente

API + postgres sobem em Docker; web roda no host (Next.js fica mais rápido fora do container).

```bash
# Terminal 1 — sobe postgres + api e segue logs (http://localhost:3333)
make dev

# Primeira vez, ou sempre que o schema mudar
make migrate

# Terminal 2 — web (http://localhost:3000)
make dev-web
```

Verifique que a API está saudável:

```bash
make health
# { "status": "OK" }
```

Guia detalhado em [`CONTRIBUTING.md`](CONTRIBUTING.md) (troubleshooting, criar nova migration, etc).

---

## Comandos úteis

```bash
# Docker (postgres + api)
make dev                       # sobe stack e segue logs
make dev-stop                  # para containers (preserva dados)
make dev-reset                 # apaga volumes (banco zerado)
make migrate                   # aplica migrations pendentes
make migrate-create NAME=foo   # cria nova migration a partir do schema.prisma
make migrate-reset             # reset completo + re-aplica tudo
make studio                    # Prisma Studio

# Host
make dev-web                   # Next.js (3000)
make dev-api                   # NestJS direto, sem Docker (3333)

# Comuns
make test                      # suite de testes
make build                     # build de todos os apps
make health                    # health check da API
```

---

## Estrutura do projeto

```
apps/
  api/          → NestJS backend
    src/
      auth/         → AuthGuard + @CurrentUser() + Clerk JWT
      health/       → GET /health
      invoices/     → POST /invoices (upload de fatura)
      storage/      → Supabase Storage (upload/download)
      prisma/       → PrismaService global
    prisma/
      schema.prisma → schema do banco
    test/           → testes e2e
  web/          → Next.js frontend
packages/
  types/        → tipos TypeScript compartilhados (@luppa/types)
docs/
  rfcs/         → decisões de arquitetura
```

---

## Supabase Storage

O bucket `invoices` precisa existir no Supabase Storage com visibilidade **private**.

Para criar: Supabase Dashboard → Storage → New bucket → nome: `invoices` → Private.

Arquivos são isolados por ambiente via `STORAGE_PREFIX`:

```
invoices/
├── prod/{userId}/...   ← produção (STORAGE_PREFIX=prod/ no Railway)
└── local/{userId}/...  ← seu desenvolvimento (STORAGE_PREFIX=local/)
```

---

## Dados sensíveis

PDFs de fatura contêm dados financeiros pessoais. A pasta `apps/api/src/extraction/testdata/` está no `.gitignore` — use-a para testes locais com faturas reais e nunca faça commit desses arquivos.

---

## Arquitetura

Veja os documentos de decisão em `docs/rfcs/`:

- [RFC 001](docs/rfcs/001-stack.md) — Stack e infraestrutura
- [RFC 002](docs/rfcs/002-invoice-extraction.md) — Extração de transações via LLM
- [RFC 003](docs/rfcs/003-categorization.md) — Categorização de transações
- [RFC 004](docs/rfcs/004-channel-architecture.md) — Arquitetura de canais (web + WhatsApp futuro)
- [RFC 005](docs/rfcs/005-infra.md) — Decisões de infra
- [RFC 006](docs/rfcs/006-multitenancy.md) — Multi-tenancy
