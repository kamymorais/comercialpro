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

function logOperationSaveFailure(action: string, error: unknown) {
  if (error instanceof LostOperationError) return;
  const details = error instanceof Error ? error as Error & { code?: unknown } : null;
  console.error(`[operacao-perdida] Falha ao ${action}`, {
    name: details?.name ?? "UnknownError",
    code: typeof details?.code === "string" ? details.code : undefined,
  });
}

function formInput(formData: FormData): LostOperationInput {
  return {
    clientName: formData.get("clientName"),
    operationValue: formData.get("operationValue"),
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
    logOperationSaveFailure("salvar", error);
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
    logOperationSaveFailure("atualizar", error);
    const message = error instanceof LostOperationError ? error.message : "Não foi possível atualizar. Tente novamente.";
    redirect(`${root}/editar/${encodeURIComponent(id)}?erro=${encodeURIComponent(message)}`);
  }
  revalidatePath(`${root}/consultar`);
  redirect(`${root}/consultar?sucesso=editada`);
}
