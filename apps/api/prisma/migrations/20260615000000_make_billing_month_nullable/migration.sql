-- AlterTable
ALTER TABLE "Invoice" ALTER COLUMN "billingMonth" DROP NOT NULL;
ALTER TABLE "Invoice" ALTER COLUMN "billingMonth" DROP DEFAULT;
