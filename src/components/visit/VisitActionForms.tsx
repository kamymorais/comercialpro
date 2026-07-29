import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Textarea";
import { VisitPhotoUploader } from "@/components/visit/VisitPhotoUploader";
import type { VisitStatus } from "@/generated/prisma/client";

type ConsultantVisitReportFormProps = {
  visitId: string;
  status: VisitStatus;
  photosEnabled: boolean;
};

type ManagerVisitReviewFormsProps = {
  visitId: string;
  status: VisitStatus;
  revisionAction: (formData: FormData) => void | Promise<void>;
  completeAction: (formData: FormData) => void | Promise<void>;
};

export function ConsultantVisitReportForm({
  visitId,
  status,
  photosEnabled,
}: ConsultantVisitReportFormProps) {
  const canSubmit = status === "ASSIGNED" || status === "REVISION_REQUESTED";

  if (!canSubmit) {
    return (
      <Card>
        <h2 className="text-xl font-bold">Relatório do consultor</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Esta atividade não está disponível para novo envio neste momento.
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <VisitPhotoUploader visitId={visitId} photosEnabled={photosEnabled} />
    </Card>
  );
}

export function ManagerVisitReviewForms({
  visitId,
  status,
  revisionAction,
  completeAction,
}: ManagerVisitReviewFormsProps) {
  if (status !== "SUBMITTED") {
    return (
      <Card>
        <h2 className="text-xl font-bold">Análise do gerente</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          A atividade só pode ser concluída ou devolvida quando estiver enviada
          para análise.
        </p>
      </Card>
    );
  }

  return (
    <section className="grid gap-4 md:grid-cols-2">
      <Card>
        <form action={completeAction} className="space-y-4">
          <input type="hidden" name="visitId" value={visitId} />
          <div>
            <h2 className="text-xl font-bold">Concluir atividade</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Use quando o relatório estiver aprovado.
            </p>
          </div>
          <Textarea
            label="Observação final"
            name="note"
            maxLength={2000}
            helperText="Opcional. Máximo de 2.000 caracteres."
          />
          <Button type="submit" className="w-full">
            Marcar como concluída
          </Button>
        </form>
      </Card>

      <Card>
        <form action={revisionAction} className="space-y-4">
          <input type="hidden" name="visitId" value={visitId} />
          <div>
            <h2 className="text-xl font-bold">Solicitar refazer visita</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Informe o motivo para liberar novo envio ao consultor.
            </p>
          </div>
          <Textarea
            label="Motivo para refazer a visita"
            name="note"
            required
            maxLength={2000}
            helperText="Obrigatório. Máximo de 2.000 caracteres."
          />
          <Button type="submit" variant="secondary" className="w-full">
            Solicitar refazer visita
          </Button>
        </form>
      </Card>
    </section>
  );
}
