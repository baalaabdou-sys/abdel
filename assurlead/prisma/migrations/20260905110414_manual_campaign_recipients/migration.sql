-- AlterTable
ALTER TABLE "CampaignRecipient" ADD COLUMN     "addedById" TEXT,
ADD COLUMN     "manual" BOOLEAN NOT NULL DEFAULT false;
