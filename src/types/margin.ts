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
// resultado de cálculo — cada campo é opcional pois pode não ser encontrado.
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

// "EXTRACTION_PENDING": arquivo recebido, extração ainda não tentada.
// "CALCULATION_PENDING": texto extraído com sucesso; falta apenas o cálculo,
// que fica para a Etapa 05.
export type MarginUploadResponse = {
  success: boolean;
  message: string;
  file?: MarginUploadFileInfo;
  extraction?: MarginExtractionResult;
  nextStep?: "EXTRACTION_PENDING" | "CALCULATION_PENDING";
};
