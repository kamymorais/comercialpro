import { ForecastForm } from "@/components/forecast/ForecastForm";
import { ForecastSummaryCard } from "@/components/forecast/ForecastSummaryCard";
import { requireRole } from "@/lib/auth";
import { getConsultantForecast } from "@/services/forecast.service";

type ConsultorPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ConsultorPage({
  searchParams,
}: ConsultorPageProps) {
  const consultant = await requireRole(["CONSULTANT"]);
  const params = searchParams ? await searchParams : {};
  const forecast = await getConsultantForecast(consultant.id);
  const saved = params.sucesso === "1";

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10 text-slate-950">
      <div className="mx-auto max-w-3xl space-y-6">
        <header>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-900">
            Consultor
          </p>
          <h1 className="mt-2 text-3xl font-bold">
            Bem-vindo, {consultant.fullName}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Registre sua previsao de pagamentos do ciclo atual.
          </p>
        </header>

        {saved ? (
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-950">
            Previsao salva com sucesso.
          </div>
        ) : null}

        <ForecastSummaryCard forecast={forecast} />
        <ForecastForm forecast={forecast} />
      </div>
    </main>
  );
}
