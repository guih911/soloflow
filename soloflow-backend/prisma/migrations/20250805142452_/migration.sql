-- AlterTable
ALTER TABLE "process_instances" ADD COLUMN "formData" TEXT;

-- CreateTable
CREATE TABLE "form_fields" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "processTypeId" TEXT NOT NULL,
    CONSTRAINT "form_fields_processTypeId_fkey" FOREIGN KEY ("processTypeId") REFERENCES "process_types" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    "requireAttachment" BOOLEAN NOT NULL DEFAULT false,
    "minAttachments" INTEGER,
    "maxAttachments" INTEGER,
    "allowedFileTypes" TEXT,
    "processTypeId" TEXT NOT NULL,
    "assignedToUserId" TEXT,
    "assignedToSectorId" TEXT,
    CONSTRAINT "steps_processTypeId_fkey" FOREIGN KEY ("processTypeId") REFERENCES "process_types" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "steps_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "steps_assignedToSectorId_fkey" FOREIGN KEY ("assignedToSectorId") REFERENCES "sectors" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_steps" ("actions", "allowAttachment", "assignedToSectorId", "assignedToUserId", "conditions", "createdAt", "description", "id", "name", "order", "processTypeId", "requiresSignature", "type", "updatedAt") SELECT "actions", "allowAttachment", "assignedToSectorId", "assignedToUserId", "conditions", "createdAt", "description", "id", "name", "order", "processTypeId", "requiresSignature", "type", "updatedAt" FROM "steps";
DROP TABLE "steps";
ALTER TABLE "new_steps" RENAME TO "steps";
CREATE UNIQUE INDEX "steps_processTypeId_order_key" ON "steps"("processTypeId", "order");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "form_fields_processTypeId_order_key" ON "form_fields"("processTypeId", "order");
