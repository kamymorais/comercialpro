"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { parseMoneyInput } from "@/lib/money";
import { upsertConsultantForecast } from "@/services/forecast.service";

export async function saveForecastAction(formData: FormData) {
  const consultant = await requireRole(["CONSULTANT"]);

  await upsertConsultantForecast({
    consultantId: consultant.id,
    productionValue: parseMoneyInput(String(formData.get("productionValue") ?? "")),
    insuranceValue: parseMoneyInput(String(formData.get("insuranceValue") ?? "")),
    tcValue: parseMoneyInput(String(formData.get("tcValue") ?? "")),
    noForecast: formData.get("noForecast") === "on",
  });

  revalidatePath("/consultor");
  redirect("/consultor?sucesso=1");
}
