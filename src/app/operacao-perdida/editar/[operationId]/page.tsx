import Link from "next/link";
import { notFound } from "next/navigation";
import { BackToMenuBar } from "@/components/layout/BackToMenuBar";
import { LostOperationForm } from "@/components/lost-operation/LostOperationForm";
import { LogoutButton } from "@/components/ui/LogoutButton";
import { requireRole } from "@/lib/auth";
import { getOwnLostOperationForEdit } from "@/services/lost-operation.service";
import { updateLostOperationAction } from "../../actions";

export default async function EditLostOperationPage({ params, searchParams }: { params: Promise<{ operationId: string }>; searchParams: Promise<{ erro?: string }> }) {
  const user = await requireRole(["ADMIN", "CONSULTANT", "MANAGER", "REGIONAL_MANAGER"]);
  const [{ operationId }, { erro }] = await Promise.all([params, searchParams]);
  const operation = await getOwnLostOperationForEdit({ viewer: { id: user.id, role: user.role }, operationId });
  if (!operation) notFound();
  return <main className="min-h-dvh bg-slate-50 px-5 py-10 text-slate-950"><div className="mx-auto max-w-2xl space-y-6"><header className="flex items-start justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-900">Operação perdida</p><h1 className="mt-2 text-3xl font-bold">Editar operação</h1></div><LogoutButton /></header><div className="flex items-center justify-between"><BackToMenuBar /><Link className="text-sm font-semibold text-blue-900" href="/operacao-perdida/consultar">Voltar às operações</Link></div><LostOperationForm action={updateLostOperationAction} operation={operation} error={erro} /></div></main>;
}
