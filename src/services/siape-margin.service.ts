import { applyPercentToCents, parseBrazilianMoneyToCents } from "@/lib/margin/money";
import type {
  MarginExtractionResult,
  MarginRubricEntryType,
  MarginRubricLine,
  SiapeCalculationResult,
  SiapeExtractionReview,
  SiapeRubric,
  SiapeRubricCategory,
} from "@/types/margin";

const DISCOUNT_TOTAL_TOLERANCE_CENTS = 5;
const ABONO_PREVIDENCE_TOLERANCE_CENTS = 1;

export const SIAPE_RUBRIC_CATEGORIES: SiapeRubricCategory[] = [
  "AUTHORIZED_FIXED_EARNING",
  "NEGATIVE_ADJUSTMENT",
  "FACULTATIVE_DISCOUNT",
  "MANDATORY_DISCOUNT",
  "UNCLASSIFIED_DISCOUNT",
  "EXCLUDED_EARNING",
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

const FIXED_EARNING_KEYWORDS = [
  "vencimento basico",
  "vencimento",
  "subsidio",
  "soldo",
  "provento basico",
  "remuneracao basica",
];

const EXCLUDED_EARNING_KEYWORDS = [
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
  "verba temporaria",
  "verbas temporarias",
  "temporaria",
];

const NEGATIVE_ADJUSTMENT_KEYWORDS = [
  "atraso",
  "atrasos",
  "devolucao",
  "devolucoes",
  "reposicao",
  "reposicoes",
  "ajuste negativo",
  "acerto negativo",
  "estorno",
];

const FACULTATIVE_DISCOUNT_KEYWORDS = [
  "emprestimo",
  "consignado",
  "contrato bancario",
  "cartao",
  "rmc",
  "rcc",
  "seguro",
  "associacao",
  "associacoes",
  "sindicato",
  "previdencia complementar",
  "plano de saude",
  "saude",
  "odontologico",
  "consignacao",
];

const MANDATORY_DISCOUNT_KEYWORDS = [
  "imposto de renda",
  "irrf",
  "previdencia oficial",
  "previdenciario",
  "pss",
  "rpps",
  "inss",
  "pensao judicial",
];

const PREVIDENCE_KEYWORDS = [
  "previdencia oficial",
  "previdenciario",
  "pss",
  "rpps",
  "inss",
];

const MONEY_PATTERN = /-?\d{1,3}(?:\.\d{3})*,\d{2}|-?\d+,\d{2}/g;

function parseRubricLine(line: MarginRubricLine): {
  code?: string;
  description: string;
  amountCents: number | null;
  entryType: MarginRubricEntryType;
} {
  const rawLine = line.linha.trim();
  const code = line.codigo ?? rawLine.match(/^\d{5}/)?.[0];
  const moneyMatches = rawLine.match(MONEY_PATTERN) ?? [];
  const rawAmount = line.valor ?? moneyMatches.at(-1);
  const amountCents = parseBrazilianMoneyToCents(rawAmount);
  const withoutCode = code ? rawLine.replace(new RegExp(`^${code}\\s*`), "") : rawLine;
  const description =
    line.descricao ??
    moneyMatches.reduce(
      (currentDescription, money) => currentDescription.replace(money, " "),
      withoutCode,
    )
      .replace(/\s+/g, " ")
      .trim();

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
        ...NEGATIVE_ADJUSTMENT_KEYWORDS,
        ...FACULTATIVE_DISCOUNT_KEYWORDS,
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
        category: "AUTHORIZED_FIXED_EARNING",
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

  if (includesAny(normalizedDescription, NEGATIVE_ADJUSTMENT_KEYWORDS)) {
    return {
      category: "NEGATIVE_ADJUSTMENT",
      requiresManualReview: false,
      notes,
    };
  }

  if (rubric.entryType === "DISCOUNT") {
    if (includesAny(normalizedDescription, MANDATORY_DISCOUNT_KEYWORDS)) {
      return { category: "MANDATORY_DISCOUNT", requiresManualReview: false, notes };
    }

    if (includesAny(normalizedDescription, FACULTATIVE_DISCOUNT_KEYWORDS)) {
      return { category: "FACULTATIVE_DISCOUNT", requiresManualReview: false, notes };
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

    if (includesAny(normalizedDescription, FIXED_EARNING_KEYWORDS)) {
      return {
        category: "AUTHORIZED_FIXED_EARNING",
        requiresManualReview: false,
        notes,
      };
    }
  }

  return {
    category: "MANUAL_REVIEW",
    requiresManualReview: true,
    notes: ["Classificação automática insegura. Confira a categoria antes de calcular."],
  };
}

function getPaycheckDiscountTotalCents(extraction: MarginExtractionResult): number | null {
  return parseBrazilianMoneyToCents(extraction.candidateFields.descontos);
}

export function buildSiapeExtractionReview(
  extraction: MarginExtractionResult,
): SiapeExtractionReview {
  const parsedRubrics = extraction.rubricas.map((line, index) => {
    const parsed = parseRubricLine(line);

    return {
      id: `${parsed.code ?? "rubrica"}-${index}`,
      code: parsed.code,
      description: parsed.description,
      amountCents: Math.abs(parsed.amountCents ?? 0),
      entryType: parsed.entryType,
      sourceSection: line.secaoOrigem,
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

  return {
    rubrics,
    paycheckDiscountTotalCents: getPaycheckDiscountTotalCents(extraction),
    warnings: extraction.warnings,
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

export function calculateSiapeMargin(params: {
  rubrics: SiapeRubric[];
  paycheckDiscountTotalCents?: number | null;
}): SiapeCalculationResult {
  if (!Array.isArray(params.rubrics) || params.rubrics.length === 0) {
    return {
      agreement: "SIAPE",
      status: "EXTRACTION_INCOMPLETE",
      authorizedFixedEarningsCents: 0,
      negativeAdjustmentsCents: 0,
      adjustedFixedIncomeCents: 0,
      totalDiscountsCents: 0,
      mandatoryDiscountsCents: 0,
      facultativeDiscountsCents: 0,
      unclassifiedDiscountsCents: 0,
      marginACents: 0,
      marginBCents: 0,
      availableMarginCents: 0,
      limitingCalculation: "TIE",
      rubricsByCategory: emptyRubricsByCategory(),
      pendingRubrics: [],
      divergences: ["Não existem rubricas suficientes para calcular."],
      notes: [],
    };
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
  const authorizedFixedEarningsCents = sumCategory("AUTHORIZED_FIXED_EARNING");
  const negativeAdjustmentsCents = sumCategory("NEGATIVE_ADJUSTMENT");
  const mandatoryDiscountsCents = sumCategory("MANDATORY_DISCOUNT");
  const facultativeDiscountsCents = sumCategory("FACULTATIVE_DISCOUNT");
  const unclassifiedDiscountsCents = sumCategory("UNCLASSIFIED_DISCOUNT");
  const totalDiscountsCents =
    mandatoryDiscountsCents + facultativeDiscountsCents + unclassifiedDiscountsCents;
  const adjustedFixedIncomeCents =
    authorizedFixedEarningsCents - negativeAdjustmentsCents;
  const marginACents =
    applyPercentToCents(adjustedFixedIncomeCents, 70) - totalDiscountsCents;
  const marginBCents =
    applyPercentToCents(adjustedFixedIncomeCents, 40) - facultativeDiscountsCents;
  const availableMarginCents = Math.min(marginACents, marginBCents);
  const pendingRubrics = params.rubrics.filter(
    (rubric) =>
      rubric.requiresManualReview ||
      rubric.category === "MANUAL_REVIEW" ||
      rubric.category === "UNCLASSIFIED_DISCOUNT",
  );
  const divergences: string[] = [];

  if (params.paycheckDiscountTotalCents !== null && params.paycheckDiscountTotalCents !== undefined) {
    const difference = Math.abs(totalDiscountsCents - params.paycheckDiscountTotalCents);

    if (difference > DISCOUNT_TOTAL_TOLERANCE_CENTS) {
      divergences.push(
        "A soma das rubricas de desconto diverge do total informado no contracheque.",
      );
    }
  }

  if (authorizedFixedEarningsCents <= 0) {
    divergences.push("Não há verbas fixas autorizadas suficientes para calcular.");
  }

  const status: SiapeCalculationResult["status"] =
    authorizedFixedEarningsCents <= 0
      ? "EXTRACTION_INCOMPLETE"
      : pendingRubrics.length > 0 || divergences.length > 0
        ? "MANUAL_REVIEW"
        : "CALCULATED";

  return {
    agreement: "SIAPE",
    status,
    authorizedFixedEarningsCents,
    negativeAdjustmentsCents,
    adjustedFixedIncomeCents,
    totalDiscountsCents,
    mandatoryDiscountsCents,
    facultativeDiscountsCents,
    unclassifiedDiscountsCents,
    marginACents,
    marginBCents,
    availableMarginCents,
    limitingCalculation:
      marginACents === marginBCents ? "TIE" : marginACents < marginBCents ? "A" : "B",
    rubricsByCategory,
    pendingRubrics,
    divergences,
    notes: ["Margem final: menor resultado entre Margem A e Margem B."],
  };
}
