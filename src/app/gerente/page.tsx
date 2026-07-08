import { ConsultantForecastList } from "@/components/forecast/ConsultantForecastList";
import { Card } from "@/components/ui/Card";
import { LogoutButton } from "@/components/ui/LogoutButton";
import { requireRole } from "@/lib/auth";
import { formatDateBR } from "@/lib/dates";
import { formatBRL } from "@/lib/money";
import { getManagerForecastSummary } from "@/services/forecast.service";

type GerentePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function GerentePage({ searchParams }: GerentePageProps) {
  const manager = await requireRole(["MANAGER"]);
  const params = searchParams ? await searchParams : {};
  const summary = await getManagerForecastSummary(manager.id);
  const updated = params.atualizado === "1";

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10 text-slate-950">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-900">
              Gerente
            </p>
            <h1 className="mt-2 text-3xl font-bold">
              Bem-vindo, {manager.fullName}
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Acompanhe a previsão de pagamentos da sua equipe.
            </p>
          </div>
          <LogoutButton />
        </header>

        {updated ? (
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-950">
            Previsão atualizada com sucesso.
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
            <p className="text-sm font-medium text-slate-600">Equipe</p>
            <p className="mt-2 text-3xl font-bold">{summary.totalTeam}</p>
          </Card>
          <Card>
            <p className="text-sm font-medium text-slate-600">
              Previsão de pagamentos
            </p>
            <p className="mt-2 text-3xl font-bold">
              {formatBRL(summary.paymentForecastTotal)}
            </p>
          </Card>
        </section>

        <ConsultantForecastList
          consultants={summary.consultants}
          getHref={(consultantId) => `/gerente/consultores/${consultantId}`}
        />
      </div>
    </main>
  );
}
