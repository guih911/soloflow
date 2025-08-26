/*
  Warnings:

  - You are about to drop the `attachments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `companies` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `form_field_versions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `process_instances` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `process_type_versions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `process_types` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `sectors` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `step_assignments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `step_executions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `step_transitions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `step_versions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user_companies` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `users` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "attachments";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "companies";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "form_field_versions";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "process_instances";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "process_type_versions";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "process_types";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "sectors";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "step_assignments";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "step_executions";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "step_transitions";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "step_versions";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "user_companies";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "users";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Company" (
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
CREATE TABLE "UserCompany" (
    "userId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "sectorId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserCompany_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "UserCompany_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "UserCompany_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "Sector" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Sector" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "companyId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Sector_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProcessType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "companyId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProcessType_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProcessTypeVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "processTypeId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "versionLabel" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "isDraft" BOOLEAN NOT NULL DEFAULT true,
    "publishedAt" DATETIME,
    "changelog" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProcessTypeVersion_processTypeId_fkey" FOREIGN KEY ("processTypeId") REFERENCES "ProcessType" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StepVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "processTypeVersionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "instructions" TEXT,
    "type" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "slaHours" INTEGER,
    "slaDays" INTEGER,
    "allowAttachment" BOOLEAN NOT NULL DEFAULT false,
    "requireAttachment" BOOLEAN NOT NULL DEFAULT false,
    "minAttachments" INTEGER,
    "maxAttachments" INTEGER,
    "allowedFileTypes" TEXT,
    "requiresSignature" BOOLEAN NOT NULL DEFAULT false,
    "conditions" JSONB,
    "actions" TEXT,
    "assignedToCreator" BOOLEAN DEFAULT false,
    "assignmentConditions" JSONB,
    "flowConditions" JSONB,
    "reuseData" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StepVersion_processTypeVersionId_fkey" FOREIGN KEY ("processTypeVersionId") REFERENCES "ProcessTypeVersion" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FormFieldVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "processTypeVersionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "placeholder" TEXT,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL,
    "options" TEXT,
    "validations" TEXT,
    "defaultValue" TEXT,
    "helpText" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FormFieldVersion_processTypeVersionId_fkey" FOREIGN KEY ("processTypeVersionId") REFERENCES "ProcessTypeVersion" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StepAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "stepVersionId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "userId" TEXT,
    "sectorId" TEXT,
    "priority" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "dynamicRole" TEXT,
    "conditionalConfig" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StepAssignment_stepVersionId_fkey" FOREIGN KEY ("stepVersionId") REFERENCES "StepVersion" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StepAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "StepAssignment_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "Sector" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProcessInstance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "processTypeVersionId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "formData" JSONB,
    "metadata" JSONB,
    "currentStepOrder" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProcessInstance_processTypeVersionId_fkey" FOREIGN KEY ("processTypeVersionId") REFERENCES "ProcessTypeVersion" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ProcessInstance_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ProcessInstance_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StepExecution" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "processInstanceId" TEXT NOT NULL,
    "stepVersionId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "action" TEXT,
    "comment" TEXT,
    "metadata" JSONB,
    "executorId" TEXT,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "dueAt" DATETIME,
    "signedAt" DATETIME,
    CONSTRAINT "StepExecution_processInstanceId_fkey" FOREIGN KEY ("processInstanceId") REFERENCES "ProcessInstance" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StepExecution_stepVersionId_fkey" FOREIGN KEY ("stepVersionId") REFERENCES "StepVersion" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StepExecution_executorId_fkey" FOREIGN KEY ("executorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "stepExecutionId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "path" TEXT NOT NULL,
    "isSigned" BOOLEAN NOT NULL DEFAULT false,
    "signedPath" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Attachment_stepExecutionId_fkey" FOREIGN KEY ("stepExecutionId") REFERENCES "StepExecution" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Company_name_key" ON "Company"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Company_cnpj_key" ON "Company"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "UserCompany_userId_companyId_key" ON "UserCompany"("userId", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Sector_companyId_name_key" ON "Sector"("companyId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ProcessType_companyId_name_key" ON "ProcessType"("companyId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ProcessTypeVersion_processTypeId_version_key" ON "ProcessTypeVersion"("processTypeId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "StepVersion_processTypeVersionId_order_key" ON "StepVersion"("processTypeVersionId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "FormFieldVersion_processTypeVersionId_order_key" ON "FormFieldVersion"("processTypeVersionId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "ProcessInstance_code_key" ON "ProcessInstance"("code");
