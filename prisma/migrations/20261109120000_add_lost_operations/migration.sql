-- CreateTable
CREATE TABLE "LostOperation" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "agency" TEXT NOT NULL,
    "competitorBank" TEXT NOT NULL,
    "rate" DECIMAL(7,4) NOT NULL,
    "operationType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LostOperation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LostOperation_authorId_createdAt_idx" ON "LostOperation"("authorId", "createdAt");

-- CreateIndex
CREATE INDEX "LostOperation_createdAt_idx" ON "LostOperation"("createdAt");

-- AddForeignKey
ALTER TABLE "LostOperation" ADD CONSTRAINT "LostOperation_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
