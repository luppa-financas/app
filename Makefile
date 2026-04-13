.PHONY: dev-api dev-web build test health migrate migrate-dev studio

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

migrate-deploy:
	cd apps/api && npx prisma migrate deploy

migrate-dev:
	cd apps/api && npx prisma migrate dev

studio:
	cd apps/api && npx prisma studio
