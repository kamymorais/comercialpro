import { notFound } from "next/navigation";
import { ForecastEditForm } from "@/components/forecast/ForecastEditForm";
import { requireRole } from "@/lib/auth";
import { getRegionalConsultantForEdit } from "@/services/forecast.service";
import { updateRegionalConsultantForecastAction } from "@/app/regional/actions";

type RegionalConsultorEditPageProps = {
  params: Promise<{ consultorId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function RegionalConsultorEditPage({
  params,
  searchParams,
}: RegionalConsultorEditPageProps) {
  const regional = await requireRole(["REGIONAL_MANAGER"]);
  const { consultorId } = await params;
  const search = searchParams ? await searchParams : {};
  const errorMessage = typeof search.erro === "string" ? search.erro : undefined;

  const data = await getRegionalConsultantForEdit({
    regionalId: regional.id,
    consultantId: consultorId,
  });

  if (!data) {
    notFound();
  }

  async function action(formData: FormData) {
    "use server";
    formData.set("consultantId", consultorId);
    await updateRegionalConsultantForecastAction(formData);
  }

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10 text-slate-950">
      <div className="mx-auto max-w-3xl space-y-6">
        <header>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-900">
            Superintendente
          </p>
          <h1 className="mt-2 text-3xl font-bold">Editar previsão</h1>
          <p className="mt-2 text-sm text-slate-600">
            Ajuste os valores da previsão do consultor para a data operacional
            atual.
          </p>
        </header>

        <ForecastEditForm
          consultantName={data.consultant.fullName}
          consultantUsername={data.consultant.username}
          forecast={data.forecast}
          action={action}
          backHref="/regional"
          errorMessage={errorMessage}
        />
      </div>
    </main>
  );
}
