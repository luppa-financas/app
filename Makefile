.PHONY: dev-api dev-web build test health migrate

dev-api:
	cd apps/api && pnpm start:dev

dev-web:
	cd apps/web && pnpm dev

build:
	pnpm build

test:
	pnpm test

health:
	curl -sf http://localhost:3333/health && echo ""

migrate:
	@echo "No migrations yet — Prisma arrives in issue #4"
