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
  | "ELIGIBLE_EARNING"
  | "EXCLUDED_EARNING"
  | "MANDATORY_DISCOUNT"
  | "EXISTING_LOAN"
  | "CONSIGNMENT_CARD"
  | "OTHER_FACULTATIVE_CONSIGNMENT"
  | "UNCLASSIFIED_DISCOUNT"
  | "MANUAL_REVIEW"
  | "IGNORED";

// Identifica qual das três travas simultâneas (empréstimos 35%, facultativo
// global 40%, descontos totais 70%) determinou a margem final. "TIE" quando
// duas ou mais travas empatam no menor valor.
export type SiapeLimitingRule =
  | "LOAN_35_PERCENT"
  | "GLOBAL_40_PERCENT"
  | "TOTAL_DISCOUNTS_70_PERCENT"
  | "TIE";

export type MarginRubricLine = {
  linha: string;
  codigo?: string;
  descricao?: string;
  valor?: string;
  tipoLancamento?: MarginRubricEntryType;
  secaoOrigem?: string;
  pagina?: number;
};

export type SiapeRubric = {
  id: string;
  code?: string;
  description: string;
  amountCents: number;
  entryType: MarginRubricEntryType;
  sourceSection?: string;
  page?: number;
  category: SiapeRubricCategory;
  requiresManualReview: boolean;
  notes: string[];
  rawLine: string;
};

// Totais são valores de conferência lidos do próprio PDF (não calculados).
// `null` significa "não identificado no texto"; nunca deve ser exibido ou
// tratado como zero, para não sugerir que a extração funcionou quando não
// funcionou.
export type SiapeExtractionReview = {
  rubrics: SiapeRubric[];
  paycheckGrossTotalCents: number | null;
  paycheckDiscountTotalCents: number | null;
  paycheckNetTotalCents: number | null;
  warnings: string[];
};

// NO_AVAILABLE_MARGIN: uma ou mais das três travas resultou em saldo <= 0.
// Não é um status de aprovação de crédito — apenas informa se há espaço
// numérico para uma nova parcela dentro dos limites calculados.
export type SiapeCalculationStatus =
  | "CALCULATED"
  | "MANUAL_REVIEW"
  | "EXTRACTION_INCOMPLETE"
  | "NO_AVAILABLE_MARGIN";

export type SiapeCalculationResult = {
  agreement: "SIAPE";
  status: SiapeCalculationStatus;
  eligibleBaseCents: number;
  loanLimitCents: number;
  existingLoansCents: number;
  loanBalanceCents: number;
  globalFacultativeLimitCents: number;
  totalFacultativeConsignmentsCents: number;
  globalBalanceCents: number;
  cardLimitCents: number;
  consignmentCardsCents: number;
  otherFacultativeConsignmentsCents: number;
  totalDiscountLimitCents: number;
  mandatoryDiscountsCents: number;
  unclassifiedDiscountsCents: number;
  totalCurrentDiscountsCents: number;
  seventyPercentBalanceCents: number;
  availableLoanMarginCents: number;
  limitingRule: SiapeLimitingRule;
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
