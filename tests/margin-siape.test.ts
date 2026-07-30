import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calculateMpdftMargin } from "../src/lib/margin/mpdft";
import { parseBrazilianMoneyToCents } from "../src/lib/margin/money";
import { extractSiapeRubricsFromText } from "../src/lib/margin/siapeRubricParser";
import {
  buildSiapeExtractionReview,
  calculateSiapeMargin,
} from "../src/services/siape-margin.service";
import type {
  MarginExtractionResult,
  SiapeRubric,
  SiapeRubricCategory,
} from "../src/types/margin";

function extractionResult(
  overrides: Partial<MarginExtractionResult>,
): MarginExtractionResult {
  return {
    pages: 1,
    text: "",
    pagesText: [],
    candidateFields: {},
    rubricas: [],
    warnings: [],
    ...overrides,
  };
}

const DISCOUNT_CATEGORIES = new Set<SiapeRubricCategory>([
  "MANDATORY_DISCOUNT",
  "EXISTING_LOAN",
  "CONSIGNMENT_CARD",
  "OTHER_FACULTATIVE_CONSIGNMENT",
  "UNCLASSIFIED_DISCOUNT",
]);

function rubric(
  category: SiapeRubricCategory,
  amountCents: number,
  description = category,
): SiapeRubric {
  return {
    id: `${category}-${description}`,
    description,
    amountCents,
    entryType: DISCOUNT_CATEGORIES.has(category) ? "DISCOUNT" : "EARNING",
    category,
    requiresManualReview:
      category === "MANUAL_REVIEW" || category === "UNCLASSIFIED_DISCOUNT",
    notes: [],
    rawLine: description,
  };
}

