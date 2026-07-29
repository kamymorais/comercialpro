import Link from "next/link";
import { BackToMenuBar } from "@/components/layout/BackToMenuBar";
import { LogoutButton } from "@/components/ui/LogoutButton";
import { AgreementLocator } from "@/components/visit/AgreementLocator";
import { requireRole } from "@/lib/auth";

export default async function LocalizarConvenioPage() {
  await requireRole(["ADMIN", "CONSULTANT", "MANAGER", "REGIONAL_MANAGER"]);

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10 text-slate-950">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-900">
              Diário de visita
            </p>
            <h1 className="mt-2 text-3xl font-bold">Localizar convênio</h1>
            <p className="mt-2 text-sm text-slate-600">
              Localize o convênio mais próximo pela localização do celular.
            </p>
          </div>
          <LogoutButton />
        </header>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <BackToMenuBar />
          <Link
            href="/diario-visita"
            className="text-sm font-semibold text-blue-900"
          >
            Voltar ao Diário de visita
          </Link>
        </div>

        <AgreementLocator />
      </div>
    </main>
  );
}
