-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'ADMIN', 'MARKETING', 'SALES', 'VIEWER');

-- CreateEnum
CREATE TYPE "ContactStatus" AS ENUM ('PROSPECT', 'CUSTOMER', 'FORMER_CUSTOMER');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('UNVERIFIED', 'VALID', 'LIKELY_VALID', 'CATCH_ALL', 'RISKY', 'UNKNOWN', 'INVALID');

-- CreateEnum
CREATE TYPE "ConsentState" AS ENUM ('UNKNOWN', 'GRANTED', 'DENIED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "InsuranceType" AS ENUM ('AUTO', 'MOTO', 'HABITATION', 'SANTE', 'PREVOYANCE', 'EMPRUNTEUR', 'PROFESSIONNELLE', 'DECENNALE', 'RC_PRO', 'AUTRE');

-- CreateEnum
CREATE TYPE "SegmentKind" AS ENUM ('STATIC', 'DYNAMIC');

-- CreateEnum
CREATE TYPE "CampaignObjective" AS ENUM ('QUOTE_REQUEST', 'CALLBACK_REQUEST', 'RENEWAL', 'CROSS_SELL', 'REACTIVATION', 'NEWSLETTER');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'SENDING', 'PAUSED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RecipientStatus" AS ENUM ('PENDING', 'QUEUED', 'PROCESSING', 'SENT', 'FAILED', 'BOUNCED', 'SUPPRESSED', 'CANCELLED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "CampaignEventType" AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'BOUNCED', 'SOFT_BOUNCED', 'OPENED', 'CLICKED', 'COMPLAINT', 'UNSUBSCRIBED', 'REPLIED', 'LANDING_VIEW', 'FORM_START', 'FORM_STEP', 'FORM_SUBMIT', 'FAILED');

-- CreateEnum
CREATE TYPE "EmailProviderKind" AS ENUM ('DEMO', 'SMTP', 'BREVO', 'MAILGUN', 'SES', 'POSTMARK');

-- CreateEnum
CREATE TYPE "DnsCheckStatus" AS ENUM ('UNKNOWN', 'CONFIGURED', 'MISSING', 'INVALID', 'NEEDS_ATTENTION');

-- CreateEnum
CREATE TYPE "SuppressionReason" AS ENUM ('UNSUBSCRIBED', 'DO_NOT_CONTACT', 'HARD_BOUNCE', 'COMPLAINT', 'MANUAL_BLOCK', 'INVALID', 'OTHER');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NOUVEAU', 'A_CONTACTER', 'CONTACTE', 'QUALIFIE', 'TRES_INTERESSE', 'RENDEZ_VOUS', 'DEVIS_ENVOYE', 'GAGNE', 'PERDU', 'NON_ELIGIBLE', 'NE_PAS_CONTACTER');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'PROCESSING', 'DONE', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReplyCategory" AS ENUM ('UNCLASSIFIED', 'INTERESTED', 'CALLBACK_REQUEST', 'QUOTE_REQUEST', 'QUESTION', 'NOT_INTERESTED', 'NOT_NOW', 'UNSUBSCRIBE', 'OUT_OF_OFFICE', 'OTHER');

-- CreateEnum
CREATE TYPE "PageStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "IntegrationStatus" AS ENUM ('DISCONNECTED', 'CONNECTED', 'ERROR');

