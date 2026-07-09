import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/constants";

const protectedRoutePrefixes = [
  "/admin",
  "/consultor",
  "/gerente",
  "/regional",
  "/verificador-margem",
  "/inicio",
];

const publicRoutePrefixes = [
  "/login",
  "/cadastro",
  "/aguardando-aprovacao",
  "/api/auth/logout",
];

function startsWithAny(pathname: string, prefixes: string[]) {
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (startsWithAny(pathname, publicRoutePrefixes)) {
    return NextResponse.next();
  }

  if (!startsWithAny(pathname, protectedRoutePrefixes)) {
    return NextResponse.next();
  }

  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
