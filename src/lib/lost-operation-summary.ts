export type LostOperationSummaryInput = {
  agency: string;
  authorName: string;
  competitorBank: string;
  operationValue: number | null;
};

export type LostOperationSummaryRow = {
  label: string;
  count: number;
  total: number;
  percent: number;
};

export type LostOperationSummaryGroup = {
  title: string;
  rows: LostOperationSummaryRow[];
};

export type LostOperationSummary = {
  totalValue: number;
  totalCount: number;
  groups: LostOperationSummaryGroup[];
};

const GROUPS: { title: string; key: (op: LostOperationSummaryInput) => string }[] = [
  { title: "Por convênio", key: (op) => op.agency },
  { title: "Por operador", key: (op) => op.authorName },
  { title: "Por banco", key: (op) => op.competitorBank },
];

export function summarizeLostOperations(operations: LostOperationSummaryInput[]): LostOperationSummary {
  const totalValue = operations.reduce((sum, op) => sum + (op.operationValue ?? 0), 0);
  const groups = GROUPS.map(({ title, key }) => {
    const buckets = new Map<string, LostOperationSummaryRow>();
    for (const op of operations) {
      const label = key(op).trim() || "Não informado";
      const id = label.toLocaleLowerCase("pt-BR");
      const bucket = buckets.get(id) ?? { label, count: 0, total: 0, percent: 0 };
      bucket.count += 1;
      bucket.total += op.operationValue ?? 0;
      buckets.set(id, bucket);
    }
    const rows = [...buckets.values()]
      .map((row) => ({ ...row, percent: totalValue > 0 ? (row.total / totalValue) * 100 : 0 }))
      .sort((a, b) => b.total - a.total || b.count - a.count || a.label.localeCompare(b.label, "pt-BR"));
    return { title, rows };
  });
  return { totalValue, totalCount: operations.length, groups };
}

export function formatPercent(value: number) {
  return `${value.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}
