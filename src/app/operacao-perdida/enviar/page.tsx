import Link from "next/link";
import { BackToMenuBar } from "@/components/layout/BackToMenuBar";
import { LostOperationForm } from "@/components/lost-operation/LostOperationForm";
import { LogoutButton } from "@/components/ui/LogoutButton";
import { requireRole } from "@/lib/auth";
import { createLostOperationAction } from "../actions";

export default async function SendLostOperationPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  await requireRole(["ADMIN", "CONSULTANT", "MANAGER", "REGIONAL_MANAGER"]);
  const { erro } = await searchParams;
  return <main className="min-h-dvh bg-slate-50 px-5 py-10 text-slate-950"><div className="mx-auto max-w-2xl space-y-6"><header className="flex items-start justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-900">Operação perdida</p><h1 className="mt-2 text-3xl font-bold">Enviar informações para meu gestor</h1><p className="mt-2 text-sm text-slate-600">Preencha os dados da operação para manter o registro.</p></div><LogoutButton /></header><div className="flex items-center justify-between"><BackToMenuBar /><Link className="text-sm font-semibold text-blue-900" href="/operacao-perdida">Voltar</Link></div><LostOperationForm action={createLostOperationAction} error={erro} /></div></main>;
}
