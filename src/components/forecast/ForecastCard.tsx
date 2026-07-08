import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { formatBRL } from "@/lib/money";
import type { ForecastCardData } from "@/services/forecast.service";

type ForecastCardProps = {
  forecast: ForecastCardData;
  href?: string;
};

const statusLabels = {
  WITH_FORECAST: "Com previsão",
  NO_FORECAST: "Sem previsão",
  NOT_SENT: "Não enviado",
};

const statusVariants = {
  WITH_FORECAST: "success",
  NO_FORECAST: "info",
  NOT_SENT: "warning",
} as const;

export function ForecastCard({ forecast, href }: ForecastCardProps) {
  const content = (
    <Card
      className={
        href ? "space-y-4 transition hover:border-blue-200 hover:bg-blue-50" : "space-y-4"
      }
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-bold">{forecast.fullName}</h3>
          <p className="mt-1 text-sm text-slate-600">@{forecast.username}</p>
        </div>
        <Badge variant={statusVariants[forecast.status]}>
          {statusLabels[forecast.status]}
        </Badge>
      </div>

      <dl className="grid gap-3 text-sm sm:grid-cols-4">
        <Value label="Produção" value={forecast.productionValue} />
        <Value label="Seguros" value={forecast.insuranceValue} />
        <Value label="TC" value={forecast.tcValue} />
        <Value label="Total" value={forecast.totalValue} strong />
      </dl>
    </Card>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}

function Value({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: number;
  strong?: boolean;
}) {
  return (
    <div>
      <dt className="text-slate-600">{label}</dt>
      <dd className={strong ? "mt-1 font-bold" : "mt-1 font-semibold"}>
        {formatBRL(value)}
      </dd>
    </div>
  );
}
