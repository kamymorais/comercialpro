import { BackToMenuBar } from "@/components/layout/BackToMenuBar";
import { MarginInfoCard } from "@/components/margin/MarginInfoCard";
import { MarginUploadForm } from "@/components/margin/MarginUploadForm";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { LogoutButton } from "@/components/ui/LogoutButton";
import { requireRole } from "@/lib/auth";

export default async function VerificadorMargemPage() {
  await requireRole(["ADMIN", "CONSULTANT", "MANAGER", "REGIONAL_MANAGER"]);

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10 text-slate-950">
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

        <Card variant="highlight" className="space-y-3">
          <Badge variant="warning">Cálculo pendente</Badge>
          <p className="text-sm leading-6 text-slate-700">
            O cálculo da margem ainda não está ativo. Nesta versão, o sistema
            apenas recebe o PDF e exibe os dados extraídos do contracheque.
          </p>
        </Card>

        <Card>
          <MarginUploadForm />
        </Card>

        <MarginInfoCard
          title="Formatos aceitos"
          description="PDF com texto selecionável, até 4 MB."
        />

        <MarginInfoCard
          variant="warning"
          title="Cálculo ainda não disponível"
          description="O cálculo da margem será implementado em uma etapa futura, após validação completa do layout do contracheque."
        />
      </div>
    </main>
  );
}
