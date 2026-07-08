import { getDashboardPathByRole } from "@/lib/auth";
import { verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import {
  generateSessionToken,
  getSessionExpiresAt,
  hashSessionToken,
} from "@/lib/session";
import { normalizeUsername } from "@/lib/validation";

export class LoginError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LoginError";
  }
}

const INVALID_CREDENTIALS_MESSAGE = "Usuário ou senha inválidos.";

export async function loginWithUsernameAndPassword(params: {
  username: string;
  password: string;
}): Promise<{
  token: string;
  expiresAt: Date;
  redirectTo: string;
}> {
  const username = normalizeUsername(params.username);
  const password = params.password;

  if (!username || !password) {
    throw new LoginError(INVALID_CREDENTIALS_MESSAGE);
  }

  const user = await prisma.user.findUnique({
    where: { username },
  });

  if (!user) {
    throw new LoginError(INVALID_CREDENTIALS_MESSAGE);
  }

  const passwordMatches = await verifyPassword(password, user.passwordHash);

  if (!passwordMatches) {
    throw new LoginError(INVALID_CREDENTIALS_MESSAGE);
  }

  if (user.status === "PENDING") {
    throw new LoginError("Cadastro ainda não aprovado pelo administrador.");
  }

  if (user.status === "REJECTED") {
    throw new LoginError(
      "Cadastro rejeitado. Entre em contato com o administrador.",
    );
  }

  if (user.status !== "APPROVED") {
    throw new LoginError("Não foi possível entrar agora. Tente novamente.");
  }

  if (!user.role) {
    throw new LoginError("Perfil de acesso ainda não definido.");
  }

  const token = generateSessionToken();
  const tokenHash = hashSessionToken(token);
  const expiresAt = getSessionExpiresAt();

  await prisma.session.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt,
    },
  });

  return {
    token,
    expiresAt,
    redirectTo: getDashboardPathByRole(user.role),
  };
}

export async function revokeSessionByToken(token: string): Promise<void> {
  await prisma.session.updateMany({
    where: {
      tokenHash: hashSessionToken(token),
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });
}
