/*
  Warnings:

  - You are about to drop the `user_certificates` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `certificateCNPJ` on the `signature_records` table. All the data in the column will be lost.
  - You are about to drop the column `certificateCPF` on the `signature_records` table. All the data in the column will be lost.
  - You are about to drop the column `certificateIssuer` on the `signature_records` table. All the data in the column will be lost.
  - You are about to drop the column `certificateSerialNumber` on the `signature_records` table. All the data in the column will be lost.
  - You are about to drop the column `certificateSubject` on the `signature_records` table. All the data in the column will be lost.
  - You are about to drop the column `certificateType` on the `signature_records` table. All the data in the column will be lost.
  - You are about to drop the column `certificateValidFrom` on the `signature_records` table. All the data in the column will be lost.
  - You are about to drop the column `certificateValidTo` on the `signature_records` table. All the data in the column will be lost.
  - You are about to drop the column `signatureAlgorithm` on the `signature_records` table. All the data in the column will be lost.
  - You are about to drop the column `signatureLocation` on the `signature_records` table. All the data in the column will be lost.
  - Added the required column `signerEmail` to the `signature_records` table without a default value. This is not possible if the table is not empty.
  - Added the required column `signerName` to the `signature_records` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "users" ADD COLUMN "cpf" TEXT;
ALTER TABLE "users" ADD COLUMN "phone" TEXT;
ALTER TABLE "users" ADD COLUMN "rg" TEXT;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "user_certificates";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    "geolocation" TEXT,
    "metadata" JSONB,
    "rejectionReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "requirementId" TEXT NOT NULL,
    "attachmentId" TEXT NOT NULL,
    "signerId" TEXT NOT NULL,
    "stepExecutionId" TEXT NOT NULL,
    CONSTRAINT "signature_records_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "signature_requirements" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "signature_records_attachmentId_fkey" FOREIGN KEY ("attachmentId") REFERENCES "attachments" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "signature_records_signerId_fkey" FOREIGN KEY ("signerId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "signature_records_stepExecutionId_fkey" FOREIGN KEY ("stepExecutionId") REFERENCES "step_executions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_signature_records" ("attachmentId", "createdAt", "geolocation", "id", "ipAddress", "metadata", "rejectionReason", "requirementId", "signatureHash", "signatureReason", "signedAt", "signerId", "status", "stepExecutionId", "updatedAt", "userAgent") SELECT "attachmentId", "createdAt", "geolocation", "id", "ipAddress", "metadata", "rejectionReason", "requirementId", "signatureHash", "signatureReason", "signedAt", "signerId", "status", "stepExecutionId", "updatedAt", "userAgent" FROM "signature_records";
DROP TABLE "signature_records";
ALTER TABLE "new_signature_records" RENAME TO "signature_records";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
