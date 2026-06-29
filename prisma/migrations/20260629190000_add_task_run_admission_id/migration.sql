-- Add a durable admission identifier so API routes can persist ownership
-- before starting a Trigger.dev run, then attach the final run id afterward.
ALTER TABLE "TaskRun" ADD COLUMN "admissionId" TEXT;

UPDATE "TaskRun"
SET "admissionId" = "runId"
WHERE "admissionId" IS NULL;

ALTER TABLE "TaskRun" ALTER COLUMN "admissionId" SET NOT NULL;
ALTER TABLE "TaskRun" ALTER COLUMN "runId" DROP NOT NULL;

CREATE UNIQUE INDEX "TaskRun_admissionId_key" ON "TaskRun"("admissionId");
