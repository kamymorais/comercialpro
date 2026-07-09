import Link from "next/link";
import { BackToMenuBar } from "@/components/layout/BackToMenuBar";
import { Card } from "@/components/ui/Card";
import { LogoutButton } from "@/components/ui/LogoutButton";
import { requireRole } from "@/lib/auth";
import { formatBRL } from "@/lib/money";
import { getAdminDashboardSummary } from "@/services/admin.service";

export default async function AdminPage() {
  const admin = await requireRole(["ADMIN"]);
  const summary = await getAdminDashboardSummary();

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10 text-slate-950">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-900">
              Admin
            </p>
            <h1 className="mt-2 text-3xl font-bold">
              Bem-vindo, {admin.fullName}
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Acompanhe cadastros e a operação diária do ComercialPro.
            </p>
          </div>
          <LogoutButton />
        </header>

        <BackToMenuBar />

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
              Previsão de hoje
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
            description="Aprovar ou rejeitar usuários pendentes."
          />
          <AdminLinkCard
            href="/admin/usuarios"
            title="Usuários"
            description="Consulta completa de usuários será implementada em etapa futura."
          />
          <AdminLinkCard
            href="/admin/previsoes"
            title="Previsões"
            description="Total geral, total por gerente e status de cada consultor."
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
