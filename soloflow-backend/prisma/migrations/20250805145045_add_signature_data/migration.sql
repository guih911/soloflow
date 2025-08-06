/*
  Warnings:

  - You are about to drop the column `companyId` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `role` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `sectorId` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "process_instances" ADD COLUMN "companyId" TEXT;

-- CreateTable
CREATE TABLE "user_companies" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "sectorId" TEXT,
    CONSTRAINT "user_companies_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "user_companies_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "user_companies_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "sectors" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_attachments" (
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
INSERT INTO "new_attachments" ("createdAt", "filename", "id", "isSigned", "mimeType", "originalName", "path", "signedPath", "size", "stepExecutionId") SELECT "createdAt", "filename", "id", "isSigned", "mimeType", "originalName", "path", "signedPath", "size", "stepExecutionId" FROM "attachments";
DROP TABLE "attachments";
ALTER TABLE "new_attachments" RENAME TO "attachments";
CREATE TABLE "new_process_types" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "companyId" TEXT NOT NULL,
    CONSTRAINT "process_types_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE CASCADE ON UPDATE CASCADE
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
    CONSTRAINT "sectors_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE CASCADE ON UPDATE CASCADE
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
    "metadata" TEXT,
    "signedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "completedAt" DATETIME,
    "processInstanceId" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "executorId" TEXT,
    "sectorId" TEXT,
    CONSTRAINT "step_executions_processInstanceId_fkey" FOREIGN KEY ("processInstanceId") REFERENCES "process_instances" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
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
    "allowedFileTypes" TEXT,
    "actions" TEXT NOT NULL DEFAULT '[]',
    "conditions" TEXT,
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
CREATE TABLE "new_users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_users" ("createdAt", "email", "id", "isActive", "name", "password", "updatedAt") SELECT "createdAt", "email", "id", "isActive", "name", "password", "updatedAt" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "user_companies_userId_companyId_key" ON "user_companies"("userId", "companyId");
