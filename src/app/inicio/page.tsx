import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { LogoutButton } from "@/components/ui/LogoutButton";
import { getDashboardPathByRole, requireRole } from "@/lib/auth";

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
        </section>
      </div>
    </main>
  );
}

function MenuCard({
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
      <Card className="flex h-full min-h-40 flex-col justify-between gap-4 transition hover:border-blue-200 hover:bg-blue-50">
        <div>
          <h2 className="text-xl font-bold">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {description}
          </p>
        </div>
        <span className="text-sm font-semibold text-blue-900">Abrir →</span>
      </Card>
    </Link>
  );
}
