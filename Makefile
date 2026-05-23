.PHONY: dev dev-logs dev-stop dev-reset dev-api dev-web build test health migrate migrate-create migrate-reset migrate-deploy studio

# --- Ambiente local via Docker (postgres + api) ---

dev:
	docker compose up -d
	docker compose logs -f api

dev-logs:
	docker compose logs -f

dev-stop:
	docker compose stop

dev-reset:
	docker compose down -v

migrate:
	docker compose exec -T api pnpm exec prisma migrate deploy

# Cria uma nova migration a partir do schema.prisma.
# Uso: make migrate-create NAME=add_some_field
migrate-create:
	@test -n "$(NAME)" || (echo "Uso: make migrate-create NAME=descricao_da_migration"; exit 1)
	docker compose exec api pnpm exec prisma migrate dev --name $(NAME)

# Apaga o banco local e re-aplica todas as migrations do zero.
migrate-reset:
	docker compose exec -T api pnpm exec prisma migrate reset --force --skip-seed

studio:
	docker compose exec -T api pnpm exec prisma studio

# --- Execução direta no host (sem Docker) ---

dev-api:
	cd apps/api && pnpm start:dev

dev-web:
	cd apps/web && pnpm dev

# --- Comuns ---

build:
	pnpm build

test:
	pnpm test

health:
	curl -sf http://localhost:3333/health && echo ""

migrate-deploy:
	cd apps/api && npx prisma migrate deploy
