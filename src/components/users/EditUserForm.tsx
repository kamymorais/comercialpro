"use client";

import { useState } from "react";
import { updateRegisteredUserAction } from "@/app/admin/usuarios/actions";
import { ManagerSelect } from "@/components/users/ManagerSelect";
import { Input } from "@/components/ui/Input";
import type { Role } from "@/generated/prisma/client";
import type { AdminEditableUser } from "@/services/admin.service";
import type { ManagerOption } from "@/services/user.service";

type EditUserFormProps = {
  user: AdminEditableUser;
  managers: ManagerOption[];
  regionalManagers: ManagerOption[];
};

const selectClassName =
  "min-h-12 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-base text-slate-950 shadow-sm outline-none transition focus:border-blue-900 focus:ring-2 focus:ring-blue-100";

export function EditUserForm({
  user,
  managers,
  regionalManagers,
}: EditUserFormProps) {
  const isAdmin = user.role === "ADMIN";
  const [role, setRole] = useState<Role | "">(user.role ?? "CONSULTANT");
  const availableManagers = managers.filter((manager) => manager.id !== user.id);

  return (
    <form action={updateRegisteredUserAction} className="grid gap-5">
      <input type="hidden" name="userId" value={user.id} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Nome completo"
          name="fullName"
          defaultValue={user.fullName}
          required
        />
        <Input
          label="Usuário"
          name="username"
          defaultValue={user.username}
          autoCapitalize="none"
          required
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block w-full" htmlFor="role">
          <span className="mb-2 block text-sm font-medium text-slate-800">
            Perfil
          </span>
          {isAdmin ? (
            <select id="role" disabled className={selectClassName}>
              <option>Administrador</option>
            </select>
          ) : (
            <select
              id="role"
              name="role"
              value={role}
              onChange={(event) => setRole(event.target.value as Role)}
              className={selectClassName}
              required
            >
              <option value="CONSULTANT">Consultor</option>
              <option value="MANAGER">Gerente</option>
              <option value="REGIONAL_MANAGER">Superintendente</option>
            </select>
          )}
        </label>

        {role === "CONSULTANT" && !isAdmin ? (
          <ManagerSelect
            managers={availableManagers}
            defaultValue={user.managerId}
            required
          />
        ) : null}

        {role === "MANAGER" && !isAdmin ? (
          <label className="block w-full" htmlFor="regionalManagerId">
            <span className="mb-2 block text-sm font-medium text-slate-800">
              Superintendente
            </span>
            <select
              id="regionalManagerId"
              name="regionalManagerId"
              defaultValue={user.regionalManagerId ?? ""}
              className={selectClassName}
            >
              <option value="">Sem superintendente</option>
              {regionalManagers
                .filter((regionalManager) => regionalManager.id !== user.id)
                .map((regionalManager) => (
                  <option key={regionalManager.id} value={regionalManager.id}>
                    {regionalManager.fullName} ({regionalManager.username})
                  </option>
                ))}
            </select>
          </label>
        ) : null}
      </div>

      <button
        type="submit"
        className="inline-flex min-h-12 items-center justify-center rounded-lg bg-blue-900 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-950"
      >
        Salvar alterações
      </button>
    </form>
  );
}
