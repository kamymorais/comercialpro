export type MarginUploadFileInfo = {
  name: string;
  size: number;
  type: string;
};

export type MarginPageText = {
  page: number;
  text: string;
};

// Valores apenas identificados no texto do PDF, ao lado dos rótulos do
// rodapé (Bruto, Descontos, Líquido, Margem). São candidatos brutos, nunca
// resultado de cálculo. Cada campo é opcional pois pode não ser encontrado.
export type MarginCandidateFields = {
  bruto?: string;
  descontos?: string;
  liquido?: string;
  margemPdf?: string;
};

export type MarginRubricLine = {
  linha: string;
};

export type MarginExtractionResult = {
  pages: number;
  text: string;
  pagesText: MarginPageText[];
  candidateFields: MarginCandidateFields;
  rubricas: MarginRubricLine[];
  warnings: string[];
};

export type MarginUploadDebug = {
  stage:
    | "AUTH"
    | "FORM_DATA"
    | "FILE_VALIDATION"
    | "PYTHON_FUNCTION_CALL"
    | "PYTHON_RESPONSE_PARSE"
    | "PYTHON_EXTRACTION"
    | "SERVER_CONFIG";
  status: number;
  detail: string;
};

// "EXTRACTION_PENDING": arquivo recebido, extração ainda não tentada.
// "CALCULATION_AVAILABLE": texto extraído com sucesso; a UI já pode calcular
// percentual de comprometimento e parcela disponível.
export type MarginUploadResponse = {
  success: boolean;
  message: string;
  file?: MarginUploadFileInfo;
  extraction?: MarginExtractionResult;
  nextStep?: "EXTRACTION_PENDING" | "CALCULATION_AVAILABLE";
  debug?: MarginUploadDebug;
};
