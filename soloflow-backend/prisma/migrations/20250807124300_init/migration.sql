/*
  Warnings:

  - You are about to drop the `attachments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `createdAt` on the `form_fields` table. All the data in the column will be lost.
  - You are about to drop the column `defaultValue` on the `form_fields` table. All the data in the column will be lost.
  - You are about to drop the column `helpText` on the `form_fields` table. All the data in the column will be lost.
  - You are about to drop the column `options` on the `form_fields` table. All the data in the column will be lost.
  - You are about to drop the column `order` on the `form_fields` table. All the data in the column will be lost.
  - You are about to drop the column `placeholder` on the `form_fields` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `form_fields` table. All the data in the column will be lost.
  - You are about to drop the column `validations` on the `form_fields` table. All the data in the column will be lost.
  - You are about to drop the column `code` on the `process_instances` table. All the data in the column will be lost.
  - You are about to drop the column `completedAt` on the `process_instances` table. All the data in the column will be lost.
  - You are about to drop the column `currentStepOrder` on the `process_instances` table. All the data in the column will be lost.
  - You are about to drop the column `formData` on the `process_instances` table. All the data in the column will be lost.
  - You are about to drop the column `metadata` on the `process_instances` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `process_types` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `sectors` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `sectors` table. All the data in the column will be lost.
  - You are about to drop the column `action` on the `step_executions` table. All the data in the column will be lost.
  - You are about to drop the column `completedAt` on the `step_executions` table. All the data in the column will be lost.
  - You are about to drop the column `executorId` on the `step_executions` table. All the data in the column will be lost.
  - You are about to drop the column `metadata` on the `step_executions` table. All the data in the column will be lost.
  - You are about to drop the column `processInstanceId` on the `step_executions` table. All the data in the column will be lost.
  - You are about to drop the column `sectorId` on the `step_executions` table. All the data in the column will be lost.
  - You are about to drop the column `signedAt` on the `step_executions` table. All the data in the column will be lost.
  - You are about to drop the column `actions` on the `steps` table. All the data in the column will be lost.
  - You are about to drop the column `allowAttachment` on the `steps` table. All the data in the column will be lost.
  - You are about to drop the column `allowedFileTypes` on the `steps` table. All the data in the column will be lost.
  - You are about to drop the column `assignedToSectorId` on the `steps` table. All the data in the column will be lost.
  - You are about to drop the column `assignedToUserId` on the `steps` table. All the data in the column will be lost.
  - You are about to drop the column `conditions` on the `steps` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `steps` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `steps` table. All the data in the column will be lost.
  - You are about to drop the column `maxAttachments` on the `steps` table. All the data in the column will be lost.
  - You are about to drop the column `minAttachments` on the `steps` table. All the data in the column will be lost.
  - You are about to drop the column `requireAttachment` on the `steps` table. All the data in the column will be lost.
  - You are about to drop the column `requiresSignature` on the `steps` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `steps` table. All the data in the column will be lost.
  - You are about to drop the column `sectorId` on the `user_companies` table. All the data in the column will be lost.
  - Added the required column `stepId` to the `form_fields` table without a default value. This is not possible if the table is not empty.
  - Made the column `title` on table `process_instances` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `processId` to the `step_executions` table without a default value. This is not possible if the table is not empty.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "attachments";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_form_fields" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "stepId" TEXT NOT NULL,
    "processTypeId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "form_fields_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "steps" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "form_fields_processTypeId_fkey" FOREIGN KEY ("processTypeId") REFERENCES "process_types" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_form_fields" ("id", "label", "name", "processTypeId", "required", "type") SELECT "id", "label", "name", "processTypeId", "required", "type" FROM "form_fields";
DROP TABLE "form_fields";
ALTER TABLE "new_form_fields" RENAME TO "form_fields";
CREATE TABLE "new_process_instances" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "processTypeId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "process_instances_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "process_instances_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "process_instances_processTypeId_fkey" FOREIGN KEY ("processTypeId") REFERENCES "process_types" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_process_instances" ("companyId", "createdAt", "createdById", "description", "id", "processTypeId", "status", "title", "updatedAt") SELECT "companyId", "createdAt", "createdById", "description", "id", "processTypeId", "status", "title", "updatedAt" FROM "process_instances";
DROP TABLE "process_instances";
ALTER TABLE "new_process_instances" RENAME TO "process_instances";
CREATE TABLE "new_process_types" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "companyId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "process_types_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_process_types" ("companyId", "createdAt", "description", "id", "name", "updatedAt") SELECT "companyId", "createdAt", "description", "id", "name", "updatedAt" FROM "process_types";
DROP TABLE "process_types";
ALTER TABLE "new_process_types" RENAME TO "process_types";
CREATE TABLE "new_sectors" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "sectors_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_sectors" ("companyId", "createdAt", "id", "name", "updatedAt") SELECT "companyId", "createdAt", "id", "name", "updatedAt" FROM "sectors";
DROP TABLE "sectors";
ALTER TABLE "new_sectors" RENAME TO "sectors";
CREATE TABLE "new_step_executions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "stepId" TEXT NOT NULL,
    "userId" TEXT,
    "processId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "startedAt" DATETIME,
    "finishedAt" DATETIME,
    "comment" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "step_executions_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "steps" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "step_executions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "step_executions_processId_fkey" FOREIGN KEY ("processId") REFERENCES "process_instances" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_step_executions" ("comment", "createdAt", "id", "status", "stepId", "updatedAt") SELECT "comment", "createdAt", "id", "status", "stepId", "updatedAt" FROM "step_executions";
DROP TABLE "step_executions";
ALTER TABLE "new_step_executions" RENAME TO "step_executions";
CREATE TABLE "new_steps" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "processTypeId" TEXT NOT NULL,
    "sectorId" TEXT,
    "assignedToId" TEXT,
    "isFinalStep" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "steps_processTypeId_fkey" FOREIGN KEY ("processTypeId") REFERENCES "process_types" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "steps_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "sectors" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "steps_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_steps" ("id", "name", "order", "processTypeId", "type") SELECT "id", "name", "order", "processTypeId", "type" FROM "steps";
DROP TABLE "steps";
ALTER TABLE "new_steps" RENAME TO "steps";
CREATE TABLE "new_user_companies" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "lastAccessedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "user_companies_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "user_companies_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_user_companies" ("companyId", "createdAt", "id", "isDefault", "lastAccessedAt", "role", "updatedAt", "userId") SELECT "companyId", "createdAt", "id", "isDefault", "lastAccessedAt", "role", "updatedAt", "userId" FROM "user_companies";
DROP TABLE "user_companies";
ALTER TABLE "new_user_companies" RENAME TO "user_companies";
CREATE UNIQUE INDEX "user_companies_userId_companyId_key" ON "user_companies"("userId", "companyId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
