import { NextResponse } from "next/server";
import type { Role } from "@/generated/prisma/client";
import { getCurrentUserFromSession } from "@/lib/auth";
import {
  calculateSiapeMargin,
  SIAPE_RUBRIC_CATEGORIES,
} from "@/services/siape-margin.service";
import type {
  SiapeCalculationResult,
  SiapeRubric,
  SiapeRubricCategory,
} from "@/types/margin";

const ALLOWED_ROLES: Role[] = [
  "ADMIN",
  "CONSULTANT",
  "MANAGER",
  "REGIONAL_MANAGER",
];

type SiapeCalculationResponse =
  | {
      success: true;
      message: string;
      agreement: "SIAPE";
      result: SiapeCalculationResult;
    }
  | {
      success: false;
      message: string;
      agreement: "SIAPE";
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function parseIntegerCents(value: unknown, fieldName: string): number {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    !Number.isFinite(value)
  ) {
    throw new Error(`${fieldName} inválido.`);
  }

  return value;
}

function parseCategory(value: unknown): SiapeRubricCategory {
  if (
    typeof value !== "string" ||
    !SIAPE_RUBRIC_CATEGORIES.includes(value as SiapeRubricCategory)
  ) {
    throw new Error("Categoria de rubrica inválida.");
  }

  return value as SiapeRubricCategory;
}

function parseRubrics(value: unknown): SiapeRubric[] {
  if (!Array.isArray(value)) {
    throw new Error("Rubricas inválidas.");
  }

  return value.map((item, index) => {
    if (!isRecord(item)) {
      throw new Error("Rubrica inválida.");
    }

    const category = parseCategory(item.category);
    const amountCents = parseIntegerCents(item.amountCents, "Valor da rubrica");
    const entryType =
      item.entryType === "EARNING" ||
      item.entryType === "DISCOUNT" ||
      item.entryType === "UNKNOWN"
        ? item.entryType
        : "UNKNOWN";

    if (amountCents < 0) {
      throw new Error("Valor da rubrica inválido.");
    }

    return {
      id: String(item.id ?? `rubrica-${index}`),
      code: typeof item.code === "string" ? item.code.slice(0, 40) : undefined,
      description: String(item.description ?? "Rubrica sem descrição").slice(0, 160),
      amountCents,
      entryType,
      sourceSection:
        typeof item.sourceSection === "string"
          ? item.sourceSection.slice(0, 80)
          : undefined,
      category,
      requiresManualReview:
        item.requiresManualReview === true ||
        category === "MANUAL_REVIEW" ||
        category === "UNCLASSIFIED_DISCOUNT",
      notes: Array.isArray(item.notes)
        ? item.notes.map((note) => String(note).slice(0, 180)).slice(0, 5)
        : [],
      rawLine: String(item.rawLine ?? "").slice(0, 240),
    };
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUserFromSession();

  if (!user || user.status !== "APPROVED" || !user.role) {
    return NextResponse.json<SiapeCalculationResponse>(
      {
        success: false,
        agreement: "SIAPE",
        message: "Sessão inválida. Faça login novamente.",
      },
      { status: 401 },
    );
  }

  if (!ALLOWED_ROLES.includes(user.role)) {
    return NextResponse.json<SiapeCalculationResponse>(
      {
        success: false,
        agreement: "SIAPE",
        message: "Você não tem permissão para usar este módulo.",
      },
      { status: 403 },
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json<SiapeCalculationResponse>(
      {
        success: false,
        agreement: "SIAPE",
        message: "Não foi possível calcular a margem SIAPE.",
      },
      { status: 400 },
    );
  }

  try {
    if (!isRecord(body)) {
      throw new Error("Dados inválidos.");
    }

    const rubrics = parseRubrics(body.rubrics);
    const paycheckDiscountTotalCents =
      body.paycheckDiscountTotalCents === null ||
      body.paycheckDiscountTotalCents === undefined
        ? null
        : parseIntegerCents(
            body.paycheckDiscountTotalCents,
            "Total de descontos do contracheque",
          );
    const result = calculateSiapeMargin({
      rubrics,
      paycheckDiscountTotalCents,
    });

    return NextResponse.json<SiapeCalculationResponse>({
      success: true,
      agreement: "SIAPE",
      message: "Cálculo SIAPE concluído.",
      result,
    });
  } catch (error) {
    return NextResponse.json<SiapeCalculationResponse>(
      {
        success: false,
        agreement: "SIAPE",
        message:
          error instanceof Error
            ? error.message
            : "Não foi possível calcular a margem SIAPE.",
      },
      { status: 400 },
    );
  }
}
