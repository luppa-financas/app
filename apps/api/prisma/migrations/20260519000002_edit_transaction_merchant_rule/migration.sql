-- Add alias to Transaction
ALTER TABLE "Transaction" ADD COLUMN "alias" TEXT;

-- Rebuild MerchantRule: drop old table and recreate with new schema
DROP TABLE "MerchantRule";

CREATE TYPE "MerchantRuleSource" AS ENUM ('USER_CORRECTION', 'LLM_INFERENCE');

CREATE TABLE "MerchantRule" (
  "id"          TEXT NOT NULL,
  "userId"      TEXT NOT NULL,
  "pattern"     TEXT NOT NULL,
  "category"    TEXT NOT NULL,
  "subcategory" TEXT,
  "confidence"  DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  "source"      "MerchantRuleSource" NOT NULL DEFAULT 'USER_CORRECTION',
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,

  CONSTRAINT "MerchantRule_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MerchantRule_userId_pattern_key" ON "MerchantRule"("userId", "pattern");

ALTER TABLE "MerchantRule" ADD CONSTRAINT "MerchantRule_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
