import type { Prisma, Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export const LOST_OPERATION_TYPES = [
  "Novo",
  "Refinanciamento",
  "Portabilidade",
  "Portabilidade com refinanciamento",
  "Cartão consignado",
  "Cartão benefício",
] as const;

const MAX_TEXT_LENGTH = 120;
const MAX_RATE = 100;

export type LostOperationInput = {
  clientName: unknown;
  agency: unknown;
  competitorBank: unknown;
  rate: unknown;
  operationType: unknown;
};

export type LostOperationView = {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: Role | null;
  managerName: string | null;
  clientName: string;
  agency: string;
  competitorBank: string;
  rate: number;
  operationType: string;
  createdAt: Date;
  updatedAt: Date;
  canEdit: boolean;
};

export type LostOperationViewer = {
  id: string;
  role: Role | null;
};

export class LostOperationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LostOperationError";
  }
}

function readText(value: unknown, fieldLabel: string): string {
  const text = typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";

  if (!text) {
    throw new LostOperationError(`Informe ${fieldLabel}.`);
  }

  if (text.length > MAX_TEXT_LENGTH) {
    throw new LostOperationError(
      `O campo ${fieldLabel} deve ter no máximo ${MAX_TEXT_LENGTH} caracteres.`,
    );
  }

  return text;
}

// Aceita "1,85", "1.85", "1,85%" e "1,85 a.m.".
export function parseRateInput(value: unknown): number {
  const raw = typeof value === "string" ? value : String(value ?? "");
  const normalized = raw
    .replace(/a\.?\s*m\.?/gi, "")
    .replace(/%/g, "")
    .replace(/\s/g, "")
    .replace(",", ".");

  if (!normalized) {
    throw new LostOperationError("Informe a taxa.");
  }

  const rate = Number(normalized);

  if (!Number.isFinite(rate) || rate < 0 || rate > MAX_RATE) {
    throw new LostOperationError("Informe uma taxa válida, por exemplo 1,85.");
  }

  return Number(rate.toFixed(4));
}

function parseLostOperationInput(input: LostOperationInput) {
  return {
    clientName: readText(input.clientName, "o nome do cliente"),
    agency: readText(input.agency, "o órgão"),
    competitorBank: readText(input.competitorBank, "o banco concorrente"),
    rate: parseRateInput(input.rate),
    operationType: readText(input.operationType, "o tipo de operação"),
  };
}

// Mesma regra de visibilidade da previsao de pagamento:
// - consultor: somente as proprias operacoes;
// - gerente: as proprias e as dos consultores vinculados a ele;
// - regional (superintendente) e admin: todas (regra MVP, ver docs/06).
function buildVisibilityFilter(
  viewer: LostOperationViewer,
): Prisma.LostOperationWhereInput {
  switch (viewer.role) {
    case "ADMIN":
    case "REGIONAL_MANAGER":
      return {};
    case "MANAGER":
      return {
        OR: [{ authorId: viewer.id }, { author: { managerId: viewer.id } }],
      };
    default:
      return { authorId: viewer.id };
  }
}

const lostOperationSelect = {
  id: true,
  authorId: true,
  clientName: true,
  agency: true,
  competitorBank: true,
  rate: true,
  operationType: true,
  createdAt: true,
  updatedAt: true,
  author: {
    select: {
      fullName: true,
      role: true,
      manager: { select: { fullName: true } },
    },
  },
} satisfies Prisma.LostOperationSelect;

type LostOperationRecord = Prisma.LostOperationGetPayload<{
  select: typeof lostOperationSelect;
}>;

function toView(
  record: LostOperationRecord,
  viewer: LostOperationViewer,
): LostOperationView {
  return {
    id: record.id,
    authorId: record.authorId,
    authorName: record.author.fullName,
    authorRole: record.author.role,
    managerName: record.author.manager?.fullName ?? null,
    clientName: record.clientName,
    agency: record.agency,
    competitorBank: record.competitorBank,
    rate: Number(record.rate),
    operationType: record.operationType,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    canEdit: record.authorId === viewer.id,
  };
}

export async function createLostOperation(params: {
  authorId: string;
  input: LostOperationInput;
}) {
  const data = parseLostOperationInput(params.input);

  return prisma.lostOperation.create({
    data: { ...data, authorId: params.authorId },
    select: { id: true },
  });
}

export async function listVisibleLostOperations(
  viewer: LostOperationViewer,
): Promise<LostOperationView[]> {
  const records = await prisma.lostOperation.findMany({
    where: buildVisibilityFilter(viewer),
    orderBy: [{ createdAt: "desc" }],
    select: lostOperationSelect,
  });

  return records.map((record) => toView(record, viewer));
}

// A edicao e restrita ao autor: cada um corrige o que lancou. Gestores
// acompanham as operacoes da equipe em modo leitura.
export async function getOwnLostOperationForEdit(params: {
  viewer: LostOperationViewer;
  operationId: string;
}): Promise<LostOperationView | null> {
  const record = await prisma.lostOperation.findFirst({
    where: { id: params.operationId, authorId: params.viewer.id },
    select: lostOperationSelect,
  });

  return record ? toView(record, params.viewer) : null;
}

export async function updateOwnLostOperation(params: {
  authorId: string;
  operationId: string;
  input: LostOperationInput;
}) {
  const data = parseLostOperationInput(params.input);

  const result = await prisma.lostOperation.updateMany({
    where: { id: params.operationId, authorId: params.authorId },
    data,
  });

  if (result.count === 0) {
    throw new LostOperationError(
      "Operação não encontrada ou você não tem permissão para editá-la.",
    );
  }
}
