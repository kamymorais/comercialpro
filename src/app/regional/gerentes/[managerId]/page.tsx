import Link from "next/link";
import { notFound } from "next/navigation";
import { ConsultantForecastList } from "@/components/forecast/ConsultantForecastList";
import { Card } from "@/components/ui/Card";
import { requireRole } from "@/lib/auth";
import { formatDateBR } from "@/lib/dates";
import { formatBRL } from "@/lib/money";
import { getRegionalManagerDetails } from "@/services/forecast.service";

type RegionalGerenteDetailPageProps = {
  params: Promise<{ managerId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function RegionalGerenteDetailPage({
  params,
  searchParams,
}: RegionalGerenteDetailPageProps) {
  const regional = await requireRole(["REGIONAL_MANAGER"]);
  const { managerId } = await params;
  const search = searchParams ? await searchParams : {};
  const updated = search.atualizado === "1";

  const details = await getRegionalManagerDetails({
    regionalId: regional.id,
    managerId,
  });

  if (!details) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10 text-slate-950">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-900">
              Gerente regional
            </p>
            <h1 className="mt-2 text-3xl font-bold">{details.manager.fullName}</h1>
            <p className="mt-2 text-sm text-slate-600">
              @{details.manager.username}
            </p>
          </div>
          <Link className="text-sm font-semibold text-blue-900" href="/regional">
            Voltar para regional
          </Link>
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
              {formatDateBR(details.operationalDate)}
            </p>
          </Card>
          <Card>
            <p className="text-sm font-medium text-slate-600">Consultores</p>
            <p className="mt-2 text-3xl font-bold">{details.consultants.length}</p>
          </Card>
          <Card>
            <p className="text-sm font-medium text-slate-600">
              Total da equipe
            </p>
            <p className="mt-2 text-3xl font-bold">{formatBRL(details.total)}</p>
          </Card>
        </section>

        <ConsultantForecastList
          consultants={details.consultants}
          getHref={(consultantId) => `/regional/consultores/${consultantId}`}
        />
      </div>
    </main>
  );
}