-- CreateEnum
CREATE TYPE "NotificationLevel" AS ENUM ('INFO', 'SUCCESS', 'WARNING', 'CRITICAL');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'fr',
    "avatarUrl" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'fr',
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Paris',
    "country" TEXT NOT NULL DEFAULT 'FR',
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "onboardingStep" INTEGER NOT NULL DEFAULT 0,
    "onboardingDone" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceMember" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'VIEWER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkspaceMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompliancePolicy" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "requireExplicitConsent" BOOLEAN NOT NULL DEFAULT true,
    "allowUnknownConsent" BOOLEAN NOT NULL DEFAULT false,
    "requireSourceRecorded" BOOLEAN NOT NULL DEFAULT true,
    "allowCatchAll" BOOLEAN NOT NULL DEFAULT true,
    "allowRisky" BOOLEAN NOT NULL DEFAULT false,
    "allowUnverified" BOOLEAN NOT NULL DEFAULT true,
    "blockOnUnknownConsent" BOOLEAN NOT NULL DEFAULT true,
    "blockOnMissingSource" BOOLEAN NOT NULL DEFAULT false,
    "blockOnLowReadiness" BOOLEAN NOT NULL DEFAULT true,
    "minReadinessScore" INTEGER NOT NULL DEFAULT 60,
    "retentionMonths" INTEGER NOT NULL DEFAULT 36,
    "unsubscribeRequired" BOOLEAN NOT NULL DEFAULT true,
    "legalNotice" TEXT NOT NULL DEFAULT '',
    "privacyUrl" TEXT NOT NULL DEFAULT '',
    "dpoEmail" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompliancePolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InsuranceProduct" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "type" "InsuranceType" NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InsuranceProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailNormalized" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "phone" TEXT,
    "phoneNormalized" TEXT,
    "address" TEXT,
    "city" TEXT,
    "postalCode" TEXT,
    "country" TEXT NOT NULL DEFAULT 'FR',
    "birthDate" TIMESTAMP(3),
    "age" INTEGER,
    "profession" TEXT,
    "company" TEXT,
    "status" "ContactStatus" NOT NULL DEFAULT 'PROSPECT',
    "insuranceInterests" "InsuranceType"[],
    "currentInsurer" TEXT,
    "renewalDate" TIMESTAMP(3),
    "renewalMonth" INTEGER,
    "requestedCoverage" TEXT,
    "budgetMin" INTEGER,
    "budgetMax" INTEGER,
    "notes" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "customData" JSONB NOT NULL DEFAULT '{}',
    "source" TEXT,
    "sourceDetail" TEXT,
    "importedAt" TIMESTAMP(3),
    "consentEmail" "ConsentState" NOT NULL DEFAULT 'UNKNOWN',
    "consentPhone" "ConsentState" NOT NULL DEFAULT 'UNKNOWN',
    "consentDate" TIMESTAMP(3),
    "consentSource" TEXT,
    "legalBasisNote" TEXT,
    "emailMarketingAllowed" BOOLEAN NOT NULL DEFAULT false,
    "phoneContactAllowed" BOOLEAN NOT NULL DEFAULT false,
    "unsubscribed" BOOLEAN NOT NULL DEFAULT false,
    "unsubscribedAt" TIMESTAMP(3),
    "suppressed" BOOLEAN NOT NULL DEFAULT false,
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "verifiedAt" TIMESTAMP(3),
    "verificationProvider" TEXT,
    "verificationConfidence" INTEGER,
    "leadScoreHint" INTEGER NOT NULL DEFAULT 0,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactSource" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "detail" TEXT,
    "importBatchId" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentRecord" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "state" "ConsentState" NOT NULL,
    "source" TEXT,
    "evidence" TEXT,
    "note" TEXT,
    "actorId" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactCustomField" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'text',
    "options" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactCustomField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportBatch" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "imported" INTEGER NOT NULL DEFAULT 0,
    "updated" INTEGER NOT NULL DEFAULT 0,
    "skipped" INTEGER NOT NULL DEFAULT 0,
    "invalid" INTEGER NOT NULL DEFAULT 0,
    "duplicates" INTEGER NOT NULL DEFAULT 0,
    "suppressedHits" INTEGER NOT NULL DEFAULT 0,
    "strategy" TEXT NOT NULL DEFAULT 'SKIP',
    "mapping" JSONB NOT NULL DEFAULT '{}',
    "defaults" JSONB NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "errorSample" JSONB NOT NULL DEFAULT '[]',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "ImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationResult" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "status" "VerificationStatus" NOT NULL,
    "confidence" INTEGER,
    "raw" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificationResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Segment" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "kind" "SegmentKind" NOT NULL DEFAULT 'DYNAMIC',
    "rules" JSONB NOT NULL DEFAULT '{"match":"AND","conditions":[]}',
    "cachedCount" INTEGER NOT NULL DEFAULT 0,
    "countedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Segment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SegmentContact" (
    "segmentId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SegmentContact_pkey" PRIMARY KEY ("segmentId","contactId")
);

