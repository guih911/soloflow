/*
  Warnings:

  - You are about to drop the `Attachment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Company` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `FormFieldVersion` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProcessInstance` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProcessType` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProcessTypeVersion` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Sector` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `StepAssignment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `StepExecution` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `StepVersion` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UserCompany` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Attachment";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Company";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "FormFieldVersion";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ProcessInstance";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ProcessType";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ProcessTypeVersion";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Sector";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "StepAssignment";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "StepExecution";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "StepVersion";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "User";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "UserCompany";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "user_companies" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "lastAccessedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "sectorId" TEXT,
    CONSTRAINT "user_companies_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "user_companies_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "user_companies_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "sectors" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "sectors" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "companyId" TEXT NOT NULL,
    CONSTRAINT "sectors_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "process_types" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "companyId" TEXT NOT NULL,
    CONSTRAINT "process_types_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "process_type_versions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "version" INTEGER NOT NULL,
    "versionLabel" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDraft" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "publishedAt" DATETIME,
    "changelog" TEXT,
    "processTypeId" TEXT NOT NULL,
    "metadata" JSONB,
    CONSTRAINT "process_type_versions_processTypeId_fkey" FOREIGN KEY ("processTypeId") REFERENCES "process_types" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "form_field_versions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "placeholder" TEXT,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL,
    "options" JSONB,
    "validations" JSONB,
    "defaultValue" TEXT,
    "helpText" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processTypeVersionId" TEXT NOT NULL,
    CONSTRAINT "form_field_versions_processTypeVersionId_fkey" FOREIGN KEY ("processTypeVersionId") REFERENCES "process_type_versions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "step_versions" (
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
    "assignmentConditions" JSONB,
    "flowConditions" JSONB,
    "reuseData" JSONB,
    "actions" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "processTypeVersionId" TEXT NOT NULL,
    CONSTRAINT "step_versions_processTypeVersionId_fkey" FOREIGN KEY ("processTypeVersionId") REFERENCES "process_type_versions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "step_assignments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "conditions" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "stepVersionId" TEXT NOT NULL,
    "userId" TEXT,
    "sectorId" TEXT,
    "dynamicRole" TEXT,
    "conditionalConfig" JSONB,
    CONSTRAINT "step_assignments_stepVersionId_fkey" FOREIGN KEY ("stepVersionId") REFERENCES "step_versions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "step_assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "step_assignments_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "sectors" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "step_transitions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "description" TEXT,
    "conditionType" TEXT NOT NULL DEFAULT 'ALWAYS',
    "conditions" JSONB,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "actions" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "processTypeVersionId" TEXT NOT NULL,
    "sourceStepId" TEXT NOT NULL,
    "targetStepId" TEXT,
    CONSTRAINT "step_transitions_processTypeVersionId_fkey" FOREIGN KEY ("processTypeVersionId") REFERENCES "process_type_versions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "step_transitions_sourceStepId_fkey" FOREIGN KEY ("sourceStepId") REFERENCES "step_versions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "step_transitions_targetStepId_fkey" FOREIGN KEY ("targetStepId") REFERENCES "step_versions" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "process_instances" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "currentStepOrder" INTEGER NOT NULL DEFAULT 1,
    "formData" JSONB,
    "metadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "completedAt" DATETIME,
    "processTypeVersionId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    CONSTRAINT "process_instances_processTypeVersionId_fkey" FOREIGN KEY ("processTypeVersionId") REFERENCES "process_type_versions" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "process_instances_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "process_instances_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "step_executions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "action" TEXT,
    "dueAt" DATETIME,
    "comment" TEXT,
    "metadata" JSONB,
    "signedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "completedAt" DATETIME,
    "processInstanceId" TEXT NOT NULL,
    "stepVersionId" TEXT NOT NULL,
    "executorId" TEXT,
    "sectorId" TEXT,
    CONSTRAINT "step_executions_processInstanceId_fkey" FOREIGN KEY ("processInstanceId") REFERENCES "process_instances" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "step_executions_stepVersionId_fkey" FOREIGN KEY ("stepVersionId") REFERENCES "step_versions" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "step_executions_executorId_fkey" FOREIGN KEY ("executorId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "step_executions_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "sectors" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "attachments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "path" TEXT NOT NULL,
    "isSigned" BOOLEAN NOT NULL DEFAULT false,
    "signedPath" TEXT,
    "signatureData" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stepExecutionId" TEXT NOT NULL,
    CONSTRAINT "attachments_stepExecutionId_fkey" FOREIGN KEY ("stepExecutionId") REFERENCES "step_executions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "companies_name_key" ON "companies"("name");

-- CreateIndex
CREATE UNIQUE INDEX "companies_cnpj_key" ON "companies"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_companies_userId_companyId_key" ON "user_companies"("userId", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "sectors_companyId_name_key" ON "sectors"("companyId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "process_types_companyId_name_key" ON "process_types"("companyId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "process_type_versions_processTypeId_version_key" ON "process_type_versions"("processTypeId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "form_field_versions_processTypeVersionId_order_key" ON "form_field_versions"("processTypeVersionId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "step_versions_processTypeVersionId_order_key" ON "step_versions"("processTypeVersionId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "process_instances_code_key" ON "process_instances"("code");
