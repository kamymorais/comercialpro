import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { listVisibleLostOperations } from "@/services/lost-operation.service";

function csvCell(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

export async function GET() {
  const user = await requireRole(["ADMIN", "CONSULTANT", "MANAGER", "REGIONAL_MANAGER"]);
  const operations = await listVisibleLostOperations({ id: user.id, role: user.role });
  const rows = [
    ["Cliente", "Valor da operação (R$)", "Órgão", "Banco concorrente", "Taxa (%)", "Tipo de operação", "Consultor", "Gerente", "Data"],
    ...operations.map((op) => [op.clientName, op.operationValue?.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) ?? "", op.agency, op.competitorBank, op.rate.toFixed(4).replace(".", ","), op.operationType, op.authorName, op.managerName ?? "", op.createdAt.toLocaleDateString("pt-BR")]),
  ];
  const csv = "\uFEFF" + rows.map((row) => row.map(csvCell).join(";")).join("\r\n");
  return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename=operacoes-perdidas.csv", "Cache-Control": "private, no-store" } });
}
