import { applyPercentToCents, parseBrazilianMoneyToCents } from "@/lib/margin/money";
import { extractSiapeRubricsFromText } from "@/lib/margin/siapeRubricParser";
import type {
  MarginExtractionResult,
  MarginRubricEntryType,
  MarginRubricLine,
  SiapeCalculationResult,
  SiapeCalculationStatus,
  SiapeExtractionReview,
  SiapeLimitingRule,
  SiapeRubric,
  SiapeRubricCategory,
} from "@/types/margin";

const DISCOUNT_TOTAL_TOLERANCE_CENTS = 5;
const ABONO_PREVIDENCE_TOLERANCE_CENTS = 1;

const LOAN_LIMIT_PERCENT = 35;
const GLOBAL_FACULTATIVE_LIMIT_PERCENT = 40;
const CARD_LIMIT_PERCENT = 5;
const TOTAL_DISCOUNT_LIMIT_PERCENT = 70;

export const SIAPE_RUBRIC_CATEGORIES: SiapeRubricCategory[] = [
  "ELIGIBLE_EARNING",
  "EXCLUDED_EARNING",
  "MANDATORY_DISCOUNT",
  "EXISTING_LOAN",
  "CONSIGNMENT_CARD",
  "OTHER_FACULTATIVE_CONSIGNMENT",
  "UNCLASSIFIED_DISCOUNT",
  "MANUAL_REVIEW",
  "IGNORED",
];

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function includesAny(normalizedText: string, keywords: string[]): boolean {
  return keywords.some((keyword) => normalizedText.includes(keyword));
}

// Verbas remunerat\u00f3rias permanentes que comp\u00f5em a base consign\u00e1vel SIAPE.
// Lista deliberadamente curta e literal: qualquer coisa fora dela (ex.:
// "gratifica\u00e7\u00e3o"/"adicional" gen\u00e9ricos) vai para MANUAL_REVIEW em vez de
// entrar automaticamente na base.
const ELIGIBLE_EARNING_KEYWORDS = [
  "vencimento basico",
  "vencimento",
  "subsidio",
  "soldo",
  "provento basico",
  "remuneracao basica",
];

// Proventos que a base consign\u00e1vel SIAPE n\u00e3o deve considerar automaticamente
// (indenizat\u00f3rios, eventuais, tempor\u00e1rios ou vari\u00e1veis).
const EXCLUDED_EARNING_KEYWORDS = [
  "diaria",
  "diarias",
  "ajuda de custo",
  "auxilio transporte",
  "auxilio-transporte",
  "auxilio alimentacao",
  "auxilio-alimentacao",
  "auxilio natalidade",
  "auxilio funeral",
  "salario familia",
  "13 salario",
  "decimo terceiro",
  "gratificacao natalina",
  "adicional de ferias",
  "1/3 de ferias",
  "terco de ferias",
  "um terco de ferias",
  "servico extraordinario",
  "hora extra",
  "horas extras",
  "adicional noturno",
  "insalubridade",
  "periculosidade",
  "atividade penosa",
  "verba eventual",
  "verbas eventuais",
  "verba temporaria",
  "verbas temporarias",
  "temporaria",
  "retroativo",
  "retroativos",
  "bonus de eficiencia",
  "bonus eficiencia",
  "cargo de direcao",
  "comissao",
  "comissoes",
  "funcao gratificada",
  "gratificacao de representacao",
  "gratificacao temporaria",
  "servico extraordinario temporario",
  "servico voluntario",
  "sentenca judicial",
  "verba variavel",
  "verbas variaveis",
];

// Ajustes de sinal amb\u00edguo (podem ou n\u00e3o representar remunera\u00e7\u00e3o mensal
// permanente). Sempre v\u00e3o para MANUAL_REVIEW: nunca comp\u00f5em a base
// automaticamente, nem s\u00e3o descartados automaticamente.
const AMBIGUOUS_ADJUSTMENT_KEYWORDS = [
  "atraso",
  "atrasos",
  "devolucao",
  "devolucoes",
  "ajuste negativo",
  "acerto negativo",
  "estorno",
];

const CONSIGNMENT_CARD_KEYWORDS = [
  "rmc",
  "rcc",
  "cartao consignado de beneficio",
  "cartao de credito consignado",
  "cartao consignado",
  "cartao",
];

const EXISTING_LOAN_KEYWORDS = [
  "emprestimo",
  "financiamento consignado",
  "contrato bancario consignado",
  "contrato bancario",
  "parcela de emprestimo",
  "consignacao bancaria de emprestimo",
];

