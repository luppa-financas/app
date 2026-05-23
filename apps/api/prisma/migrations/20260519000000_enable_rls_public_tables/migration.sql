-- Enable RLS on all public tables to block direct PostgREST access.
-- Prisma connects via DATABASE_URL with a role that has BYPASSRLS,
-- so application behavior is unchanged.
-- Note: _prisma_migrations (internal Prisma table) is intentionally excluded
-- because altering it inside a migration breaks shadow DB validation in
-- `prisma migrate dev`. RLS there must be enabled out-of-band if needed.
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Invoice" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Transaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MerchantRule" ENABLE ROW LEVEL SECURITY;
