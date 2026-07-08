import type { Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export type PendingUser = {
  id: string;
  fullName: string;
  username: string;
  requestedRole: "CONSULTANT" | "MANAGER" | "REGIONAL_MANAGER" | null;
  managerId: string | null;
  manager: {
    fullName: string;
    username: string;
  } | null;
  createdAt: Date;
};

export type ApproveUserInput = {
  adminId: string;
  userId: string;
  role: string;
  managerId?: string | null;
};

export class ApprovalServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApprovalServiceError";
  }
}

const approvableRoles: Role[] = ["CONSULTANT", "MANAGER", "REGIONAL_MANAGER"];

async function assertApprovedAdmin(adminId: string) {
  const admin = await prisma.user.findFirst({
    where: {
      id: adminId,
      role: "ADMIN",
      status: "APPROVED",
    },
    select: { id: true },
  });

  if (!admin) {
    throw new ApprovalServiceError("Administrador não autorizado.");
  }
}

export async function listPendingUsers(): Promise<PendingUser[]> {
  return prisma.user.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      fullName: true,
      username: true,
      requestedRole: true,
      managerId: true,
      createdAt: true,
      manager: {
        select: {
          fullName: true,
          username: true,
        },
      },
    },
  });
}

export async function approvePendingUser(input: ApproveUserInput) {
  await assertApprovedAdmin(input.adminId);

  const role = input.role as Role;
  if (!approvableRoles.includes(role)) {
    throw new ApprovalServiceError("Informe o perfil final do usuário.");
  }

  const pendingUser = await prisma.user.findFirst({
    where: {
      id: input.userId,
      status: "PENDING",
    },
    select: { id: true },
  });

  if (!pendingUser) {
    throw new ApprovalServiceError("Cadastro pendente não encontrado.");
  }

  let managerId: string | null = null;

  if (role === "CONSULTANT") {
    if (!input.managerId) {
      throw new ApprovalServiceError("Selecione o gerente do consultor.");
    }

    const manager = await prisma.user.findFirst({
      where: {
        id: input.managerId,
        role: "MANAGER",
        status: "APPROVED",
      },
      select: { id: true },
    });

    if (!manager) {
      throw new ApprovalServiceError("Gerente selecionado não está aprovado.");
    }

    managerId = manager.id;
  }

  return prisma.user.update({
    where: { id: pendingUser.id },
    data: {
      status: "APPROVED",
      role,
      managerId,
      approvedAt: new Date(),
      approvedById: input.adminId,
      rejectedAt: null,
    },
    select: {
      id: true,
      role: true,
      status: true,
    },
  });
}

export async function rejectPendingUser(adminId: string, userId: string) {
  await assertApprovedAdmin(adminId);

  const pendingUser = await prisma.user.findFirst({
    where: {
      id: userId,
      status: "PENDING",
    },
    select: { id: true },
  });

  if (!pendingUser) {
    throw new ApprovalServiceError("Cadastro pendente não encontrado.");
  }

  return prisma.user.update({
    where: { id: pendingUser.id },
    data: {
      status: "REJECTED",
      rejectedAt: new Date(),
    },
    select: {
      id: true,
      status: true,
    },
  });
}
