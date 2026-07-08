import { Card } from "@/components/ui/Card";
import { APP_NAME } from "@/lib/constants";
import { LoginForm } from "@/app/login/LoginForm";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-10 text-slate-950">
      <section className="w-full max-w-md">
        <div className="mb-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-900">
            {APP_NAME}
          </p>
          <h1 className="mt-3 text-3xl font-bold">Acesse sua prévia diária</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Entre com seu usuário e senha para continuar.
          </p>
        </div>

        <Card>
          <LoginForm />
        </Card>
      </section>
    </main>
  );
}
