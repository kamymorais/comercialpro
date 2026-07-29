import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { VisitStatusBadge } from "@/components/visit/VisitStatusBadge";
import type { VisitListItem } from "@/services/visit.service";

type VisitListProps = {
  visits: VisitListItem[];
  emptyTitle: string;
  emptyDescription: string;
};

function formatDateTimeBR(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

export function VisitList({
  visits,
  emptyTitle,
  emptyDescription,
}: VisitListProps) {
  if (visits.length === 0) {
    return (
      <Card>
        <h2 className="text-lg font-bold">{emptyTitle}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {emptyDescription}
        </p>
      </Card>
    );
  }

  return (
    <section className="grid gap-4">
      {visits.map((visit) => (
        <Link key={visit.id} href={`/diario-visita/registrar/visitas/${visit.id}`}>
          <Card className="space-y-4 transition hover:border-blue-200 hover:bg-blue-50">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-lg font-bold">{visit.unitName}</h3>
                <p className="mt-1 text-sm text-slate-600">
                  {visit.agreementName} · {visit.consultantName}
                </p>
              </div>
              <VisitStatusBadge status={visit.status} />
            </div>

            <dl className="grid gap-3 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-slate-600">Gerente</dt>
                <dd className="mt-1 font-semibold">{visit.managerName}</dd>
              </div>
              <div>
                <dt className="text-slate-600">Atribuída em</dt>
                <dd className="mt-1 font-semibold">
                  {formatDateTimeBR(visit.assignedAt)}
                </dd>
              </div>
              <div>
                <dt className="text-slate-600">Última observação</dt>
                <dd className="mt-1 font-semibold">
                  {visit.latestNote ?? "Sem observação"}
                </dd>
              </div>
            </dl>
          </Card>
        </Link>
      ))}
    </section>
  );
}
