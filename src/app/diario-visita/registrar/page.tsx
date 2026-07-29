import Link from "next/link";
import { BackToMenuBar } from "@/components/layout/BackToMenuBar";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { LogoutButton } from "@/components/ui/LogoutButton";
import { VisitList } from "@/components/visit/VisitList";
import { requireRole } from "@/lib/auth";
import {
  getConsultantVisitDashboard,
  getManagerVisitDashboard,
  getVisitOversightDashboard,
  type VisitSummary,
} from "@/services/visit.service";

export default async function RegistrarVisitaPage() {
  const user = await requireRole([
    "ADMIN",
    "CONSULTANT",
    "MANAGER",
    "REGIONAL_MANAGER",
  ]);

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10 text-slate-950">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-900">
              Diário de visita
            </p>
            <h1 className="mt-2 text-3xl font-bold">Registrar minha visita</h1>
            <p className="mt-2 text-sm text-slate-600">
              Atividades, relatórios e histórico de visitas.
            </p>
          </div>
          <LogoutButton />
        </header>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <BackToMenuBar />
          <Link
            href="/diario-visita"
            className="text-sm font-semibold text-blue-900"
          >
            Voltar ao Diário de visita
          </Link>
        </div>

        {user.role === "CONSULTANT" ? (
          <ConsultantDashboard consultantId={user.id} />
        ) : null}
        {user.role === "MANAGER" ? <ManagerDashboard managerId={user.id} /> : null}
        {user.role === "REGIONAL_MANAGER" ? <OversightDashboard /> : null}
        {user.role === "ADMIN" ? <OversightDashboard isAdmin /> : null}
      </div>
    </main>
  );
}

async function ConsultantDashboard({ consultantId }: { consultantId: string }) {
  const dashboard = await getConsultantVisitDashboard(consultantId);

  return (
    <>
      <SummaryCards summary={dashboard.summary} />
      <VisitList
        visits={dashboard.visits}
        emptyTitle="Nenhuma atividade de visita"
        emptyDescription="Quando seu gerente atribuir uma visita, ela aparecerá aqui."
      />
    </>
  );
}

async function ManagerDashboard({ managerId }: { managerId: string }) {
  const dashboard = await getManagerVisitDashboard(managerId);

  if (dashboard.consultants.length === 0) {
    return (
      <Card>
        <h2 className="text-lg font-bold">Nenhum consultor aprovado</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Apenas consultores aprovados e vinculados a você por gerente aparecem
          nesta área.
        </p>
      </Card>
    );
  }

  return (
    <section className="grid gap-4">
      {dashboard.consultants.map((consultant) => (
        <Link
          key={consultant.id}
          href={`/diario-visita/registrar/consultores/${consultant.id}`}
        >
          <Card className="space-y-4 transition hover:border-blue-200 hover:bg-blue-50">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-bold">{consultant.fullName}</h2>
                <p className="mt-1 text-sm text-slate-600">
                  @{consultant.username}
                </p>
              </div>
              <Badge variant="neutral">
                {consultant.summary.total} atividades
              </Badge>
            </div>
            <SummaryLine summary={consultant.summary} />
          </Card>
        </Link>
      ))}
    </section>
  );
}

async function OversightDashboard({ isAdmin = false }: { isAdmin?: boolean }) {
  const dashboard = await getVisitOversightDashboard();

  return (
    <>
      <Card variant="highlight">
        <h2 className="text-xl font-bold">
          {isAdmin ? "Visão global de registros" : "Acompanhamento de gerentes"}
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-700">
          Esta área é somente para leitura. Criação, conclusão, refazer visita e envio
          de relatórios permanecem bloqueados para este perfil.
        </p>
      </Card>
      <SummaryCards summary={dashboard.summary} />
      {dashboard.managers.length === 0 ? (
        <Card>
          <h2 className="text-lg font-bold">Nenhum gerente aprovado</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Quando gerentes forem aprovados, eles aparecerão aqui.
          </p>
        </Card>
      ) : (
        <section className="grid gap-4">
          {dashboard.managers.map((manager) => (
            <Link
              key={manager.id}
              href={`/diario-visita/registrar/gerentes/${manager.id}`}
            >
              <Card className="space-y-4 transition hover:border-blue-200 hover:bg-blue-50">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-lg font-bold">{manager.fullName}</h2>
                    <p className="mt-1 text-sm text-slate-600">
                      @{manager.username}
                    </p>
                  </div>
                  <Badge variant="neutral">
                    {manager.consultantsCount} consultores
                  </Badge>
                </div>
                <SummaryLine summary={manager.summary} />
              </Card>
            </Link>
          ))}
        </section>
      )}
    </>
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

function SummaryLine({ summary }: { summary: VisitSummary }) {
  return (
    <dl className="grid gap-3 text-sm sm:grid-cols-4">
      <div>
        <dt className="text-slate-600">Aguardando</dt>
        <dd className="mt-1 font-semibold">{summary.assigned}</dd>
      </div>
      <div>
        <dt className="text-slate-600">Refazer</dt>
        <dd className="mt-1 font-semibold">{summary.revisionRequested}</dd>
      </div>
      <div>
        <dt className="text-slate-600">Em análise</dt>
        <dd className="mt-1 font-semibold">{summary.submitted}</dd>
      </div>
      <div>
        <dt className="text-slate-600">Concluídas</dt>
        <dd className="mt-1 font-semibold">{summary.completed}</dd>
      </div>
    </dl>
  );
}
