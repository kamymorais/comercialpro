import type { Role } from "@/generated/prisma/client";

export function isAdmin(role: Role | null | undefined): boolean {
  return role === "ADMIN";
}

export function isConsultant(role: Role | null | undefined): boolean {
  return role === "CONSULTANT";
}

export function isManager(role: Role | null | undefined): boolean {
  return role === "MANAGER";
}

export function isRegionalManager(role: Role | null | undefined): boolean {
  return role === "REGIONAL_MANAGER";
}

export function canManagerAccessConsultant(
  managerId: string,
  consultantManagerId: string | null | undefined,
): boolean {
  return Boolean(managerId && consultantManagerId === managerId);
}

export function canRegionalAccessManager(
  regionalId: string,
  managerRegionalId: string | null | undefined,
): boolean {
  if (!managerRegionalId) {
    return true;
  }

  return managerRegionalId === regionalId;
}

export function canRegionalAccessConsultant(params: {
  regionalId: string;
  consultantManagerRegionalId?: string | null;
}): boolean {
  if (!params.consultantManagerRegionalId) {
    return true;
  }

  return params.consultantManagerRegionalId === params.regionalId;
}
