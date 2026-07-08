import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type {
  RequestedRole,
  Role,
  User,
  UserStatus,
} from "@/generated/prisma/client";
import { SESSION_COOKIE_NAME } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { hashSessionToken, isSessionExpired } from "@/lib/session";

export type SafeUser = {
  id: string;
  fullName: string;
  username: string;
  requestedRole: RequestedRole | null;
  role: Role | null;
  status: UserStatus;
  managerId: string | null;
  regionalManagerId: string | null;
  approvedById: string | null;
  approvedAt: Date | null;
  rejectedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export function sanitizeUserForClient(user: User): SafeUser {
  return {
    id: user.id,
    fullName: user.fullName,
    username: user.username,
    requestedRole: user.requestedRole,
    role: user.role,
    status: user.status,
    managerId: user.managerId,
    regionalManagerId: user.regionalManagerId,
    approvedById: user.approvedById,
    approvedAt: user.approvedAt,
    rejectedAt: user.rejectedAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export function getDashboardPathByRole(role: Role): string {
  const paths: Record<Role, string> = {
    ADMIN: "/admin",
    CONSULTANT: "/consultor",
    MANAGER: "/gerente",
    REGIONAL_MANAGER: "/regional",
  };

  return paths[role];
}

export function isApprovedUser(user: Pick<User, "status">): boolean {
  return user.status === "APPROVED";
}

export async function getCurrentUserFromSession(): Promise<SafeUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const tokenHash = hashSessionToken(token);
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!session || session.revokedAt || !session.user) {
    return null;
  }

  if (isSessionExpired(session.expiresAt)) {
    await prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });

    return null;
  }

  return sanitizeUserForClient(session.user);
}

export async function requireCurrentUser(): Promise<SafeUser> {
  const user = await getCurrentUserFromSession();

  if (!user) {
    redirect("/login");
  }

  if (user.status === "PENDING") {
    redirect("/aguardando-aprovacao");
  }

  if (user.status === "REJECTED") {
    redirect("/login");
  }

  if (user.status !== "APPROVED" || !user.role) {
    redirect("/login");
  }

  return user;
}

export async function requireRole(allowedRoles: Role[]): Promise<SafeUser> {
  const user = await requireCurrentUser();

  if (!user.role) {
    redirect("/login");
  }

  if (!allowedRoles.includes(user.role)) {
    redirect(getDashboardPathByRole(user.role));
  }

  return user;
}
