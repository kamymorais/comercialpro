import { ForecastCard } from "@/components/forecast/ForecastCard";
import { Card } from "@/components/ui/Card";
import type { ForecastCardData } from "@/services/forecast.service";

type ConsultantForecastListProps = {
  consultants: ForecastCardData[];
  getHref?: (consultantId: string) => string;
  emptyTitle?: string;
  emptyDescription?: string;
};

export function ConsultantForecastList({
  consultants,
  getHref,
  emptyTitle = "Nenhum consultor aprovado",
  emptyDescription = "Quando consultores forem aprovados para sua equipe, eles aparecerao aqui.",
}: ConsultantForecastListProps) {
  if (consultants.length === 0) {
    return (
      <Card>
        <h2 className="text-lg font-bold">{emptyTitle}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">{emptyDescription}</p>
      </Card>
    );
  }

  return (
    <section className="grid gap-4">
      {consultants.map((consultant) => (
        <ForecastCard
          key={consultant.id}
          forecast={consultant}
          href={getHref?.(consultant.id)}
        />
      ))}
    </section>
  );
}
