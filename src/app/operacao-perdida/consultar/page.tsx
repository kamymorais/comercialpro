import Link from "next/link";
import { BackToMenuBar } from "@/components/layout/BackToMenuBar";
import { ShareLostOperations } from "@/components/lost-operation/ShareLostOperations";
import { Card } from "@/components/ui/Card";
import { LogoutButton } from "@/components/ui/LogoutButton";
import { requireRole } from "@/lib/auth";
import { listVisibleLostOperations } from "@/services/lost-operation.service";

export default async function ConsultLostOperationsPage({ searchParams }: { searchParams: Promise<{ sucesso?: string }> }) {
  const user = await requireRole(["ADMIN", "CONSULTANT", "MANAGER", "REGIONAL_MANAGER"]);
  const [operations, query] = await Promise.all([listVisibleLostOperations({ id: user.id, role: user.role }), searchParams]);
  const csv = buildCsv(operations.map((op) => [op.clientName, op.operationValue?.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) ?? "", op.agency, op.competitorBank, op.rate.toFixed(4).replace(".", ","), op.operationType, op.authorName, op.managerName ?? "", op.createdAt.toLocaleDateString("pt-BR")]));
  return <main className="min-h-screen bg-slate-50 px-5 py-10 text-slate-950"><div className="mx-auto max-w-6xl space-y-6">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-900">Operação perdida</p><h1 className="mt-2 text-3xl font-bold">Consultar minhas operações</h1><p className="mt-2 text-sm text-slate-600">{user.role === "CONSULTANT" ? "Você está vendo somente as operações que registrou." : user.role === "MANAGER" ? "Você está vendo suas operações e as dos seus consultores." : "Você está vendo as operações de toda a estrutura."}</p></div><LogoutButton /></header>
    <div className="flex flex-wrap items-center justify-between gap-3"><BackToMenuBar /><Link href="/operacao-perdida/enviar" className="text-sm font-semibold text-blue-900">+ Registrar operação</Link></div>
    {query.sucesso ? <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-800">{query.sucesso === "editada" ? "Operação atualizada com sucesso." : "Operação registrada com sucesso."}</p> : null}
    <Card className="space-y-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><h2 className="text-lg font-bold">Arquivo com todas as operações ({operations.length})</h2><a href="/api/operacoes-perdidas/exportar" className="inline-flex min-h-12 items-center justify-center rounded-lg border border-slate-200 bg-white px-5 py-3 text-sm font-semibold hover:bg-slate-50">Baixar CSV</a></div><ShareLostOperations csv={csv} /></Card>
    {operations.length === 0 ? <Card><p className="text-sm text-slate-600">Nenhuma operação perdida registrada ainda.</p></Card> : <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white"><table className="w-full min-w-[1050px] text-left text-sm"><thead className="bg-slate-100 text-slate-700"><tr>{["Cliente", "Valor da operação", "Órgão", "Banco concorrente", "Taxa", "Tipo", "Registrado por", "Data"].map((h) => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr></thead><tbody>{operations.map((op) => <tr key={op.id} className="border-t border-slate-100"><td className="px-4 py-3 font-medium"><span className="inline-flex items-center gap-2">{op.canEdit ? <Link href={`/operacao-perdida/editar/${op.id}`} aria-label={`Editar operação de ${op.clientName}`} title="Editar operação" className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-blue-900 hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-900"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="m16 4 4 4M4 20l4.5-1 11-11a2.12 2.12 0 0 0-3-3l-11 11L4 20Z" /></svg></Link> : null}{op.clientName}</span></td><td className="px-4 py-3">{op.operationValue === null ? "—" : op.operationValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td><td className="px-4 py-3">{op.agency}</td><td className="px-4 py-3">{op.competitorBank}</td><td className="px-4 py-3">{op.rate.toLocaleString("pt-BR", { maximumFractionDigits: 4 })}%</td><td className="px-4 py-3">{op.operationType}</td><td className="px-4 py-3">{op.authorName}</td><td className="px-4 py-3">{op.createdAt.toLocaleDateString("pt-BR")}</td></tr>)}</tbody></table></div>}
  </div></main>;
}

function buildCsv(rows: string[][]) {
  const headers = ["Cliente", "Valor da operação (R$)", "Órgão", "Banco concorrente", "Taxa (%)", "Tipo de operação", "Consultor", "Gerente", "Data"];
  return [headers, ...rows].map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(";")).join("\r\n");
}
