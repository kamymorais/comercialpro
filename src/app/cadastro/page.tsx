import { Card } from "@/components/ui/Card";
import { CadastroForm } from "@/app/cadastro/CadastroForm";
import { listApprovedManagers } from "@/services/user.service";

export const dynamic = "force-dynamic";

export default async function CadastroPage() {
  const managers = await listApprovedManagers();

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-10 text-slate-950">
      <section className="w-full max-w-md">
        <div className="mb-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-900">
            ComercialPro
          </p>
          <h1 className="mt-3 text-3xl font-bold">Solicitar cadastro</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Envie seus dados para análise do administrador.
          </p>
        </div>

        <Card>
          <CadastroForm managers={managers} />
        </Card>
      </section>
    </main>
  );
}
