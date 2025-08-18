-- AddColumn
ALTER TABLE "steps" ADD COLUMN "instructions" TEXT;
ALTER TABLE "steps" ADD COLUMN "slaHours" INTEGER;

-- AddColumn
ALTER TABLE "step_executions" ADD COLUMN "dueAt" DATETIME;