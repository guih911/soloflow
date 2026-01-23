/*
  Warnings:

  - You are about to drop the `step_transitions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `geolocation` on the `signature_records` table. All the data in the column will be lost.
  - You are about to drop the column `rejectionReason` on the `signature_records` table. All the data in the column will be lost.
  - You are about to drop the column `actions` on the `step_versions` table. All the data in the column will be lost.
  - You are about to drop the column `assignmentConditions` on the `step_versions` table. All the data in the column will be lost.
  - You are about to drop the column `flowConditions` on the `step_versions` table. All the data in the column will be lost.
  - You are about to drop the column `role` on the `users` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[stepVersionId,attachmentId,order]` on the table `signature_requirements` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId,companyId,profileId]` on the table `user_profiles` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "signature_requirements_stepVersionId_order_key";

-- DropIndex
DROP INDEX "user_profiles_userId_companyId_key";

-- AlterTable
ALTER TABLE "form_field_versions" ADD COLUMN "maxRows" INTEGER;
ALTER TABLE "form_field_versions" ADD COLUMN "minRows" INTEGER;
ALTER TABLE "form_field_versions" ADD COLUMN "tableColumns" JSONB;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "step_transitions";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" DATETIME,
    "userId" TEXT NOT NULL,
    CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT,
    "details" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,
    "companyId" TEXT,
    CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "audit_logs_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "child_process_configs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "processInstanceId" TEXT NOT NULL,
    "childProcessTypeId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "triggerStepVersionId" TEXT,
    "recurrence" JSONB,
    "waitForCompletion" BOOLEAN NOT NULL DEFAULT false,
    "autoStart" BOOLEAN NOT NULL DEFAULT true,
    "inputDataMapping" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "nextRunAt" DATETIME,
    "lastRunAt" DATETIME,
    "runCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "child_process_configs_processInstanceId_fkey" FOREIGN KEY ("processInstanceId") REFERENCES "process_instances" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "child_process_configs_childProcessTypeId_fkey" FOREIGN KEY ("childProcessTypeId") REFERENCES "process_types" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "child_process_configs_triggerStepVersionId_fkey" FOREIGN KEY ("triggerStepVersionId") REFERENCES "step_versions" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "child_process_instances" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "configId" TEXT,
    "parentProcessInstanceId" TEXT NOT NULL,
    "childProcessInstanceId" TEXT NOT NULL,
    "originStepExecutionId" TEXT,
    "runNumber" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "scheduledFor" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    CONSTRAINT "child_process_instances_configId_fkey" FOREIGN KEY ("configId") REFERENCES "child_process_configs" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "child_process_instances_parentProcessInstanceId_fkey" FOREIGN KEY ("parentProcessInstanceId") REFERENCES "process_instances" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "child_process_instances_childProcessInstanceId_fkey" FOREIGN KEY ("childProcessInstanceId") REFERENCES "process_instances" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "child_process_instances_originStepExecutionId_fkey" FOREIGN KEY ("originStepExecutionId") REFERENCES "step_executions" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "sub_task_templates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "stepVersionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "instructions" TEXT,
    "order" INTEGER NOT NULL,
    "executionMode" TEXT NOT NULL DEFAULT 'PARALLEL',
    "assignmentType" TEXT NOT NULL DEFAULT 'INHERIT',
    "assignedToUserId" TEXT,
    "assignedToSectorId" TEXT,
    "slaHours" INTEGER,
    "slaDays" INTEGER,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "allowAttachment" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "sub_task_templates_stepVersionId_fkey" FOREIGN KEY ("stepVersionId") REFERENCES "step_versions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "sub_task_templates_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "sub_task_templates_assignedToSectorId_fkey" FOREIGN KEY ("assignedToSectorId") REFERENCES "sectors" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "sub_tasks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "stepExecutionId" TEXT NOT NULL,
    "subTaskTemplateId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "executorId" TEXT,
    "comment" TEXT,
    "dueAt" DATETIME,
    "attachmentPath" TEXT,
    "attachmentName" TEXT,
    "attachmentSize" INTEGER,
    "attachmentMimeType" TEXT,
    "requireSignature" BOOLEAN NOT NULL DEFAULT false,
    "signatureType" TEXT,
    "signers" TEXT,
    "signatures" TEXT,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "sub_tasks_stepExecutionId_fkey" FOREIGN KEY ("stepExecutionId") REFERENCES "step_executions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "sub_tasks_subTaskTemplateId_fkey" FOREIGN KEY ("subTaskTemplateId") REFERENCES "sub_task_templates" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "sub_tasks_executorId_fkey" FOREIGN KEY ("executorId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_process_types" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isChildProcessOnly" BOOLEAN NOT NULL DEFAULT false,
    "allowSubProcesses" BOOLEAN NOT NULL DEFAULT true,
    "allowSubTasks" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "companyId" TEXT NOT NULL,
    "allowedChildProcessTypes" JSONB,
    CONSTRAINT "process_types_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_process_types" ("companyId", "createdAt", "description", "id", "isActive", "name", "updatedAt") SELECT "companyId", "createdAt", "description", "id", "isActive", "name", "updatedAt" FROM "process_types";
DROP TABLE "process_types";
ALTER TABLE "new_process_types" RENAME TO "process_types";
CREATE UNIQUE INDEX "process_types_companyId_name_key" ON "process_types"("companyId", "name");
CREATE TABLE "new_profiles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "companyId" TEXT,
    "parentProfileId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "profiles_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "profiles_parentProfileId_fkey" FOREIGN KEY ("parentProfileId") REFERENCES "profiles" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_profiles" ("companyId", "createdAt", "description", "id", "isDefault", "name", "updatedAt") SELECT "companyId", "createdAt", "description", "id", "isDefault", "name", "updatedAt" FROM "profiles";
DROP TABLE "profiles";
ALTER TABLE "new_profiles" RENAME TO "profiles";
CREATE INDEX "profiles_parentProfileId_idx" ON "profiles"("parentProfileId");
CREATE UNIQUE INDEX "profiles_companyId_name_key" ON "profiles"("companyId", "name");
CREATE TABLE "new_signature_records" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "signerName" TEXT NOT NULL,
    "signerCPF" TEXT,
    "signerEmail" TEXT NOT NULL,
    "signedAt" DATETIME,
    "signatureHash" TEXT,
    "documentHash" TEXT,
    "signatureToken" TEXT,
    "signatureReason" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "requirementId" TEXT NOT NULL,
    "attachmentId" TEXT NOT NULL,
    "signerId" TEXT NOT NULL,
    "stepExecutionId" TEXT NOT NULL,
    CONSTRAINT "signature_records_stepExecutionId_fkey" FOREIGN KEY ("stepExecutionId") REFERENCES "step_executions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "signature_records_signerId_fkey" FOREIGN KEY ("signerId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "signature_records_attachmentId_fkey" FOREIGN KEY ("attachmentId") REFERENCES "attachments" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "signature_records_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "signature_requirements" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_signature_records" ("attachmentId", "createdAt", "documentHash", "id", "ipAddress", "metadata", "requirementId", "signatureHash", "signatureReason", "signatureToken", "signedAt", "signerCPF", "signerEmail", "signerId", "signerName", "status", "stepExecutionId", "updatedAt", "userAgent") SELECT "attachmentId", "createdAt", "documentHash", "id", "ipAddress", "metadata", "requirementId", "signatureHash", "signatureReason", "signatureToken", "signedAt", "signerCPF", "signerEmail", "signerId", "signerName", "status", "stepExecutionId", "updatedAt", "userAgent" FROM "signature_records";
DROP TABLE "signature_records";
ALTER TABLE "new_signature_records" RENAME TO "signature_records";
CREATE TABLE "new_step_versions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "instructions" TEXT,
    "slaHours" INTEGER,
    "slaDays" INTEGER,
    "type" TEXT NOT NULL DEFAULT 'INPUT',
    "order" INTEGER NOT NULL,
    "allowAttachment" BOOLEAN NOT NULL DEFAULT false,
    "requiresSignature" BOOLEAN NOT NULL DEFAULT false,
    "requireAttachment" BOOLEAN NOT NULL DEFAULT false,
    "minAttachments" INTEGER,
    "maxAttachments" INTEGER,
    "allowedFileTypes" JSONB,
    "conditions" JSONB,
    "assignedToCreator" BOOLEAN NOT NULL DEFAULT false,
    "reuseData" JSONB,
    "reviewSettings" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "processTypeVersionId" TEXT NOT NULL,
    CONSTRAINT "step_versions_processTypeVersionId_fkey" FOREIGN KEY ("processTypeVersionId") REFERENCES "process_type_versions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_step_versions" ("allowAttachment", "allowedFileTypes", "assignedToCreator", "conditions", "createdAt", "description", "id", "instructions", "maxAttachments", "minAttachments", "name", "order", "processTypeVersionId", "requireAttachment", "requiresSignature", "reuseData", "slaDays", "slaHours", "type", "updatedAt") SELECT "allowAttachment", "allowedFileTypes", "assignedToCreator", "conditions", "createdAt", "description", "id", "instructions", "maxAttachments", "minAttachments", "name", "order", "processTypeVersionId", "requireAttachment", "requiresSignature", "reuseData", "slaDays", "slaHours", "type", "updatedAt" FROM "step_versions";
DROP TABLE "step_versions";
ALTER TABLE "new_step_versions" RENAME TO "step_versions";
CREATE UNIQUE INDEX "step_versions_processTypeVersionId_order_key" ON "step_versions"("processTypeVersionId", "order");
CREATE TABLE "new_users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "cpf" TEXT,
    "phone" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_users" ("cpf", "createdAt", "email", "id", "isActive", "name", "password", "updatedAt") SELECT "cpf", "createdAt", "email", "id", "isActive", "name", "password", "updatedAt" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- CreateIndex
CREATE INDEX "refresh_tokens_token_idx" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_companyId_idx" ON "audit_logs"("companyId");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_resource_idx" ON "audit_logs"("resource");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "child_process_instances_childProcessInstanceId_key" ON "child_process_instances"("childProcessInstanceId");

-- CreateIndex
CREATE UNIQUE INDEX "sub_task_templates_stepVersionId_order_key" ON "sub_task_templates"("stepVersionId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "signature_requirements_stepVersionId_attachmentId_order_key" ON "signature_requirements"("stepVersionId", "attachmentId", "order");

-- CreateIndex
CREATE INDEX "user_profiles_userId_companyId_idx" ON "user_profiles"("userId", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_userId_companyId_profileId_key" ON "user_profiles"("userId", "companyId", "profileId");
