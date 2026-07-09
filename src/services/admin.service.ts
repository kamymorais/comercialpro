import { getOperationalDate } from "@/lib/dates";
import { normalizeMoneyValue } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import type { Role, UserStatus } from "@/generated/prisma/client";

export type AdminDashboardSummary = {
  pendingUsersCount: number;
  approvedUsersCount: number;
  todayForecastTotal: number;
};

export type AdminUserListItem = {
  id: string;
  fullName: string;
  username: string;
  role: Role | null;
  status: UserStatus;
  manager: {
    fullName: string;
    username: string;
  } | null;
  regionalManager: {
    fullName: string;
    username: string;
  } | null;
  createdAt: Date;
  approvedAt: Date | null;
  _count: {
    consultants: number;
    managers: number;
    forecasts: number;
  };
};

export class AdminServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdminServiceError";
  }
}

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

export async function listAdminUsers(): Promise<AdminUserListItem[]> {
  return prisma.user.findMany({
    orderBy: [{ status: "asc" }, { fullName: "asc" }, { username: "asc" }],
    select: {
      id: true,
      fullName: true,
      username: true,
      role: true,
      status: true,
      createdAt: true,
      approvedAt: true,
      manager: {
        select: {
          fullName: true,
          username: true,
        },
      },
      regionalManager: {
        select: {
          fullName: true,
          username: true,
        },
      },
      _count: {
        select: {
          consultants: true,
          managers: true,
          forecasts: true,
        },
      },
    },
  });
}

export async function deleteRegisteredUser(adminId: string, userId: string) {
  if (!userId) {
    throw new AdminServiceError("Usuário não informado.");
  }

  if (adminId === userId) {
    throw new AdminServiceError("Você não pode excluir o próprio usuário.");
  }

  const admin = await prisma.user.findFirst({
    where: {
      id: adminId,
      role: "ADMIN",
      status: "APPROVED",
    },
    select: { id: true },
  });

  if (!admin) {
    throw new AdminServiceError("Administrador não autorizado.");
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      fullName: true,
    },
  });

  if (!targetUser) {
    throw new AdminServiceError("Usuário não encontrado.");
  }

  if (targetUser.role === "ADMIN") {
    const approvedAdminCount = await prisma.user.count({
      where: {
        role: "ADMIN",
        status: "APPROVED",
      },
    });

    if (approvedAdminCount <= 1) {
      throw new AdminServiceError("Não é possível excluir o último administrador.");
    }
  }

  await prisma.$transaction([
    prisma.session.deleteMany({ where: { userId } }),
    prisma.dailyForecast.deleteMany({ where: { consultantId: userId } }),
    prisma.dailyForecast.updateMany({
      where: { updatedById: userId },
      data: { updatedById: null },
    }),
    prisma.user.updateMany({
      where: { managerId: userId },
      data: { managerId: null },
    }),
    prisma.user.updateMany({
      where: { regionalManagerId: userId },
      data: { regionalManagerId: null },
    }),
    prisma.user.updateMany({
      where: { approvedById: userId },
      data: { approvedById: null },
    }),
    prisma.user.delete({ where: { id: userId } }),
  ]);

  return { deletedUserName: targetUser.fullName };
}
