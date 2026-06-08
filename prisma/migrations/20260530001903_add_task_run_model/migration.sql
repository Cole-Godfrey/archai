-- CreateTable
CREATE TABLE "TaskRun" (
    "runId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "TaskRun_runId_key" ON "TaskRun"("runId");

-- CreateIndex
CREATE INDEX "TaskRun_userId_projectId_idx" ON "TaskRun"("userId", "projectId");
