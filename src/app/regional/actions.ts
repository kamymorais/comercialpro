"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { parseMoneyInput } from "@/lib/money";
import {
  ForecastAccessError,
  updateConsultantForecastByRegional,
} from "@/services/forecast.service";

export async function updateRegionalConsultantForecastAction(formData: FormData) {
  const regional = await requireRole(["REGIONAL_MANAGER"]);
  const consultantId = String(formData.get("consultantId") ?? "");

  let managerId: string | null = null;

  try {
    const result = await updateConsultantForecastByRegional({
      regionalId: regional.id,
      consultantId,
      productionValue: parseMoneyInput(String(formData.get("productionValue") ?? "")),
      insuranceValue: parseMoneyInput(String(formData.get("insuranceValue") ?? "")),
      tcValue: parseMoneyInput(String(formData.get("tcValue") ?? "")),
      noForecast: formData.get("noForecast") === "on",
    });
    managerId = result.managerId;
  } catch (error) {
    if (error instanceof ForecastAccessError) {
      redirect(
        `/regional/consultores/${consultantId}?erro=${encodeURIComponent(error.message)}`,
      );
    }

    throw error;
  }

  revalidatePath("/regional");
  revalidatePath(`/regional/consultores/${consultantId}`);

  if (managerId) {
    revalidatePath(`/regional/gerentes/${managerId}`);
    redirect(`/regional/gerentes/${managerId}?atualizado=1`);
  }

  redirect("/regional?atualizado=1");
}
