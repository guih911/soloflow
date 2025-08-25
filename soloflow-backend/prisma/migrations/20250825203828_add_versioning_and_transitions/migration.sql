/*
  Warnings:

  - You are about to drop the `form_fields` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `steps` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `processTypeId` on the `process_instances` table. All the data in the column will be lost.
  - You are about to drop the column `stepId` on the `step_executions` table. All the data in the column will be lost.
  - Added the required column `processTypeVersionId` to the `process_instances` table without a default value. This is not possible if the table is not empty.
  - Added the required column `stepVersionId` to the `step_executions` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "form_fields_processTypeId_order_key";

-- DropIndex
DROP INDEX "steps_processTypeId_order_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "form_fields";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "steps";
PRAGMA foreign_keys=on;

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
    "type" TEXT NOT NULL DEFAULT 'INPUT',
    "order" INTEGER NOT NULL,
    "allowAttachment" BOOLEAN NOT NULL DEFAULT false,
    "requiresSignature" BOOLEAN NOT NULL DEFAULT false,
    "requireAttachment" BOOLEAN NOT NULL DEFAULT false,
    "minAttachments" INTEGER,
    "maxAttachments" INTEGER,
    "allowedFileTypes" JSONB,
    "conditions" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
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

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    "processTypeVersionId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    CONSTRAINT "process_instances_processTypeVersionId_fkey" FOREIGN KEY ("processTypeVersionId") REFERENCES "process_type_versions" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "process_instances_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "process_instances_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_process_instances" ("code", "companyId", "completedAt", "createdAt", "createdById", "currentStepOrder", "description", "formData", "id", "metadata", "status", "title", "updatedAt") SELECT "code", "companyId", "completedAt", "createdAt", "createdById", "currentStepOrder", "description", "formData", "id", "metadata", "status", "title", "updatedAt" FROM "process_instances";
DROP TABLE "process_instances";
ALTER TABLE "new_process_instances" RENAME TO "process_instances";
CREATE UNIQUE INDEX "process_instances_code_key" ON "process_instances"("code");
CREATE TABLE "new_step_executions" (
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
INSERT INTO "new_step_executions" ("action", "comment", "completedAt", "createdAt", "dueAt", "executorId", "id", "metadata", "processInstanceId", "sectorId", "signedAt", "status", "updatedAt") SELECT "action", "comment", "completedAt", "createdAt", "dueAt", "executorId", "id", "metadata", "processInstanceId", "sectorId", "signedAt", "status", "updatedAt" FROM "step_executions";
DROP TABLE "step_executions";
ALTER TABLE "new_step_executions" RENAME TO "step_executions";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "process_type_versions_processTypeId_version_key" ON "process_type_versions"("processTypeId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "form_field_versions_processTypeVersionId_order_key" ON "form_field_versions"("processTypeVersionId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "step_versions_processTypeVersionId_order_key" ON "step_versions"("processTypeVersionId", "order");
