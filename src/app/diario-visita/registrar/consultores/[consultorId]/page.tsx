import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { VisitAssignmentForm } from "@/components/visit/VisitAssignmentForm";
import { VisitList } from "@/components/visit/VisitList";
import { requireRole } from "@/lib/auth";
import { createManagerVisitAssignmentAction } from "@/app/diario-visita/registrar/actions";
import { getManagerConsultantVisitDetails } from "@/services/visit.service";

type ManagerConsultantVisitsPageProps = {
  params: Promise<{ consultorId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ManagerConsultantVisitsPage({
  params,
  searchParams,
}: ManagerConsultantVisitsPageProps) {
  const manager = await requireRole(["MANAGER"]);
  const { consultorId } = await params;
  const search = searchParams ? await searchParams : {};

  const details = await getManagerConsultantVisitDetails({
    managerId: manager.id,
    consultantId: consultorId,
  }).catch(() => null);

  if (!details) {
    notFound();
  }

  async function createAction(formData: FormData) {
    "use server";
    formData.set("consultantId", consultorId);
    await createManagerVisitAssignmentAction(formData);
  }

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10 text-slate-950">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-900">
              Diário de visita
            </p>
            <h1 className="mt-2 text-3xl font-bold">
              {details.consultant.fullName}
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              @{details.consultant.username}
            </p>
          </div>
          <Link
            className="text-sm font-semibold text-blue-900"
            href="/diario-visita/registrar"
          >
            Voltar para registros
          </Link>
        </header>

        {search.criada === "1" ? (
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-950">
            Atividade criada com sucesso.
          </div>
        ) : null}

        {typeof search.erro === "string" ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {search.erro}
          </div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-3">
          <Card>
            <p className="text-sm font-medium text-slate-600">Abertas</p>
            <p className="mt-2 text-3xl font-bold">
              {details.summary.assigned +
                details.summary.revisionRequested +
                details.summary.submitted}
            </p>
          </Card>
          <Card>
            <p className="text-sm font-medium text-slate-600">Concluídas</p>
            <p className="mt-2 text-3xl font-bold">
              {details.summary.completed}
            </p>
          </Card>
          <Card>
            <p className="text-sm font-medium text-slate-600">Total</p>
            <p className="mt-2 text-3xl font-bold">{details.summary.total}</p>
          </Card>
        </section>

        <VisitAssignmentForm
          consultantId={details.consultant.id}
          agreements={details.agreements}
          action={createAction}
        />

        <VisitList
          visits={details.visits}
          emptyTitle="Nenhuma atividade para este consultor"
          emptyDescription="Use o formulário acima para atribuir a primeira visita."
        />
      </div>
    </main>
  );
}
