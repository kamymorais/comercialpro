import { saveForecastAction } from "@/app/consultor/actions";
import { Card } from "@/components/ui/Card";
import { MoneyInput } from "@/components/ui/MoneyInput";
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

        <MoneyInput
          label="Produção"
          name="productionValue"
          defaultValue={forecast.productionValue}
        />
        <MoneyInput
          label="Seguros"
          name="insuranceValue"
          defaultValue={forecast.insuranceValue}
        />
        <MoneyInput
          label="TC"
          name="tcValue"
          defaultValue={forecast.tcValue}
        />

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
