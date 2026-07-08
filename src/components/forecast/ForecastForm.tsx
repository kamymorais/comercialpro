import { saveForecastAction } from "@/app/consultor/actions";
import { Card } from "@/components/ui/Card";
import { formatBRL } from "@/lib/money";
import type { ConsultantForecastView } from "@/services/forecast.service";

type ForecastFormProps = {
  forecast: ConsultantForecastView;
};

export function ForecastForm({ forecast }: ForecastFormProps) {
  return (
    <Card>
      <form action={saveForecastAction} className="space-y-4">
        <div>
          <h2 className="text-xl font-bold">Previsão de pagamentos</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Informe os valores esperados para a data operacional atual.
          </p>
        </div>

        <MoneyField
          label="Produção"
          name="productionValue"
          defaultValue={forecast.productionValue}
        />
        <MoneyField
          label="Seguros"
          name="insuranceValue"
          defaultValue={forecast.insuranceValue}
        />
        <MoneyField label="TC" name="tcValue" defaultValue={forecast.tcValue} />

        <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          <input
            type="checkbox"
            name="noForecast"
            defaultChecked={forecast.noForecast}
            className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-900"
          />
          <span>
            Não tenho previsão para hoje. Ao marcar, os valores serão salvos
            como {formatBRL(0)}.
          </span>
        </label>

        <button
          type="submit"
          className="inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-blue-900 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-950"
        >
          Salvar previsão
        </button>
      </form>
    </Card>
  );
}

function MoneyField({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue: number;
}) {
  return (
    <label className="block w-full" htmlFor={name}>
      <span className="mb-2 block text-sm font-medium text-slate-800">
        {label}
      </span>
      <input
        id={name}
        name={name}
        type="text"
        inputMode="decimal"
        defaultValue={defaultValue ? defaultValue.toFixed(2).replace(".", ",") : ""}
        placeholder="0,00"
        className="min-h-12 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-base text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-900 focus:ring-2 focus:ring-blue-100"
      />
    </label>
  );
}
