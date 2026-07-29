import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Textarea";
import {
  AGREEMENT_LOCATIONS,
  type AgreementOption,
} from "@/data/agreement-locations";

type VisitAssignmentFormProps = {
  consultantId: string;
  agreements: AgreementOption[];
  action: (formData: FormData) => void | Promise<void>;
};

export function VisitAssignmentForm({
  consultantId,
  agreements,
  action,
}: VisitAssignmentFormProps) {
  return (
    <Card>
      <form action={action} className="space-y-4">
        <div>
          <h2 className="text-xl font-bold">Nova atividade</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Selecione o convênio, a unidade e inclua uma orientação inicial se
            necessário.
          </p>
        </div>

        <input type="hidden" name="consultantId" value={consultantId} />

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-800">
            Convênio
          </span>
          <select
            name="agreementCode"
            className="min-h-12 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-base text-slate-950 shadow-sm outline-none transition focus:border-blue-900 focus:ring-2 focus:ring-blue-100"
            defaultValue={agreements[0]?.code}
          >
            {agreements.map((agreement) => (
              <option key={agreement.code} value={agreement.code}>
                {agreement.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-800">
            Unidade ou órgão
          </span>
          <select
            name="unitId"
            className="min-h-12 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-base text-slate-950 shadow-sm outline-none transition focus:border-blue-900 focus:ring-2 focus:ring-blue-100"
            required
          >
            {AGREEMENT_LOCATIONS.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>
        </label>

        <Textarea
          label="Orientação inicial"
          name="initialNote"
          maxLength={2000}
          helperText="Opcional. Máximo de 2.000 caracteres."
        />

        <Button type="submit" className="w-full sm:w-auto">
          Criar atividade
        </Button>
      </form>
    </Card>
  );
}
