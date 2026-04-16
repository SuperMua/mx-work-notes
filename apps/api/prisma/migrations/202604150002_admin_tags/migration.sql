-- CreateTable
CREATE TABLE "TagRecord" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TagRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TagRecord_workspaceId_name_key" ON "TagRecord"("workspaceId", "name");

-- CreateIndex
CREATE INDEX "TagRecord_workspaceId_usageCount_idx" ON "TagRecord"("workspaceId", "usageCount");

-- AddForeignKey
ALTER TABLE "TagRecord" ADD CONSTRAINT "TagRecord_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
