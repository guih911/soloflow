/*
  Warnings:

  - You are about to alter the column `options` on the `form_fields` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - You are about to alter the column `validations` on the `form_fields` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - You are about to alter the column `formData` on the `process_instances` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - You are about to alter the column `metadata` on the `process_instances` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - You are about to alter the column `metadata` on the `step_executions` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - You are about to alter the column `actions` on the `steps` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - You are about to alter the column `allowedFileTypes` on the `steps` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - You are about to alter the column `conditions` on the `steps` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - Made the column `companyId` on table `process_instances` required. This step will fail if there are existing NULL values in that column.

*/
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
INSERT INTO "new_form_fields" ("createdAt", "defaultValue", "helpText", "id", "label", "name", "options", "order", "placeholder", "processTypeId", "required", "type", "updatedAt", "validations") SELECT "createdAt", "defaultValue", "helpText", "id", "label", "name", "options", "order", "placeholder", "processTypeId", "required", "type", "updatedAt", "validations" FROM "form_fields";
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
INSERT INTO "new_process_instances" ("code", "companyId", "completedAt", "createdAt", "createdById", "currentStepOrder", "description", "formData", "id", "metadata", "processTypeId", "status", "title", "updatedAt") SELECT "code", "companyId", "completedAt", "createdAt", "createdById", "currentStepOrder", "description", "formData", "id", "metadata", "processTypeId", "status", "title", "updatedAt" FROM "process_instances";
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
INSERT INTO "new_process_types" ("companyId", "createdAt", "description", "id", "isActive", "name", "updatedAt") SELECT "companyId", "createdAt", "description", "id", "isActive", "name", "updatedAt" FROM "process_types";
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
INSERT INTO "new_sectors" ("companyId", "createdAt", "description", "id", "isActive", "name", "updatedAt") SELECT "companyId", "createdAt", "description", "id", "isActive", "name", "updatedAt" FROM "sectors";
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
INSERT INTO "new_step_executions" ("action", "comment", "completedAt", "createdAt", "executorId", "id", "metadata", "processInstanceId", "sectorId", "signedAt", "status", "stepId", "updatedAt") SELECT "action", "comment", "completedAt", "createdAt", "executorId", "id", "metadata", "processInstanceId", "sectorId", "signedAt", "status", "stepId", "updatedAt" FROM "step_executions";
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
INSERT INTO "new_steps" ("actions", "allowAttachment", "allowedFileTypes", "assignedToSectorId", "assignedToUserId", "conditions", "createdAt", "description", "id", "maxAttachments", "minAttachments", "name", "order", "processTypeId", "requireAttachment", "requiresSignature", "type", "updatedAt") SELECT "actions", "allowAttachment", "allowedFileTypes", "assignedToSectorId", "assignedToUserId", "conditions", "createdAt", "description", "id", "maxAttachments", "minAttachments", "name", "order", "processTypeId", "requireAttachment", "requiresSignature", "type", "updatedAt" FROM "steps";
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
INSERT INTO "new_user_companies" ("companyId", "createdAt", "id", "isDefault", "role", "sectorId", "updatedAt", "userId") SELECT "companyId", "createdAt", "id", "isDefault", "role", "sectorId", "updatedAt", "userId" FROM "user_companies";
DROP TABLE "user_companies";
ALTER TABLE "new_user_companies" RENAME TO "user_companies";
CREATE UNIQUE INDEX "user_companies_userId_companyId_key" ON "user_companies"("userId", "companyId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
