import Link from "next/link";
import { PendingUserCard } from "@/components/users/PendingUserCard";
import { Card } from "@/components/ui/Card";
import { requireRole } from "@/lib/auth";
import { listPendingUsers } from "@/services/approval.service";
import { listApprovedManagers } from "@/services/user.service";

type AdminCadastrosPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminCadastrosPage({
  searchParams,
}: AdminCadastrosPageProps) {
  await requireRole(["ADMIN"]);
  const params = searchParams ? await searchParams : {};
  const [pendingUsers, managers] = await Promise.all([
    listPendingUsers(),
    listApprovedManagers(),
  ]);

  const status = typeof params.status === "string" ? params.status : null;

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10 text-slate-950">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-900">
              Admin
            </p>
            <h1 className="mt-2 text-3xl font-bold">Cadastros pendentes</h1>
            <p className="mt-2 text-sm text-slate-600">
              Revise o perfil solicitado e defina o perfil final antes de aprovar.
            </p>
          </div>
          <Link className="text-sm font-semibold text-blue-900" href="/admin">
            Voltar ao painel
          </Link>
        </header>

        {status ? (
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-950">
            {status === "approved"
              ? "Cadastro aprovado com sucesso."
              : "Cadastro rejeitado com sucesso."}
          </div>
        ) : null}

        {pendingUsers.length === 0 ? (
          <Card>
            <h2 className="text-lg font-bold">Nenhum cadastro pendente</h2>
            <p className="mt-2 text-sm text-slate-600">
              Quando novos usuários solicitarem acesso, eles aparecerão aqui.
            </p>
          </Card>
        ) : (
          <section className="grid gap-4">
            {pendingUsers.map((user) => (
              <PendingUserCard key={user.id} user={user} managers={managers} />
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
