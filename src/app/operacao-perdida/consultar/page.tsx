import Link from "next/link";
import type { ReactNode } from "react";
import { BackToMenuBar } from "@/components/layout/BackToMenuBar";
import { ShareLostOperations } from "@/components/lost-operation/ShareLostOperations";
import { Card } from "@/components/ui/Card";
import { LogoutButton } from "@/components/ui/LogoutButton";
import { requireRole } from "@/lib/auth";
import { formatPercent, summarizeLostOperations, type LostOperationSummaryGroup } from "@/lib/lost-operation-summary";
import { listVisibleLostOperations, type LostOperationView } from "@/services/lost-operation.service";

const brl = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const GROUP_LABELS: Record<LostOperationSummaryGroup["id"], { singular: string; plural: string; icon: ReactNode }> = {
  convenio: { singular: "convênio", plural: "convênios", icon: <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M5 21V9l7-5 7 5v12M9 21v-6h6v6" /> },
  operador: { singular: "operador", plural: "operadores", icon: <path strokeLinecap="round" strokeLinejoin="round" d="M16 19v-1a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v1M10 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm10 9v-1a4 4 0 0 0-3-3.87M16 4.13a3 3 0 0 1 0 5.74" /> },
  banco: { singular: "banco", plural: "bancos", icon: <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M5 10v8m4.67-8v8m4.66-8v8M19 10v8M3 21h18M12 3l9 5H3l9-5Z" /> },
};

export default async function ConsultLostOperationsPage({ searchParams }: { searchParams: Promise<{ sucesso?: string }> }) {
  const user = await requireRole(["ADMIN", "CONSULTANT", "MANAGER", "REGIONAL_MANAGER"]);
  const [operations, query] = await Promise.all([listVisibleLostOperations({ id: user.id, role: user.role }), searchParams]);
  const csv = buildCsv(operations.map((op) => [op.clientName, op.operationValue?.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) ?? "", op.agency, op.competitorBank, op.rate.toFixed(4).replace(".", ","), op.operationType, op.authorName, op.managerName ?? "", op.createdAt.toLocaleDateString("pt-BR")]));
  const summary = summarizeLostOperations(operations);
  const topAgency = summary.groups.find((group) => group.id === "convenio")?.rows[0];

  return <main className="min-h-dvh bg-slate-50 px-5 py-10 text-slate-950"><div className="mx-auto max-w-6xl space-y-6">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-900">Operação perdida</p><h1 className="mt-2 text-3xl font-bold">Consultar minhas operações</h1><p className="mt-2 text-sm text-slate-600">{user.role === "CONSULTANT" ? "Você está vendo somente as operações que registrou." : user.role === "MANAGER" ? "Você está vendo suas operações e as dos seus consultores." : "Você está vendo as operações de toda a estrutura."}</p></div><LogoutButton /></header>
    <div className="flex flex-wrap items-center justify-between gap-3"><BackToMenuBar /><Link href="/operacao-perdida/enviar" className="text-sm font-semibold text-blue-900">+ Registrar operação</Link></div>
    {query.sucesso ? <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-800">{query.sucesso === "editada" ? "Operação atualizada com sucesso." : "Operação registrada com sucesso."}</p> : null}

    {operations.length === 0 ? <Card><p className="text-sm text-slate-600">Nenhuma operação perdida registrada ainda.</p></Card> : <>
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Operações perdidas" value={String(summary.totalCount)} />
        <Stat label="Valor total acumulado" value={brl(summary.totalValue)} />
        <Stat label="Maior perda por convênio" value={topAgency && topAgency.total > 0 ? topAgency.label : "—"} hint={topAgency && topAgency.total > 0 ? `${brl(topAgency.total)} · ${formatPercent(topAgency.percent)}` : undefined} />
      </div>

      <div className="space-y-3">
        {summary.groups.map((group) => <SummarySection key={group.id} group={group} totalCount={summary.totalCount} totalValue={summary.totalValue} />)}

        <details className="group/sec overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <SectionHeader icon={<path strokeLinecap="round" strokeLinejoin="round" d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />} title="Todas as operações" subtitle={`${operations.length} ${operations.length === 1 ? "operação registrada" : "operações registradas"}`} />
          <div className="overflow-x-auto border-t border-slate-200"><table className="w-full min-w-[1050px] text-left text-sm"><thead className="bg-slate-100 text-slate-700"><tr>{["Cliente", "Valor da operação", "Órgão", "Banco concorrente", "Taxa", "Tipo", "Registrado por", "Data"].map((h) => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr></thead><tbody>{operations.map((op) => <tr key={op.id} className="border-t border-slate-100"><td className="px-4 py-3 font-medium"><ClientName op={op} /></td><td className="px-4 py-3">{op.operationValue === null ? "—" : brl(op.operationValue)}</td><td className="px-4 py-3">{op.agency}</td><td className="px-4 py-3">{op.competitorBank}</td><td className="px-4 py-3">{op.rate.toLocaleString("pt-BR", { maximumFractionDigits: 4 })}%</td><td className="px-4 py-3">{op.operationType}</td><td className="px-4 py-3">{op.authorName}</td><td className="px-4 py-3">{op.createdAt.toLocaleDateString("pt-BR")}</td></tr>)}</tbody></table></div>
        </details>
      </div>
      <p className="text-xs text-slate-500">Toque em cada opção para ver o detalhamento e em cada nome para ver as operações. Ordenado pelo maior valor perdido; o % considera o valor das operações e registros sem valor entram apenas na quantidade.</p>
    </>}

    <Card className="space-y-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-lg font-bold">Exportar para Excel</h2><p className="text-sm text-slate-600">Arquivo com todas as operações ({operations.length}).</p></div><a href="/api/operacoes-perdidas/exportar" className="inline-flex min-h-12 items-center justify-center rounded-lg border border-slate-200 bg-white px-5 py-3 text-sm font-semibold hover:bg-slate-50">Baixar arquivo</a></div><ShareLostOperations csv={csv} /></Card>
  </div></main>;
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 truncate text-2xl font-bold" title={value}>{value}</p>{hint ? <p className="mt-1 text-sm font-medium text-red-800">{hint}</p> : null}</div>;
}

function SectionHeader({ icon, title, subtitle }: { icon: ReactNode; title: string; subtitle: string }) {
  return <summary className="flex cursor-pointer list-none items-center gap-4 p-4 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-900 [&::-webkit-details-marker]:hidden">
    <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-900"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">{icon}</svg></span>
    <span className="min-w-0 flex-1"><span className="block font-bold">{title}</span><span className="block truncate text-sm text-slate-600">{subtitle}</span></span>
    <Chevron className="group-open/sec:rotate-180" />
  </summary>;
}

function SummarySection({ group, totalCount, totalValue }: { group: LostOperationSummaryGroup<LostOperationView>; totalCount: number; totalValue: number }) {
  const labels = GROUP_LABELS[group.id];
  const top = group.rows[0];
  const subtitle = `${group.rows.length} ${group.rows.length === 1 ? labels.singular : labels.plural}${top && top.total > 0 ? ` · maior perda: ${top.label} (${formatPercent(top.percent)})` : ""}`;
  return <details className="group/sec overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
    <SectionHeader icon={labels.icon} title={group.title} subtitle={subtitle} />
    <div className="border-t border-slate-200">
      <div className="hidden grid-cols-[1fr_5rem_9rem_5rem_1.25rem] gap-3 bg-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 sm:grid"><span className="capitalize">{labels.singular}</span><span className="text-right">Qtd.</span><span className="text-right">Valor</span><span className="text-right">%</span><span /></div>
      {group.rows.map((row, index) => {
        const highlight = index === 0 && row.total > 0;
        return <details key={row.label} className="group/row border-t border-slate-100 first:border-t-0">
          <summary className="grid cursor-pointer list-none grid-cols-[1fr_auto_1.25rem] items-center gap-x-3 gap-y-1 px-4 py-3 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-900 sm:grid-cols-[1fr_5rem_9rem_5rem_1.25rem] [&::-webkit-details-marker]:hidden">
            <span className="min-w-0"><span className={`block truncate font-semibold ${highlight ? "text-red-800" : ""}`}>{row.label}</span><span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-slate-100"><span className={`block h-full rounded-full ${highlight ? "bg-red-700" : "bg-blue-900"}`} style={{ width: `${Math.max(row.percent, row.total > 0 ? 2 : 0)}%` }} /></span></span>
            <span className="text-right text-sm text-slate-600 sm:hidden">{row.count} · {formatPercent(row.percent)}<span className="block font-semibold text-slate-950">{brl(row.total)}</span></span>
            <span className="hidden text-right text-sm sm:block">{row.count}</span>
            <span className="hidden whitespace-nowrap text-right text-sm font-semibold sm:block">{brl(row.total)}</span>
            <span className={`hidden text-right text-sm font-semibold sm:block ${highlight ? "text-red-800" : ""}`}>{formatPercent(row.percent)}</span>
            <Chevron className="group-open/row:rotate-180" />
          </summary>
          <ul className="space-y-2 bg-slate-50 px-4 py-3">{row.items.map((op) => <li key={op.id} className="flex flex-col gap-1 rounded-lg border border-slate-200 bg-white p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
            <span className="min-w-0"><span className="block font-medium"><ClientName op={op} /></span><span className="block text-slate-600">{[group.id !== "convenio" ? op.agency : null, group.id !== "banco" ? op.competitorBank : null, op.operationType, group.id !== "operador" ? op.authorName : null].filter(Boolean).join(" · ")}</span></span>
            <span className="shrink-0 text-slate-600 sm:text-right"><span className="font-semibold text-slate-950">{op.operationValue === null ? "Sem valor" : brl(op.operationValue)}</span> · {op.rate.toLocaleString("pt-BR", { maximumFractionDigits: 4 })}% · {op.createdAt.toLocaleDateString("pt-BR")}</span>
          </li>)}</ul>
        </details>;
      })}
      <div className="grid grid-cols-[1fr_auto_1.25rem] gap-3 border-t-2 border-slate-200 px-4 py-3 text-sm font-bold sm:grid-cols-[1fr_5rem_9rem_5rem_1.25rem]"><span>Total</span><span className="text-right sm:hidden">{totalCount} · {brl(totalValue)}</span><span className="hidden text-right sm:block">{totalCount}</span><span className="hidden whitespace-nowrap text-right sm:block">{brl(totalValue)}</span><span className="hidden text-right sm:block">{totalValue > 0 ? "100,0%" : "—"}</span><span /></div>
    </div>
  </details>;
}

function ClientName({ op }: { op: LostOperationView }) {
  return <span className="inline-flex items-center gap-2">{op.canEdit ? <Link href={`/operacao-perdida/editar/${op.id}`} aria-label={`Editar operação de ${op.clientName}`} title="Editar operação" className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-blue-900 hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-900"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="m16 4 4 4M4 20l4.5-1 11-11a2.12 2.12 0 0 0-3-3l-11 11L4 20Z" /></svg></Link> : null}{op.clientName}</span>;
}

function Chevron({ className = "" }: { className?: string }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`h-5 w-5 shrink-0 text-slate-500 transition-transform ${className}`}><path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" /></svg>;
}

function buildCsv(rows: string[][]) {
  const headers = ["Cliente", "Valor da operação (R$)", "Órgão", "Banco concorrente", "Taxa (%)", "Tipo de operação", "Consultor", "Gerente", "Data"];
  return [headers, ...rows].map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(";")).join("\r\n");
}
