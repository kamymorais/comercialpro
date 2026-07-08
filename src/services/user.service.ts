import type { RequestedRole } from "@/generated/prisma/client";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import {
  normalizeUsername,
  validateFullName,
  validatePassword,
  validateUsername,
} from "@/lib/validation";

export type ManagerOption = {
  id: string;
  fullName: string;
  username: string;
};

export type CreatePendingUserInput = {
  fullName: string;
  username: string;
  password: string;
  requestedRole: string;
  managerId?: string | null;
};

const requestedRoles: RequestedRole[] = [
  "CONSULTANT",
  "MANAGER",
  "REGIONAL_MANAGER",
];

export class UserServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserServiceError";
  }
}

export async function listApprovedManagers(): Promise<ManagerOption[]> {
  return prisma.user.findMany({
    where: {
      status: "APPROVED",
      role: "MANAGER",
    },
    orderBy: [{ fullName: "asc" }, { username: "asc" }],
    select: {
      id: true,
      fullName: true,
      username: true,
    },
  });
}

export async function createPendingUser(input: CreatePendingUserInput) {
  const fullName = input.fullName.trim();
  const username = normalizeUsername(input.username);
  const password = input.password;
  const requestedRole = input.requestedRole as RequestedRole;

  const fullNameError = validateFullName(fullName);
  if (fullNameError) {
    throw new UserServiceError(fullNameError);
  }

  const usernameError = validateUsername(username);
  if (usernameError) {
    throw new UserServiceError(usernameError);
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    throw new UserServiceError(passwordError);
  }

  if (!requestedRoles.includes(requestedRole)) {
    throw new UserServiceError("Informe o perfil solicitado.");
  }

  const existingUser = await prisma.user.findUnique({
    where: { username },
    select: { id: true },
  });

  if (existingUser) {
    throw new UserServiceError("Este usuário já está em uso.");
  }

  let managerId: string | null = null;

  if (requestedRole === "CONSULTANT") {
    if (!input.managerId) {
      throw new UserServiceError("Selecione o gerente responsável.");
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
      throw new UserServiceError("Gerente selecionado não está disponível.");
    }

    managerId = manager.id;
  }

  const passwordHash = await hashPassword(password);

  return prisma.user.create({
    data: {
      fullName,
      username,
      passwordHash,
      requestedRole,
      role: null,
      status: "PENDING",
      managerId,
    },
    select: {
      id: true,
      username: true,
      status: true,
    },
  });
}
