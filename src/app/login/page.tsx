import { Card } from "@/components/ui/Card";
import { APP_NAME } from "@/lib/constants";
import { LoginForm } from "@/app/login/LoginForm";

type LoginPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = searchParams ? await searchParams : {};
  const passwordReset = params.senhaRedefinida === "1";

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-10 text-slate-950">
      <section className="w-full max-w-md">
        <div className="mb-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-900">
            {APP_NAME}
          </p>
          <h1 className="mt-3 text-3xl font-bold">Entrar</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Entre com seu usuário e senha para continuar.
          </p>
        </div>

        {passwordReset ? (
          <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-950">
            Senha alterada com sucesso. Entre usando sua nova senha.
          </div>
        ) : null}

        <Card>
          <LoginForm />
        </Card>
      </section>
    </main>
  );
}
