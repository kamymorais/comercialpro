import Link from "next/link";
import { BackToMenuBar } from "@/components/layout/BackToMenuBar";
import { Card } from "@/components/ui/Card";
import { LogoutButton } from "@/components/ui/LogoutButton";
import { requireRole } from "@/lib/auth";

export default async function LostOperationPage() {
  await requireRole(["ADMIN", "CONSULTANT", "MANAGER", "REGIONAL_MANAGER"]);
  return <main className="min-h-dvh bg-slate-50 px-5 py-10 text-slate-950"><div className="mx-auto max-w-3xl space-y-6">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-900">ComercialPro</p><h1 className="mt-2 text-3xl font-bold">Operação perdida</h1><p className="mt-2 text-sm text-slate-600">Registre e consulte operações fechadas com a concorrência.</p></div><LogoutButton /></header>
    <BackToMenuBar />
    <section className="grid gap-4 sm:grid-cols-2"><ModuleCard href="/operacao-perdida/enviar" title="Enviar informações para meu gestor" description="Informe os dados da operação perdida."/><ModuleCard href="/operacao-perdida/consultar" title="Consultar minhas operações" description="Consulte, edite e compartilhe suas operações e as da sua equipe."/></section>
  </div></main>;
}

function ModuleCard({ href, title, description }: { href: string; title: string; description: string }) {
  return <Link href={href}><Card className="flex h-full min-h-40 flex-col justify-between gap-4 transition hover:border-blue-200 hover:bg-blue-50"><div><h2 className="text-xl font-bold">{title}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{description}</p></div><span className="text-sm font-semibold text-blue-900">Abrir →</span></Card></Link>;
}
