export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

export function validateUsername(username: string): string | null {
  if (!isNonEmptyString(normalizeUsername(username))) {
    return "Informe um usuário.";
  }

  return null;
}

export function validatePassword(password: string): string | null {
  if (!isNonEmptyString(password)) {
    return "Informe uma senha.";
  }

  return null;
}

export function validateFullName(fullName: string): string | null {
  if (!isNonEmptyString(fullName)) {
    return "Informe o nome completo.";
  }

  return null;
}
