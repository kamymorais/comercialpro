import Link from "next/link";
import { DeleteUserForm } from "@/components/users/DeleteUserForm";
import { PasswordResetLinkGenerator } from "@/components/users/PasswordResetLinkGenerator";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { formatDateBR } from "@/lib/dates";
import { requireRole } from "@/lib/auth";
import { listAdminUsers } from "@/services/admin.service";
import type { Role, UserStatus } from "@/generated/prisma/client";

type AdminUsuariosPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const roleLabels: Record<Role, string> = {
  ADMIN: "Administrador",
  CONSULTANT: "Consultor",
  MANAGER: "Gerente",
  REGIONAL_MANAGER: "Superintendente",
};

const statusLabels: Record<UserStatus, string> = {
  APPROVED: "Aprovado",
  PENDING: "Pendente",
  REJECTED: "Rejeitado",
};

const statusVariants: Record<UserStatus, "success" | "warning" | "danger"> = {
  APPROVED: "success",
  PENDING: "warning",
  REJECTED: "danger",
};

export default async function AdminUsuariosPage({
  searchParams,
}: AdminUsuariosPageProps) {
  const admin = await requireRole(["ADMIN"]);
  const params = searchParams ? await searchParams : {};
  const users = await listAdminUsers();
  const status = typeof params.status === "string" ? params.status : null;
  const error = typeof params.error === "string" ? params.error : null;

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10 text-slate-950">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-900">
              Admin
            </p>
            <h1 className="mt-2 text-3xl font-bold">Usuários</h1>
            <p className="mt-2 text-sm text-slate-600">
              Consulte usuários cadastrados e exclua acessos de funcionários
              desligados.
            </p>
          </div>
          <Link className="text-sm font-semibold text-blue-900" href="/admin">
            Voltar ao painel
          </Link>
        </header>

        {status === "deleted" ? (
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-950">
            Cadastro excluído com sucesso.
          </div>
        ) : null}

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {users.length === 0 ? (
          <Card>
            <h2 className="text-lg font-bold">Nenhum usuário cadastrado</h2>
            <p className="mt-2 text-sm text-slate-600">
              Quando houver cadastros, eles aparecerão aqui.
            </p>
          </Card>
        ) : (
          <section className="grid gap-4">
            {users.map((user) => {
              const isCurrentAdmin = user.id === admin.id;

              return (
                <Card key={user.id} className="space-y-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-slate-950">
                        {user.fullName}
                      </h2>
                      <p className="mt-1 text-sm text-slate-600">
                        @{user.username}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={statusVariants[user.status]}>
                        {statusLabels[user.status]}
                      </Badge>
                      <Badge variant="neutral">
                        {user.role ? roleLabels[user.role] : "Sem perfil"}
                      </Badge>
                    </div>
                  </div>

                  <dl className="grid gap-3 text-sm text-slate-700 sm:grid-cols-2 lg:grid-cols-3">
                    <div>
                      <dt className="font-semibold text-slate-900">Gerente</dt>
                      <dd className="mt-1">
                        {user.manager
                          ? `${user.manager.fullName} (${user.manager.username})`
                          : "Não informado"}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-slate-900">
                        Superintendente
                      </dt>
                      <dd className="mt-1">
                        {user.regionalManager
                          ? `${user.regionalManager.fullName} (${user.regionalManager.username})`
                          : "Não informado"}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-slate-900">
                        Cadastrado em
                      </dt>
                      <dd className="mt-1">{formatDateBR(user.createdAt)}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-slate-900">
                        Aprovado em
                      </dt>
                      <dd className="mt-1">
                        {user.approvedAt ? formatDateBR(user.approvedAt) : "-"}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-slate-900">
                        Consultores vinculados
                      </dt>
                      <dd className="mt-1">{user._count.consultants}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-slate-900">
                        Previsões lançadas
                      </dt>
                      <dd className="mt-1">{user._count.forecasts}</dd>
                    </div>
                  </dl>

                  <div className="space-y-4 border-t border-slate-100 pt-4">
                    {user.status === "APPROVED" ? (
                      <PasswordResetLinkGenerator userId={user.id} />
                    ) : null}

                    {isCurrentAdmin ? (
                      <p className="text-sm text-slate-500">
                        Você está logado com este usuário. O próprio usuário não
                        pode ser excluído.
                      </p>
                    ) : (
                      <DeleteUserForm
                        userId={user.id}
                        userName={user.fullName}
                      />
                    )}
                  </div>
                </Card>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}
