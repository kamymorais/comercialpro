"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  SESSION_COOKIE_NAME,
  SESSION_DURATION_HOURS,
} from "@/lib/constants";
import {
  LoginError,
  loginWithUsernameAndPassword,
} from "@/services/auth.service";

export type LoginFormState = {
  error?: string;
};

export async function loginAction(
  _previousState: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");

  let loginResult: Awaited<ReturnType<typeof loginWithUsernameAndPassword>>;

  try {
    loginResult = await loginWithUsernameAndPassword({ username, password });
  } catch (error) {
    if (error instanceof LoginError) {
      return { error: error.message };
    }

    return { error: "Não foi possível entrar agora. Tente novamente." };
  }

  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, loginResult.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * SESSION_DURATION_HOURS,
    path: "/",
    expires: loginResult.expiresAt,
  });

  redirect(loginResult.redirectTo);
}
