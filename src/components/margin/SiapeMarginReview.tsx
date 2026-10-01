"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatCentsToBRL, parseBrazilianMoneyToCents } from "@/lib/margin/money";
import type {
  SiapeCalculationResult,
  SiapeCalculationStatus,
  SiapeExtractionReview,
  SiapeLimitingRule,
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

// Nomes voltados ao operador. Nunca exibir os identificadores internos
// (ex.: "EXISTING_LOAN") diretamente na tela.
const CATEGORY_LABELS: Record<SiapeRubricCategory, string> = {
  ELIGIBLE_EARNING: "Verba que compõe a base consignável",
  EXCLUDED_EARNING: "Verba que não compõe a base",
  MANDATORY_DISCOUNT: "Desconto obrigatório",
  EXISTING_LOAN: "Empréstimo consignado existente",
  CONSIGNMENT_CARD: "Cartão consignado (RMC/RCC)",
  OTHER_FACULTATIVE_CONSIGNMENT: "Outra consignação facultativa",
  UNCLASSIFIED_DISCOUNT: "Desconto não classificado",
  MANUAL_REVIEW: "Pendente de revisão manual",
  IGNORED: "Ignorada",
};

const LIMITING_RULE_LABELS: Record<SiapeLimitingRule, string> = {
  LOAN_35_PERCENT: "Limite de empréstimos de 35%",
  GLOBAL_40_PERCENT: "Limite global facultativo de 40%",
  TOTAL_DISCOUNTS_70_PERCENT: "Limite geral de descontos de 70%",
  TIE: "Mais de uma trava atingiu o mesmo valor",
};

const STATUS_LABELS: Record<SiapeCalculationStatus, string> = {
  CALCULATED: "Cálculo concluído, sem rubricas pendentes.",
  MANUAL_REVIEW:
    "Cálculo concluído, mas existem rubricas pendentes de revisão manual.",
  EXTRACTION_INCOMPLETE:
    "Dados insuficientes para formar a base consignável ou calcular a margem.",
  NO_AVAILABLE_MARGIN:
    "Não há margem disponível para nova parcela: uma das travas está zerada ou negativa.",
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

// `null` significa que o valor não foi identificado no PDF, o que é
// diferente de um zero real. Nunca deve aparecer como "R$ 0,00".
function NullableMoneyRow({
  label,
  value,
}: {
  label: string;
  value: number | null;
}) {
  return (
    <div>
      <dt className="text-slate-600">{label}</dt>
      <dd className="mt-1 font-semibold text-slate-950">
        {value === null ? (
          <span className="font-normal text-slate-500">Não identificado</span>
        ) : (
          formatCentsToBRL(value)
        )}
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

      <dl className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 text-sm sm:grid-cols-3">
        <NullableMoneyRow label="Rendimentos" value={review.paycheckGrossTotalCents} />
        <NullableMoneyRow label="Descontos" value={review.paycheckDiscountTotalCents} />
        <NullableMoneyRow label="Líquido" value={review.paycheckNetTotalCents} />
      </dl>

      {review.warnings.length > 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {review.warnings.join(" ")}
        </div>
      ) : null}

      <div className="space-y-3">
        <h4 className="text-sm font-bold text-slate-950">
          Conferência das rubricas ({rubrics.length}{" "}
          {rubrics.length === 1 ? "rubrica encontrada" : "rubricas encontradas"})
        </h4>
        {rubrics.length === 0 ? (
          <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Nenhuma rubrica encontrada. Não é possível calcular a margem sem
            rubricas conferidas.
          </p>
        ) : null}
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
        disabled={rubrics.length === 0}
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
  const blockedRuleLabels = Array.from(
    new Set(
      [
        result.loanBalanceCents <= 0 ? "LOAN_35_PERCENT" : null,
        result.globalBalanceCents <= 0 ? "GLOBAL_40_PERCENT" : null,
        result.seventyPercentBalanceCents <= 0 ? "TOTAL_DISCOUNTS_70_PERCENT" : null,
      ].filter((rule): rule is SiapeLimitingRule => rule !== null),
    ),
  );

  return (
    <section className="space-y-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-950">
      <div>
        <h4 className="font-semibold">Resultado SIAPE</h4>
        <p className="mt-2 font-semibold">{STATUS_LABELS[result.status]}</p>
      </div>

      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <MoneyRow label="Base consignável SIAPE" value={result.eligibleBaseCents} />
        <MoneyRow label="Limite de empréstimos — 35%" value={result.loanLimitCents} />
        <MoneyRow label="Empréstimos já utilizados" value={result.existingLoansCents} />
        <MoneyRow label="Saldo de empréstimos" value={result.loanBalanceCents} />
        <MoneyRow
          label="Limite global facultativo — 40%"
          value={result.globalFacultativeLimitCents}
        />
        <MoneyRow
          label="Total facultativo utilizado"
          value={result.totalFacultativeConsignmentsCents}
        />
        <MoneyRow label="Saldo global" value={result.globalBalanceCents} />
        <MoneyRow label="Limite de cartão — 5%" value={result.cardLimitCents} />
        <MoneyRow label="Cartão consignado utilizado" value={result.consignmentCardsCents} />
        <MoneyRow
          label="Limite geral de descontos — 70%"
          value={result.totalDiscountLimitCents}
        />
        <MoneyRow label="Descontos obrigatórios" value={result.mandatoryDiscountsCents} />
        <MoneyRow
          label="Total de consignações"
          value={result.totalFacultativeConsignmentsCents}
        />
        <MoneyRow
          label="Descontos não classificados"
          value={result.unclassifiedDiscountsCents}
        />
        <MoneyRow label="Total atual de descontos" value={result.totalCurrentDiscountsCents} />
        <MoneyRow label="Espaço restante até 70%" value={result.seventyPercentBalanceCents} />
        <MoneyRow
          label="Margem final disponível para nova parcela"
          value={result.availableLoanMarginCents}
        />
      </dl>

      <p className="font-semibold">
        Regra que limitou a margem: {LIMITING_RULE_LABELS[result.limitingRule]}
      </p>

      {blockedRuleLabels.length > 0 ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-800">
          <p className="font-semibold">Trava(s) sem saldo disponível:</p>
          <ul className="mt-1 list-inside list-disc">
            {blockedRuleLabels.map((rule) => (
              <li key={rule}>{LIMITING_RULE_LABELS[rule]}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {result.divergences.length > 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
          {result.divergences.join(" ")}
        </div>
      ) : null}

      {result.pendingRubrics.length > 0 ? (
        <div>
          <h5 className="font-semibold">Rubricas pendentes de revisão</h5>
          <ul className="mt-2 space-y-1">
            {result.pendingRubrics.map((rubric) => (
              <li key={rubric.id}>
                {rubric.description} - {formatCentsToBRL(rubric.amountCents)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="font-semibold">
        A margem final representa o valor máximo aproximado da nova parcela
        mensal de empréstimo.
      </p>
      <p>
        A base SIAPE pode ser diferente do valor bruto e do valor líquido do
        contracheque.
      </p>
    </section>
  );
}
