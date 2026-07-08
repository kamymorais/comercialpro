"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { parseMoneyInput } from "@/lib/money";
import {
  ForecastAccessError,
  updateConsultantForecastByAdmin,
} from "@/services/forecast.service";

export async function updateAdminConsultantForecastAction(formData: FormData) {
  const admin = await requireRole(["ADMIN"]);
  const consultantId = String(formData.get("consultantId") ?? "");

  try {
    await updateConsultantForecastByAdmin({
      adminId: admin.id,
      consultantId,
      productionValue: parseMoneyInput(String(formData.get("productionValue") ?? "")),
      insuranceValue: parseMoneyInput(String(formData.get("insuranceValue") ?? "")),
      tcValue: parseMoneyInput(String(formData.get("tcValue") ?? "")),
      noForecast: formData.get("noForecast") === "on",
    });
  } catch (error) {
    if (error instanceof ForecastAccessError) {
      redirect(
        `/admin/previsoes/consultores/${consultantId}?erro=${encodeURIComponent(error.message)}`,
      );
    }

    throw error;
  }

  revalidatePath("/admin/previsoes");
  revalidatePath(`/admin/previsoes/consultores/${consultantId}`);
  redirect("/admin/previsoes?atualizado=1");
}
