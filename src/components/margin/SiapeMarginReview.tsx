"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatCentsToBRL, parseBrazilianMoneyToCents } from "@/lib/margin/money";
import type {
  SiapeCalculationResult,
  SiapeExtractionReview,
  SiapeRubric,
  SiapeRubricCategory,
} from "@/types/margin";

type SiapeMarginReviewProps = {
  review: SiapeExtractionReview;
};

type CalculationState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; result: SiapeCalculationResult };

type EditableRubric = SiapeRubric & {
  amountInput: string;
};

const CATEGORY_LABELS: Record<SiapeRubricCategory, string> = {
  AUTHORIZED_FIXED_EARNING: "Verbas fixas autorizadas",
  NEGATIVE_ADJUSTMENT: "Atrasos e ajustes negativos",
  FACULTATIVE_DISCOUNT: "Descontos facultativos",
  MANDATORY_DISCOUNT: "Descontos obrigatórios",
  UNCLASSIFIED_DISCOUNT: "Descontos não classificados",
  EXCLUDED_EARNING: "Verbas excluídas",
  MANUAL_REVIEW: "Rubricas pendentes",
  IGNORED: "Ignoradas",
};

const CATEGORY_OPTIONS = Object.entries(CATEGORY_LABELS) as Array<
  [SiapeRubricCategory, string]
>;

function toEditableRubric(rubric: SiapeRubric): EditableRubric {
  return {
    ...rubric,
    amountInput: formatCentsToBRL(rubric.amountCents).replace("R$", "").trim(),
  };
}

function buildCalculationPayload(rubrics: EditableRubric[]): SiapeRubric[] {
  return rubrics.map((rubric) => {
    const parsedAmount = parseBrazilianMoneyToCents(rubric.amountInput);

    if (parsedAmount === null || parsedAmount < 0) {
      throw new Error(`${rubric.description}: informe um valor válido.`);
    }

    return {
      ...rubric,
      amountCents: parsedAmount,
      requiresManualReview:
        rubric.category === "MANUAL_REVIEW" ||
        rubric.category === "UNCLASSIFIED_DISCOUNT",
    };
  });
}

function groupRubrics(rubrics: SiapeRubric[]) {
  return CATEGORY_OPTIONS.map(([category, label]) => ({
    category,
    label,
    rubrics: rubrics.filter((rubric) => rubric.category === category),
  }));
}

function MoneyRow({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-slate-600">{label}</dt>
      <dd className="mt-1 font-semibold text-slate-950">
        {formatCentsToBRL(value)}
      </dd>
    </div>
  );
}

