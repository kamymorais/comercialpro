import { getOperationalDate } from "@/lib/dates";
import { normalizeMoneyValue } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import {
  normalizeFullName,
  normalizeUsername,
  validateFullName,
  validateUsername,
} from "@/lib/validation";
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

export type AdminEditableUser = {
  id: string;
  fullName: string;
  username: string;
  role: Role | null;
  status: UserStatus;
  managerId: string | null;
  regionalManagerId: string | null;
};

export type UpdateRegisteredUserInput = {
  adminId: string;
  userId: string;
  fullName: string;
  username: string;
  role: string;
  managerId?: string | null;
  regionalManagerId?: string | null;
};

const editableRoles: Role[] = ["CONSULTANT", "MANAGER", "REGIONAL_MANAGER"];

export async function getAdminEditableUser(
  userId: string,
): Promise<AdminEditableUser | null> {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      fullName: true,
      username: true,
      role: true,
      status: true,
      managerId: true,
      regionalManagerId: true,
    },
  });
}

export async function listApprovedRegionalManagers() {
  return prisma.user.findMany({
    where: {
      status: "APPROVED",
      role: "REGIONAL_MANAGER",
    },
    orderBy: [{ fullName: "asc" }, { username: "asc" }],
    select: {
      id: true,
      fullName: true,
      username: true,
    },
  });
}

export async function updateRegisteredUser(input: UpdateRegisteredUserInput) {
  const admin = await prisma.user.findFirst({
    where: {
      id: input.adminId,
      role: "ADMIN",
      status: "APPROVED",
    },
    select: { id: true },
  });

  if (!admin) {
    throw new AdminServiceError("Administrador não autorizado.");
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: input.userId },
    select: {
      id: true,
      role: true,
      _count: {
        select: {
          consultants: { where: { status: "APPROVED" } },
        },
      },
    },
  });

  if (!targetUser) {
    throw new AdminServiceError("Usuário não encontrado.");
  }

  const fullName = normalizeFullName(input.fullName);
  const fullNameError = validateFullName(fullName);
  if (fullNameError) {
    throw new AdminServiceError(fullNameError);
  }

  const username = normalizeUsername(input.username);
  const usernameError = validateUsername(username);
  if (usernameError) {
    throw new AdminServiceError(usernameError);
  }

  const usernameOwner = await prisma.user.findUnique({
    where: { username },
    select: { id: true },
  });

  if (usernameOwner && usernameOwner.id !== targetUser.id) {
    throw new AdminServiceError("Este usuário já está em uso.");
  }

  // Administradores mantêm o perfil; os demais escolhem entre os perfis operacionais.
  let role: Role | null = targetUser.role;
  if (targetUser.role !== "ADMIN") {
    role = input.role as Role;

    if (!editableRoles.includes(role)) {
      throw new AdminServiceError("Informe o perfil do usuário.");
    }
  }

  const hasActiveConsultants = targetUser._count.consultants > 0;
  if (
    targetUser.role === "MANAGER" &&
    hasActiveConsultants &&
    role !== "MANAGER"
  ) {
    throw new AdminServiceError(
      "Este gerente possui consultores vinculados. Transfira os consultores para outro gerente antes de alterar o perfil.",
    );
  }

  let managerId: string | null = null;
  if (role === "CONSULTANT") {
    if (!input.managerId) {
      throw new AdminServiceError("Selecione o gerente do consultor.");
    }

    const manager = await prisma.user.findFirst({
      where: {
        id: input.managerId,
        role: "MANAGER",
        status: "APPROVED",
      },
      select: { id: true },
    });

    if (!manager || manager.id === targetUser.id) {
      throw new AdminServiceError("Gerente selecionado não está disponível.");
    }

    managerId = manager.id;
  }

  let regionalManagerId: string | null = null;
  if (role === "MANAGER" && input.regionalManagerId) {
    const regionalManager = await prisma.user.findFirst({
      where: {
        id: input.regionalManagerId,
        role: "REGIONAL_MANAGER",
        status: "APPROVED",
      },
      select: { id: true },
    });

    if (!regionalManager || regionalManager.id === targetUser.id) {
      throw new AdminServiceError(
        "Superintendente selecionado não está disponível.",
      );
    }

    regionalManagerId = regionalManager.id;
  }

  await prisma.user.update({
    where: { id: targetUser.id },
    data: {
      fullName,
      username,
      role,
      managerId,
      regionalManagerId,
    },
  });
}
