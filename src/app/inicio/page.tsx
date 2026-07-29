import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { LogoutButton } from "@/components/ui/LogoutButton";
import { getDashboardPathByRole, requireRole } from "@/lib/auth";
import { getConsultantPendingVisitNotice } from "@/services/visit.service";

export default async function InicioPage() {
  const user = await requireRole([
    "ADMIN",
    "CONSULTANT",
    "MANAGER",
    "REGIONAL_MANAGER",
  ]);

  if (!user.role) {
    return null;
  }

  const previsaoHref = getDashboardPathByRole(user.role);
  const visitNotice =
    user.role === "CONSULTANT"
      ? await getConsultantPendingVisitNotice(user.id)
      : null;

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10 text-slate-950">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-900">
              ComercialPro
            </p>
            <h1 className="mt-2 text-3xl font-bold">
              Bem-vindo, {user.fullName}
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Escolha o que deseja acessar.
            </p>
          </div>
          <LogoutButton />
        </header>

        {visitNotice ? (
          <Link href="/diario-visita/registrar">
            <Card variant="highlight" className="space-y-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-lg font-bold">Diário de visita</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    {getVisitNoticeText(visitNotice)}
                  </p>
                </div>
                <Badge variant="warning">
                  {visitNotice.total} pendente
                  {visitNotice.total === 1 ? "" : "s"}
                </Badge>
              </div>
            </Card>
          </Link>
        ) : null}

        <section className="grid gap-4 sm:grid-cols-2">
          <MenuCard
            href={previsaoHref}
            title="Previsão"
            description="Acompanhe e registre a previsão diária de pagamentos."
          />
          <MenuCard
            href="/verificador-margem"
            title="Verificador de Margem"
            description="Envie um contracheque em PDF e veja os dados extraídos."
          />
          <MenuCard
            href="/diario-visita"
            title="Diário de visita"
            description="Localize convênios e acompanhe atividades de visita."
            badge={visitNotice?.total}
          />
        </section>
      </div>
    </main>
  );
}

function MenuCard({
  href,
  title,
  description,
  badge,
}: {
  href: string;
  title: string;
  description: string;
  badge?: number;
}) {
  return (
    <Link href={href}>
      <Card className="flex h-full min-h-40 flex-col justify-between gap-4 transition hover:border-blue-200 hover:bg-blue-50">
        <div>
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-xl font-bold">{title}</h2>
            {badge ? <Badge variant="warning">{badge}</Badge> : null}
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {description}
          </p>
        </div>
        <span className="text-sm font-semibold text-blue-900">Abrir →</span>
      </Card>
    </Link>
  );
}

function getVisitNoticeText(notice: {
  total: number;
  assigned: number;
  revisionRequested: number;
}) {
  if (notice.total > 1) {
    return `Você possui ${notice.total} atividades pendentes. Veja em Diário de visita.`;
  }

  if (notice.revisionRequested > 0) {
    return "Seu gerente solicitou que uma visita seja refeita. Veja em Diário de visita.";
  }

  return "Seu gerente adicionou uma nova atividade para você. Veja em Diário de visita.";
}
