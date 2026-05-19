-- Enable RLS on all public tables to block direct PostgREST access.
-- Prisma connects via DATABASE_URL with a role that has BYPASSRLS,
-- so application behavior is unchanged.
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Invoice" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Transaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MerchantRule" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