export function SiapeMarginReview({ review }: SiapeMarginReviewProps) {
  const [rubrics, setRubrics] = useState<EditableRubric[]>(
    () => review.rubrics.map(toEditableRubric),
  );
  const [calculation, setCalculation] = useState<CalculationState>({
    status: "idle",
  });
  const groupedRubrics = useMemo(() => groupRubrics(rubrics), [rubrics]);

  function updateRubric(
    rubricId: string,
    changes: Partial<Pick<EditableRubric, "category" | "amountInput">>,
  ) {
    setRubrics((current) =>
      current.map((rubric) =>
        rubric.id === rubricId
          ? { ...rubric, ...changes, requiresManualReview: false }
          : rubric,
      ),
    );
    setCalculation({ status: "idle" });
  }

  async function handleCalculate() {
    setCalculation({ status: "loading" });

    try {
      const response = await fetch("/api/verificador-margem/siape/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rubrics: buildCalculationPayload(rubrics),
          paycheckDiscountTotalCents: review.paycheckDiscountTotalCents,
        }),
      });
      const data = (await response.json()) as {
        success: boolean;
        message?: string;
        result?: SiapeCalculationResult;
      };

      if (!response.ok || !data.success || !data.result) {
        setCalculation({
          status: "error",
          message: data.message ?? "Não foi possível calcular a margem SIAPE.",
        });
        return;
      }

      setCalculation({ status: "success", result: data.result });
    } catch {
      setCalculation({
        status: "error",
        message: "Não foi possível calcular a margem SIAPE.",
      });
    }
  }

  return (
    <section className="space-y-5">
      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-4 text-sm text-blue-950">
        <h3 className="font-semibold">Convênio: SIAPE</h3>
        <p className="mt-2 leading-6">
          Confira as rubricas extraídas e ajuste a categoria antes de calcular.
        </p>
      </div>

      {review.warnings.length > 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {review.warnings.join(" ")}
        </div>
      ) : null}

      <div className="space-y-3">
        <h4 className="text-sm font-bold text-slate-950">
          Conferência das rubricas
        </h4>
        <div className="space-y-3">
          {rubrics.map((rubric) => (
            <div
              key={rubric.id}
              className="grid gap-3 rounded-lg border border-slate-200 bg-white p-3 text-sm md:grid-cols-[1fr_170px_240px]"
            >
              <div>
                <p className="font-semibold text-slate-950">
                  {rubric.code ? `${rubric.code} - ` : ""}
                  {rubric.description}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {rubric.entryType === "DISCOUNT"
                    ? "Desconto"
                    : rubric.entryType === "EARNING"
                      ? "Provento"
                      : "Tipo não identificado"}
                </p>
                {rubric.notes.length > 0 ? (
                  <p className="mt-2 text-xs font-semibold text-amber-800">
                    {rubric.notes.join(" ")}
                  </p>
                ) : null}
              </div>
              <Input
                label="Valor"
                inputMode="decimal"
                value={rubric.amountInput}
                onChange={(event) =>
                  updateRubric(rubric.id, { amountInput: event.target.value })
                }
              />
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-800">
                  Categoria
                </span>
                <select
                  className="min-h-12 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 shadow-sm outline-none transition focus:border-blue-900 focus:ring-2 focus:ring-blue-100"
                  value={rubric.category}
                  onChange={(event) =>
                    updateRubric(rubric.id, {
                      category: event.target.value as SiapeRubricCategory,
                    })
                  }
                >
                  {CATEGORY_OPTIONS.map(([category, label]) => (
                    <option key={category} value={category}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-3">
        {groupedRubrics.map(({ category, label, rubrics: categoryRubrics }) => (
          <div key={category} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <h5 className="text-sm font-semibold text-slate-950">{label}</h5>
            {categoryRubrics.length > 0 ? (
              <ul className="mt-2 space-y-1 text-xs text-slate-600">
                {categoryRubrics.map((rubric) => (
                  <li key={rubric.id}>
                    {rubric.description} - {formatCentsToBRL(rubric.amountCents)}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-slate-500">Nenhuma rubrica.</p>
            )}
          </div>
        ))}
      </div>

      <Button
        type="button"
        className="w-full sm:w-auto"
        loading={calculation.status === "loading"}
        onClick={handleCalculate}
      >
        Calcular margem SIAPE
      </Button>

      {calculation.status === "error" ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {calculation.message}
        </div>
      ) : null}

      {calculation.status === "success" ? (
        <SiapeCalculationResultView result={calculation.result} />
      ) : null}
    </section>
  );
}

function SiapeCalculationResultView({
  result,
}: {
  result: SiapeCalculationResult;
}) {
  return (
    <section className="space-y-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-950">
      <div>
        <h4 className="font-semibold">Resultado SIAPE</h4>
        <p className="mt-2">
          Margem final: menor resultado entre Margem A e Margem B.
        </p>
      </div>

      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <MoneyRow label="Verbas fixas autorizadas" value={result.authorizedFixedEarningsCents} />
        <MoneyRow label="Atrasos e ajustes negativos" value={result.negativeAdjustmentsCents} />
        <MoneyRow label="Base de renda considerada" value={result.adjustedFixedIncomeCents} />
        <MoneyRow label="Total de descontos" value={result.totalDiscountsCents} />
        <MoneyRow label="Descontos obrigatórios" value={result.mandatoryDiscountsCents} />
        <MoneyRow label="Descontos facultativos" value={result.facultativeDiscountsCents} />
        <MoneyRow label="Descontos não classificados" value={result.unclassifiedDiscountsCents} />
        <MoneyRow label="Margem A - cálculo dos 70%" value={result.marginACents} />
        <MoneyRow label="Margem B - cálculo dos 40%" value={result.marginBCents} />
        <MoneyRow label="Margem final disponível" value={result.availableMarginCents} />
      </dl>

      <p className="font-semibold">
        Cálculo limitador:{" "}
        {result.limitingCalculation === "TIE"
          ? "Margem A e Margem B iguais"
          : `Margem ${result.limitingCalculation}`}
      </p>

      {result.divergences.length > 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
          {result.divergences.join(" ")}
        </div>
      ) : null}

      {result.pendingRubrics.length > 0 ? (
        <div>
          <h5 className="font-semibold">Rubricas pendentes de análise manual</h5>
          <ul className="mt-2 space-y-1">
            {result.pendingRubrics.map((rubric) => (
              <li key={rubric.id}>
                {rubric.description} - {formatCentsToBRL(rubric.amountCents)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p>
        A margem final representa o valor máximo aproximado da parcela mensal, e
        não o valor total do empréstimo.
      </p>
    </section>
  );
}
