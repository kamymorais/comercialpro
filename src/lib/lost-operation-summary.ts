export type LostOperationSummaryInput = {
  agency: string;
  authorName: string;
  competitorBank: string;
  operationValue: number | null;
};

export type LostOperationSummaryRow<T extends LostOperationSummaryInput = LostOperationSummaryInput> = {
  label: string;
  count: number;
  total: number;
  percent: number;
  items: T[];
};

export type LostOperationSummaryGroup<T extends LostOperationSummaryInput = LostOperationSummaryInput> = {
  id: "convenio" | "operador" | "banco";
  title: string;
  rows: LostOperationSummaryRow<T>[];
};

export type LostOperationSummary<T extends LostOperationSummaryInput = LostOperationSummaryInput> = {
  totalValue: number;
  totalCount: number;
  groups: LostOperationSummaryGroup<T>[];
};

const GROUPS: { id: LostOperationSummaryGroup["id"]; title: string; key: (op: LostOperationSummaryInput) => string }[] = [
  { id: "convenio", title: "Operações perdidas por convênio", key: (op) => op.agency },
  { id: "operador", title: "Operações perdidas por operador", key: (op) => op.authorName },
  { id: "banco", title: "Operações perdidas por banco", key: (op) => op.competitorBank },
];

export function summarizeLostOperations<T extends LostOperationSummaryInput>(operations: T[]): LostOperationSummary<T> {
  const totalValue = operations.reduce((sum, op) => sum + (op.operationValue ?? 0), 0);
  const groups = GROUPS.map(({ id, title, key }) => {
    const buckets = new Map<string, LostOperationSummaryRow<T>>();
    for (const op of operations) {
      const label = key(op).trim() || "Não informado";
      const bucketId = label.toLocaleLowerCase("pt-BR");
      const bucket = buckets.get(bucketId) ?? { label, count: 0, total: 0, percent: 0, items: [] };
      bucket.count += 1;
      bucket.total += op.operationValue ?? 0;
      bucket.items.push(op);
      buckets.set(bucketId, bucket);
    }
    const rows = [...buckets.values()]
      .map((row) => ({ ...row, percent: totalValue > 0 ? (row.total / totalValue) * 100 : 0 }))
      .sort((a, b) => b.total - a.total || b.count - a.count || a.label.localeCompare(b.label, "pt-BR"));
    return { id, title, rows };
  });
  return { totalValue, totalCount: operations.length, groups };
}

export function formatPercent(value: number) {
  return `${value.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}
