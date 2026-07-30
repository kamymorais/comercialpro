"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import {
  AdminServiceError,
  deleteRegisteredUser,
} from "@/services/admin.service";
import {
  generatePasswordResetToken,
  PasswordResetServiceError,
} from "@/services/password-reset.service";

export type GeneratePasswordResetLinkState = {
  success: boolean;
  error?: string;
  resetPath?: string;
  expiresAt?: string;
};

export async function generatePasswordResetLinkAction(
  _previousState: GeneratePasswordResetLinkState,
  formData: FormData,
): Promise<GeneratePasswordResetLinkState> {
  const admin = await requireRole(["ADMIN"]);
  const userId = String(formData.get("userId") ?? "");

  try {
    const resetToken = await generatePasswordResetToken({
      adminId: admin.id,
      userId,
    });

    return {
      success: true,
      resetPath: `/redefinir-senha/${resetToken.token}`,
      expiresAt: resetToken.expiresAt.toISOString(),
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof PasswordResetServiceError
          ? error.message
          : "Não foi possível gerar o link de redefinição.",
    };
  }
}

export async function deleteRegisteredUserAction(formData: FormData) {
  const admin = await requireRole(["ADMIN"]);
  const userId = String(formData.get("userId") ?? "");

  try {
    await deleteRegisteredUser(admin.id, userId);
  } catch (error) {
    const message =
      error instanceof AdminServiceError
        ? error.message
        : "Não foi possível excluir o usuário.";

    redirect(`/admin/usuarios?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/admin");
  revalidatePath("/admin/usuarios");
  revalidatePath("/admin/cadastros");
  revalidatePath("/admin/previsoes");
  redirect("/admin/usuarios?status=deleted");
}
