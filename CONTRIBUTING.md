# Contribuindo com o Luppa

Guia rápido para subir o ambiente de desenvolvimento.

## Pré-requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (com Docker Compose v2)
- [Node.js 22+](https://nodejs.org/) (para rodar a web no host)
- [pnpm 10+](https://pnpm.io/installation): `npm install -g pnpm`

## Setup em 3 passos

### 1. Configurar variáveis de ambiente

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

Preencha as chaves nos dois `.env`:

- **Clerk** (instância dev): `dashboard.clerk.com` → API keys
- **Supabase**: `app.supabase.com` → Project Settings → API
- **Anthropic**: `console.anthropic.com` → API keys

> O `DATABASE_URL` no `apps/api/.env` é ignorado quando rodando via `make dev` — o docker-compose injeta o URL do postgres local.

### 2. Subir api + postgres

```bash
make dev
```

Sobe postgres + api em containers. Segue os logs da api no terminal (Ctrl+C interrompe o tail; os containers continuam rodando — `make dev-stop` para tudo).

### 3. Aplicar migrations e subir a web

```bash
make migrate         # roda prisma migrate dev no postgres local
pnpm --filter web dev   # web no host (mais rápido que dentro do container)
```

A API fica em `http://localhost:3333/health` e a web em `http://localhost:3000`.

## Comandos úteis

| Comando | O que faz |
|---------|-----------|
| `make dev` | Sobe postgres + api e segue logs da api |
| `make dev-logs` | Logs combinados dos dois containers |
| `make dev-stop` | Para os containers (preserva dados) |
| `make dev-reset` | Para containers **e remove volumes** (limpa o banco local) |
| `make migrate` | Aplica migrations pendentes (`prisma migrate deploy`) |
| `make migrate-create NAME=foo` | Cria nova migration a partir do `schema.prisma` |
| `make migrate-reset` | Apaga o banco local e re-aplica tudo do zero |
| `make studio` | Abre Prisma Studio |
| `make test` | Suite de testes (jest) |

### Criando uma nova migration

1. Edite `apps/api/prisma/schema.prisma` com a mudança desejada.
2. Rode `make migrate-create NAME=descricao_curta` (ex: `add_invoice_currency`).
3. O Prisma gera o SQL em `apps/api/prisma/migrations/<timestamp>_<nome>/migration.sql` e aplica no banco local.
4. Commit do diretório gerado + do `schema.prisma`.
5. Em produção (Railway), o `prisma migrate deploy` no startup do container aplica a migration automaticamente.

> **Importante**: nunca edite migrations já aplicadas em produção. O `prisma migrate deploy` ignora drift de checksum, mas times que rodem `migrate dev` localmente vão precisar de reset (`make migrate-reset`) para limpar.

## Estrutura de ambientes

| | Postgres | Storage | Clerk |
|---|---|---|---|
| **Local** | container do compose (`luppa_local`) | Supabase com `STORAGE_PREFIX=local/` | instância dev |
| **Produção** (Railway) | Supabase | Supabase com `STORAGE_PREFIX=prod/` | instância prod |

Storage é compartilhado entre ambientes; isolamento via prefixo no path. Banco é totalmente separado.

## Troubleshooting

### Porta 5432 ocupada

Você tem um postgres rodando no host. Pare ele (`brew services stop postgresql`) ou mude a porta exposta no `docker-compose.yml` (linha `5432:5432` → `5433:5432`) e ajuste o `DATABASE_URL` injetado para `localhost:5433` apenas quando acessar do host (Prisma Studio). De dentro do container, a porta continua 5432.

### Schema mudou e o Prisma Client tá desatualizado

O `start:dev` não regenera o client. Quando alterar `schema.prisma`:

```bash
make migrate     # cria/aplica a migration
docker compose restart api  # restart pega o novo client
```

### `make dev` falha no boot da api com erro de native binding

Volume mounts misturados podem corromper o `node_modules` do container. Resolva limpando os volumes nomeados:

```bash
make dev-reset && make dev
```

### Web não acha a API

A web roda no host (porta 3000) e bate na api em `http://localhost:3333`. Se preferir rodar a web em container futuramente, use `host.docker.internal` ou adicione um service no compose.

### Login redireciona para `/waitlist` em vez do dashboard

O Clerk cria o usuário sem roles no primeiro login em dev local (webhooks não funcionam em localhost). Para liberar o acesso:

```bash
make studio   # abre Prisma Studio em localhost:5555
```

Na tabela **User**, edite o registro com o seu e-mail e defina o campo `roles` como `["mvp"]`. Salve e recarregue o app.

Só precisa fazer isso uma vez por usuário novo em dev local.

## Primeiro upload

Após o setup, siga [`docs/first-upload.md`](docs/first-upload.md) para validar que tudo está funcionando ponta-a-ponta.

## Dúvidas

Abra uma issue ou pergunte no grupo do projeto.
