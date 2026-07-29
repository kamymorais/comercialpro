import { Card } from "@/components/ui/Card";
import { VisitPhotoGallery } from "@/components/visit/VisitPhotoGallery";
import {
  getVisitEventLabel,
  type VisitEventView,
} from "@/services/visit.service";
import type { Role } from "@/generated/prisma/client";

type VisitTimelineProps = {
  events: VisitEventView[];
};

function formatDateTimeBR(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

function getRoleLabel(role: Role | null) {
  const labels: Record<Role, string> = {
    ADMIN: "Administrador",
    CONSULTANT: "Consultor",
    MANAGER: "Gerente",
    REGIONAL_MANAGER: "Superintendente",
  };

  return role ? labels[role] : "Perfil não definido";
}

export function VisitTimeline({ events }: VisitTimelineProps) {
  return (
    <Card>
      <h2 className="text-xl font-bold">Histórico</h2>

      {events.length === 0 ? (
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Nenhum evento registrado.
        </p>
      ) : (
        <ol className="mt-5 space-y-4">
          {events.map((event) => (
            <li key={event.id} className="border-l-2 border-blue-100 pl-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-950">
                    {getVisitEventLabel(event.type)}
                  </p>
                  <p className="mt-1 text-xs text-slate-600">
                    {event.author.fullName} · {getRoleLabel(event.author.role)} · @
                    {event.author.username}
                  </p>
                </div>
                <time className="text-xs font-semibold text-slate-500">
                  {formatDateTimeBR(event.createdAt)}
                </time>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                {event.note ?? "Sem observação registrada."}
              </p>
              <VisitPhotoGallery photos={event.photos} />
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
