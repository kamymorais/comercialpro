"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import {
  createLostOperation,
  LostOperationError,
  updateOwnLostOperation,
  type LostOperationInput,
} from "@/services/lost-operation.service";

const roles = ["ADMIN", "CONSULTANT", "MANAGER", "REGIONAL_MANAGER"] as const;
const root = "/operacao-perdida";

function formInput(formData: FormData): LostOperationInput {
  return {
    clientName: formData.get("clientName"),
    agency: formData.get("agency"),
    competitorBank: formData.get("competitorBank"),
    rate: formData.get("rate"),
    operationType: formData.get("operationType"),
  };
}

export async function createLostOperationAction(formData: FormData) {
  const user = await requireRole([...roles]);
  try {
    await createLostOperation({ authorId: user.id, input: formInput(formData) });
  } catch (error) {
    const message = error instanceof LostOperationError ? error.message : "Não foi possível salvar. Tente novamente.";
    redirect(`${root}/enviar?erro=${encodeURIComponent(message)}`);
  }
  revalidatePath(`${root}/consultar`);
  redirect(`${root}/consultar?sucesso=criada`);
}

export async function updateLostOperationAction(formData: FormData) {
  const user = await requireRole([...roles]);
  const id = String(formData.get("id") ?? "");
  try {
    await updateOwnLostOperation({ authorId: user.id, operationId: id, input: formInput(formData) });
  } catch (error) {
    const message = error instanceof LostOperationError ? error.message : "Não foi possível atualizar. Tente novamente.";
    redirect(`${root}/editar/${encodeURIComponent(id)}?erro=${encodeURIComponent(message)}`);
  }
  revalidatePath(`${root}/consultar`);
  redirect(`${root}/consultar?sucesso=editada`);
}
