import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { VisitPhotoGallery } from "@/components/visit/VisitPhotoGallery";
import { VisitStatusBadge } from "@/components/visit/VisitStatusBadge";
import { requireRole } from "@/lib/auth";
import {
  getVisitEventLabel,
  getVisitOversightManagerDetails,
  type VisitSummary,
} from "@/services/visit.service";

type OversightManagerVisitsPageProps = {
  params: Promise<{ managerId: string }>;
};

function formatDateTimeBR(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

export default async function OversightManagerVisitsPage({
  params,
}: OversightManagerVisitsPageProps) {
  await requireRole(["ADMIN", "REGIONAL_MANAGER"]);
  const { managerId } = await params;
  const details = await getVisitOversightManagerDetails(managerId);

  if (!details) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10 text-slate-950">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-900">
              Diário de visita
            </p>
            <h1 className="mt-2 text-3xl font-bold">{details.manager.fullName}</h1>
            <p className="mt-2 text-sm text-slate-600">
              @{details.manager.username}
            </p>
          </div>
          <Link
            className="text-sm font-semibold text-blue-900"
            href="/diario-visita/registrar"
          >
            Voltar para registros
          </Link>
        </header>

        <Card variant="highlight">
          <h2 className="text-xl font-bold">Acompanhamento somente leitura</h2>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            Superintendentes e administradores visualizam atividades e histórico,
            sem executar ações operacionais.
          </p>
        </Card>

        <SummaryCards summary={details.summary} />

        {details.consultants.length === 0 ? (
          <Card>
            <h2 className="text-lg font-bold">Nenhum consultor vinculado</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Quando consultores aprovados estiverem vinculados a este gerente,
              eles aparecerão aqui.
            </p>
          </Card>
        ) : (
          <section className="space-y-6">
            {details.consultants.map((consultant) => (
              <section key={consultant.id} className="space-y-4">
                <div>
                  <h2 className="text-xl font-bold">{consultant.fullName}</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    @{consultant.username}
                  </p>
                </div>

                {consultant.visits.length === 0 ? (
                  <Card>
                    <h3 className="text-lg font-bold">Sem atividades</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Este consultor ainda não possui atividades de visita.
                    </p>
                  </Card>
                ) : (
                  consultant.visits.map((visit) => (
                    <Card key={visit.id} className="space-y-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <h3 className="text-lg font-bold">{visit.unitName}</h3>
                          <p className="mt-1 text-sm text-slate-600">
                            {visit.agreementName} · atribuída em{" "}
                            {formatDateTimeBR(visit.assignedAt)}
                          </p>
                        </div>
                        <VisitStatusBadge status={visit.status} />
                      </div>

                      <dl className="grid gap-3 text-sm sm:grid-cols-2">
                        <div>
                          <dt className="text-slate-600">Endereço</dt>
                          <dd className="mt-1 font-semibold">
                            {visit.unitAddress}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-slate-600">Gerente</dt>
                          <dd className="mt-1 font-semibold">
                            {visit.managerName}
                          </dd>
                        </div>
                      </dl>

                      <div className="space-y-3">
                        <h4 className="text-sm font-bold text-slate-950">
                          Histórico completo
                        </h4>
                        <ol className="space-y-3">
                          {visit.events.map((event) => (
                            <li
                              key={event.id}
                              className="border-l-2 border-blue-100 pl-4 text-sm"
                            >
                              <p className="font-semibold">
                                {getVisitEventLabel(event.type)} ·{" "}
                                {formatDateTimeBR(event.createdAt)}
                              </p>
                              <p className="mt-1 text-xs text-slate-600">
                                {event.author.fullName} · @{event.author.username}
                              </p>
                              <p className="mt-2 whitespace-pre-wrap leading-6 text-slate-700">
                                {event.note ?? "Sem observação registrada."}
                              </p>
                              <VisitPhotoGallery photos={event.photos} />
                            </li>
                          ))}
                        </ol>
                      </div>

                      <Link
                        href={`/diario-visita/registrar/visitas/${visit.id}`}
                        className="inline-flex text-sm font-semibold text-blue-900"
                      >
                        Abrir atividade
                      </Link>
                    </Card>
                  ))
                )}
              </section>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}

function SummaryCards({ summary }: { summary: VisitSummary }) {
  return (
    <section className="grid gap-4 md:grid-cols-4">
      <Card>
        <p className="text-sm font-medium text-slate-600">Aguardando</p>
        <p className="mt-2 text-3xl font-bold">{summary.assigned}</p>
      </Card>
      <Card>
        <p className="text-sm font-medium text-slate-600">Refazer</p>
        <p className="mt-2 text-3xl font-bold">{summary.revisionRequested}</p>
      </Card>
      <Card>
        <p className="text-sm font-medium text-slate-600">Em análise</p>
        <p className="mt-2 text-3xl font-bold">{summary.submitted}</p>
      </Card>
      <Card>
        <p className="text-sm font-medium text-slate-600">Concluídas</p>
        <p className="mt-2 text-3xl font-bold">{summary.completed}</p>
      </Card>
    </section>
  );
}
