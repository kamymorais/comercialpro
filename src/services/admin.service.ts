import { getOperationalDate } from "@/lib/dates";
import { normalizeMoneyValue } from "@/lib/money";
import { prisma } from "@/lib/prisma";

export type AdminDashboardSummary = {
  pendingUsersCount: number;
  approvedUsersCount: number;
  todayForecastTotal: number;
};

export async function getAdminDashboardSummary(): Promise<AdminDashboardSummary> {
  const operationalDate = getOperationalDate();

  const [pendingUsersCount, approvedUsersCount, forecasts] = await Promise.all([
    prisma.user.count({ where: { status: "PENDING" } }),
    prisma.user.count({ where: { status: "APPROVED" } }),
    prisma.dailyForecast.findMany({
      where: { operationalDate },
      select: {
        productionValue: true,
        insuranceValue: true,
        tcValue: true,
        noForecast: true,
      },
    }),
  ]);

  const todayForecastTotal = forecasts.reduce((total, forecast) => {
    if (forecast.noForecast) {
      return total;
    }

    return (
      total +
      normalizeMoneyValue(forecast.productionValue.toString()) +
      normalizeMoneyValue(forecast.insuranceValue.toString()) +
      normalizeMoneyValue(forecast.tcValue.toString())
    );
  }, 0);

  return {
    pendingUsersCount,
    approvedUsersCount,
    todayForecastTotal,
  };
}
