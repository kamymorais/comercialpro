"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import {
  AdminServiceError,
  deleteRegisteredUser,
} from "@/services/admin.service";

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
