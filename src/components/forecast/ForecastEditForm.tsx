import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { formatBRL } from "@/lib/money";
import type { ConsultantForecastView } from "@/services/forecast.service";

type ForecastEditFormProps = {
  consultantName: string;
  consultantUsername: string;
  forecast: ConsultantForecastView;
  action: (formData: FormData) => void | Promise<void>;
  backHref: string;
  errorMessage?: string;
};

export function ForecastEditForm({
  consultantName,
  consultantUsername,
  forecast,
  action,
  backHref,
  errorMessage,
}: ForecastEditFormProps) {
  return (
    <Card>
      <form action={action} className="space-y-4">
        <div>
          <h2 className="text-xl font-bold">{consultantName}</h2>
          <p className="mt-1 text-sm text-slate-600">@{consultantUsername}</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Editar previsao da data operacional atual.
          </p>
        </div>

        {errorMessage ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : null}

        <MoneyInput
          label="Producao"
          name="productionValue"
          defaultValue={formatMoneyInputValue(forecast.productionValue)}
        />
        <MoneyInput
          label="Seguros"
          name="insuranceValue"
          defaultValue={formatMoneyInputValue(forecast.insuranceValue)}
        />
        <MoneyInput
          label="TC"
          name="tcValue"
          defaultValue={formatMoneyInputValue(forecast.tcValue)}
        />

        <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          <input
            type="checkbox"
            name="noForecast"
            defaultChecked={forecast.noForecast}
            className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-900"
          />
          <span>
            Sem previsao para hoje. Ao marcar, os valores serao salvos como{" "}
            {formatBRL(0)}.
          </span>
        </label>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button type="submit" className="flex-1">
            Salvar previsao
          </Button>
          <Link
            href={backHref}
            className="inline-flex min-h-12 flex-1 items-center justify-center rounded-lg border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-50"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </Card>
  );
}

function formatMoneyInputValue(value: number): string {
  return value ? value.toFixed(2).replace(".", ",") : "";
}
