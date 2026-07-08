import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { formatBRL } from "@/lib/money";
import type { RegionalManagerSummary } from "@/services/forecast.service";

type ManagerForecastListProps = {
  managers: RegionalManagerSummary[];
  getHref: (managerId: string) => string;
};

export function ManagerForecastList({ managers, getHref }: ManagerForecastListProps) {
  if (managers.length === 0) {
    return (
      <Card>
        <h2 className="text-lg font-bold">Nenhum gerente aprovado</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Quando gerentes forem aprovados, eles aparecerao aqui.
        </p>
      </Card>
    );
  }

  return (
    <section className="grid gap-4">
      {managers.map((manager) => (
        <Link key={manager.id} href={getHref(manager.id)}>
          <Card className="space-y-4 transition hover:border-blue-200 hover:bg-blue-50">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-lg font-bold">{manager.fullName}</h3>
                <p className="mt-1 text-sm text-slate-600">@{manager.username}</p>
              </div>
              <Badge variant="neutral">{manager.consultantsCount} consultores</Badge>
            </div>

            <dl className="grid gap-3 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-slate-600">Com previsao</dt>
                <dd className="mt-1 font-semibold">{manager.withForecastCount}</dd>
              </div>
              <div>
                <dt className="text-slate-600">Sem previsao</dt>
                <dd className="mt-1 font-semibold">{manager.noForecastCount}</dd>
              </div>
              <div>
                <dt className="text-slate-600">Nao enviado</dt>
                <dd className="mt-1 font-semibold">{manager.notSentCount}</dd>
              </div>
              <div>
                <dt className="text-slate-600">Total</dt>
                <dd className="mt-1 font-bold">{formatBRL(manager.total)}</dd>
              </div>
            </dl>
          </Card>
        </Link>
      ))}
    </section>
  );
}