describe("SIAPE margin calculation", () => {
  // 1. Exemplo obrigatório do item 8: base R$ 8.000, margem final R$ 900.
  it("matches the mandatory R$ 8.000 base example (R$ 900 available margin)", () => {
    const result = calculateSiapeMargin({
      rubrics: [
        rubric("ELIGIBLE_EARNING", 800_000),
        rubric("MANDATORY_DISCOUNT", 250_000),
        rubric("EXISTING_LOAN", 190_000),
        rubric("CONSIGNMENT_CARD", 20_000),
      ],
    });

    assert.equal(result.eligibleBaseCents, 800_000);
    assert.equal(result.loanLimitCents, 280_000);
    assert.equal(result.loanBalanceCents, 90_000);
    assert.equal(result.globalFacultativeLimitCents, 320_000);
    assert.equal(result.totalFacultativeConsignmentsCents, 210_000);
    assert.equal(result.globalBalanceCents, 110_000);
    assert.equal(result.totalDiscountLimitCents, 560_000);
    assert.equal(result.totalCurrentDiscountsCents, 460_000);
    assert.equal(result.seventyPercentBalanceCents, 100_000);
    assert.equal(result.availableLoanMarginCents, 90_000);
    assert.equal(result.limitingRule, "LOAN_35_PERCENT");
  });

  // 2. Trava de 35% sendo a menor (empréstimo alto, sem facultativo/mandatório).
  it("is limited by the 35% loan cap when it is the smallest balance", () => {
    const result = calculateSiapeMargin({
      rubrics: [
        rubric("ELIGIBLE_EARNING", 1_000_000),
        rubric("EXISTING_LOAN", 300_000),
      ],
    });

    assert.equal(result.loanBalanceCents, 50_000);
    assert.equal(result.availableLoanMarginCents, 50_000);
    assert.equal(result.limitingRule, "LOAN_35_PERCENT");
  });

  // 3. Trava global de 40% sendo a menor.
  it("is limited by the 40% global facultative cap when it is the smallest balance", () => {
    const result = calculateSiapeMargin({
      rubrics: [
        rubric("ELIGIBLE_EARNING", 1_000_000),
        rubric("OTHER_FACULTATIVE_CONSIGNMENT", 350_000),
      ],
    });

    assert.equal(result.globalBalanceCents, 50_000);
    assert.equal(result.availableLoanMarginCents, 50_000);
    assert.equal(result.limitingRule, "GLOBAL_40_PERCENT");
  });

  // 4. Trava de 70% sendo a menor (desconto obrigatório alto).
  it("is limited by the 70% total discount cap when it is the smallest balance", () => {
    const result = calculateSiapeMargin({
      rubrics: [
        rubric("ELIGIBLE_EARNING", 1_000_000),
        rubric("MANDATORY_DISCOUNT", 650_000),
      ],
    });

    assert.equal(result.seventyPercentBalanceCents, 50_000);
    assert.equal(result.availableLoanMarginCents, 50_000);
    assert.equal(result.limitingRule, "TOTAL_DISCOUNTS_70_PERCENT");
  });

  // 5. Empate entre travas (loan e global no mesmo valor mínimo).
  it("reports TIE when two balances reach the same minimum", () => {
    const result = calculateSiapeMargin({
      rubrics: [
        rubric("ELIGIBLE_EARNING", 1_000_000),
        rubric("EXISTING_LOAN", 300_000),
        rubric("CONSIGNMENT_CARD", 50_000),
      ],
    });

    assert.equal(result.loanBalanceCents, 50_000);
    assert.equal(result.globalBalanceCents, 50_000);
    assert.equal(result.limitingRule, "TIE");
  });

  // 6. Cartão não reduz diretamente o limite de empréstimos (35%).
  it("does not let the card discount reduce the 35% loan balance", () => {
    const result = calculateSiapeMargin({
      rubrics: [
        rubric("ELIGIBLE_EARNING", 1_000_000),
        rubric("CONSIGNMENT_CARD", 200_000),
      ],
    });

    assert.equal(result.loanBalanceCents, result.loanLimitCents);
  });

  // 7. Cartão reduz o limite global facultativo (40%).
  it("lets the card discount reduce the 40% global balance", () => {
    const result = calculateSiapeMargin({
      rubrics: [
        rubric("ELIGIBLE_EARNING", 1_000_000),
        rubric("CONSIGNMENT_CARD", 200_000),
      ],
    });

    assert.equal(result.globalBalanceCents, result.globalFacultativeLimitCents - 200_000);
  });

  // 8. Cartão reduz o espaço dos 70%.
  it("lets the card discount reduce the 70% balance", () => {
    const result = calculateSiapeMargin({
      rubrics: [
        rubric("ELIGIBLE_EARNING", 1_000_000),
        rubric("CONSIGNMENT_CARD", 200_000),
      ],
    });

    assert.equal(
      result.seventyPercentBalanceCents,
      result.totalDiscountLimitCents - 200_000,
    );
  });

  // 9. Empréstimo reduz simultaneamente as travas de 35%, 40% e 70%.
  it("lets an existing loan reduce all three balances at once", () => {
    const baseline = calculateSiapeMargin({
      rubrics: [rubric("ELIGIBLE_EARNING", 1_000_000)],
    });
    const withLoan = calculateSiapeMargin({
      rubrics: [
        rubric("ELIGIBLE_EARNING", 1_000_000),
        rubric("EXISTING_LOAN", 150_000),
      ],
    });

    assert.ok(withLoan.loanBalanceCents < baseline.loanBalanceCents);
    assert.ok(withLoan.globalBalanceCents < baseline.globalBalanceCents);
    assert.ok(withLoan.seventyPercentBalanceCents < baseline.seventyPercentBalanceCents);
  });

  // 10. Desconto obrigatório reduz somente o espaço dos 70%.
  it("lets a mandatory discount reduce only the 70% balance", () => {
    const result = calculateSiapeMargin({
      rubrics: [
        rubric("ELIGIBLE_EARNING", 1_000_000),
        rubric("MANDATORY_DISCOUNT", 100_000),
      ],
    });

    assert.equal(result.loanBalanceCents, result.loanLimitCents);
    assert.equal(result.globalBalanceCents, result.globalFacultativeLimitCents);
    assert.equal(
      result.seventyPercentBalanceCents,
      result.totalDiscountLimitCents - 100_000,
    );
  });

  // 11. Outra consignação facultativa reduz 40% e 70%, mas não 35%.
  it("lets another facultative consignment reduce the 40% and 70% balances only", () => {
    const result = calculateSiapeMargin({
      rubrics: [
        rubric("ELIGIBLE_EARNING", 1_000_000),
        rubric("OTHER_FACULTATIVE_CONSIGNMENT", 100_000),
      ],
    });

    assert.equal(result.loanBalanceCents, result.loanLimitCents);
    assert.equal(result.globalBalanceCents, result.globalFacultativeLimitCents - 100_000);
    assert.equal(
      result.seventyPercentBalanceCents,
      result.totalDiscountLimitCents - 100_000,
    );
  });

  // 12. Desconto não classificado reduz os 70% e gera pendência de revisão.
  it("lets an unclassified discount reduce the 70% balance and trigger manual review", () => {
    const result = calculateSiapeMargin({
      rubrics: [
        rubric("ELIGIBLE_EARNING", 1_000_000),
        rubric("UNCLASSIFIED_DISCOUNT", 50_000, "Desconto diverso"),
      ],
    });

    assert.equal(result.globalBalanceCents, result.globalFacultativeLimitCents);
    assert.equal(
      result.seventyPercentBalanceCents,
      result.totalDiscountLimitCents - 50_000,
    );
    assert.equal(result.status, "MANUAL_REVIEW");
    assert.equal(result.pendingRubrics.length, 1);
  });

  // 13. Rubrica excluída não compõe a base.
  it("does not let an excluded earning enter the eligible base", () => {
    const result = calculateSiapeMargin({
      rubrics: [
        rubric("ELIGIBLE_EARNING", 500_000),
        rubric("EXCLUDED_EARNING", 300_000, "Auxílio-alimentação"),
      ],
    });

    assert.equal(result.eligibleBaseCents, 500_000);
  });

  // 14. Rubrica elegível compõe a base.
  it("lets an eligible earning enter the eligible base", () => {
    const result = calculateSiapeMargin({
      rubrics: [rubric("ELIGIBLE_EARNING", 500_000)],
    });

    assert.equal(result.eligibleBaseCents, 500_000);
  });

  // 15. Resultado negativo em qualquer trava produz margem disponível zero.
  it("clamps the available margin to zero when a balance goes negative", () => {
    const result = calculateSiapeMargin({
      rubrics: [
        rubric("ELIGIBLE_EARNING", 1_000_000),
        rubric("EXISTING_LOAN", 400_000),
      ],
    });

    assert.ok(result.loanBalanceCents < 0);
    assert.equal(result.availableLoanMarginCents, 0);
    assert.equal(result.status, "NO_AVAILABLE_MARGIN");
  });

  // 16. Saldo negativo original continua visível no resultado (não é zerado).
  it("keeps the original negative balance visible instead of hiding it", () => {
    const result = calculateSiapeMargin({
      rubrics: [
        rubric("ELIGIBLE_EARNING", 1_000_000),
        rubric("EXISTING_LOAN", 400_000),
      ],
    });

    assert.equal(result.loanBalanceCents, 350_000 - 400_000);
  });

  // 17. Proibição de ignorar o saldo negativo e escolher outro saldo positivo.
  it("never substitutes a positive balance for the negative one when picking the minimum", () => {
    const result = calculateSiapeMargin({
      rubrics: [
        rubric("ELIGIBLE_EARNING", 1_000_000),
        // Empréstimo maior que o limite de 35%: derruba só a trava do empréstimo.
        rubric("EXISTING_LOAN", 355_000),
      ],
    });

    assert.ok(result.loanBalanceCents < 0);
    assert.ok(result.globalBalanceCents > 0);
    assert.ok(result.seventyPercentBalanceCents > 0);
    // Se o Math.min filtrasse valores positivos antes de comparar, o
    // resultado enganosamente escolheria um saldo positivo aqui.
    assert.equal(result.availableLoanMarginCents, 0);
    assert.equal(result.limitingRule, "LOAN_35_PERCENT");
  });

  // 18. Base zerada produz EXTRACTION_INCOMPLETE.
  it("returns EXTRACTION_INCOMPLETE when there is no eligible base", () => {
    const result = calculateSiapeMargin({
      rubrics: [rubric("EXCLUDED_EARNING", 500_000, "Auxílio-alimentação")],
    });

    assert.equal(result.eligibleBaseCents, 0);
    assert.equal(result.status, "EXTRACTION_INCOMPLETE");
  });

  // 19. Precisão em centavos ao aplicar percentuais.
  it("rounds percentages to the nearest cent instead of using floating point reais", () => {
    const result = calculateSiapeMargin({
      rubrics: [rubric("ELIGIBLE_EARNING", 100_001)],
    });

    assert.equal(result.loanLimitCents, 35_000);
    assert.equal(result.globalFacultativeLimitCents, 40_000);
    assert.equal(result.cardLimitCents, 5_000);
    assert.equal(result.totalDiscountLimitCents, 70_001);
  });

  it("classifies temporary earnings as excluded", () => {
    const review = buildSiapeExtractionReview({
      pages: 1,
      text: "",
      pagesText: [],
      candidateFields: {},
      rubricas: [{ linha: "12345 Gratificação temporária 1.000,00" }],
      warnings: [],
    });

    assert.equal(review.rubrics[0].category, "EXCLUDED_EARNING");
  });

  it("accepts abono when it matches the official previdence discount", () => {
    const review = buildSiapeExtractionReview({
      pages: 1,
      text: "",
      pagesText: [],
      candidateFields: {},
      rubricas: [
        { linha: "11111 PSS previdenciário 500,00" },
        { linha: "22222 Abono de permanência 500,00" },
      ],
      warnings: [],
    });

    assert.equal(review.rubrics[1].category, "ELIGIBLE_EARNING");
  });

  it("sends divergent abono to manual review", () => {
    const review = buildSiapeExtractionReview({
      pages: 1,
      text: "",
      pagesText: [],
      candidateFields: {},
      rubricas: [
        { linha: "11111 PSS previdenciário 500,00" },
        { linha: "22222 Abono de permanência 400,00" },
      ],
      warnings: [],
    });

    assert.equal(review.rubrics[1].category, "MANUAL_REVIEW");
  });

  it("sends etapa alimentação to manual review", () => {
    const review = buildSiapeExtractionReview({
      pages: 1,
      text: "",
      pagesText: [],
      candidateFields: {},
      rubricas: [{ linha: "12345 Etapa alimentação 300,00" }],
      warnings: [],
    });

    assert.equal(review.rubrics[0].category, "MANUAL_REVIEW");
  });

  it("flags discount divergence above R$ 0,05", () => {
    const result = calculateSiapeMargin({
      paycheckDiscountTotalCents: 10_006,
      rubrics: [
        rubric("ELIGIBLE_EARNING", 500_000),
        rubric("OTHER_FACULTATIVE_CONSIGNMENT", 10_000),
      ],
    });

    assert.equal(result.divergences.length, 1);
  });

  it("tolerates discount divergence up to R$ 0,05", () => {
    const result = calculateSiapeMargin({
      paycheckDiscountTotalCents: 10_005,
      rubrics: [
        rubric("ELIGIBLE_EARNING", 500_000),
        rubric("OTHER_FACULTATIVE_CONSIGNMENT", 10_000),
      ],
    });

    assert.equal(result.divergences.length, 0);
  });

  it("parses Brazilian monetary values with comma decimals", () => {
    assert.equal(parseBrazilianMoneyToCents("R$ 1.234,56"), 123_456);
  });

  it("keeps the current MPDFT calculation behavior", () => {
    const result = calculateMpdftMargin({
      bruto: "5.000,00",
      descontos: "2.000,00",
      margemPdf: "1.200,00",
    });

    assert.equal(result?.seventyPercentMargin, 1500);
    assert.equal(result?.availableInstallment, 1200);
    assert.equal(result?.status, "AVAILABLE");
  });
});

