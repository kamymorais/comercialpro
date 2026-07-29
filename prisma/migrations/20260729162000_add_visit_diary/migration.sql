-- CreateEnum
CREATE TYPE "VisitStatus" AS ENUM ('ASSIGNED', 'SUBMITTED', 'REVISION_REQUESTED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "VisitEventType" AS ENUM ('ASSIGNED', 'CONSULTANT_SUBMITTED', 'REVISION_REQUESTED', 'COMPLETED');

-- CreateTable
CREATE TABLE "VisitAssignment" (
    "id" TEXT NOT NULL,
    "consultantId" TEXT NOT NULL,
    "managerId" TEXT NOT NULL,
    "agreementCode" TEXT NOT NULL,
    "agreementName" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "unitName" TEXT NOT NULL,
    "unitAddress" TEXT NOT NULL,
    "unitLatitude" DOUBLE PRECISION NOT NULL,
    "unitLongitude" DOUBLE PRECISION NOT NULL,
    "status" "VisitStatus" NOT NULL DEFAULT 'ASSIGNED',
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VisitAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisitEvent" (
    "id" TEXT NOT NULL,
    "visitAssignmentId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "type" "VisitEventType" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VisitEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VisitAssignment_consultantId_status_idx" ON "VisitAssignment"("consultantId", "status");

-- CreateIndex
CREATE INDEX "VisitAssignment_managerId_status_idx" ON "VisitAssignment"("managerId", "status");

-- CreateIndex
CREATE INDEX "VisitAssignment_createdAt_idx" ON "VisitAssignment"("createdAt");

-- CreateIndex
CREATE INDEX "VisitEvent_visitAssignmentId_createdAt_idx" ON "VisitEvent"("visitAssignmentId", "createdAt");

-- CreateIndex
CREATE INDEX "VisitEvent_authorId_idx" ON "VisitEvent"("authorId");

-- AddForeignKey
ALTER TABLE "VisitAssignment" ADD CONSTRAINT "VisitAssignment_consultantId_fkey" FOREIGN KEY ("consultantId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitAssignment" ADD CONSTRAINT "VisitAssignment_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitEvent" ADD CONSTRAINT "VisitEvent_visitAssignmentId_fkey" FOREIGN KEY ("visitAssignmentId") REFERENCES "VisitAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitEvent" ADD CONSTRAINT "VisitEvent_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
