import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calculateMpdftMargin } from "../src/lib/margin/mpdft";
import { parseBrazilianMoneyToCents } from "../src/lib/margin/money";
import {
  buildSiapeExtractionReview,
  calculateSiapeMargin,
} from "../src/services/siape-margin.service";
import type { SiapeRubric, SiapeRubricCategory } from "../src/types/margin";

function rubric(
  category: SiapeRubricCategory,
  amountCents: number,
  description = category,
): SiapeRubric {
  return {
    id: `${category}-${description}`,
    description,
    amountCents,
    entryType: category.includes("DISCOUNT") ? "DISCOUNT" : "EARNING",
    category,
    requiresManualReview:
      category === "MANUAL_REVIEW" || category === "UNCLASSIFIED_DISCOUNT",
    notes: [],
    rawLine: description,
  };
}

describe("SIAPE margin calculation", () => {
  it("uses Margin A when it is lower than Margin B", () => {
    const result = calculateSiapeMargin({
      rubrics: [
        rubric("AUTHORIZED_FIXED_EARNING", 500_000),
        rubric("MANDATORY_DISCOUNT", 200_000),
        rubric("FACULTATIVE_DISCOUNT", 10_000),
      ],
    });

    assert.equal(result.marginACents, 140_000);
    assert.equal(result.marginBCents, 190_000);
    assert.equal(result.availableMarginCents, 140_000);
    assert.equal(result.limitingCalculation, "A");
  });

  it("uses Margin B when it is lower than Margin A", () => {
    const result = calculateSiapeMargin({
      rubrics: [
        rubric("AUTHORIZED_FIXED_EARNING", 500_000),
        rubric("MANDATORY_DISCOUNT", 10_000),
        rubric("FACULTATIVE_DISCOUNT", 120_000),
      ],
    });

    assert.equal(result.marginACents, 220_000);
    assert.equal(result.marginBCents, 80_000);
    assert.equal(result.availableMarginCents, 80_000);
    assert.equal(result.limitingCalculation, "B");
  });

  it("always chooses the lower result and never Math.max", () => {
    const result = calculateSiapeMargin({
      rubrics: [
        rubric("AUTHORIZED_FIXED_EARNING", 100_000),
        rubric("FACULTATIVE_DISCOUNT", 90_000),
      ],
    });

    assert.equal(result.marginACents, -20_000);
    assert.equal(result.marginBCents, -50_000);
    assert.equal(result.availableMarginCents, -50_000);
  });

  it("keeps negative Margin A", () => {
    const result = calculateSiapeMargin({
      rubrics: [
        rubric("AUTHORIZED_FIXED_EARNING", 100_000),
        rubric("MANDATORY_DISCOUNT", 80_000),
      ],
    });

    assert.equal(result.marginACents, -10_000);
  });

  it("keeps negative Margin B", () => {
    const result = calculateSiapeMargin({
      rubrics: [
        rubric("AUTHORIZED_FIXED_EARNING", 100_000),
        rubric("FACULTATIVE_DISCOUNT", 50_000),
      ],
    });

    assert.equal(result.marginBCents, -10_000);
  });

  it("keeps final negative margin without converting to zero", () => {
    const result = calculateSiapeMargin({
      rubrics: [
        rubric("AUTHORIZED_FIXED_EARNING", 100_000),
        rubric("FACULTATIVE_DISCOUNT", 50_000),
      ],
    });

    assert.equal(result.availableMarginCents, -10_000);
  });

  it("subtracts negative adjustments from the fixed income base", () => {
    const result = calculateSiapeMargin({
      rubrics: [
        rubric("AUTHORIZED_FIXED_EARNING", 500_000),
        rubric("NEGATIVE_ADJUSTMENT", 20_000),
      ],
    });

    assert.equal(result.adjustedFixedIncomeCents, 480_000);
  });

  it("counts mandatory discounts in total discounts", () => {
    const result = calculateSiapeMargin({
      rubrics: [
        rubric("AUTHORIZED_FIXED_EARNING", 500_000),
        rubric("MANDATORY_DISCOUNT", 60_000),
      ],
    });

    assert.equal(result.totalDiscountsCents, 60_000);
  });

  it("does not count mandatory discounts as facultative", () => {
    const result = calculateSiapeMargin({
      rubrics: [
        rubric("AUTHORIZED_FIXED_EARNING", 500_000),
        rubric("MANDATORY_DISCOUNT", 60_000),
      ],
    });

    assert.equal(result.facultativeDiscountsCents, 0);
  });

  it("counts facultative discounts in total and facultative discounts", () => {
    const result = calculateSiapeMargin({
      rubrics: [
        rubric("AUTHORIZED_FIXED_EARNING", 500_000),
        rubric("FACULTATIVE_DISCOUNT", 70_000),
      ],
    });

    assert.equal(result.totalDiscountsCents, 70_000);
    assert.equal(result.facultativeDiscountsCents, 70_000);
  });

  it("counts unknown discounts in total discounts", () => {
    const result = calculateSiapeMargin({
      rubrics: [
        rubric("AUTHORIZED_FIXED_EARNING", 500_000),
        rubric("UNCLASSIFIED_DISCOUNT", 30_000, "Desconto diverso"),
      ],
    });

    assert.equal(result.totalDiscountsCents, 30_000);
    assert.equal(result.unclassifiedDiscountsCents, 30_000);
  });

  it("marks unknown discounts for manual review", () => {
    const result = calculateSiapeMargin({
      rubrics: [
        rubric("AUTHORIZED_FIXED_EARNING", 500_000),
        rubric("UNCLASSIFIED_DISCOUNT", 30_000, "Desconto diverso"),
      ],
    });

    assert.equal(result.status, "MANUAL_REVIEW");
    assert.equal(result.pendingRubrics.length, 1);
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

    assert.equal(review.rubrics[1].category, "AUTHORIZED_FIXED_EARNING");
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
        rubric("AUTHORIZED_FIXED_EARNING", 500_000),
        rubric("FACULTATIVE_DISCOUNT", 10_000),
      ],
    });

    assert.equal(result.divergences.length, 1);
  });

  it("tolerates discount divergence up to R$ 0,05", () => {
    const result = calculateSiapeMargin({
      paycheckDiscountTotalCents: 10_005,
      rubrics: [
        rubric("AUTHORIZED_FIXED_EARNING", 500_000),
        rubric("FACULTATIVE_DISCOUNT", 10_000),
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
