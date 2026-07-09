import Link from "next/link";
import { redirect } from "next/navigation";
import { MarginInfoCard } from "@/components/margin/MarginInfoCard";
import { MarginUploadForm } from "@/components/margin/MarginUploadForm";
import { ModuleNav } from "@/components/layout/ModuleNav";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { LogoutButton } from "@/components/ui/LogoutButton";
import { getDashboardPathByRole, requireRole } from "@/lib/auth";

export default async function VerificadorMargemPage() {
  const user = await requireRole([
    "ADMIN",
    "CONSULTANT",
    "MANAGER",
    "REGIONAL_MANAGER",
  ]);

  if (!user.role) {
    redirect("/login");
  }

  const dashboardHref = getDashboardPathByRole(user.role);

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10 text-slate-950">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-900">
              ComercialPro
            </p>
            <h1 className="mt-2 text-3xl font-bold">Verificador de Margem</h1>
            <p className="mt-2 text-sm text-slate-600">
              Envie um contracheque em PDF para extrair os dados do
              documento.
            </p>
          </div>
          <LogoutButton />
        </header>

        <ModuleNav role={user.role} active="margem" />

        <Card variant="highlight" className="space-y-3">
          <Badge variant="warning">Cálculo pendente</Badge>
          <p className="text-sm leading-6 text-slate-700">
            O cálculo da margem ainda não está ativo. Nesta versão, o sistema
            apenas recebe o PDF e exibe os dados extraídos do contracheque.
          </p>
        </Card>

        <Card>
          <MarginUploadForm />
        </Card>

        <MarginInfoCard
          title="Formatos aceitos"
          description="PDF com texto selecionável, até 4 MB."
        />

        <MarginInfoCard
          variant="warning"
          title="Cálculo ainda não disponível"
          description="O cálculo da margem será implementado em uma etapa futura, após validação completa do layout do contracheque."
        />

        <Link
          href={dashboardHref}
          className="inline-flex min-h-12 items-center justify-center rounded-lg border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-50"
        >
          Voltar
        </Link>
      </div>
    </main>
  );
}
