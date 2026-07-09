import { BackToMenuBar } from "@/components/layout/BackToMenuBar";
import { VisitDiary } from "@/components/visit/VisitDiary";
import { LogoutButton } from "@/components/ui/LogoutButton";
import { requireRole } from "@/lib/auth";

export default async function DiarioVisitaPage() {
  await requireRole(["ADMIN", "CONSULTANT", "MANAGER", "REGIONAL_MANAGER"]);

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10 text-slate-950">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-900">
              ComercialPro
            </p>
            <h1 className="mt-2 text-3xl font-bold">Diário de visita</h1>
            <p className="mt-2 text-sm text-slate-600">
              Localize o convênio mais próximo para registrar a visita.
            </p>
          </div>
          <LogoutButton />
        </header>

        <BackToMenuBar />

        <VisitDiary />
      </div>
    </main>
  );
}
