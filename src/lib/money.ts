export function formatBRL(value: number | string | null | undefined): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(normalizeMoneyValue(value));
}

export function parseMoneyInput(value: string): number {
  const normalizedValue = value
    .replace(/\s/g, "")
    .replace("R$", "")
    .replace(/\./g, "")
    .replace(",", ".");

  return normalizeMoneyValue(normalizedValue);
}

export function normalizeMoneyValue(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsedValue = Number(value.replace(",", "."));
    return Number.isFinite(parsedValue) ? parsedValue : 0;
  }

  return 0;
}

export function sumMoneyValues(
  values: Array<number | string | null | undefined>,
): number {
  return values.reduce<number>(
    (total, value) => total + normalizeMoneyValue(value),
    0,
  );
}
