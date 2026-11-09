import { Button } from "@/components/ui/Button";
import { LOST_OPERATION_TYPES, type LostOperationView } from "@/services/lost-operation.service";

export function LostOperationForm({ action, operation, error }: { action: (formData: FormData) => void | Promise<void>; operation?: LostOperationView; error?: string }) {
  return <form action={action} className="space-y-5">
    {operation ? <input type="hidden" name="id" value={operation.id} /> : null}
    {error ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p> : null}
    <Field label="Nome do cliente" name="clientName" defaultValue={operation?.clientName} />
    <Field label="Órgão" name="agency" defaultValue={operation?.agency} />
    <Field label="Banco concorrente" name="competitorBank" defaultValue={operation?.competitorBank} />
    <Field label="Taxa (%)" name="rate" inputMode="decimal" placeholder="Ex.: 1,85" defaultValue={operation?.rate.toString().replace(".", ",")} />
    <label className="block space-y-2 text-sm font-semibold text-slate-800">Tipo de operação<select name="operationType" defaultValue={operation?.operationType ?? ""} required className="min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 font-normal"><option value="" disabled>Selecione</option>{LOST_OPERATION_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}</select></label>
    <Button type="submit">{operation ? "Salvar alterações" : "Enviar"}</Button>
  </form>;
}

function Field({ label, name, defaultValue, placeholder, inputMode }: { label: string; name: string; defaultValue?: string; placeholder?: string; inputMode?: "decimal" }) {
  return <label className="block space-y-2 text-sm font-semibold text-slate-800">{label}<input name={name} defaultValue={defaultValue} placeholder={placeholder} inputMode={inputMode} required maxLength={120} className="min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 font-normal" /></label>;
}
