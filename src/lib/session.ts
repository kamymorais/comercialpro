import crypto from "node:crypto";
import { SESSION_DURATION_HOURS } from "@/lib/constants";

export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function hashSessionToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function getSessionExpiresAt(): Date {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + SESSION_DURATION_HOURS);
  return expiresAt;
}

export function isSessionExpired(expiresAt: Date): boolean {
  return expiresAt.getTime() <= Date.now();
}
