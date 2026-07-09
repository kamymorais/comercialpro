"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/cn";

type SimulationMode = "installment" | "released";

type LoanSimulationProps = {
  maxInstallment: number;
};

const DUE_DAY = 24;
const CUTOFF_DAY = 8;
const IOF_ADDITIONAL_RATE = 0.0038;
const IOF_DAILY_RATE = 0.000082;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

function parseBrazilianNumber(value: string): number | null {
  const numericValue = value.trim().replace(/[^\d,.-]/g, "");

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
  }

  const parsedValue = Number(normalizedValue);

  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function parsePercent(value: string): number | null {
  const parsedValue = parseBrazilianNumber(value);

  if (parsedValue === null || parsedValue < 0) {
    return null;
  }

  return parsedValue / 100;
}

function getFirstDueDate(referenceDate = new Date()): Date {
  const dueMonth =
    referenceDate.getDate() <= CUTOFF_DAY
      ? referenceDate.getMonth()
      : referenceDate.getMonth() + 1;

  return new Date(referenceDate.getFullYear(), dueMonth, DUE_DAY);
}

function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, DUE_DAY);
}

function getDaysUntilDue(dueDate: Date, referenceDate = new Date()): number {
  return Math.max(
    1,
    Math.ceil((dueDate.getTime() - referenceDate.getTime()) / MS_PER_DAY),
  );
}

function estimateIofRatio(term: number, firstDueDate: Date): number {
  const referenceDate = new Date();
  let cappedDaysTotal = 0;

  for (let installmentIndex = 0; installmentIndex < term; installmentIndex += 1) {
    const dueDate = addMonths(firstDueDate, installmentIndex);
    cappedDaysTotal += Math.min(getDaysUntilDue(dueDate, referenceDate), 365);
  }

  const averageCappedDays = cappedDaysTotal / term;

  return IOF_ADDITIONAL_RATE + IOF_DAILY_RATE * averageCappedDays;
}

function getPresentValueFactor(
  term: number,
  monthlyRate: number,
  firstDueDate: Date,
): number {
  if (monthlyRate === 0) {
    return term;
  }

  const referenceDate = new Date();
  let factor = 0;

  for (let installmentIndex = 0; installmentIndex < term; installmentIndex += 1) {
    const dueDate = addMonths(firstDueDate, installmentIndex);
    const daysUntilDue = getDaysUntilDue(dueDate, referenceDate);

    factor += 1 / Math.pow(1 + monthlyRate, daysUntilDue / 30);
  }

  return factor;
}

function getPresentValueFromInstallment(
  installment: number,
  term: number,
  monthlyRate: number,
  firstDueDate: Date,
): number {
  return installment * getPresentValueFactor(term, monthlyRate, firstDueDate);
}

function getInstallmentFromPrincipal(
  principal: number,
  term: number,
  monthlyRate: number,
  firstDueDate: Date,
): number {
  const factor = getPresentValueFactor(term, monthlyRate, firstDueDate);

  return principal / factor;
}

