import crypto from "node:crypto";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

const PASSWORD_RESET_DURATION_MS = 60 * 60 * 1000;
const INVALID_RESET_LINK_MESSAGE =
  "Este link é inválido, expirou ou já foi utilizado. Solicite um novo link ao administrador.";

export class PasswordResetServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PasswordResetServiceError";
  }
}

export type PasswordResetTokenValidation = {
  valid: boolean;
  message?: string;
  user?: {
    fullName: string;
    username: string;
  };
};

function generateRawPasswordResetToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

function hashPasswordResetToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function getPasswordResetExpiresAt(): Date {
  return new Date(Date.now() + PASSWORD_RESET_DURATION_MS);
}

function validateNewPassword(password: string, passwordConfirmation: string) {
  if (!password) {
    throw new PasswordResetServiceError("Informe a nova senha.");
  }

  if (password.length < 8) {
    throw new PasswordResetServiceError(
      "A nova senha deve ter pelo menos 8 caracteres.",
    );
  }

  if (password !== passwordConfirmation) {
    throw new PasswordResetServiceError("As senhas informadas não coincidem.");
  }
}

export async function generatePasswordResetToken(params: {
  adminId: string;
  userId: string;
}): Promise<{
  token: string;
  expiresAt: Date;
}> {
  if (!params.userId) {
    throw new PasswordResetServiceError("Usuário não informado.");
  }

  const admin = await prisma.user.findFirst({
    where: {
      id: params.adminId,
      role: "ADMIN",
      status: "APPROVED",
    },
    select: { id: true },
  });

  if (!admin) {
    throw new PasswordResetServiceError("Administrador não autorizado.");
  }

  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: {
      id: true,
      status: true,
    },
  });

  if (!user) {
    throw new PasswordResetServiceError("Usuário não encontrado.");
  }

  if (user.status !== "APPROVED") {
    throw new PasswordResetServiceError(
      "O link só pode ser gerado para usuário aprovado.",
    );
  }

  const token = generateRawPasswordResetToken();
  const tokenHash = hashPasswordResetToken(token);
  const expiresAt = getPasswordResetExpiresAt();
  const now = new Date();

  await prisma.$transaction([
    prisma.passwordResetToken.updateMany({
      where: {
        userId: user.id,
        usedAt: null,
        revokedAt: null,
        expiresAt: { gt: now },
      },
      data: { revokedAt: now },
    }),
    prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
        createdByAdminId: admin.id,
      },
    }),
  ]);

  return { token, expiresAt };
}

export async function validatePasswordResetToken(
  token: string,
): Promise<PasswordResetTokenValidation> {
  if (!token) {
    return { valid: false, message: INVALID_RESET_LINK_MESSAGE };
  }

  const tokenHash = hashPasswordResetToken(token);
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: {
      user: {
        select: {
          fullName: true,
          username: true,
          status: true,
        },
      },
    },
  });

  if (
    !resetToken ||
    resetToken.usedAt ||
    resetToken.revokedAt ||
    resetToken.expiresAt.getTime() <= Date.now() ||
    resetToken.user.status !== "APPROVED"
  ) {
    return { valid: false, message: INVALID_RESET_LINK_MESSAGE };
  }

  return {
    valid: true,
    user: {
      fullName: resetToken.user.fullName,
      username: resetToken.user.username,
    },
  };
}

export async function resetPasswordWithToken(params: {
  token: string;
  password: string;
  passwordConfirmation: string;
}): Promise<void> {
  validateNewPassword(params.password, params.passwordConfirmation);

  if (!params.token) {
    throw new PasswordResetServiceError(INVALID_RESET_LINK_MESSAGE);
  }

  const tokenHash = hashPasswordResetToken(params.token);
  const passwordHash = await hashPassword(params.password);
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    const updatedToken = await tx.passwordResetToken.updateMany({
      where: {
        tokenHash,
        usedAt: null,
        revokedAt: null,
        expiresAt: { gt: now },
        user: {
          status: "APPROVED",
        },
      },
      data: { usedAt: now },
    });

    if (updatedToken.count !== 1) {
      throw new PasswordResetServiceError(INVALID_RESET_LINK_MESSAGE);
    }

    const resetToken = await tx.passwordResetToken.findUnique({
      where: { tokenHash },
      select: { userId: true },
    });

    if (!resetToken) {
      throw new PasswordResetServiceError(INVALID_RESET_LINK_MESSAGE);
    }

    await tx.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash },
    });

    await tx.passwordResetToken.updateMany({
      where: {
        userId: resetToken.userId,
        tokenHash: { not: tokenHash },
        usedAt: null,
        revokedAt: null,
      },
      data: { revokedAt: now },
    });

    await tx.session.updateMany({
      where: {
        userId: resetToken.userId,
        revokedAt: null,
      },
      data: { revokedAt: now },
    });
  });
}

export { INVALID_RESET_LINK_MESSAGE };