const OTHER_FACULTATIVE_CONSIGNMENT_KEYWORDS = [
  "associacao",
  "associacoes",
  "sindicato",
  "seguro",
  "previdencia complementar",
  "plano de saude",
  "plano odontologico",
  "odontologico",
  "saude",
  "consignacao",
  "consignado",
];

const MANDATORY_DISCOUNT_KEYWORDS = [
  "contribuicao previdenciaria",
  "previdencia oficial",
  "previdenciario",
  "pss",
  "rpps",
  "inss",
  "irrf",
  "imposto de renda",
  "pensao alimenticia",
  "pensao judicial",
  "reposicao ao erario",
  "desconto judicial",
  "decisao judicial",
];

const PREVIDENCE_KEYWORDS = [
  "previdencia oficial",
  "previdenciario",
  "pss",
  "rpps",
  "inss",
];

const MONEY_PATTERN = /-?\d{1,3}(?:\.\d{3})*,\d{2}-?|-?\d+,\d{2}-?/g;

function parseRubricLine(line: MarginRubricLine): {
  code?: string;
  description: string;
  amountCents: number | null;
  entryType: MarginRubricEntryType;
} {
  const rawLine = line.linha.trim();
  const code = line.codigo ?? rawLine.match(/^\d{3,10}/)?.[0];
  const moneyMatches = rawLine.match(MONEY_PATTERN) ?? [];
  const rawAmount = line.valor ?? moneyMatches.at(-1);
  const amountCents = parseBrazilianMoneyToCents(rawAmount);
  const withoutCode = code ? rawLine.replace(new RegExp(`^${code}[\\s-]*`), "") : rawLine;
  // Remove os valores com uma única passagem do regex: substituir token a
  // token com .replace(money, ...) corrompe a descrição quando um valor é
  // substring de outro (ex.: "0,00" dentro de "200,00").
  const description =
    line.descricao ?? withoutCode.replace(MONEY_PATTERN, " ").replace(/\s+/g, " ").trim();

  return {
    code,
    description: description || rawLine,
    amountCents,
    entryType: line.tipoLancamento ?? inferEntryType(rawLine, amountCents),
  };
}

function inferEntryType(rawLine: string, amountCents: number | null): MarginRubricEntryType {
  const normalizedLine = normalizeText(rawLine);

  if (
    amountCents !== null &&
    (amountCents < 0 ||
      includesAny(normalizedLine, [
        ...AMBIGUOUS_ADJUSTMENT_KEYWORDS,
        ...CONSIGNMENT_CARD_KEYWORDS,
        ...EXISTING_LOAN_KEYWORDS,
        ...OTHER_FACULTATIVE_CONSIGNMENT_KEYWORDS,
        ...MANDATORY_DISCOUNT_KEYWORDS,
        "desconto",
      ]))
  ) {
    return "DISCOUNT";
  }

  if (amountCents !== null && amountCents > 0) {
    return "EARNING";
  }

  return "UNKNOWN";
}

function findOfficialPrevidenceDiscountCents(rubrics: SiapeRubric[]): number | null {
  const previdenceDiscount = rubrics.find(
    (rubric) =>
      rubric.entryType === "DISCOUNT" &&
      includesAny(normalizeText(rubric.description), PREVIDENCE_KEYWORDS),
  );

  return previdenceDiscount?.amountCents ?? null;
}

