import { getOperationalDate } from "@/lib/dates";
import { prisma } from "@/lib/prisma";

export type DailyResetResult = {
  status: "SUCCESS" | "SKIPPED";
  operationalDate: Date;
  message: string;
};

export async function runDailyReset(params?: {
  triggeredBy?: "cron" | "manual";
}): Promise<DailyResetResult> {
  const operationalDate = getOperationalDate();

  const existing = await prisma.resetLog.findUnique({
    where: { operationalDate },
    select: { status: true },
  });

  if (existing?.status === "SUCCESS") {
    return {
      status: "SKIPPED",
      operationalDate,
      message: "Reset já foi executado para esta data operacional.",
    };
  }

  const message = `Reset executado via ${params?.triggeredBy ?? "cron"}.`;

  await prisma.resetLog.upsert({
    where: { operationalDate },
    create: { operationalDate, status: "SUCCESS", message },
    update: { status: "SUCCESS", message, executedAt: new Date() },
    select: { id: true },
  });

  return {
    status: "SUCCESS",
    operationalDate,
    message: "Reset executado com sucesso.",
  };
}