-- CreateTable
CREATE TABLE "SendingDomain" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "spf" "DnsCheckStatus" NOT NULL DEFAULT 'UNKNOWN',
    "dkim" "DnsCheckStatus" NOT NULL DEFAULT 'UNKNOWN',
    "dmarc" "DnsCheckStatus" NOT NULL DEFAULT 'UNKNOWN',
    "trackingCname" "DnsCheckStatus" NOT NULL DEFAULT 'UNKNOWN',
    "spfRecord" TEXT,
    "dkimRecord" TEXT,
    "dmarcRecord" TEXT,
    "lastCheckedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SendingDomain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailAccount" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "domainId" TEXT,
    "provider" "EmailProviderKind" NOT NULL DEFAULT 'DEMO',
    "label" TEXT NOT NULL,
    "fromEmail" TEXT NOT NULL,
    "fromName" TEXT NOT NULL,
    "replyTo" TEXT,
    "credentials" JSONB NOT NULL DEFAULT '{}',
    "status" "IntegrationStatus" NOT NULL DEFAULT 'DISCONNECTED',
    "statusMessage" TEXT,
    "dailyLimit" INTEGER NOT NULL DEFAULT 500,
    "hourlyLimit" INTEGER NOT NULL DEFAULT 100,
    "warmupEnabled" BOOLEAN NOT NULL DEFAULT true,
    "warmupStartAt" TIMESTAMP(3),
    "warmupStartLimit" INTEGER NOT NULL DEFAULT 50,
    "warmupIncrement" INTEGER NOT NULL DEFAULT 50,
    "sentToday" INTEGER NOT NULL DEFAULT 0,
    "sentTodayDate" TIMESTAMP(3),
    "bounceCount" INTEGER NOT NULL DEFAULT 0,
    "sentTotal" INTEGER NOT NULL DEFAULT 0,
    "lastSyncAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailThread" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "emailAccountId" TEXT,
    "subject" TEXT NOT NULL,
    "participants" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "category" "ReplyCategory" NOT NULL DEFAULT 'UNCLASSIFIED',
    "unread" BOOLEAN NOT NULL DEFAULT true,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "campaignId" TEXT,
    "leadId" TEXT,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailMessage" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "emailAccountId" TEXT,
    "contactId" TEXT,
    "direction" TEXT NOT NULL DEFAULT 'INBOUND',
    "fromEmail" TEXT NOT NULL,
    "toEmail" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "bodyText" TEXT NOT NULL DEFAULT '',
    "bodyHtml" TEXT NOT NULL DEFAULT '',
    "providerMessageId" TEXT,
    "category" "ReplyCategory" NOT NULL DEFAULT 'UNCLASSIFIED',
    "aiSuggestion" TEXT,
    "aiReasoning" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "objective" "CampaignObjective" NOT NULL DEFAULT 'QUOTE_REQUEST',
    "product" "InsuranceType" NOT NULL DEFAULT 'AUTO',
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "segmentId" TEXT,
    "emailAccountId" TEXT,
    "landingPageId" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'fr',
    "scheduledAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "launchedById" TEXT,
    "launchedAt" TIMESTAMP(3),
    "trackOpens" BOOLEAN NOT NULL DEFAULT false,
    "trackClicks" BOOLEAN NOT NULL DEFAULT true,
    "batchSize" INTEGER NOT NULL DEFAULT 200,
    "batchIntervalMinutes" INTEGER NOT NULL DEFAULT 10,
    "dailyCap" INTEGER NOT NULL DEFAULT 2000,
    "readinessScore" INTEGER NOT NULL DEFAULT 0,
    "readinessReport" JSONB NOT NULL DEFAULT '{}',
    "abEnabled" BOOLEAN NOT NULL DEFAULT false,
    "abDimension" TEXT,
    "recipientCount" INTEGER NOT NULL DEFAULT 0,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignVariant" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT 'A',
    "weight" INTEGER NOT NULL DEFAULT 100,
    "subject" TEXT NOT NULL,
    "previewText" TEXT NOT NULL DEFAULT '',
    "bodyHtml" TEXT NOT NULL DEFAULT '',
    "bodyText" TEXT NOT NULL DEFAULT '',
    "ctaLabel" TEXT NOT NULL DEFAULT 'Demander mon devis',
    "isControl" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignRecipient" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "variantId" TEXT,
    "status" "RecipientStatus" NOT NULL DEFAULT 'PENDING',
    "sendKey" TEXT NOT NULL,
    "trackingToken" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "error" TEXT,
    "providerMessageId" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "skipReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignEvent" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "campaignId" TEXT,
    "recipientId" TEXT,
    "contactId" TEXT,
    "variantId" TEXT,
    "type" "CampaignEventType" NOT NULL,
    "dedupeKey" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Template" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'AUTRE',
    "product" "InsuranceType" NOT NULL DEFAULT 'AUTRE',
    "locale" TEXT NOT NULL DEFAULT 'fr',
    "subject" TEXT NOT NULL,
    "previewText" TEXT NOT NULL DEFAULT '',
    "bodyHtml" TEXT NOT NULL DEFAULT '',
    "bodyText" TEXT NOT NULL DEFAULT '',
    "version" INTEGER NOT NULL DEFAULT 1,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LandingPage" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "product" "InsuranceType" NOT NULL DEFAULT 'AUTO',
    "locale" TEXT NOT NULL DEFAULT 'fr',
    "status" "PageStatus" NOT NULL DEFAULT 'DRAFT',
    "customDomain" TEXT,
    "seoTitle" TEXT NOT NULL DEFAULT '',
    "seoDescription" TEXT NOT NULL DEFAULT '',
    "noIndex" BOOLEAN NOT NULL DEFAULT true,
    "theme" JSONB NOT NULL DEFAULT '{}',
    "sections" JSONB NOT NULL DEFAULT '[]',
    "formId" TEXT,
    "publishedAt" TIMESTAMP(3),
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LandingPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LandingPageVersion" (
    "id" TEXT NOT NULL,
    "landingPageId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "sections" JSONB NOT NULL DEFAULT '[]',
    "theme" JSONB NOT NULL DEFAULT '{}',
    "label" TEXT NOT NULL DEFAULT '',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LandingPageVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Form" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "product" "InsuranceType" NOT NULL DEFAULT 'AUTO',
    "locale" TEXT NOT NULL DEFAULT 'fr',
    "multiStep" BOOLEAN NOT NULL DEFAULT true,
    "steps" JSONB NOT NULL DEFAULT '[]',
    "consentText" TEXT NOT NULL DEFAULT '',
    "successMessage" TEXT NOT NULL DEFAULT '',
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Form_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormField" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'text',
    "step" INTEGER NOT NULL DEFAULT 1,
    "order" INTEGER NOT NULL DEFAULT 0,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "options" JSONB NOT NULL DEFAULT '[]',
    "placeholder" TEXT NOT NULL DEFAULT '',
    "helpText" TEXT NOT NULL DEFAULT '',
    "conditionField" TEXT,
    "conditionValue" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FormField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormSubmission" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "landingPageId" TEXT,
    "campaignId" TEXT,
    "contactId" TEXT,
    "recipientToken" TEXT,
    "sessionId" TEXT,
    "answers" JSONB NOT NULL DEFAULT '{}',
    "consentGiven" BOOLEAN NOT NULL DEFAULT false,
    "consentText" TEXT NOT NULL DEFAULT '',
    "ipHash" TEXT,
    "userAgent" TEXT,
    "variantLabel" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FormSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "contactId" TEXT,
    "campaignId" TEXT,
    "submissionId" TEXT,
    "product" "InsuranceType" NOT NULL DEFAULT 'AUTO',
    "status" "LeadStatus" NOT NULL DEFAULT 'NOUVEAU',
    "score" INTEGER NOT NULL DEFAULT 0,
    "scoreBand" TEXT NOT NULL DEFAULT 'LOW',
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "city" TEXT,
    "postalCode" TEXT,
    "currentInsurer" TEXT,
    "renewalDate" TIMESTAMP(3),
    "answers" JSONB NOT NULL DEFAULT '{}',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "ownerId" TEXT,
    "assignedAt" TIMESTAMP(3),
    "firstActionAt" TIMESTAMP(3),
    "responseMinutes" INTEGER,
    "contactedAt" TIMESTAMP(3),
    "appointmentAt" TIMESTAMP(3),
    "wonAt" TIMESTAMP(3),
    "lostAt" TIMESTAMP(3),
    "lostReason" TEXT,
    "value" INTEGER,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadScore" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "band" TEXT NOT NULL,
    "breakdown" JSONB NOT NULL DEFAULT '[]',
    "model" TEXT NOT NULL DEFAULT 'default-v1',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadAssignment" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "userId" TEXT,
    "strategy" TEXT NOT NULL DEFAULT 'MANUAL',
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,

    CONSTRAINT "LeadAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadActivity" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "userId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "leadId" TEXT,
    "assigneeId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "type" TEXT NOT NULL DEFAULT 'CALL',
    "status" "TaskStatus" NOT NULL DEFAULT 'TODO',
    "priority" "TaskPriority" NOT NULL DEFAULT 'NORMAL',
    "dueAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SuppressionEntry" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "email" TEXT,
    "emailNormalized" TEXT,
    "phone" TEXT,
    "reason" "SuppressionReason" NOT NULL DEFAULT 'UNSUBSCRIBED',
    "source" TEXT,
    "campaignId" TEXT,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SuppressionEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "summary" TEXT NOT NULL DEFAULT '',
    "before" JSONB,
    "after" JSONB,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationRule" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "trigger" TEXT NOT NULL,
    "conditions" JSONB NOT NULL DEFAULT '[]',
    "actions" JSONB NOT NULL DEFAULT '[]',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "runCount" INTEGER NOT NULL DEFAULT 0,
    "lastRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutomationRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationExecution" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SUCCESS',
    "detail" JSONB NOT NULL DEFAULT '{}',
    "dedupeKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AutomationExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Integration" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "status" "IntegrationStatus" NOT NULL DEFAULT 'DISCONNECTED',
    "config" JSONB NOT NULL DEFAULT '{}',
    "statusMessage" TEXT,
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Integration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT,
    "level" "NotificationLevel" NOT NULL DEFAULT 'INFO',
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "link" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "emailSent" BOOLEAN NOT NULL DEFAULT false,
    "dedupeKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyGoal" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "minTarget" INTEGER NOT NULL DEFAULT 10,
    "stretchTarget" INTEGER NOT NULL DEFAULT 20,
    "achieved" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyGoal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiUsage" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT '',
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "periodMonth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "queue" TEXT NOT NULL DEFAULT 'default',
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "runAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "lockedAt" TIMESTAMP(3),
    "lockedBy" TEXT,
    "lastError" TEXT,
    "dedupeKey" TEXT,
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "ip" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_slug_key" ON "Workspace"("slug");