function classifyRubric(
  rubric: Omit<SiapeRubric, "category" | "requiresManualReview" | "notes">,
  officialPrevidenceDiscountCents: number | null,
): Pick<SiapeRubric, "category" | "requiresManualReview" | "notes"> {
  const normalizedDescription = normalizeText(rubric.description);
  const notes: string[] = [];

  if (rubric.amountCents <= 0) {
    return {
      category: "MANUAL_REVIEW",
      requiresManualReview: true,
      notes: ["Valor ausente, zerado ou inválido para classificação automática."],
    };
  }

  if (includesAny(normalizedDescription, ["etapa alimentacao"])) {
    return {
      category: "MANUAL_REVIEW",
      requiresManualReview: true,
      notes: ["Etapa alimentação exige conferência manual."],
    };
  }

  if (includesAny(normalizedDescription, ["abono de permanencia", "abono permanencia"])) {
    if (
      officialPrevidenceDiscountCents !== null &&
      Math.abs(rubric.amountCents - officialPrevidenceDiscountCents) <=
        ABONO_PREVIDENCE_TOLERANCE_CENTS
    ) {
      return {
        category: "ELIGIBLE_EARNING",
        requiresManualReview: false,
        notes: ["Abono de permanência incluído por equivalência com o desconto previdenciário."],
      };
    }

    return {
      category: "MANUAL_REVIEW",
      requiresManualReview: true,
      notes: [
        "Abono de permanência divergente ou sem correspondência com o desconto previdenciário.",
      ],
    };
  }

  // Ajustes de atraso/devolução/estorno têm sinal ambíguo quanto a formar
  // (ou não) a base consignável permanente: nunca entram automaticamente,
  // sempre ficam pendentes de decisão do operador.
  if (includesAny(normalizedDescription, AMBIGUOUS_ADJUSTMENT_KEYWORDS)) {
    return {
      category: "MANUAL_REVIEW",
      requiresManualReview: true,
      notes: [
        "Ajuste, atraso ou estorno exige confirmação manual sobre se compõe a base consignável.",
      ],
    };
  }

  if (rubric.entryType === "DISCOUNT") {
    // Ordem importa: "cartão consignado" contém "consignado" e deve ser
    // reconhecido como CONSIGNMENT_CARD antes de cair no bucket genérico de
    // outras consignações facultativas.
    if (includesAny(normalizedDescription, CONSIGNMENT_CARD_KEYWORDS)) {
      return { category: "CONSIGNMENT_CARD", requiresManualReview: false, notes };
    }

    if (includesAny(normalizedDescription, EXISTING_LOAN_KEYWORDS)) {
      return { category: "EXISTING_LOAN", requiresManualReview: false, notes };
    }

    if (includesAny(normalizedDescription, MANDATORY_DISCOUNT_KEYWORDS)) {
      return { category: "MANDATORY_DISCOUNT", requiresManualReview: false, notes };
    }

    if (includesAny(normalizedDescription, OTHER_FACULTATIVE_CONSIGNMENT_KEYWORDS)) {
      return {
        category: "OTHER_FACULTATIVE_CONSIGNMENT",
        requiresManualReview: false,
        notes,
      };
    }

    return {
      category: "UNCLASSIFIED_DISCOUNT",
      requiresManualReview: true,
      notes: ["Desconto não reconhecido incluído no total e pendente de revisão manual."],
    };
  }

  if (rubric.entryType === "EARNING") {
    if (includesAny(normalizedDescription, EXCLUDED_EARNING_KEYWORDS)) {
      return { category: "EXCLUDED_EARNING", requiresManualReview: false, notes };
    }

    if (includesAny(normalizedDescription, ELIGIBLE_EARNING_KEYWORDS)) {
      return {
        category: "ELIGIBLE_EARNING",
        requiresManualReview: false,
        notes,
      };
    }
  }

  return {
    category: "MANUAL_REVIEW",
    requiresManualReview: true,
    notes: ["Classificação automática insegura. Confira se esta rubrica compõe a base consignável."],
  };
}

const NO_RUBRICS_WARNING =
  "Nenhuma rubrica foi identificada automaticamente. Confira se o PDF possui texto selecionável.";

export function buildSiapeExtractionReview(
  extraction: MarginExtractionResult,
): SiapeExtractionReview {
  // A Python Function é a fonte primária de rubricas. Se ela devolver uma
  // lista vazia mas ainda houver texto extraído, tenta reconstruir as
  // rubricas a partir do texto bruto como camada extra de segurança, em vez
  // de devolver silenciosamente uma revisão vazia.
  const rubricLines =
    extraction.rubricas.length > 0
      ? extraction.rubricas
      : extraction.text.trim().length > 0
        ? extractSiapeRubricsFromText(extraction.text)
        : [];

  const parsedRubrics = rubricLines.map((line, index) => {
    const parsed = parseRubricLine(line);

    return {
      id: `${parsed.code ?? "rubrica"}-${index}`,
      code: parsed.code,
      description: parsed.description,
      amountCents: Math.abs(parsed.amountCents ?? 0),
      entryType: parsed.entryType,
      sourceSection: line.secaoOrigem,
      page: line.pagina,
      rawLine: line.linha,
    };
  });
  const officialPrevidenceDiscountCents = findOfficialPrevidenceDiscountCents(
    parsedRubrics.map((rubric) => ({
      ...rubric,
      category: "IGNORED",
      requiresManualReview: false,
      notes: [],
    })),
  );
  const rubrics = parsedRubrics.map((rubric) => ({
    ...rubric,
    ...classifyRubric(rubric, officialPrevidenceDiscountCents),
  }));

  const warnings = [...extraction.warnings];
  if (rubrics.length === 0 && !warnings.includes(NO_RUBRICS_WARNING)) {
    warnings.push(NO_RUBRICS_WARNING);
  }

  return {
    rubrics,
    paycheckGrossTotalCents: parseBrazilianMoneyToCents(extraction.candidateFields.bruto),
    paycheckDiscountTotalCents: parseBrazilianMoneyToCents(
      extraction.candidateFields.descontos,
    ),
    paycheckNetTotalCents: parseBrazilianMoneyToCents(extraction.candidateFields.liquido),
    warnings,
  };
}

