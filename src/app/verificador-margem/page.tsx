import { BackToMenuBar } from "@/components/layout/BackToMenuBar";
import { MarginInfoCard } from "@/components/margin/MarginInfoCard";
import { MarginUploadForm } from "@/components/margin/MarginUploadForm";
import { Card } from "@/components/ui/Card";
import { LogoutButton } from "@/components/ui/LogoutButton";
import { requireRole } from "@/lib/auth";

export default async function VerificadorMargemPage() {
  await requireRole(["ADMIN", "CONSULTANT", "MANAGER", "REGIONAL_MANAGER"]);

  return (
    <main className="min-h-dvh bg-slate-50 px-5 py-10 text-slate-950">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-900">
              ComercialPro
            </p>
            <h1 className="mt-2 text-3xl font-bold">Verificador de Margem</h1>
            <p className="mt-2 text-sm text-slate-600">
              Envie um contracheque em PDF para extrair os dados do documento.
            </p>
          </div>
          <LogoutButton />
        </header>

        <BackToMenuBar />

        <Card>
          <MarginUploadForm />
        </Card>

        <MarginInfoCard
          title="Formatos aceitos"
          description="PDF com texto selecionável, até 4 MB."
        />
      </div>
    </main>
  );
}
