import type { MarginCandidateFields, MarginExtractionResult } from "@/types/margin";

type MarginExtractionViewerProps = {
  extraction: MarginExtractionResult;
};

const CANDIDATE_FIELD_LABELS: Record<keyof MarginCandidateFields, string> = {
  bruto: "Bruto informado no PDF",
  descontos: "Descontos informados no PDF",
  liquido: "Líquido informado no PDF",
  margemPdf: "Margem informada no PDF",
};

export function MarginExtractionViewer({
  extraction,
}: MarginExtractionViewerProps) {
  const candidateEntries = Object.entries(extraction.candidateFields).filter(
    (entry): entry is [keyof MarginCandidateFields, string] => Boolean(entry[1]),
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <p className="text-slate-500">Páginas lidas</p>
          <p className="mt-1 font-semibold text-slate-900">
            {extraction.pages}
          </p>
        </div>
        <div>
          <p className="text-slate-500">Avisos</p>
          <p className="mt-1 font-semibold text-slate-900">
            {extraction.warnings.length > 0
              ? extraction.warnings.length
              : "Nenhum"}
          </p>
        </div>
      </div>

      {extraction.warnings.length > 0 ? (
        <ul className="space-y-1 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {extraction.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}

      {candidateEntries.length > 0 ? (
        <div>
          <h4 className="text-sm font-semibold text-slate-900">
            Campos candidatos extraídos
          </h4>
          <dl className="mt-2 grid gap-3 text-sm sm:grid-cols-2">
            {candidateEntries.map(([key, value]) => (
              <div key={key}>
                <dt className="text-slate-500">
                  {CANDIDATE_FIELD_LABELS[key]}
                </dt>
                <dd className="mt-1 font-semibold text-slate-900">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-2 text-xs text-slate-500">
            Valores encontrados no PDF, sem qualquer cálculo. O cálculo da
            margem fica para a etapa final do módulo.
          </p>
        </div>
      ) : null}

      {extraction.rubricas.length > 0 ? (
        <div>
          <h4 className="text-sm font-semibold text-slate-900">
            Rubricas encontradas
          </h4>
          <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
            {extraction.rubricas.map((rubrica, index) => (
              <li key={index} className="break-words">
                {rubrica.linha}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div>
        <h4 className="text-sm font-semibold text-slate-900">Texto extraído</h4>
        <div className="mt-2 max-h-64 overflow-y-auto whitespace-pre-wrap break-words rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-700">
          {extraction.text}
        </div>
      </div>
    </div>
  );
}
