"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { parseMoneyInput } from "@/lib/money";
import {
  ForecastAccessError,
  updateConsultantForecastByManager,
} from "@/services/forecast.service";

export async function updateManagerConsultantForecastAction(formData: FormData) {
  const manager = await requireRole(["MANAGER"]);
  const consultantId = String(formData.get("consultantId") ?? "");

  try {
    await updateConsultantForecastByManager({
      managerId: manager.id,
      consultantId,
      productionValue: parseMoneyInput(String(formData.get("productionValue") ?? "")),
      insuranceValue: parseMoneyInput(String(formData.get("insuranceValue") ?? "")),
      tcValue: parseMoneyInput(String(formData.get("tcValue") ?? "")),
      noForecast: formData.get("noForecast") === "on",
    });
  } catch (error) {
    if (error instanceof ForecastAccessError) {
      redirect(
        `/gerente/consultores/${consultantId}?erro=${encodeURIComponent(error.message)}`,
      );
    }

    throw error;
  }

  revalidatePath("/gerente");
  revalidatePath(`/gerente/consultores/${consultantId}`);
  redirect("/gerente?atualizado=1");
}
