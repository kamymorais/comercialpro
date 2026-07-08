import { ManagerForecastList } from "@/components/forecast/ManagerForecastList";
import { Card } from "@/components/ui/Card";
import { requireRole } from "@/lib/auth";
import { formatDateBR } from "@/lib/dates";
import { formatBRL } from "@/lib/money";
import { getRegionalForecastSummary } from "@/services/forecast.service";

type RegionalPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function RegionalPage({ searchParams }: RegionalPageProps) {
  const regional = await requireRole(["REGIONAL_MANAGER"]);
  const params = searchParams ? await searchParams : {};
  const summary = await getRegionalForecastSummary({ regionalId: regional.id });
  const updated = params.atualizado === "1";

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10 text-slate-950">
      <div className="mx-auto max-w-5xl space-y-6">
        <header>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-900">
            Gerente regional
          </p>
          <h1 className="mt-2 text-3xl font-bold">
            Bem-vindo, {regional.fullName}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Acompanhe a previsao de pagamentos de toda a regiao.
          </p>
        </header>

        {updated ? (
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-950">
            Previsao atualizada com sucesso.
          </div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-3">
          <Card>
            <p className="text-sm font-medium text-slate-600">
              Data operacional
            </p>
            <p className="mt-2 text-3xl font-bold">
              {formatDateBR(summary.operationalDate)}
            </p>
          </Card>
          <Card>
            <p className="text-sm font-medium text-slate-600">Gerentes</p>
            <p className="mt-2 text-3xl font-bold">{summary.managers.length}</p>
          </Card>
          <Card>
            <p className="text-sm font-medium text-slate-600">
              Previa total regional
            </p>
            <p className="mt-2 text-3xl font-bold">{formatBRL(summary.total)}</p>
          </Card>
        </section>

        <ManagerForecastList
          managers={summary.managers}
          getHref={(managerId) => `/regional/gerentes/${managerId}`}
        />
      </div>
    </main>
  );
}
