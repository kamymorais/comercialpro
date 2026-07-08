import { approvePendingUserAction, rejectPendingUserAction } from "@/app/admin/cadastros/actions";
import { ManagerSelect } from "@/components/users/ManagerSelect";
import { getRoleLabel, UserRoleSelect } from "@/components/users/UserRoleSelect";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { formatDateBR } from "@/lib/dates";
import type { PendingUser } from "@/services/approval.service";
import type { ManagerOption } from "@/services/user.service";

type PendingUserCardProps = {
  user: PendingUser;
  managers: ManagerOption[];
};

export function PendingUserCard({ user, managers }: PendingUserCardProps) {
  return (
    <Card className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-950">{user.fullName}</h2>
          <p className="mt-1 text-sm text-slate-600">@{user.username}</p>
        </div>
        <Badge variant="warning">{getRoleLabel(user.requestedRole)}</Badge>
      </div>

      <dl className="grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
        <div>
          <dt className="font-semibold text-slate-900">Gerente escolhido</dt>
          <dd className="mt-1">
            {user.manager
              ? `${user.manager.fullName} (${user.manager.username})`
              : "Não se aplica"}
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-900">Solicitado em</dt>
          <dd className="mt-1">{formatDateBR(user.createdAt)}</dd>
        </div>
      </dl>

      <form action={approvePendingUserAction} className="grid gap-4">
        <input type="hidden" name="userId" value={user.id} />
        <div className="grid gap-4 sm:grid-cols-2">
          <UserRoleSelect defaultValue={user.requestedRole} />
          <ManagerSelect managers={managers} defaultValue={user.managerId} />
        </div>
        <p className="text-xs leading-5 text-slate-500">
          Para aprovar como consultor, selecione um gerente aprovado.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="submit"
            className="inline-flex min-h-12 flex-1 items-center justify-center rounded-lg bg-blue-900 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-950"
          >
            Aprovar cadastro
          </button>
          <button
            formAction={rejectPendingUserAction}
            type="submit"
            className="inline-flex min-h-12 flex-1 items-center justify-center rounded-lg bg-red-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700"
          >
            Rejeitar
          </button>
        </div>
      </form>
    </Card>
  );
}
