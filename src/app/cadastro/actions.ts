"use server";

import { redirect } from "next/navigation";
import {
  createPendingUser,
  UserServiceError,
} from "@/services/user.service";

export type CadastroFormState = {
  error?: string;
};

export async function createPendingUserAction(
  _previousState: CadastroFormState,
  formData: FormData,
): Promise<CadastroFormState> {
  try {
    await createPendingUser({
      fullName: String(formData.get("fullName") ?? ""),
      username: String(formData.get("username") ?? ""),
      password: String(formData.get("password") ?? ""),
      requestedRole: String(formData.get("requestedRole") ?? ""),
      managerId: String(formData.get("managerId") ?? "") || null,
    });
  } catch (error) {
    if (error instanceof UserServiceError) {
      return { error: error.message };
    }

    return { error: "Não foi possível enviar o cadastro." };
  }

  redirect("/aguardando-aprovacao");
}
