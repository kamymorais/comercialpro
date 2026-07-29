"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ManagerSelect } from "@/components/users/ManagerSelect";
import {
  createPendingUserAction,
  type CadastroFormState,
} from "@/app/cadastro/actions";
import { formatFullNameInput } from "@/lib/validation";
import type { ManagerOption } from "@/services/user.service";

type CadastroFormProps = {
  managers: ManagerOption[];
};

const initialState: CadastroFormState = {};

export function CadastroForm({ managers }: CadastroFormProps) {
  const [state, formAction, isPending] = useActionState(
    createPendingUserAction,
    initialState,
  );
  const [requestedRole, setRequestedRole] = useState("CONSULTANT");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={formAction} className="space-y-4">
      <Input
        label="Nome completo"
        name="fullName"
        type="text"
        autoComplete="name"
        placeholder="Digite seu nome completo"
        value={fullName}
        onChange={(event) => setFullName(formatFullNameInput(event.target.value))}
        required
      />
      <Input
        label="Usuário de acesso"
        name="username"
        type="text"
        autoComplete="username"
        placeholder="Crie seu usuário"
        required
      />
      <Input
        label="Senha"
        name="password"
        type={showPassword ? "text" : "password"}
        autoComplete="new-password"
        placeholder="Crie sua senha"
        required
      />
      <label className="flex w-fit items-center gap-2 text-sm font-medium text-slate-700">
        <input
          type="checkbox"
          checked={showPassword}
          onChange={(event) => setShowPassword(event.target.checked)}
          className="h-4 w-4 rounded border-slate-300 text-blue-900 focus:ring-blue-900"
        />
        Mostrar senha
      </label>

      <label className="block w-full" htmlFor="requestedRole">
        <span className="mb-2 block text-sm font-medium text-slate-800">
          Perfil solicitado
        </span>
        <select
          id="requestedRole"
          name="requestedRole"
          value={requestedRole}
          onChange={(event) => setRequestedRole(event.target.value)}
          className="min-h-12 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-base text-slate-950 shadow-sm outline-none transition focus:border-blue-900 focus:ring-2 focus:ring-blue-100"
          required
        >
          <option value="CONSULTANT">Consultor</option>
          <option value="MANAGER">Gerente</option>
          <option value="REGIONAL_MANAGER">Superintendente</option>
        </select>
      </label>

      {requestedRole === "CONSULTANT" ? (
        <ManagerSelect managers={managers} required />
      ) : null}

      {state.error ? (
        <div
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
        >
          {state.error}
        </div>
      ) : null}

      <Button type="submit" className="w-full" loading={isPending}>
        Enviar cadastro
      </Button>
    </form>
  );
}