function assertValidRubric(rubric: SiapeRubric) {
  if (!SIAPE_RUBRIC_CATEGORIES.includes(rubric.category)) {
    throw new Error("Categoria de rubrica inválida.");
  }

  if (
    !Number.isInteger(rubric.amountCents) ||
    !Number.isFinite(rubric.amountCents) ||
    rubric.amountCents < 0
  ) {
    throw new Error("Valor de rubrica inválido.");
  }
}

function emptyRubricsByCategory(): Record<SiapeRubricCategory, SiapeRubric[]> {
  return SIAPE_RUBRIC_CATEGORIES.reduce(
    (groups, category) => ({ ...groups, [category]: [] }),
    {} as Record<SiapeRubricCategory, SiapeRubric[]>,
  );
}

function emptyCalculationResult(
  status: SiapeCalculationStatus,
  divergences: string[],
  rubricsByCategory: Record<SiapeRubricCategory, SiapeRubric[]> = emptyRubricsByCategory(),
  pendingRubrics: SiapeRubric[] = [],
): SiapeCalculationResult {
  return {
    agreement: "SIAPE",
    status,
    eligibleBaseCents: 0,
    loanLimitCents: 0,
    existingLoansCents: 0,
    loanBalanceCents: 0,
    globalFacultativeLimitCents: 0,
    totalFacultativeConsignmentsCents: 0,
    globalBalanceCents: 0,
    cardLimitCents: 0,
    consignmentCardsCents: 0,
    otherFacultativeConsignmentsCents: 0,
    totalDiscountLimitCents: 0,
    mandatoryDiscountsCents: 0,
    unclassifiedDiscountsCents: 0,
    totalCurrentDiscountsCents: 0,
    seventyPercentBalanceCents: 0,
    availableLoanMarginCents: 0,
    limitingRule: "TIE",
    rubricsByCategory,
    pendingRubrics,
    divergences,
    notes: [],
  };
}

// Identifica qual trava determinou o menor saldo (empata em "TIE" quando
// duas ou mais travas atingem o mesmo valor mínimo).
function resolveLimitingRule(
  loanBalanceCents: number,
  globalBalanceCents: number,
  seventyPercentBalanceCents: number,
): SiapeLimitingRule {
  const minimumCents = Math.min(loanBalanceCents, globalBalanceCents, seventyPercentBalanceCents);
  const matchingRules: SiapeLimitingRule[] = [];

  if (loanBalanceCents === minimumCents) {
    matchingRules.push("LOAN_35_PERCENT");
  }
  if (globalBalanceCents === minimumCents) {
    matchingRules.push("GLOBAL_40_PERCENT");
  }
  if (seventyPercentBalanceCents === minimumCents) {
    matchingRules.push("TOTAL_DISCOUNTS_70_PERCENT");
  }

  return matchingRules.length === 1 ? matchingRules[0] : "TIE";
}

