import Link from "next/link";
import { Card } from "@/components/ui/Card";
import {
  INVALID_RESET_LINK_MESSAGE,
  validatePasswordResetToken,
} from "@/services/password-reset.service";
import { PasswordResetForm } from "@/app/redefinir-senha/[token]/PasswordResetForm";

type RedefinirSenhaPageProps = {
  params: Promise<{ token: string }>;
};

export default async function RedefinirSenhaPage({
  params,
}: RedefinirSenhaPageProps) {
  const { token } = await params;
  const validation = await validatePasswordResetToken(token);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-10 text-slate-950">
      <section className="w-full max-w-md">
        <div className="mb-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-900">
            ComercialPro
          </p>
          <h1 className="mt-3 text-3xl font-bold">Redefinir senha</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Crie uma nova senha para voltar a acessar sua conta.
          </p>
        </div>

        <Card>
          {validation.valid ? (
            <div className="space-y-5">
              <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-950">
                Link válido para @{validation.user?.username}. Este link expira
                em 1 hora e funciona apenas uma vez.
              </div>
              <PasswordResetForm token={token} />
            </div>
          ) : (
            <div className="space-y-4">
              <div
                className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                role="alert"
              >
                {validation.message ?? INVALID_RESET_LINK_MESSAGE}
              </div>
              <Link
                href="/login"
                className="inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-blue-900 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-950"
              >
                Voltar ao login
              </Link>
            </div>
          )}
        </Card>
      </section>
    </main>
  );
}