export function LoanSimulation({ maxInstallment }: LoanSimulationProps) {
  const [mode, setMode] = useState<SimulationMode>("installment");
  const [installmentInput, setInstallmentInput] = useState("");
  const [releasedInput, setReleasedInput] = useState("");
  const [termInput, setTermInput] = useState("84");
  const [rateInput, setRateInput] = useState("1,80");
  const [copied, setCopied] = useState(false);

  const firstDueDate = useMemo(() => getFirstDueDate(), []);
  const simulation = useMemo(() => {
    const term = Number.parseInt(termInput, 10);
    const monthlyRate = parsePercent(rateInput);
    const selectedValue =
      mode === "installment"
        ? parseBrazilianNumber(installmentInput)
        : parseBrazilianNumber(releasedInput);

    if (!Number.isInteger(term) || term <= 0) {
      return { error: "Informe um prazo válido." };
    }

    if (monthlyRate === null) {
      return { error: "Informe uma taxa de juros válida." };
    }

    if (selectedValue === null || selectedValue <= 0) {
      return { error: null };
    }

    const iofRatio = estimateIofRatio(term, firstDueDate);

    if (mode === "installment") {
      if (selectedValue > maxInstallment) {
        return {
          error: `A parcela informada ultrapassa a margem autorizada de ${currencyFormatter.format(maxInstallment)}.`,
        };
      }

      const financedAmount = getPresentValueFromInstallment(
        selectedValue,
        term,
        monthlyRate,
        firstDueDate,
      );
      const estimatedIof = financedAmount * iofRatio;
      const releasedAmount = Math.max(financedAmount - estimatedIof, 0);
      const message = `${term}x de ${currencyFormatter.format(
        selectedValue,
      )} libera ${currencyFormatter.format(
        releasedAmount,
      )} com o primeiro vencimento para ${dateFormatter.format(firstDueDate)}.`;

      return {
        error: null,
        message,
        estimatedIof,
        installment: selectedValue,
        releasedAmount,
      };
    }

    const financedAmount = selectedValue / Math.max(1 - iofRatio, 0.0001);
    const estimatedIof = financedAmount - selectedValue;
    const installment = getInstallmentFromPrincipal(
      financedAmount,
      term,
      monthlyRate,
      firstDueDate,
    );

    if (installment > maxInstallment) {
      return {
        error: `A parcela calculada de ${currencyFormatter.format(
          installment,
        )} ultrapassa a margem autorizada de ${currencyFormatter.format(maxInstallment)}.`,
      };
    }

    const message = `${term}x de ${currencyFormatter.format(
      installment,
    )} libera ${currencyFormatter.format(
      selectedValue,
    )} com o primeiro vencimento para ${dateFormatter.format(firstDueDate)}.`;

    return {
      error: null,
      message,
      estimatedIof,
      installment,
      releasedAmount: selectedValue,
    };
  }, [
    firstDueDate,
    installmentInput,
    maxInstallment,
    mode,
    rateInput,
    releasedInput,
    termInput,
  ]);

  async function handleCopy() {
    if (!simulation.message) {
      return;
    }

    await navigator.clipboard.writeText(simulation.message);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <section className="space-y-4 rounded-lg border border-slate-200 bg-white px-4 py-4">
      <div className="space-y-1">
        <h4 className="text-sm font-semibold text-slate-900">
          Simulação de empréstimo
        </h4>
      </div>

      <div className="grid gap-2 rounded-lg bg-slate-100 p-1 text-sm sm:grid-cols-2">
        <button
          type="button"
          className={cn(
            "rounded-md px-3 py-2 font-semibold transition",
            mode === "installment"
              ? "bg-white text-blue-950 shadow-sm"
              : "text-slate-600 hover:text-slate-950",
          )}
          onClick={() => {
            setMode("installment");
            setCopied(false);
          }}
        >
          Informar parcela
        </button>
        <button
          type="button"
          className={cn(
            "rounded-md px-3 py-2 font-semibold transition",
            mode === "released"
              ? "bg-white text-blue-950 shadow-sm"
              : "text-slate-600 hover:text-slate-950",
          )}
          onClick={() => {
            setMode("released");
            setCopied(false);
          }}
        >
          Informar valor liberado
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {mode === "installment" ? (
          <Input
            label="Valor da parcela"
            inputMode="decimal"
            placeholder="Ex.: 492,64"
            value={installmentInput}
            onChange={(event) => setInstallmentInput(event.target.value)}
          />
        ) : (
          <Input
            label="Valor liberado"
            inputMode="decimal"
            placeholder="Ex.: 20.000,00"
            value={releasedInput}
            onChange={(event) => setReleasedInput(event.target.value)}
          />
        )}

        <Input
          label="Prazo"
          type="number"
          min={1}
          step={1}
          placeholder="Ex.: 84"
          value={termInput}
          onChange={(event) => setTermInput(event.target.value)}
        />

        <Input
          label="Taxa de juros ao mês (%)"
          inputMode="decimal"
          placeholder="Ex.: 1,80"
          value={rateInput}
          onChange={(event) => setRateInput(event.target.value)}
        />

        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
          <p className="text-slate-500">Parcela máxima autorizada</p>
          <p className="mt-1 font-semibold text-slate-950">
            {currencyFormatter.format(maxInstallment)}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Primeiro vencimento: {dateFormatter.format(firstDueDate)}
          </p>
        </div>
      </div>

      {simulation.error ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {simulation.error}
        </div>
      ) : null}

      {simulation.message ? (
        <div className="space-y-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-950">
          <p className="font-semibold">{simulation.message}</p>
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
            <span className="font-semibold">⚠ Importante:</span> Os dados
            apresentados nos próximos passos referem-se apenas a uma simulação
            baseada nas informações fornecidas. Os valores ainda podem sofrer
            alterações conforme margem consignável do cliente e a análise de
            crédito.
          </p>
          <Button
            type="button"
            variant="secondary"
            className="w-full sm:w-auto"
            onClick={handleCopy}
          >
            {copied ? "Copiado" : "Copiar simulação"}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
