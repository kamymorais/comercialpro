export type MarginUploadFileInfo = {
  name: string;
  size: number;
  type: string;
};

export type MarginAgreement = "MPDFT" | "SIAPE";

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

export type MarginRubricEntryType = "EARNING" | "DISCOUNT" | "UNKNOWN";

export type SiapeRubricCategory =
  | "AUTHORIZED_FIXED_EARNING"
  | "NEGATIVE_ADJUSTMENT"
  | "FACULTATIVE_DISCOUNT"
  | "MANDATORY_DISCOUNT"
  | "UNCLASSIFIED_DISCOUNT"
  | "EXCLUDED_EARNING"
  | "MANUAL_REVIEW"
  | "IGNORED";

export type MarginRubricLine = {
  linha: string;
  codigo?: string;
  descricao?: string;
  valor?: string;
  tipoLancamento?: MarginRubricEntryType;
  secaoOrigem?: string;
};

export type SiapeRubric = {
  id: string;
  code?: string;
  description: string;
  amountCents: number;
  entryType: MarginRubricEntryType;
  sourceSection?: string;
  category: SiapeRubricCategory;
  requiresManualReview: boolean;
  notes: string[];
  rawLine: string;
};

export type SiapeExtractionReview = {
  rubrics: SiapeRubric[];
  paycheckDiscountTotalCents: number | null;
  warnings: string[];
};

export type SiapeCalculationStatus =
  | "CALCULATED"
  | "MANUAL_REVIEW"
  | "EXTRACTION_INCOMPLETE";

export type SiapeCalculationResult = {
  agreement: "SIAPE";
  status: SiapeCalculationStatus;
  authorizedFixedEarningsCents: number;
  negativeAdjustmentsCents: number;
  adjustedFixedIncomeCents: number;
  totalDiscountsCents: number;
  mandatoryDiscountsCents: number;
  facultativeDiscountsCents: number;
  unclassifiedDiscountsCents: number;
  marginACents: number;
  marginBCents: number;
  availableMarginCents: number;
  limitingCalculation: "A" | "B" | "TIE";
  rubricsByCategory: Record<SiapeRubricCategory, SiapeRubric[]>;
  pendingRubrics: SiapeRubric[];
  divergences: string[];
  notes: string[];
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
export type MarginUploadErrorResponse = {
  success: false;
  message: string;
  agreement?: MarginAgreement;
  file?: MarginUploadFileInfo;
  debug?: MarginUploadDebug;
};

export type MarginMpdftUploadSuccessResponse = {
  success: true;
  agreement: "MPDFT";
  message: string;
  file: MarginUploadFileInfo;
  extraction: MarginExtractionResult;
  nextStep: "CALCULATION_AVAILABLE";
};

export type MarginSiapeUploadSuccessResponse = {
  success: true;
  agreement: "SIAPE";
  message: string;
  file: MarginUploadFileInfo;
  extraction: MarginExtractionResult;
  siapeDraft: SiapeExtractionReview;
  nextStep: "CALCULATION_AVAILABLE";
};

export type MarginUploadResponse =
  | MarginUploadErrorResponse
  | MarginMpdftUploadSuccessResponse
  | MarginSiapeUploadSuccessResponse;
