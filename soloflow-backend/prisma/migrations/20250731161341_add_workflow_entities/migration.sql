/*
  Warnings:

  - You are about to drop the `notifications` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `uploadedById` on the `attachments` table. All the data in the column will be lost.
  - You are about to drop the column `currentStepId` on the `process_instances` table. All the data in the column will be lost.
  - You are about to drop the column `formData` on the `process_instances` table. All the data in the column will be lost.
  - You are about to drop the column `priority` on the `process_instances` table. All the data in the column will be lost.
  - You are about to drop the column `customFields` on the `process_types` table. All the data in the column will be lost.
  - You are about to drop the column `executedAt` on the `step_executions` table. All the data in the column will be lost.
  - You are about to drop the column `signatureData` on the `step_executions` table. All the data in the column will be lost.
  - You are about to drop the column `signedPdfPath` on the `step_executions` table. All the data in the column will be lost.
  - Added the required column `code` to the `process_instances` table without a default value. This is not possible if the table is not empty.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "notifications";
PRAGMA foreign_keys=on;

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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stepExecutionId" TEXT NOT NULL,
    CONSTRAINT "attachments_stepExecutionId_fkey" FOREIGN KEY ("stepExecutionId") REFERENCES "step_executions" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_attachments" ("createdAt", "filename", "id", "mimeType", "originalName", "path", "size", "stepExecutionId") SELECT "createdAt", "filename", "id", "mimeType", "originalName", "path", "size", "stepExecutionId" FROM "attachments";
DROP TABLE "attachments";
ALTER TABLE "new_attachments" RENAME TO "attachments";
CREATE TABLE "new_process_instances" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "currentStepOrder" INTEGER NOT NULL DEFAULT 1,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "completedAt" DATETIME,
    "processTypeId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    CONSTRAINT "process_instances_processTypeId_fkey" FOREIGN KEY ("processTypeId") REFERENCES "process_types" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "process_instances_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_process_instances" ("completedAt", "createdAt", "createdById", "description", "id", "processTypeId", "status", "title", "updatedAt") SELECT "completedAt", "createdAt", "createdById", "description", "id", "processTypeId", "status", "title", "updatedAt" FROM "process_instances";
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
    CONSTRAINT "step_executions_processInstanceId_fkey" FOREIGN KEY ("processInstanceId") REFERENCES "process_instances" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "step_executions_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "steps" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "step_executions_executorId_fkey" FOREIGN KEY ("executorId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "step_executions_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "sectors" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_step_executions" ("action", "comment", "createdAt", "executorId", "id", "processInstanceId", "sectorId", "signedAt", "status", "stepId", "updatedAt") SELECT "action", "comment", "createdAt", "executorId", "id", "processInstanceId", "sectorId", "signedAt", "status", "stepId", "updatedAt" FROM "step_executions";
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
    "actions" TEXT NOT NULL DEFAULT '[]',
    "conditions" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "processTypeId" TEXT NOT NULL,
    "assignedToUserId" TEXT,
    "assignedToSectorId" TEXT,
    CONSTRAINT "steps_processTypeId_fkey" FOREIGN KEY ("processTypeId") REFERENCES "process_types" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "steps_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "steps_assignedToSectorId_fkey" FOREIGN KEY ("assignedToSectorId") REFERENCES "sectors" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_steps" ("actions", "allowAttachment", "assignedToSectorId", "assignedToUserId", "conditions", "createdAt", "description", "id", "name", "order", "processTypeId", "requiresSignature", "type", "updatedAt") SELECT coalesce("actions", '[]') AS "actions", "allowAttachment", "assignedToSectorId", "assignedToUserId", "conditions", "createdAt", "description", "id", "name", "order", "processTypeId", "requiresSignature", "type", "updatedAt" FROM "steps";
DROP TABLE "steps";
ALTER TABLE "new_steps" RENAME TO "steps";
CREATE UNIQUE INDEX "steps_processTypeId_order_key" ON "steps"("processTypeId", "order");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
