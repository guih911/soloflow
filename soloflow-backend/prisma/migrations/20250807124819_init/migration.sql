/*
  Warnings:

  - You are about to drop the column `stepId` on the `form_fields` table. All the data in the column will be lost.
  - You are about to drop the column `finishedAt` on the `step_executions` table. All the data in the column will be lost.
  - You are about to drop the column `processId` on the `step_executions` table. All the data in the column will be lost.
  - You are about to drop the column `startedAt` on the `step_executions` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `step_executions` table. All the data in the column will be lost.
  - You are about to drop the column `assignedToId` on the `steps` table. All the data in the column will be lost.
  - You are about to drop the column `isFinalStep` on the `steps` table. All the data in the column will be lost.
  - You are about to drop the column `sectorId` on the `steps` table. All the data in the column will be lost.
  - Added the required column `order` to the `form_fields` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `form_fields` table without a default value. This is not possible if the table is not empty.
  - Added the required column `code` to the `process_instances` table without a default value. This is not possible if the table is not empty.
  - Added the required column `processInstanceId` to the `step_executions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `steps` table without a default value. This is not possible if the table is not empty.

*/
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

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_form_fields" (
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
    "updatedAt" DATETIME NOT NULL,
    "processTypeId" TEXT NOT NULL,
    CONSTRAINT "form_fields_processTypeId_fkey" FOREIGN KEY ("processTypeId") REFERENCES "process_types" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_form_fields" ("id", "label", "name", "processTypeId", "required", "type") SELECT "id", "label", "name", "processTypeId", "required", "type" FROM "form_fields";
DROP TABLE "form_fields";
ALTER TABLE "new_form_fields" RENAME TO "form_fields";
CREATE UNIQUE INDEX "form_fields_processTypeId_order_key" ON "form_fields"("processTypeId", "order");
CREATE TABLE "new_process_instances" (
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
    "processTypeId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    CONSTRAINT "process_instances_processTypeId_fkey" FOREIGN KEY ("processTypeId") REFERENCES "process_types" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "process_instances_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "process_instances_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_process_instances" ("companyId", "createdAt", "createdById", "description", "id", "processTypeId", "status", "title", "updatedAt") SELECT "companyId", "createdAt", "createdById", "description", "id", "processTypeId", "status", "title", "updatedAt" FROM "process_instances";
DROP TABLE "process_instances";
ALTER TABLE "new_process_instances" RENAME TO "process_instances";
CREATE UNIQUE INDEX "process_instances_code_key" ON "process_instances"("code");
CREATE TABLE "new_process_types" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "companyId" TEXT NOT NULL,
    CONSTRAINT "process_types_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_process_types" ("companyId", "createdAt", "description", "id", "name", "updatedAt") SELECT "companyId", "createdAt", "description", "id", "name", "updatedAt" FROM "process_types";
DROP TABLE "process_types";
ALTER TABLE "new_process_types" RENAME TO "process_types";
CREATE UNIQUE INDEX "process_types_companyId_name_key" ON "process_types"("companyId", "name");
CREATE TABLE "new_sectors" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "companyId" TEXT NOT NULL,
    CONSTRAINT "sectors_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_sectors" ("companyId", "createdAt", "id", "name", "updatedAt") SELECT "companyId", "createdAt", "id", "name", "updatedAt" FROM "sectors";
DROP TABLE "sectors";
ALTER TABLE "new_sectors" RENAME TO "sectors";
CREATE UNIQUE INDEX "sectors_companyId_name_key" ON "sectors"("companyId", "name");
CREATE TABLE "new_step_executions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "action" TEXT,
    "comment" TEXT,
    "metadata" JSONB,
    "signedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "completedAt" DATETIME,
    "processInstanceId" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "executorId" TEXT,
    "sectorId" TEXT,
    CONSTRAINT "step_executions_processInstanceId_fkey" FOREIGN KEY ("processInstanceId") REFERENCES "process_instances" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "step_executions_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "steps" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "step_executions_executorId_fkey" FOREIGN KEY ("executorId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "step_executions_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "sectors" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_step_executions" ("comment", "createdAt", "id", "status", "stepId", "updatedAt") SELECT "comment", "createdAt", "id", "status", "stepId", "updatedAt" FROM "step_executions";
DROP TABLE "step_executions";
ALTER TABLE "new_step_executions" RENAME TO "step_executions";
CREATE TABLE "new_steps" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'INPUT',
    "order" INTEGER NOT NULL,
    "allowAttachment" BOOLEAN NOT NULL DEFAULT false,
    "requiresSignature" BOOLEAN NOT NULL DEFAULT false,
    "requireAttachment" BOOLEAN NOT NULL DEFAULT false,
    "minAttachments" INTEGER,
    "maxAttachments" INTEGER,
    "allowedFileTypes" JSONB,
    "actions" JSONB NOT NULL DEFAULT [],
    "conditions" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "processTypeId" TEXT NOT NULL,
    "assignedToUserId" TEXT,
    "assignedToSectorId" TEXT,
    CONSTRAINT "steps_processTypeId_fkey" FOREIGN KEY ("processTypeId") REFERENCES "process_types" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "steps_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "steps_assignedToSectorId_fkey" FOREIGN KEY ("assignedToSectorId") REFERENCES "sectors" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_steps" ("id", "name", "order", "processTypeId", "type") SELECT "id", "name", "order", "processTypeId", "type" FROM "steps";
DROP TABLE "steps";
ALTER TABLE "new_steps" RENAME TO "steps";
CREATE UNIQUE INDEX "steps_processTypeId_order_key" ON "steps"("processTypeId", "order");
CREATE TABLE "new_user_companies" (
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
INSERT INTO "new_user_companies" ("companyId", "createdAt", "id", "isDefault", "lastAccessedAt", "role", "updatedAt", "userId") SELECT "companyId", "createdAt", "id", "isDefault", "lastAccessedAt", "role", "updatedAt", "userId" FROM "user_companies";
DROP TABLE "user_companies";
ALTER TABLE "new_user_companies" RENAME TO "user_companies";
CREATE UNIQUE INDEX "user_companies_userId_companyId_key" ON "user_companies"("userId", "companyId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
