import { compare, hash } from "bcryptjs";

const PASSWORD_SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  if (!password) {
    throw new Error("Senha não pode ser vazia.");
  }

  return hash(password, PASSWORD_SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  if (!password || !passwordHash) {
    return false;
  }

  try {
    return await compare(password, passwordHash);
  } catch {
    return false;
  }
}
