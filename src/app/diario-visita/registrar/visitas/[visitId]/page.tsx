import Link from "next/link";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/Card";
import {
  ConsultantVisitReportForm,
  ManagerVisitReviewForms,
} from "@/components/visit/VisitActionForms";
import { VisitStatusBadge } from "@/components/visit/VisitStatusBadge";
import { VisitTimeline } from "@/components/visit/VisitTimeline";
import { requireRole } from "@/lib/auth";
import {
  completeVisitAssignmentAction,
  requestVisitRevisionAction,
} from "@/app/diario-visita/registrar/actions";
import { isVisitPhotoStorageConfigured } from "@/services/visit-photo.service";
import {
  getVisitAssignmentDetails,
  getVisitMapsUrl,
  VisitDiaryError,
} from "@/services/visit.service";

type VisitDetailsPageProps = {
  params: Promise<{ visitId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function formatDateTimeBR(date: Date | null) {
  if (!date) {
    return "Ainda não registrado";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

export default async function VisitDetailsPage({
  params,
  searchParams,
}: VisitDetailsPageProps) {
  const user = await requireRole([
    "ADMIN",
    "CONSULTANT",
    "MANAGER",
    "REGIONAL_MANAGER",
  ]);
  const { visitId } = await params;
  const search = searchParams ? await searchParams : {};

  if (!user.role) {
    notFound();
  }

  const visit = await getVisitAssignmentDetails({
    viewerId: user.id,
    viewerRole: user.role,
    visitId,
  }).catch((error) => {
    if (error instanceof VisitDiaryError) {
      return null;
    }

    throw error;
  });

  if (!visit) {
    notFound();
  }

  const initialNote =
    visit.events.find((event) => event.type === "ASSIGNED")?.note ??
    "Sem orientação inicial.";
  const photosEnabled = isVisitPhotoStorageConfigured();

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10 text-slate-950">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-900">
              Diário de visita
            </p>
            <h1 className="mt-2 text-3xl font-bold">{visit.unitName}</h1>
            <p className="mt-2 text-sm text-slate-600">
              {visit.agreementName} · {visit.consultantName}
            </p>
          </div>
          <Link
            className="text-sm font-semibold text-blue-900"
            href="/diario-visita/registrar"
          >
            Voltar para registros
          </Link>
        </header>

        {search.sucesso === "1" ? (
          <Alert>Relatório enviado com sucesso.</Alert>
        ) : null}
        {search.refazer === "1" ? (
          <Alert>Solicitação para refazer visita registrada.</Alert>
        ) : null}
        {search.concluida === "1" ? (
          <Alert>Atividade concluída com sucesso.</Alert>
        ) : null}
        {typeof search.erro === "string" ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {search.erro}
          </div>
        ) : null}

        <Card>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-bold">Dados da atividade</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Endereço, responsável e situação atual.
              </p>
            </div>
            <VisitStatusBadge status={visit.status} />
          </div>

          <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
            <Info label="Convênio" value={visit.agreementName} />
            <Info label="Unidade ou órgão" value={visit.unitName} />
            <Info label="Consultor" value={visit.consultantName} />
            <Info label="Gerente" value={visit.managerName} />
            <Info label="Atribuída em" value={formatDateTimeBR(visit.assignedAt)} />
            <Info label="Enviada em" value={formatDateTimeBR(visit.submittedAt)} />
            <Info label="Concluída em" value={formatDateTimeBR(visit.completedAt)} />
            <div className="sm:col-span-2">
              <dt className="text-slate-600">Endereço</dt>
              <dd className="mt-1 font-semibold text-slate-950">
                {visit.unitAddress}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-slate-600">Mapa</dt>
              <dd className="mt-2">
                <a
                  href={getVisitMapsUrl(visit)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 items-center rounded-lg bg-blue-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-950"
                >
                  Abrir no mapa
                </a>
              </dd>
            </div>
          </dl>
        </Card>

        <Card variant="highlight">
          <h2 className="text-xl font-bold">Orientação inicial</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
            {initialNote}
          </p>
        </Card>

        <VisitTimeline events={visit.events} />

        {user.role === "CONSULTANT" ? (
          <ConsultantVisitReportForm
            visitId={visit.id}
            status={visit.status}
            photosEnabled={photosEnabled}
          />
        ) : null}

        {user.role === "MANAGER" ? (
          <ManagerVisitReviewForms
            visitId={visit.id}
            status={visit.status}
            revisionAction={requestVisitRevisionAction}
            completeAction={completeVisitAssignmentAction}
          />
        ) : null}
      </div>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-slate-600">{label}</dt>
      <dd className="mt-1 font-semibold text-slate-950">{value}</dd>
    </div>
  );
}

function Alert({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-950">
      {children}
    </div>
  );
}
