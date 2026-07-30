"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  resetPasswordAction,
  type ResetPasswordFormState,
} from "@/app/redefinir-senha/[token]/actions";

type PasswordResetFormProps = {
  token: string;
};

const initialState: ResetPasswordFormState = {};

export function PasswordResetForm({ token }: PasswordResetFormProps) {
  const [state, formAction, isPending] = useActionState(
    resetPasswordAction,
    initialState,
  );
  const [showPassword, setShowPassword] = useState(false);
  const passwordType = showPassword ? "text" : "password";

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="token" value={token} />

      <Input
        label="Nova senha"
        name="password"
        type={passwordType}
        autoComplete="new-password"
        placeholder="Digite a nova senha"
        minLength={8}
        required
      />
      <Input
        label="Confirmar nova senha"
        name="passwordConfirmation"
        type={passwordType}
        autoComplete="new-password"
        placeholder="Digite a senha novamente"
        minLength={8}
        required
      />

      <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
        <input
          type="checkbox"
          checked={showPassword}
          onChange={(event) => setShowPassword(event.target.checked)}
          className="h-5 w-5 rounded border-slate-300 text-blue-900 focus:ring-blue-900"
        />
        Mostrar senha
      </label>

      {state.error ? (
        <div
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
        >
          {state.error}
        </div>
      ) : null}

      <Button type="submit" className="w-full" loading={isPending}>
        Alterar senha
      </Button>
    </form>
  );
}
