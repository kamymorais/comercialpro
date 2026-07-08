"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { loginAction, type LoginFormState } from "@/app/login/actions";

const initialState: LoginFormState = {};

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(
    loginAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <Input
        label="Usuário de acesso"
        name="username"
        type="text"
        autoComplete="username"
        placeholder="Digite seu usuário"
        required
      />
      <Input
        label="Senha"
        name="password"
        type="password"
        autoComplete="current-password"
        placeholder="Digite sua senha"
        required
      />

      {state.error ? (
        <div
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
        >
          {state.error}
        </div>
      ) : null}

      <Button type="submit" className="w-full" loading={isPending}>
        Entrar
      </Button>

      <div className="space-y-2 text-center text-sm text-slate-600">
        <p>Sua sessão expira após 3 horas.</p>
        <Link className="font-semibold text-blue-900" href="/cadastro">
          Solicitar cadastro
        </Link>
      </div>
    </form>
  );
}
