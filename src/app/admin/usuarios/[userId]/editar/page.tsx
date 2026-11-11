import Link from "next/link";
import { notFound } from "next/navigation";
import { EditUserForm } from "@/components/users/EditUserForm";
import { Card } from "@/components/ui/Card";
import { requireRole } from "@/lib/auth";
import {
  getAdminEditableUser,
  listApprovedRegionalManagers,
} from "@/services/admin.service";
import { listApprovedManagers } from "@/services/user.service";

type EditarUsuarioPageProps = {
  params: Promise<{ userId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function EditarUsuarioPage({
  params,
  searchParams,
}: EditarUsuarioPageProps) {
  await requireRole(["ADMIN"]);
  const { userId } = await params;
  const query = searchParams ? await searchParams : {};
  const error = typeof query.error === "string" ? query.error : null;

  const [user, managers, regionalManagers] = await Promise.all([
    getAdminEditableUser(userId),
    listApprovedManagers(),
    listApprovedRegionalManagers(),
  ]);

  if (!user) {
    notFound();
  }

  return (
    <main className="min-h-dvh bg-slate-50 px-5 py-10 text-slate-950">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-900">
              Admin
            </p>
            <h1 className="mt-2 text-3xl font-bold">Editar colaborador</h1>
            <p className="mt-2 text-sm text-slate-600">
              Atualize os dados, o perfil ou o gerente responsável do
              cadastro de {user.fullName}.
            </p>
          </div>
          <Link
            className="text-sm font-semibold text-blue-900"
            href="/admin/usuarios"
          >
            Voltar aos usuários
          </Link>
        </header>

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <Card>
          <EditUserForm
            user={user}
            managers={managers}
            regionalManagers={regionalManagers}
          />
        </Card>
      </div>
    </main>
  );
}
