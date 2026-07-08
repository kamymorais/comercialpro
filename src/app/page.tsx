import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

const futureProfiles = ["Admin", "Consultor", "Gerente", "Gerente Regional"];

export default function Home() {
  return (
    <AppShell
      title="ComercialPro"
      subtitle="Sistema de previsao diaria de pagamentos."
      showBottomNav
    >
      <section className="space-y-4">
        <Card variant="highlight">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Badge variant="success">Projeto base iniciado</Badge>
              <p className="mt-4 max-w-xl text-base leading-7 text-slate-700">
                A estrutura visual inicial esta pronta para receber as proximas
                etapas do ComercialPro.
              </p>
            </div>
            <Button className="w-full sm:w-auto">Continuar configuracao</Button>
          </div>
        </Card>

        <Card>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Etapa atual</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-950">
                Layout inicial
              </h2>
            </div>
            <Badge variant="info">Etapa 02</Badge>
          </div>
        </Card>

        <Card>
          <h2 className="text-base font-semibold text-slate-950">
            Perfis futuros
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {futureProfiles.map((profile) => (
              <div
                key={profile}
                className="flex min-h-16 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-center text-sm font-medium text-slate-700"
              >
                {profile}
              </div>
            ))}
          </div>
        </Card>
      </section>
    </AppShell>
  );
}
