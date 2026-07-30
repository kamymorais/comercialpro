"use server";

import { redirect } from "next/navigation";
import {
  PasswordResetServiceError,
  resetPasswordWithToken,
} from "@/services/password-reset.service";

export type ResetPasswordFormState = {
  error?: string;
};

export async function resetPasswordAction(
  _previousState: ResetPasswordFormState,
  formData: FormData,
): Promise<ResetPasswordFormState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const passwordConfirmation = String(
    formData.get("passwordConfirmation") ?? "",
  );

  try {
    await resetPasswordWithToken({
      token,
      password,
      passwordConfirmation,
    });
  } catch (error) {
    return {
      error:
        error instanceof PasswordResetServiceError
          ? error.message
          : "Não foi possível alterar a senha. Solicite um novo link ao administrador.",
    };
  }

  redirect("/login?senhaRedefinida=1");
}
