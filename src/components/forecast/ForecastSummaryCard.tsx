import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { formatDateBR } from "@/lib/dates";
import { formatBRL } from "@/lib/money";
import type { ConsultantForecastView } from "@/services/forecast.service";

type ForecastSummaryCardProps = {
  forecast: ConsultantForecastView;
};

export function ForecastSummaryCard({ forecast }: ForecastSummaryCardProps) {
  const hasSubmission = Boolean(forecast.submittedAt);

  return (
    <Card variant={hasSubmission ? "highlight" : "default"}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-600">
            Data operacional
          </p>
          <h2 className="mt-1 text-2xl font-bold">
            {formatDateBR(forecast.operationalDate)}
          </h2>
        </div>
        <Badge variant={hasSubmission ? "success" : "warning"}>
          {hasSubmission ? "Enviado" : "Não enviado"}
        </Badge>
      </div>

      <dl className="mt-5 grid gap-4 sm:grid-cols-4">
        <div>
          <dt className="text-sm text-slate-600">Produção</dt>
          <dd className="mt-1 font-bold">{formatBRL(forecast.productionValue)}</dd>
        </div>
        <div>
          <dt className="text-sm text-slate-600">Seguros</dt>
          <dd className="mt-1 font-bold">{formatBRL(forecast.insuranceValue)}</dd>
        </div>
        <div>
          <dt className="text-sm text-slate-600">TC</dt>
          <dd className="mt-1 font-bold">{formatBRL(forecast.tcValue)}</dd>
        </div>
        <div>
          <dt className="text-sm text-slate-600">Total</dt>
          <dd className="mt-1 font-bold">{formatBRL(forecast.totalValue)}</dd>
        </div>
      </dl>
    </Card>
  );
}
