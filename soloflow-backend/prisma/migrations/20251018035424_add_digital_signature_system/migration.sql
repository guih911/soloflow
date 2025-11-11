-- CreateTable
CREATE TABLE "signature_requirements" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "order" INTEGER NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'SEQUENTIAL',
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "stepVersionId" TEXT NOT NULL,
    "attachmentId" TEXT,
    "userId" TEXT,
    "sectorId" TEXT,
    CONSTRAINT "signature_requirements_stepVersionId_fkey" FOREIGN KEY ("stepVersionId") REFERENCES "step_versions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "signature_requirements_attachmentId_fkey" FOREIGN KEY ("attachmentId") REFERENCES "attachments" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "signature_requirements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "signature_requirements_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "sectors" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "signature_records" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "certificateType" TEXT NOT NULL DEFAULT 'A1',
    "certificateSubject" TEXT,
    "certificateIssuer" TEXT,
    "certificateSerialNumber" TEXT,
    "certificateValidFrom" DATETIME,
    "certificateValidTo" DATETIME,
    "certificateCPF" TEXT,
    "certificateCNPJ" TEXT,
    "signedAt" DATETIME,
    "signatureHash" TEXT,
    "signatureAlgorithm" TEXT,
    "signatureLocation" TEXT,
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

-- CreateTable
CREATE TABLE "user_certificates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'A1',
    "certificateData" TEXT NOT NULL,
    "certificatePassword" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "issuer" TEXT NOT NULL,
    "serialNumber" TEXT NOT NULL,
    "validFrom" DATETIME NOT NULL,
    "validTo" DATETIME NOT NULL,
    "cpf" TEXT,
    "cnpj" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "user_certificates_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "signature_requirements_stepVersionId_order_key" ON "signature_requirements"("stepVersionId", "order");
