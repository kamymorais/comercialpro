import { parseBrazilianMoneyToCents } from "@/lib/margin/money";
import type { MarginCandidateFields } from "@/types/margin";

export type MpdftMarginCalculation = {
  gross: number;
  discounts: number;
  pdfMargin: number;
  committedPercent: number;
  seventyPercentMargin: number;
  availableInstallment: number;
  status: "AVAILABLE" | "NEGATIVE_PDF_MARGIN" | "NEGATIVE_SEVENTY_MARGIN";
};

const COMMITMENT_LIMIT_RATIO = 0.7;

export function calculateMpdftMargin(
  candidateFields: MarginCandidateFields,
): MpdftMarginCalculation | null {
  const grossCents = parseBrazilianMoneyToCents(candidateFields.bruto);
  const discountsCents = parseBrazilianMoneyToCents(candidateFields.descontos);
  const pdfMarginCents = parseBrazilianMoneyToCents(candidateFields.margemPdf);

  if (
    grossCents === null ||
    discountsCents === null ||
    pdfMarginCents === null ||
    grossCents <= 0 ||
    discountsCents < 0
  ) {
    return null;
  }

  const gross = grossCents / 100;
  const discounts = discountsCents / 100;
  const pdfMargin = pdfMarginCents / 100;
  const seventyPercentMargin = gross * COMMITMENT_LIMIT_RATIO - discounts;
  const status =
    seventyPercentMargin < 0
      ? "NEGATIVE_SEVENTY_MARGIN"
      : pdfMargin < 0
        ? "NEGATIVE_PDF_MARGIN"
        : "AVAILABLE";

  return {
    gross,
    discounts,
    pdfMargin,
    committedPercent: (discounts / gross) * 100,
    seventyPercentMargin,
    availableInstallment:
      status === "AVAILABLE" ? Math.min(pdfMargin, seventyPercentMargin) : 0,
    status,
  };
}
