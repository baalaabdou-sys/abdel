-- CreateTable
CREATE TABLE "CaptureSite" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL DEFAULT '',
    "publicKey" TEXT NOT NULL,
    "secretKeyHash" TEXT,
    "allowedOrigins" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "formId" TEXT,
    "product" "InsuranceType" NOT NULL DEFAULT 'AUTRE',
    "fieldMapping" JSONB NOT NULL DEFAULT '{}',
    "consentText" TEXT NOT NULL DEFAULT '',
    "requireConsentField" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastEventAt" TIMESTAMP(3),
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "leadCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CaptureSite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CaptureSite_publicKey_key" ON "CaptureSite"("publicKey");

-- CreateIndex
CREATE INDEX "CaptureSite_workspaceId_idx" ON "CaptureSite"("workspaceId");

-- AddForeignKey
ALTER TABLE "CaptureSite" ADD CONSTRAINT "CaptureSite_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaptureSite" ADD CONSTRAINT "CaptureSite_formId_fkey" FOREIGN KEY ("formId") REFERENCES "Form"("id") ON DELETE SET NULL ON UPDATE CASCADE;