describe("SIAPE raw-text rubric parser (fallback)", () => {
  it("reads a rubric with a 5-digit code", () => {
    const rubrics = extractSiapeRubricsFromText(
      "12345 VENCIMENTO BASICO 5.000,00",
    );

    assert.equal(rubrics.length, 1);
    assert.equal(rubrics[0].codigo, "12345");
    assert.equal(rubrics[0].descricao, "VENCIMENTO BASICO");
    assert.equal(rubrics[0].valor, "5.000,00");
    assert.equal(rubrics[0].tipoLancamento, "EARNING");
  });

  it("reads a rubric with more than 5 digits in the code", () => {
    const rubrics = extractSiapeRubricsFromText(
      "1234567 GRATIFICACAO DE ATIVIDADE 800,00",
    );

    assert.equal(rubrics[0].codigo, "1234567");
    assert.equal(rubrics[0].descricao, "GRATIFICACAO DE ATIVIDADE");
  });

  it("reads a code followed by a hyphen", () => {
    const rubrics = extractSiapeRubricsFromText(
      "456-CONSIGNADO BANCO EXEMPLO 123,45",
    );

    assert.equal(rubrics[0].codigo, "456");
    assert.equal(rubrics[0].descricao, "CONSIGNADO BANCO EXEMPLO");
    assert.equal(rubrics[0].tipoLancamento, "DISCOUNT");
  });

  it("joins a description split across two lines", () => {
    const rubrics = extractSiapeRubricsFromText(
      ["777 AUXILIO", "ALIMENTACAO 350,00"].join("\n"),
    );

    assert.equal(rubrics.length, 1);
    assert.equal(rubrics[0].descricao, "AUXILIO ALIMENTACAO");
    assert.equal(rubrics[0].valor, "350,00");
  });

  it("parses values with thousands separator (1.234,56)", () => {
    const rubrics = extractSiapeRubricsFromText("11111 SUBSIDIO 1.234,56");

    assert.equal(rubrics[0].valor, "1.234,56");
  });

  it("parses a leading negative value", () => {
    const rubrics = extractSiapeRubricsFromText("22222 ATRASO -123,45");

    assert.equal(rubrics[0].valor, "-123,45");
    assert.equal(rubrics[0].tipoLancamento, "DISCOUNT");
  });

  it("parses a trailing negative value (123,45-)", () => {
    const rubrics = extractSiapeRubricsFromText("33333 SEGURO SAUDE 123,45-");

    assert.equal(rubrics[0].valor, "-123,45");
    assert.equal(rubrics[0].tipoLancamento, "DISCOUNT");
  });

  it("splits an earning column and a discount column on the same line", () => {
    const rubrics = extractSiapeRubricsFromText(
      "44444 VERBA COM DUAS COLUNAS 0,00 200,00",
    );

    assert.equal(rubrics[0].valor, "200,00");
    assert.equal(rubrics[0].tipoLancamento, "DISCOUNT");
    assert.equal(rubrics[0].descricao, "VERBA COM DUAS COLUNAS");
  });

  it("picks the earning column when the discount column is zero", () => {
    const rubrics = extractSiapeRubricsFromText(
      "55555 VERBA COM DUAS COLUNAS 900,00 0,00",
    );

    assert.equal(rubrics[0].valor, "900,00");
    assert.equal(rubrics[0].tipoLancamento, "EARNING");
  });

  it("does not confuse a code shorter than 3 digits with a rubric", () => {
    const rubrics = extractSiapeRubricsFromText("11-CARTAO CONSIGNADO 1.234,56");

    assert.equal(rubrics.length, 0);
  });

  it("returns no rubrics for text without any rubric-shaped lines", () => {
    const rubrics = extractSiapeRubricsFromText(
      "CONTRACHEQUE\nCompetencia: 07/2026\nTotal de Rendimentos 6.150,00",
    );

    assert.equal(rubrics.length, 0);
  });
});

