const brlFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function parseBrazilianMoneyToCents(value: string | null | undefined): number | null {
  if (!value) {
    return null;
  }

  const trimmedValue = value.trim();
  const isNegative = /^-|\((.*)\)/.test(trimmedValue);
  const numericValue = trimmedValue.replace(/\s/g, "").replace(/[^\d,.-]/g, "");

  if (!numericValue) {
    return null;
  }

  const unsignedValue = numericValue.replace(/^-/, "");
  const lastCommaIndex = unsignedValue.lastIndexOf(",");
  const lastDotIndex = unsignedValue.lastIndexOf(".");
  let normalizedValue = unsignedValue;

  if (lastCommaIndex > -1 && lastDotIndex > -1) {
    const decimalSeparator = lastCommaIndex > lastDotIndex ? "," : ".";
    const thousandsSeparator = decimalSeparator === "," ? "." : ",";

    normalizedValue = unsignedValue
      .replaceAll(thousandsSeparator, "")
      .replace(decimalSeparator, ".");
  } else if (lastCommaIndex > -1) {
    normalizedValue = unsignedValue.replaceAll(".", "").replace(",", ".");
  } else if (lastDotIndex > -1) {
    const decimalDigits = unsignedValue.length - lastDotIndex - 1;
    normalizedValue =
      decimalDigits === 2 ? unsignedValue : unsignedValue.replaceAll(".", "");
  }

  const parsedValue = Number(normalizedValue);

  if (!Number.isFinite(parsedValue)) {
    return null;
  }

  const cents = Math.round(parsedValue * 100);

  return isNegative ? -cents : cents;
}

export function formatCentsToBRL(cents: number): string {
  return brlFormatter.format(cents / 100);
}

// Percentuais monetários são arredondados para o centavo mais próximo.
export function applyPercentToCents(
  cents: number,
  numerator: number,
  denominator = 100,
): number {
  return Math.round((cents * numerator) / denominator);
}
