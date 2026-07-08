import Link from "next/link";
import { ConsultantForecastList } from "@/components/forecast/ConsultantForecastList";
import { ManagerForecastList } from "@/components/forecast/ManagerForecastList";
import { Card } from "@/components/ui/Card";
import { requireRole } from "@/lib/auth";
import { formatDateBR } from "@/lib/dates";
import { formatBRL } from "@/lib/money";
import {
  getAdminForecastPanel,
  type ForecastStatus,
} from "@/services/forecast.service";

const statusOptions: Array<{ value: ForecastStatus; label: string }> = [
  { value: "WITH_FORECAST", label: "Com previsao" },
  { value: "NO_FORECAST", label: "Sem previsao" },
  { value: "NOT_SENT", label: "Nao enviado" },
];

type AdminPrevisoesPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminPrevisoesPage({
  searchParams,
}: AdminPrevisoesPageProps) {
  await requireRole(["ADMIN"]);
  const params = searchParams ? await searchParams : {};

  const managerId = typeof params.gerente === "string" ? params.gerente : undefined;
  const statusParam = typeof params.status === "string" ? params.status : undefined;
  const status = statusOptions.some((option) => option.value === statusParam)
    ? (statusParam as ForecastStatus)
    : undefined;
  const updated = params.atualizado === "1";

  const panel = await getAdminForecastPanel({ managerId, status });
  const hasFilters = Boolean(managerId || status);

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10 text-slate-950">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-900">
              Admin
            </p>
            <h1 className="mt-2 text-3xl font-bold">Previsoes</h1>
            <p className="mt-2 text-sm text-slate-600">
              Acompanhe a previsao de pagamentos de toda a operacao.
            </p>
          </div>
          <Link className="text-sm font-semibold text-blue-900" href="/admin">
            Voltar ao painel
          </Link>
        </header>

        {updated ? (
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-950">
            Previsao atualizada com sucesso.
          </div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2">
          <Card>
            <p className="text-sm font-medium text-slate-600">
              Data operacional
            </p>
            <p className="mt-2 text-3xl font-bold">
              {formatDateBR(panel.operationalDate)}
            </p>
          </Card>
          <Card>
            <p className="text-sm font-medium text-slate-600">Total geral</p>
            <p className="mt-2 text-3xl font-bold">{formatBRL(panel.total)}</p>
          </Card>
        </section>

        <Card>
          <form method="get" className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <label className="block w-full sm:max-w-xs" htmlFor="gerente">
              <span className="mb-2 block text-sm font-medium text-slate-800">
                Gerente
              </span>
              <select
                id="gerente"
                name="gerente"
                defaultValue={managerId ?? ""}
                className="min-h-12 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-base text-slate-950 shadow-sm outline-none transition focus:border-blue-900 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">Todos os gerentes</option>
                {panel.managers.map((manager) => (
                  <option key={manager.id} value={manager.id}>
                    {manager.fullName}
                  </option>
                ))}
              </select>
            </label>

            <label className="block w-full sm:max-w-xs" htmlFor="status">
              <span className="mb-2 block text-sm font-medium text-slate-800">
                Status
              </span>
              <select
                id="status"
                name="status"
                defaultValue={status ?? ""}
                className="min-h-12 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-base text-slate-950 shadow-sm outline-none transition focus:border-blue-900 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">Todos os status</option>
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex gap-3">
              <button
                type="submit"
                className="inline-flex min-h-12 items-center justify-center rounded-lg bg-blue-900 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-950"
              >
                Filtrar
              </button>
              {hasFilters ? (
                <Link
                  href="/admin/previsoes"
                  className="inline-flex min-h-12 items-center justify-center rounded-lg border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-50"
                >
                  Limpar
                </Link>
              ) : null}
            </div>
          </form>
        </Card>

        <div>
          <h2 className="mb-4 text-lg font-bold">Gerentes</h2>
          <ManagerForecastList
            managers={panel.managers}
            getHref={(id) => `/admin/previsoes?gerente=${id}`}
          />
        </div>

        <div>
          <h2 className="mb-4 text-lg font-bold">Consultores</h2>
          <ConsultantForecastList
            consultants={panel.consultants}
            getHref={(consultantId) => `/admin/previsoes/consultores/${consultantId}`}
            emptyTitle="Nenhum consultor encontrado"
            emptyDescription="Ajuste os filtros para visualizar outros consultores."
          />
        </div>
      </div>
    </main>
  );
}
