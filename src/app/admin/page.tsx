import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { requireRole } from "@/lib/auth";
import { formatBRL } from "@/lib/money";
import { getAdminDashboardSummary } from "@/services/admin.service";

export default async function AdminPage() {
  const admin = await requireRole(["ADMIN"]);
  const summary = await getAdminDashboardSummary();

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10 text-slate-950">
      <div className="mx-auto max-w-5xl space-y-6">
        <header>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-900">
            Admin
          </p>
          <h1 className="mt-2 text-3xl font-bold">
            Bem-vindo, {admin.fullName}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Acompanhe cadastros e a operacao diaria do ComercialPro.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <Card>
            <p className="text-sm font-medium text-slate-600">Pendentes</p>
            <p className="mt-2 text-3xl font-bold">
              {summary.pendingUsersCount}
            </p>
          </Card>
          <Card>
            <p className="text-sm font-medium text-slate-600">Aprovados</p>
            <p className="mt-2 text-3xl font-bold">
              {summary.approvedUsersCount}
            </p>
          </Card>
          <Card>
            <p className="text-sm font-medium text-slate-600">
              Previsao de hoje
            </p>
            <p className="mt-2 text-3xl font-bold">
              {formatBRL(summary.todayForecastTotal)}
            </p>
          </Card>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <AdminLinkCard
            href="/admin/cadastros"
            title="Cadastros"
            description="Aprovar ou rejeitar usuarios pendentes."
          />
          <AdminLinkCard
            href="/admin/usuarios"
            title="Usuarios"
            description="Consulta de usuarios aprovada para etapa futura."
          />
          <AdminLinkCard
            href="/admin/previsoes"
            title="Previsoes"
            description="Acompanhamento consolidado previsto para etapa futura."
          />
        </section>
      </div>
    </main>
  );
}

function AdminLinkCard({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link href={href}>
      <Card className="h-full transition hover:border-blue-200 hover:bg-blue-50">
        <h2 className="text-lg font-bold">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
      </Card>
    </Link>
  );
}
