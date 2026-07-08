-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'REGIONAL_MANAGER', 'MANAGER', 'CONSULTANT');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "RequestedRole" AS ENUM ('REGIONAL_MANAGER', 'MANAGER', 'CONSULTANT');

-- CreateEnum
CREATE TYPE "ResetStatus" AS ENUM ('SUCCESS', 'SKIPPED', 'ERROR');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "requestedRole" "RequestedRole",
    "role" "Role",
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING',
    "managerId" TEXT,
    "regionalManagerId" TEXT,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyForecast" (
    "id" TEXT NOT NULL,
    "consultantId" TEXT NOT NULL,
    "operationalDate" TIMESTAMP(3) NOT NULL,
    "productionValue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "insuranceValue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "tcValue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "noForecast" BOOLEAN NOT NULL DEFAULT false,
    "submittedAt" TIMESTAMP(3),
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyForecast_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResetLog" (
    "id" TEXT NOT NULL,
    "operationalDate" TIMESTAMP(3) NOT NULL,
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "ResetStatus" NOT NULL,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResetLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_managerId_idx" ON "User"("managerId");

-- CreateIndex
CREATE INDEX "User_regionalManagerId_idx" ON "User"("regionalManagerId");

-- CreateIndex
CREATE INDEX "DailyForecast_operationalDate_idx" ON "DailyForecast"("operationalDate");

-- CreateIndex
CREATE INDEX "DailyForecast_consultantId_idx" ON "DailyForecast"("consultantId");

-- CreateIndex
CREATE INDEX "DailyForecast_updatedById_idx" ON "DailyForecast"("updatedById");

-- CreateIndex
CREATE UNIQUE INDEX "DailyForecast_consultantId_operationalDate_key" ON "DailyForecast"("consultantId", "operationalDate");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "ResetLog_operationalDate_key" ON "ResetLog"("operationalDate");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_regionalManagerId_fkey" FOREIGN KEY ("regionalManagerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyForecast" ADD CONSTRAINT "DailyForecast_consultantId_fkey" FOREIGN KEY ("consultantId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyForecast" ADD CONSTRAINT "DailyForecast_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