export function calculateSiapeMargin(params: {
  rubrics: SiapeRubric[];
  paycheckDiscountTotalCents?: number | null;
}): SiapeCalculationResult {
  if (!Array.isArray(params.rubrics) || params.rubrics.length === 0) {
    return emptyCalculationResult("EXTRACTION_INCOMPLETE", [
      "Não existem rubricas suficientes para calcular.",
    ]);
  }

  for (const rubric of params.rubrics) {
    assertValidRubric(rubric);
  }

  const rubricsByCategory = emptyRubricsByCategory();

  for (const rubric of params.rubrics) {
    rubricsByCategory[rubric.category].push(rubric);
  }

  const sumCategory = (category: SiapeRubricCategory) =>
    rubricsByCategory[category].reduce((total, rubric) => total + rubric.amountCents, 0);

  const eligibleBaseCents = sumCategory("ELIGIBLE_EARNING");
  const mandatoryDiscountsCents = sumCategory("MANDATORY_DISCOUNT");
  const existingLoansCents = sumCategory("EXISTING_LOAN");
  const consignmentCardsCents = sumCategory("CONSIGNMENT_CARD");
  const otherFacultativeConsignmentsCents = sumCategory("OTHER_FACULTATIVE_CONSIGNMENT");
  const unclassifiedDiscountsCents = sumCategory("UNCLASSIFIED_DISCOUNT");

  const pendingRubrics = params.rubrics.filter(
    (rubric) =>
      rubric.requiresManualReview ||
      rubric.category === "MANUAL_REVIEW" ||
      rubric.category === "UNCLASSIFIED_DISCOUNT",
  );

  if (eligibleBaseCents <= 0) {
    return emptyCalculationResult(
      "EXTRACTION_INCOMPLETE",
      ["Não há rubricas elegíveis suficientes para formar a base consignável."],
      rubricsByCategory,
      pendingRubrics,
    );
  }

  const totalFacultativeConsignmentsCents =
    existingLoansCents + consignmentCardsCents + otherFacultativeConsignmentsCents;
  // Descontos não classificados entram na trava dos 70% mas não no limite
  // facultativo de 40% nem são tratados como empréstimo até serem
  // reclassificados manualmente.
  const totalCurrentDiscountsCents =
    mandatoryDiscountsCents + totalFacultativeConsignmentsCents + unclassifiedDiscountsCents;

  const loanLimitCents = applyPercentToCents(eligibleBaseCents, LOAN_LIMIT_PERCENT);
  const globalFacultativeLimitCents = applyPercentToCents(
    eligibleBaseCents,
    GLOBAL_FACULTATIVE_LIMIT_PERCENT,
  );
  const cardLimitCents = applyPercentToCents(eligibleBaseCents, CARD_LIMIT_PERCENT);
  const totalDiscountLimitCents = applyPercentToCents(
    eligibleBaseCents,
    TOTAL_DISCOUNT_LIMIT_PERCENT,
  );

  const loanBalanceCents = loanLimitCents - existingLoansCents;
  const globalBalanceCents = globalFacultativeLimitCents - totalFacultativeConsignmentsCents;
  const seventyPercentBalanceCents = totalDiscountLimitCents - totalCurrentDiscountsCents;

  // As três travas são comparadas simultaneamente com os saldos originais
  // (que podem ser negativos). Nunca filtrar valores positivos antes do
  // Math.min: um saldo negativo precisa continuar decidindo o resultado.
  const rawFinalLoanMarginCents = Math.min(
    loanBalanceCents,
    globalBalanceCents,
    seventyPercentBalanceCents,
  );
  const availableLoanMarginCents = Math.max(0, rawFinalLoanMarginCents);
  const limitingRule = resolveLimitingRule(
    loanBalanceCents,
    globalBalanceCents,
    seventyPercentBalanceCents,
  );

  const divergences: string[] = [];

  if (
    params.paycheckDiscountTotalCents !== null &&
    params.paycheckDiscountTotalCents !== undefined
  ) {
    const difference = Math.abs(
      totalCurrentDiscountsCents - params.paycheckDiscountTotalCents,
    );

    if (difference > DISCOUNT_TOTAL_TOLERANCE_CENTS) {
      divergences.push(
        "A soma das rubricas de desconto diverge do total informado no contracheque.",
      );
    }
  }

  const status: SiapeCalculationStatus =
    rawFinalLoanMarginCents <= 0
      ? "NO_AVAILABLE_MARGIN"
      : pendingRubrics.length > 0 || divergences.length > 0
        ? "MANUAL_REVIEW"
        : "CALCULATED";

  return {
    agreement: "SIAPE",
    status,
    eligibleBaseCents,
    loanLimitCents,
    existingLoansCents,
    loanBalanceCents,
    globalFacultativeLimitCents,
    totalFacultativeConsignmentsCents,
    globalBalanceCents,
    cardLimitCents,
    consignmentCardsCents,
    otherFacultativeConsignmentsCents,
    totalDiscountLimitCents,
    mandatoryDiscountsCents,
    unclassifiedDiscountsCents,
    totalCurrentDiscountsCents,
    seventyPercentBalanceCents,
    availableLoanMarginCents,
    limitingRule,
    rubricsByCategory,
    pendingRubrics,
    divergences,
    notes: [
      "Margem final: menor saldo entre a trava de empréstimos (35%), a trava facultativa global (40%) e o espaço restante até o limite geral de descontos (70%).",
    ],
  };
}
