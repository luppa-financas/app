# Setup completo do ambiente local

Guia passo a passo para rodar o Luppa na sua máquina. Ao final, você terá:

- PostgreSQL local em Docker
- API NestJS em Docker (porta 3333)
- Web Next.js no host (porta 3000)
- Frontend apontando para o backend local

---

## Pré-requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) rodando
- Node.js 22+ — `node -v`
- pnpm 10+ — `npm install -g pnpm`

---

## 1. Clonar e instalar dependências

```bash
git clone git@github.com:luppa-financas/app.git
cd app
pnpm install
```

---

## 2. Variáveis de ambiente — API (`apps/api/.env`)

```bash
cp apps/api/.env.example apps/api/.env
```

Preencha o arquivo `apps/api/.env`:

```env
# Servidor
NODE_ENV=development
PORT=3333

# CORS — aceita requisições do frontend local
CORS_ORIGIN=http://localhost:3000

# Auth — Clerk (instância dev)
# dashboard.clerk.com → selecione o app → API Keys
CLERK_SECRET_KEY=sk_test_<copiar do Clerk>
CLERK_AUTHORIZED_PARTIES=http://localhost:3000
CLERK_WEBHOOK_SECRET=whsec_<copiar do Clerk — opcional para dev local>

# LLM — Anthropic
# console.anthropic.com → API Keys → Create key
ANTHROPIC_API_KEY=sk-ant-<copiar do Anthropic>

# Banco de dados
# Quando rodando via `make dev`, estes valores são IGNORADOS:
# o docker-compose injeta automaticamente a URL do postgres local.
# Só precisam ser preenchidos se rodar a API fora do Docker (make dev-api).
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/luppa_local?schema=public
DIRECT_URL=postgresql://postgres:postgres@localhost:5432/luppa_local?schema=public

# Supabase Storage — mesmo bucket de produção, isolado por prefixo
# app.supabase.com → Settings → API
SUPABASE_URL=https://<seu-projeto>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ<copiar do Supabase — service_role key, não a anon key>

# Prefixo de storage — NÃO alterar em dev local
STORAGE_PREFIX=local/
```

> **Nota sobre DATABASE_URL**: o `docker-compose.yml` sobrescreve essa var automaticamente
> para apontar ao postgres do container. Você não precisa de acesso ao Supabase para o banco em dev.

---

## 3. Variáveis de ambiente — Web (`apps/web/.env.local`)

O arquivo correto para o Next.js é `.env.local` (não `.env`):

```bash
cp apps/web/.env.example apps/web/.env.local
```

Preencha o arquivo `apps/web/.env.local`:

```env
# Clerk — mesma instância dev da API
# dashboard.clerk.com → selecione o app → API Keys
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_<copiar do Clerk>
CLERK_SECRET_KEY=sk_test_<mesmo valor do apps/api/.env>

# Rotas de auth (não alterar)
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# Maintenance mode (deixar false em dev)
NEXT_PUBLIC_MAINTENANCE_MODE=false

# URL da API — aponta para o backend local
NEXT_PUBLIC_API_URL=http://localhost:3333
```

---

## 4. Onde obter cada chave

### Clerk (dashboard.clerk.com)

1. Acesse [dashboard.clerk.com](https://dashboard.clerk.com)
2. Selecione o app **Luppa (dev)**
3. Menu lateral → **API Keys**
4. Copie:
   - `Publishable key` → `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `Secret keys` → `CLERK_SECRET_KEY` (mesmo valor nos dois `.env`)
5. Para `CLERK_WEBHOOK_SECRET`: **Webhooks** → selecione o endpoint dev → copie o Signing Secret
   - Se não houver endpoint configurado, deixe o valor do `.env.example` — a API sobe sem webhook em dev

### Supabase (app.supabase.com)

1. Acesse [app.supabase.com](https://app.supabase.com)
2. Selecione o projeto Luppa
3. Menu lateral → **Settings** → **API**
4. Copie:
   - `Project URL` → `SUPABASE_URL`
   - `service_role` (em "Project API keys") → `SUPABASE_SERVICE_ROLE_KEY`
   - **Não use a `anon` key** — ela não tem permissão para storage

### Anthropic (console.anthropic.com)

1. Acesse [console.anthropic.com](https://console.anthropic.com)
2. Menu lateral → **API Keys**
3. Crie ou copie uma chave → `ANTHROPIC_API_KEY`

---

## 5. Subir o stack

```bash
# Terminal 1 — sobe postgres + api (aguarda até a API estar healthy)
make dev

# Aguarde aparecer: "NestJS application is running on: http://localhost:3333"

# Verificar que a API está respondendo (em outro terminal)
make health
# Resposta esperada: {"status":"OK"}

# Aplicar migrations (só precisa na primeira vez, ou quando o schema mudar)
make migrate

# Terminal 2 — web no host
make dev-web
```

Acesse [http://localhost:3000](http://localhost:3000).

---

## 6. Conectar ao banco local no DBeaver

Com o stack rodando (`make dev` ou `docker compose up -d postgres`):

| Campo    | Valor         |
|----------|---------------|
| Host     | `localhost`   |
| Port     | `5432`        |
| Database | `luppa_local` |
| Username | `postgres`    |
| Password | `postgres`    |

New Connection → PostgreSQL → preencher os campos acima → Test Connection → Finish.

Se o DBeaver pedir driver JDBC do PostgreSQL, aceite o download automático.

---

## Resumo dos arquivos e valores fixos de dev

| Arquivo | Variável | Valor em dev local |
|---------|----------|--------------------|
| `apps/api/.env` | `NODE_ENV` | `development` |
| `apps/api/.env` | `PORT` | `3333` |
| `apps/api/.env` | `CORS_ORIGIN` | `http://localhost:3000` |
| `apps/api/.env` | `CLERK_AUTHORIZED_PARTIES` | `http://localhost:3000` |
| `apps/api/.env` | `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/luppa_local?schema=public` (sobrescrito pelo compose) |
| `apps/api/.env` | `STORAGE_PREFIX` | `local/` (sobrescrito pelo compose) |
| `apps/web/.env.local` | `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/sign-in` |
| `apps/web/.env.local` | `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/sign-up` |
| `apps/web/.env.local` | `NEXT_PUBLIC_MAINTENANCE_MODE` | `false` |
| `apps/web/.env.local` | `NEXT_PUBLIC_API_URL` | `http://localhost:3333` |

As variáveis que precisam de chaves reais: `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `ANTHROPIC_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