-- CreateIndex
CREATE INDEX "WorkspaceMember_userId_idx" ON "WorkspaceMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceMember_workspaceId_userId_key" ON "WorkspaceMember"("workspaceId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "CompliancePolicy_workspaceId_key" ON "CompliancePolicy"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "InsuranceProduct_workspaceId_type_key" ON "InsuranceProduct"("workspaceId", "type");

-- CreateIndex
CREATE INDEX "Contact_workspaceId_verificationStatus_idx" ON "Contact"("workspaceId", "verificationStatus");

-- CreateIndex
CREATE INDEX "Contact_workspaceId_suppressed_idx" ON "Contact"("workspaceId", "suppressed");

-- CreateIndex
CREATE INDEX "Contact_workspaceId_city_idx" ON "Contact"("workspaceId", "city");

-- CreateIndex
CREATE INDEX "Contact_workspaceId_renewalMonth_idx" ON "Contact"("workspaceId", "renewalMonth");

-- CreateIndex
CREATE INDEX "Contact_workspaceId_phoneNormalized_idx" ON "Contact"("workspaceId", "phoneNormalized");

-- CreateIndex
CREATE INDEX "Contact_workspaceId_createdAt_idx" ON "Contact"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "Contact_workspaceId_isDemo_idx" ON "Contact"("workspaceId", "isDemo");

-- CreateIndex
CREATE UNIQUE INDEX "Contact_workspaceId_emailNormalized_key" ON "Contact"("workspaceId", "emailNormalized");

-- CreateIndex
CREATE INDEX "ContactSource_contactId_idx" ON "ContactSource"("contactId");

-- CreateIndex
CREATE INDEX "ConsentRecord_contactId_channel_idx" ON "ConsentRecord"("contactId", "channel");

-- CreateIndex
CREATE UNIQUE INDEX "ContactCustomField_workspaceId_key_key" ON "ContactCustomField"("workspaceId", "key");

-- CreateIndex
CREATE INDEX "ImportBatch_workspaceId_createdAt_idx" ON "ImportBatch"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "VerificationResult_contactId_createdAt_idx" ON "VerificationResult"("contactId", "createdAt");

-- CreateIndex
CREATE INDEX "Segment_workspaceId_idx" ON "Segment"("workspaceId");

-- CreateIndex
CREATE INDEX "SegmentContact_contactId_idx" ON "SegmentContact"("contactId");

-- CreateIndex
CREATE UNIQUE INDEX "SendingDomain_workspaceId_domain_key" ON "SendingDomain"("workspaceId", "domain");

-- CreateIndex
CREATE INDEX "EmailAccount_workspaceId_idx" ON "EmailAccount"("workspaceId");

-- CreateIndex
CREATE INDEX "EmailThread_workspaceId_unread_idx" ON "EmailThread"("workspaceId", "unread");

-- CreateIndex
CREATE INDEX "EmailThread_workspaceId_lastMessageAt_idx" ON "EmailThread"("workspaceId", "lastMessageAt");

-- CreateIndex
CREATE INDEX "EmailMessage_threadId_idx" ON "EmailMessage"("threadId");

-- CreateIndex
CREATE INDEX "Campaign_workspaceId_status_idx" ON "Campaign"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "Campaign_workspaceId_createdAt_idx" ON "Campaign"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "CampaignVariant_campaignId_idx" ON "CampaignVariant"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignRecipient_sendKey_key" ON "CampaignRecipient"("sendKey");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignRecipient_trackingToken_key" ON "CampaignRecipient"("trackingToken");

-- CreateIndex
CREATE INDEX "CampaignRecipient_campaignId_status_idx" ON "CampaignRecipient"("campaignId", "status");

-- CreateIndex
CREATE INDEX "CampaignRecipient_contactId_idx" ON "CampaignRecipient"("contactId");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignRecipient_campaignId_contactId_key" ON "CampaignRecipient"("campaignId", "contactId");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignEvent_dedupeKey_key" ON "CampaignEvent"("dedupeKey");

-- CreateIndex
CREATE INDEX "CampaignEvent_workspaceId_type_occurredAt_idx" ON "CampaignEvent"("workspaceId", "type", "occurredAt");

-- CreateIndex
CREATE INDEX "CampaignEvent_campaignId_type_idx" ON "CampaignEvent"("campaignId", "type");

-- CreateIndex
CREATE INDEX "CampaignEvent_occurredAt_idx" ON "CampaignEvent"("occurredAt");

-- CreateIndex
CREATE INDEX "Template_workspaceId_category_idx" ON "Template"("workspaceId", "category");

-- CreateIndex
CREATE INDEX "LandingPage_slug_idx" ON "LandingPage"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "LandingPage_workspaceId_slug_key" ON "LandingPage"("workspaceId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "LandingPageVersion_landingPageId_version_key" ON "LandingPageVersion"("landingPageId", "version");

-- CreateIndex
CREATE INDEX "Form_workspaceId_idx" ON "Form"("workspaceId");

-- CreateIndex
CREATE INDEX "FormField_formId_step_order_idx" ON "FormField"("formId", "step", "order");

-- CreateIndex
CREATE UNIQUE INDEX "FormField_formId_key_key" ON "FormField"("formId", "key");

-- CreateIndex
CREATE INDEX "FormSubmission_workspaceId_createdAt_idx" ON "FormSubmission"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "FormSubmission_formId_idx" ON "FormSubmission"("formId");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_submissionId_key" ON "Lead"("submissionId");

-- CreateIndex
CREATE INDEX "Lead_workspaceId_status_idx" ON "Lead"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "Lead_workspaceId_createdAt_idx" ON "Lead"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "Lead_workspaceId_ownerId_idx" ON "Lead"("workspaceId", "ownerId");

-- CreateIndex
CREATE INDEX "Lead_workspaceId_score_idx" ON "Lead"("workspaceId", "score");

-- CreateIndex
CREATE INDEX "LeadScore_leadId_createdAt_idx" ON "LeadScore"("leadId", "createdAt");

-- CreateIndex
CREATE INDEX "LeadAssignment_leadId_idx" ON "LeadAssignment"("leadId");

-- CreateIndex
CREATE INDEX "LeadActivity_leadId_createdAt_idx" ON "LeadActivity"("leadId", "createdAt");

-- CreateIndex
CREATE INDEX "Task_workspaceId_status_idx" ON "Task"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "Task_assigneeId_status_idx" ON "Task"("assigneeId", "status");

-- CreateIndex
CREATE INDEX "SuppressionEntry_workspaceId_reason_idx" ON "SuppressionEntry"("workspaceId", "reason");

-- CreateIndex
CREATE INDEX "SuppressionEntry_emailNormalized_idx" ON "SuppressionEntry"("emailNormalized");

-- CreateIndex
CREATE UNIQUE INDEX "SuppressionEntry_workspaceId_emailNormalized_key" ON "SuppressionEntry"("workspaceId", "emailNormalized");

-- CreateIndex
CREATE INDEX "AuditLog_workspaceId_createdAt_idx" ON "AuditLog"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_workspaceId_entityType_entityId_idx" ON "AuditLog"("workspaceId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "AutomationRule_workspaceId_trigger_enabled_idx" ON "AutomationRule"("workspaceId", "trigger", "enabled");

-- CreateIndex
CREATE UNIQUE INDEX "AutomationExecution_dedupeKey_key" ON "AutomationExecution"("dedupeKey");

-- CreateIndex
CREATE INDEX "AutomationExecution_ruleId_createdAt_idx" ON "AutomationExecution"("ruleId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Integration_workspaceId_kind_provider_key" ON "Integration"("workspaceId", "kind", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_dedupeKey_key" ON "Notification"("dedupeKey");

-- CreateIndex
CREATE INDEX "Notification_workspaceId_read_createdAt_idx" ON "Notification"("workspaceId", "read", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_read_idx" ON "Notification"("userId", "read");

-- CreateIndex
CREATE UNIQUE INDEX "DailyGoal_workspaceId_date_key" ON "DailyGoal"("workspaceId", "date");

-- CreateIndex
CREATE INDEX "ApiUsage_workspaceId_periodMonth_kind_idx" ON "ApiUsage"("workspaceId", "periodMonth", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "Job_dedupeKey_key" ON "Job"("dedupeKey");

-- CreateIndex
CREATE INDEX "Job_status_runAt_idx" ON "Job"("status", "runAt");

-- CreateIndex
CREATE INDEX "Job_queue_status_runAt_idx" ON "Job"("queue", "status", "runAt");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- AddForeignKey
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompliancePolicy" ADD CONSTRAINT "CompliancePolicy_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsuranceProduct" ADD CONSTRAINT "InsuranceProduct_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactSource" ADD CONSTRAINT "ContactSource_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactSource" ADD CONSTRAINT "ContactSource_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "ImportBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentRecord" ADD CONSTRAINT "ConsentRecord_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactCustomField" ADD CONSTRAINT "ContactCustomField_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportBatch" ADD CONSTRAINT "ImportBatch_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationResult" ADD CONSTRAINT "VerificationResult_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Segment" ADD CONSTRAINT "Segment_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SegmentContact" ADD CONSTRAINT "SegmentContact_segmentId_fkey" FOREIGN KEY ("segmentId") REFERENCES "Segment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SegmentContact" ADD CONSTRAINT "SegmentContact_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SendingDomain" ADD CONSTRAINT "SendingDomain_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailAccount" ADD CONSTRAINT "EmailAccount_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailAccount" ADD CONSTRAINT "EmailAccount_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "SendingDomain"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailThread" ADD CONSTRAINT "EmailThread_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailThread" ADD CONSTRAINT "EmailThread_emailAccountId_fkey" FOREIGN KEY ("emailAccountId") REFERENCES "EmailAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailThread" ADD CONSTRAINT "EmailThread_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailThread" ADD CONSTRAINT "EmailThread_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailMessage" ADD CONSTRAINT "EmailMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "EmailThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailMessage" ADD CONSTRAINT "EmailMessage_emailAccountId_fkey" FOREIGN KEY ("emailAccountId") REFERENCES "EmailAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailMessage" ADD CONSTRAINT "EmailMessage_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_segmentId_fkey" FOREIGN KEY ("segmentId") REFERENCES "Segment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_emailAccountId_fkey" FOREIGN KEY ("emailAccountId") REFERENCES "EmailAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_landingPageId_fkey" FOREIGN KEY ("landingPageId") REFERENCES "LandingPage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignVariant" ADD CONSTRAINT "CampaignVariant_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignRecipient" ADD CONSTRAINT "CampaignRecipient_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignRecipient" ADD CONSTRAINT "CampaignRecipient_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignRecipient" ADD CONSTRAINT "CampaignRecipient_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "CampaignVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignEvent" ADD CONSTRAINT "CampaignEvent_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignEvent" ADD CONSTRAINT "CampaignEvent_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "CampaignRecipient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignEvent" ADD CONSTRAINT "CampaignEvent_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignEvent" ADD CONSTRAINT "CampaignEvent_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "CampaignVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Template" ADD CONSTRAINT "Template_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LandingPage" ADD CONSTRAINT "LandingPage_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LandingPage" ADD CONSTRAINT "LandingPage_formId_fkey" FOREIGN KEY ("formId") REFERENCES "Form"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LandingPageVersion" ADD CONSTRAINT "LandingPageVersion_landingPageId_fkey" FOREIGN KEY ("landingPageId") REFERENCES "LandingPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Form" ADD CONSTRAINT "Form_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormField" ADD CONSTRAINT "FormField_formId_fkey" FOREIGN KEY ("formId") REFERENCES "Form"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormSubmission" ADD CONSTRAINT "FormSubmission_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormSubmission" ADD CONSTRAINT "FormSubmission_formId_fkey" FOREIGN KEY ("formId") REFERENCES "Form"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormSubmission" ADD CONSTRAINT "FormSubmission_landingPageId_fkey" FOREIGN KEY ("landingPageId") REFERENCES "LandingPage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormSubmission" ADD CONSTRAINT "FormSubmission_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormSubmission" ADD CONSTRAINT "FormSubmission_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "FormSubmission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadScore" ADD CONSTRAINT "LeadScore_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadAssignment" ADD CONSTRAINT "LeadAssignment_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadAssignment" ADD CONSTRAINT "LeadAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadActivity" ADD CONSTRAINT "LeadActivity_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadActivity" ADD CONSTRAINT "LeadActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuppressionEntry" ADD CONSTRAINT "SuppressionEntry_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationRule" ADD CONSTRAINT "AutomationRule_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationExecution" ADD CONSTRAINT "AutomationExecution_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "AutomationRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Integration" ADD CONSTRAINT "Integration_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyGoal" ADD CONSTRAINT "DailyGoal_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiUsage" ADD CONSTRAINT "ApiUsage_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
