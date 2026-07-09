import { LoanSimulation } from "@/components/margin/LoanSimulation";
import type { MarginCandidateFields, MarginExtractionResult } from "@/types/margin";

type MarginExtractionViewerProps = {
  extraction: MarginExtractionResult;
};

type MarginCalculation = {
  gross: number;
  discounts: number;
  pdfMargin: number;
  committedPercent: number;
  seventyPercentMargin: number;
  availableInstallment: number;
  status: "AVAILABLE" | "NEGATIVE_PDF_MARGIN" | "NEGATIVE_SEVENTY_MARGIN";
};

const COMMITMENT_LIMIT_PERCENT = 70;
const COMMITMENT_LIMIT_RATIO = COMMITMENT_LIMIT_PERCENT / 100;

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const percentFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function parseBrazilianMoney(value?: string): number | null {
  if (!value) {
    return null;
  }

  const numericValue = value.replace(/\s/g, "").replace(/[^\d,.-]/g, "");

  if (!numericValue) {
    return null;
  }

  const lastCommaIndex = numericValue.lastIndexOf(",");
  const lastDotIndex = numericValue.lastIndexOf(".");
  let normalizedValue = numericValue;

  if (lastCommaIndex > -1 && lastDotIndex > -1) {
    const decimalSeparator = lastCommaIndex > lastDotIndex ? "," : ".";
    const thousandsSeparator = decimalSeparator === "," ? "." : ",";

    normalizedValue = numericValue
      .replaceAll(thousandsSeparator, "")
      .replace(decimalSeparator, ".");
  } else if (lastCommaIndex > -1) {
    normalizedValue = numericValue.replaceAll(".", "").replace(",", ".");
  } else if (lastDotIndex > -1) {
    const decimalDigits = numericValue.length - lastDotIndex - 1;
    normalizedValue =
      decimalDigits === 2 ? numericValue : numericValue.replaceAll(".", "");
  }

  const parsedValue = Number(normalizedValue);

  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function calculateMargin(
  candidateFields: MarginCandidateFields,
): MarginCalculation | null {
  const gross = parseBrazilianMoney(candidateFields.bruto);
  const discounts = parseBrazilianMoney(candidateFields.descontos);
  const pdfMargin = parseBrazilianMoney(candidateFields.margemPdf);

  if (
    gross === null ||
    discounts === null ||
    pdfMargin === null ||
    gross <= 0 ||
    discounts < 0
  ) {
    return null;
  }

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
    availableInstallment: status === "AVAILABLE"
      ? Math.min(pdfMargin, seventyPercentMargin)
      : 0,
    status,
  };
}

export function MarginExtractionViewer({
  extraction,
}: MarginExtractionViewerProps) {
  const marginCalculation = calculateMargin(extraction.candidateFields);

  return (
    <div className="space-y-4">
      {marginCalculation ? (
        <div className="space-y-4">
          <div className="space-y-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-950">
            <h4 className="font-semibold">Cálculo de margem</h4>
            <p className="leading-6">
              Atualmente o cliente possui{" "}
              <strong>
                {percentFormatter.format(marginCalculation.committedPercent)}%
              </strong>{" "}
              de comprometimento
              {marginCalculation.status === "AVAILABLE" ? (
                <>
                  {" "}
                  e pode ter uma parcela de até{" "}
                  <strong>
                    {currencyFormatter.format(
                      marginCalculation.availableInstallment,
                    )}
                  </strong>{" "}
                  mediante a margem disponibilizada pelo convênio.
                </>
              ) : marginCalculation.status === "NEGATIVE_PDF_MARGIN" ? (
                <>
                  , mas a margem está negativa pelo convênio, não sendo possível
                  realizar uma operação nova. Isso ocorre porque a margem do
                  contracheque é menor do que a margem do cálculo dos 70%.
                </>
              ) : (
                <strong>
                  {" "}
                  e cliente não possui margem disponível no cálculo dos 70%.
                </strong>
              )}
            </p>
            <dl className="grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-5">
              <div>
                <dt className="text-emerald-800">Bruto usado no cálculo</dt>
                <dd className="mt-1 font-semibold">
                  {currencyFormatter.format(marginCalculation.gross)}
                </dd>
              </div>
              <div>
                <dt className="text-emerald-800">
                  Descontos usados no cálculo
                </dt>
                <dd className="mt-1 font-semibold">
                  {currencyFormatter.format(marginCalculation.discounts)}
                </dd>
              </div>
              <div>
                <dt className="text-emerald-800">Margem informada no PDF</dt>
                <dd className="mt-1 font-semibold">
                  {currencyFormatter.format(marginCalculation.pdfMargin)}
                </dd>
              </div>
              <div>
                <dt className="text-emerald-800">Limite considerado</dt>
                <dd className="mt-1 font-semibold">
                  {COMMITMENT_LIMIT_PERCENT}%
                </dd>
              </div>
              <div>
                <dt className="text-emerald-800">Margem dos 70%</dt>
                <dd className="mt-1 font-semibold">
                  {currencyFormatter.format(
                    marginCalculation.seventyPercentMargin,
                  )}
                </dd>
              </div>
            </dl>
          </div>

          {marginCalculation.status === "AVAILABLE" &&
          marginCalculation.availableInstallment > 0 ? (
            <LoanSimulation
              maxInstallment={marginCalculation.availableInstallment}
            />
          ) : null}
        </div>
      ) : (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Não foi possível calcular a margem automaticamente. Confira se o PDF
          trouxe os campos de bruto, descontos e margem informada de forma
          legível.
        </div>
      )}
    </div>
  );
}
