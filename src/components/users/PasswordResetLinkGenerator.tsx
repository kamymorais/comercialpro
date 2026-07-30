"use client";

import { useActionState, useState } from "react";
import {
  generatePasswordResetLinkAction,
  type GeneratePasswordResetLinkState,
} from "@/app/admin/usuarios/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type PasswordResetLinkGeneratorProps = {
  userId: string;
};

const initialState: GeneratePasswordResetLinkState = {
  success: false,
};

export function PasswordResetLinkGenerator({
  userId,
}: PasswordResetLinkGeneratorProps) {
  const [state, formAction, isPending] = useActionState(
    generatePasswordResetLinkAction,
    initialState,
  );
  const [copiedLink, setCopiedLink] = useState("");
  const fullLink =
    state.resetPath && typeof window !== "undefined"
      ? `${window.location.origin}${state.resetPath}`
      : "";
  const copied = copiedLink === fullLink;

  async function copyLink() {
    if (!fullLink) {
      return;
    }

    await navigator.clipboard.writeText(fullLink);
    setCopiedLink(fullLink);
  }

  return (
    <div className="space-y-3">
      <form action={formAction}>
        <input type="hidden" name="userId" value={userId} />
        <Button
          type="submit"
          variant="secondary"
          loading={isPending}
          className="w-full sm:w-auto"
        >
          Gerar link para trocar senha
        </Button>
      </form>

      {state.error ? (
        <div
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
        >
          {state.error}
        </div>
      ) : null}

      {fullLink ? (
        <div className="space-y-3 rounded-lg border border-blue-100 bg-blue-50 p-4">
          <Input
            label="Link de redefinição"
            name={`reset-link-${userId}`}
            value={fullLink}
            readOnly
          />
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button
              type="button"
              onClick={copyLink}
              variant="primary"
              className="w-full sm:w-auto"
            >
              Copiar link
            </Button>
            {copied ? (
              <p className="text-sm font-semibold text-blue-900">
                Link copiado
              </p>
            ) : null}
          </div>
          <p className="text-sm text-blue-950">
            Este link expira em 1 hora e funciona apenas uma vez.
          </p>
        </div>
      ) : null}
    </div>
  );
}