describe("SIAPE extraction review (buildSiapeExtractionReview)", () => {
  it("falls back to the raw text when the extractor returns no rubricas", () => {
    const review = buildSiapeExtractionReview(
      extractionResult({
        text: "12345 VENCIMENTO BASICO 5.000,00\n88888 CONSIGNADO BANCO XYZ 123,45",
        rubricas: [],
      }),
    );

    assert.equal(review.rubrics.length, 2);
    assert.ok(!review.warnings.includes(
      "Nenhuma rubrica foi identificada automaticamente. Confira se o PDF possui texto selecionável.",
    ));
  });

  it("returns a clear warning instead of a silent empty review", () => {
    const review = buildSiapeExtractionReview(
      extractionResult({ text: "CONTRACHEQUE SEM RUBRICAS RECONHECIVEIS", rubricas: [] }),
    );

    assert.equal(review.rubrics.length, 0);
    assert.ok(
      review.warnings.includes(
        "Nenhuma rubrica foi identificada automaticamente. Confira se o PDF possui texto selecionável.",
      ),
    );
  });

  it("never reports zero totals when nothing was identified", () => {
    const review = buildSiapeExtractionReview(extractionResult({ text: "", rubricas: [] }));

    assert.equal(review.paycheckGrossTotalCents, null);
    assert.equal(review.paycheckDiscountTotalCents, null);
    assert.equal(review.paycheckNetTotalCents, null);
    assert.equal(review.rubrics.length, 0);
  });

  it("recognizes 'Total de Rendimentos' as the gross total label", () => {
    const review = buildSiapeExtractionReview(
      extractionResult({ candidateFields: { bruto: "6.150,00" } }),
    );

    assert.equal(review.paycheckGrossTotalCents, 615_000);
  });

  it("recognizes 'Total de Descontos' as the discount total label", () => {
    const review = buildSiapeExtractionReview(
      extractionResult({ candidateFields: { descontos: "823,45" } }),
    );

    assert.equal(review.paycheckDiscountTotalCents, 82_345);
  });

  it("recognizes 'Valor Líquido' as the net total label", () => {
    const review = buildSiapeExtractionReview(
      extractionResult({ candidateFields: { liquido: "5.326,55" } }),
    );

    assert.equal(review.paycheckNetTotalCents, 532_655);
  });

  it("keeps working with rubricas already provided by the Python extractor", () => {
    const review = buildSiapeExtractionReview(
      extractionResult({
        text: "não deveria ser usado quando rubricas já vieram preenchidas",
        rubricas: [{ linha: "12345 Vencimento básico 5.000,00" }],
      }),
    );

    assert.equal(review.rubrics.length, 1);
    assert.equal(review.rubrics[0].category, "ELIGIBLE_EARNING");
  });
});
