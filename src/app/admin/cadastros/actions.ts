"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import {
  approvePendingUser,
  rejectPendingUser,
} from "@/services/approval.service";

export async function approvePendingUserAction(formData: FormData) {
  const admin = await requireRole(["ADMIN"]);

  await approvePendingUser({
    adminId: admin.id,
    userId: String(formData.get("userId") ?? ""),
    role: String(formData.get("role") ?? ""),
    managerId: String(formData.get("managerId") ?? "") || null,
  });

  revalidatePath("/admin");
  revalidatePath("/admin/cadastros");
  revalidatePath("/admin/usuarios");
  revalidatePath("/cadastro");
  redirect("/admin/cadastros?status=approved");
}

export async function rejectPendingUserAction(formData: FormData) {
  const admin = await requireRole(["ADMIN"]);

  await rejectPendingUser(admin.id, String(formData.get("userId") ?? ""));

  revalidatePath("/admin");
  revalidatePath("/admin/cadastros");
  revalidatePath("/admin/usuarios");
  revalidatePath("/cadastro");
  redirect("/admin/cadastros?status=rejected");
}
