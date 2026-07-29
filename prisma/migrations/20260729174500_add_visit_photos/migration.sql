-- CreateTable
CREATE TABLE "VisitPhoto" (
    "id" TEXT NOT NULL,
    "visitEventId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "pathname" TEXT NOT NULL,
    "blobUrl" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VisitPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VisitPhoto_pathname_key" ON "VisitPhoto"("pathname");

-- CreateIndex
CREATE INDEX "VisitPhoto_visitEventId_idx" ON "VisitPhoto"("visitEventId");

-- CreateIndex
CREATE INDEX "VisitPhoto_uploadedById_idx" ON "VisitPhoto"("uploadedById");

-- CreateIndex
CREATE INDEX "VisitPhoto_createdAt_idx" ON "VisitPhoto"("createdAt");

-- AddForeignKey
ALTER TABLE "VisitPhoto" ADD CONSTRAINT "VisitPhoto_visitEventId_fkey" FOREIGN KEY ("visitEventId") REFERENCES "VisitEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitPhoto" ADD CONSTRAINT "VisitPhoto_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
