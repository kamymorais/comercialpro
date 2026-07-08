import { canManagerAccessConsultant, canRegionalAccessConsultant } from "@/lib/permissions";
import { getOperationalDate } from "@/lib/dates";
import { normalizeMoneyValue } from "@/lib/money";
import { prisma } from "@/lib/prisma";

export type ForecastStatus = "WITH_FORECAST" | "NO_FORECAST" | "NOT_SENT";

export type ConsultantForecastView = {
  operationalDate: Date;
  productionValue: number;
  insuranceValue: number;
  tcValue: number;
  totalValue: number;
  noForecast: boolean;
  submittedAt: Date | null;
};

export type SaveForecastInput = {
  consultantId: string;
  productionValue: number;
  insuranceValue: number;
  tcValue: number;
  noForecast: boolean;
};

export type ForecastCardData = {
  id: string;
  fullName: string;
  username: string;
  productionValue: number;
  insuranceValue: number;
  tcValue: number;
  totalValue: number;
  noForecast: boolean;
  status: ForecastStatus;
};

export type ManagerConsultantForecast = ForecastCardData;

export type ManagerForecastSummary = {
  operationalDate: Date;
  totalTeam: number;
  paymentForecastTotal: number;
  consultants: ManagerConsultantForecast[];
};

export type RegionalManagerSummary = {
  id: string;
  fullName: string;
  username: string;
  consultantsCount: number;
  total: number;
  withForecastCount: number;
  noForecastCount: number;
  notSentCount: number;
};

export type RegionalForecastSummary = {
  operationalDate: Date;
  total: number;
  managers: RegionalManagerSummary[];
};

export type RegionalManagerDetails = {
  manager: {
    id: string;
    fullName: string;
    username: string;
  };
  operationalDate: Date;
  total: number;
  consultants: ForecastCardData[];
};

export type AdminForecastConsultant = ForecastCardData & {
  managerId: string | null;
  managerName: string | null;
};

export type AdminForecastManagerSummary = {
  id: string;
  fullName: string;
  username: string;
  total: number;
  consultantsCount: number;
  withForecastCount: number;
  noForecastCount: number;
  notSentCount: number;
};

export type AdminForecastPanel = {
  operationalDate: Date;
  total: number;
  managers: AdminForecastManagerSummary[];
  consultants: AdminForecastConsultant[];
};

export type EditableConsultantForecast = {
  consultant: {
    id: string;
    fullName: string;
    username: string;
  };
  forecast: ConsultantForecastView;
};

export class ForecastAccessError extends Error {
  code: "NOT_FOUND" | "FORBIDDEN";

  constructor(code: "NOT_FOUND" | "FORBIDDEN", message: string) {
    super(message);
    this.name = "ForecastAccessError";
    this.code = code;
  }
}

type RawForecastValues = {
  productionValue: unknown;
  insuranceValue: unknown;
  tcValue: unknown;
  noForecast: boolean;
  submittedAt: Date | null;
};

function decimalToNumber(value: unknown): number {
  return normalizeMoneyValue(String(value ?? 0));
}

function sanitizeForecastValue(value: number): number {
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }

  return Number(value.toFixed(2));
}

function buildForecastView(
  operationalDate: Date,
  forecast: RawForecastValues | null,
): ConsultantForecastView {
  const productionValue = forecast?.noForecast
    ? 0
    : decimalToNumber(forecast?.productionValue);
  const insuranceValue = forecast?.noForecast
    ? 0
    : decimalToNumber(forecast?.insuranceValue);
  const tcValue = forecast?.noForecast ? 0 : decimalToNumber(forecast?.tcValue);

  return {
    operationalDate,
    productionValue,
    insuranceValue,
    tcValue,
    totalValue: productionValue + insuranceValue + tcValue,
    noForecast: forecast?.noForecast ?? false,
    submittedAt: forecast?.submittedAt ?? null,
  };
}

function toForecastStatus(forecast: { noForecast: boolean } | null): ForecastStatus {
  if (!forecast) {
    return "NOT_SENT";
  }

  return forecast.noForecast ? "NO_FORECAST" : "WITH_FORECAST";
}

function deriveForecastTotals(
  operationalDate: Date,
  forecast: RawForecastValues | null,
): { totalValue: number; status: ForecastStatus } {
  const view = buildForecastView(operationalDate, forecast);

  return { totalValue: view.totalValue, status: toForecastStatus(forecast) };
}

function buildForecastCardData(params: {
  id: string;
  fullName: string;
  username: string;
  operationalDate: Date;
  forecast: RawForecastValues | null;
}): ForecastCardData {
  const view = buildForecastView(params.operationalDate, params.forecast);

  return {
    id: params.id,
    fullName: params.fullName,
    username: params.username,
    productionValue: view.productionValue,
    insuranceValue: view.insuranceValue,
    tcValue: view.tcValue,
    totalValue: view.totalValue,
    noForecast: view.noForecast,
    status: toForecastStatus(params.forecast),
  };
}

async function upsertForecastByEditor(input: {
  consultantId: string;
  editorId: string;
  productionValue: number;
  insuranceValue: number;
  tcValue: number;
  noForecast: boolean;
}): Promise<void> {
  const operationalDate = getOperationalDate();
  const noForecast = input.noForecast;
  const productionValue = noForecast ? 0 : sanitizeForecastValue(input.productionValue);
  const insuranceValue = noForecast ? 0 : sanitizeForecastValue(input.insuranceValue);
  const tcValue = noForecast ? 0 : sanitizeForecastValue(input.tcValue);

  await prisma.dailyForecast.upsert({
    where: {
      consultantId_operationalDate: {
        consultantId: input.consultantId,
        operationalDate,
      },
    },
    create: {
      consultantId: input.consultantId,
      operationalDate,
      productionValue,
      insuranceValue,
      tcValue,
      noForecast,
      submittedAt: new Date(),
      updatedById: input.editorId,
    },
    update: {
      productionValue,
      insuranceValue,
      tcValue,
      noForecast,
      updatedById: input.editorId,
    },
    select: { id: true },
  });
}

export async function getConsultantForecast(
  consultantId: string,
): Promise<ConsultantForecastView> {
  const operationalDate = getOperationalDate();
  const forecast = await prisma.dailyForecast.findUnique({
    where: {
      consultantId_operationalDate: {
        consultantId,
        operationalDate,
      },
    },
    select: {
      productionValue: true,
      insuranceValue: true,
      tcValue: true,
      noForecast: true,
      submittedAt: true,
    },
  });

  return buildForecastView(operationalDate, forecast);
}

export async function upsertConsultantForecast(input: SaveForecastInput) {
  const operationalDate = getOperationalDate();
  const noForecast = input.noForecast;
  const productionValue = noForecast
    ? 0
    : sanitizeForecastValue(input.productionValue);
  const insuranceValue = noForecast ? 0 : sanitizeForecastValue(input.insuranceValue);
  const tcValue = noForecast ? 0 : sanitizeForecastValue(input.tcValue);

  return prisma.dailyForecast.upsert({
    where: {
      consultantId_operationalDate: {
        consultantId: input.consultantId,
        operationalDate,
      },
    },
    create: {
      consultantId: input.consultantId,
      operationalDate,
      productionValue,
      insuranceValue,
      tcValue,
      noForecast,
      submittedAt: new Date(),
      updatedById: input.consultantId,
    },
    update: {
      productionValue,
      insuranceValue,
      tcValue,
      noForecast,
      submittedAt: new Date(),
      updatedById: input.consultantId,
    },
    select: {
      id: true,
    },
  });
}

export async function getManagerForecastSummary(
  managerId: string,
): Promise<ManagerForecastSummary> {
  const operationalDate = getOperationalDate();
  const consultants = await prisma.user.findMany({
    where: {
      managerId,
      role: "CONSULTANT",
      status: "APPROVED",
    },
    orderBy: [{ fullName: "asc" }, { username: "asc" }],
    select: {
      id: true,
      fullName: true,
      username: true,
      forecasts: {
        where: { operationalDate },
        select: {
          productionValue: true,
          insuranceValue: true,
          tcValue: true,
          noForecast: true,
          submittedAt: true,
        },
        take: 1,
      },
    },
  });

  const consultantForecasts = consultants.map((consultant) =>
    buildForecastCardData({
      id: consultant.id,
      fullName: consultant.fullName,
      username: consultant.username,
      operationalDate,
      forecast: consultant.forecasts[0] ?? null,
    }),
  );

  return {
    operationalDate,
    totalTeam: consultantForecasts.length,
    paymentForecastTotal: consultantForecasts.reduce(
      (total, consultant) => total + consultant.totalValue,
      0,
    ),
    consultants: consultantForecasts,
  };
}

export async function updateConsultantForecastByManager(params: {
  managerId: string;
  consultantId: string;
  productionValue: number;
  insuranceValue: number;
  tcValue: number;
  noForecast: boolean;
}): Promise<void> {
  const consultant = await prisma.user.findUnique({
    where: { id: params.consultantId },
    select: { id: true, role: true, status: true, managerId: true },
  });

  if (!consultant) {
    throw new ForecastAccessError("NOT_FOUND", "Consultor não encontrado.");
  }

  if (
    consultant.role !== "CONSULTANT" ||
    consultant.status !== "APPROVED" ||
    !canManagerAccessConsultant(params.managerId, consultant.managerId)
  ) {
    throw new ForecastAccessError(
      "FORBIDDEN",
      "Você não tem permissão para editar este consultor.",
    );
  }

  await upsertForecastByEditor({
    consultantId: params.consultantId,
    editorId: params.managerId,
    productionValue: params.productionValue,
    insuranceValue: params.insuranceValue,
    tcValue: params.tcValue,
    noForecast: params.noForecast,
  });
}

export async function getManagerConsultantForEdit(params: {
  managerId: string;
  consultantId: string;
}): Promise<EditableConsultantForecast | null> {
  const consultant = await prisma.user.findUnique({
    where: { id: params.consultantId },
    select: {
      id: true,
      fullName: true,
      username: true,
      role: true,
      status: true,
      managerId: true,
    },
  });

  if (
    !consultant ||
    consultant.role !== "CONSULTANT" ||
    consultant.status !== "APPROVED" ||
    !canManagerAccessConsultant(params.managerId, consultant.managerId)
  ) {
    return null;
  }

  const forecast = await getConsultantForecast(consultant.id);

  return {
    consultant: {
      id: consultant.id,
      fullName: consultant.fullName,
      username: consultant.username,
    },
    forecast,
  };
}

export async function getRegionalForecastSummary(params: {
  regionalId: string;
}): Promise<RegionalForecastSummary> {
  // Regra MVP: o regional visualiza todos os gerentes aprovados, sem filtrar
  // por regionalManagerId (ver docs/06). O parametro fica preparado para a
  // restricao futura mencionada na Etapa 16.
  void params.regionalId;

  const operationalDate = getOperationalDate();

  const managers = await prisma.user.findMany({
    where: { role: "MANAGER", status: "APPROVED" },
    orderBy: [{ fullName: "asc" }, { username: "asc" }],
    select: {
      id: true,
      fullName: true,
      username: true,
      consultants: {
        where: { role: "CONSULTANT", status: "APPROVED" },
        select: {
          forecasts: {
            where: { operationalDate },
            select: {
              productionValue: true,
              insuranceValue: true,
              tcValue: true,
              noForecast: true,
              submittedAt: true,
            },
            take: 1,
          },
        },
      },
    },
  });

  const managerSummaries: RegionalManagerSummary[] = managers.map((manager) => {
    const consultantTotals = manager.consultants.map((consultant) =>
      deriveForecastTotals(operationalDate, consultant.forecasts[0] ?? null),
    );

    return {
      id: manager.id,
      fullName: manager.fullName,
      username: manager.username,
      consultantsCount: consultantTotals.length,
      total: consultantTotals.reduce((sum, c) => sum + c.totalValue, 0),
      withForecastCount: consultantTotals.filter((c) => c.status === "WITH_FORECAST")
        .length,
      noForecastCount: consultantTotals.filter((c) => c.status === "NO_FORECAST").length,
      notSentCount: consultantTotals.filter((c) => c.status === "NOT_SENT").length,
    };
  });

  return {
    operationalDate,
    total: managerSummaries.reduce((sum, manager) => sum + manager.total, 0),
    managers: managerSummaries,
  };
}

export async function getRegionalManagerDetails(params: {
  regionalId: string;
  managerId: string;
}): Promise<RegionalManagerDetails | null> {
  const operationalDate = getOperationalDate();

  const manager = await prisma.user.findUnique({
    where: { id: params.managerId },
    select: {
      id: true,
      fullName: true,
      username: true,
      role: true,
      status: true,
      regionalManagerId: true,
    },
  });

  if (
    !manager ||
    manager.role !== "MANAGER" ||
    manager.status !== "APPROVED" ||
    !canRegionalAccessConsultant({
      regionalId: params.regionalId,
      consultantManagerRegionalId: manager.regionalManagerId,
    })
  ) {
    return null;
  }

  const consultants = await prisma.user.findMany({
    where: { managerId: manager.id, role: "CONSULTANT", status: "APPROVED" },
    orderBy: [{ fullName: "asc" }, { username: "asc" }],
    select: {
      id: true,
      fullName: true,
      username: true,
      forecasts: {
        where: { operationalDate },
        select: {
          productionValue: true,
          insuranceValue: true,
          tcValue: true,
          noForecast: true,
          submittedAt: true,
        },
        take: 1,
      },
    },
  });

  const consultantCards = consultants.map((consultant) =>
    buildForecastCardData({
      id: consultant.id,
      fullName: consultant.fullName,
      username: consultant.username,
      operationalDate,
      forecast: consultant.forecasts[0] ?? null,
    }),
  );

  return {
    manager: {
      id: manager.id,
      fullName: manager.fullName,
      username: manager.username,
    },
    operationalDate,
    total: consultantCards.reduce((sum, c) => sum + c.totalValue, 0),
    consultants: consultantCards,
  };
}

export async function updateConsultantForecastByRegional(params: {
  regionalId: string;
  consultantId: string;
  productionValue: number;
  insuranceValue: number;
  tcValue: number;
  noForecast: boolean;
}): Promise<{ managerId: string | null }> {
  const consultant = await prisma.user.findUnique({
    where: { id: params.consultantId },
    select: {
      id: true,
      role: true,
      status: true,
      managerId: true,
      manager: {
        select: { role: true, status: true, regionalManagerId: true },
      },
    },
  });

  if (!consultant) {
    throw new ForecastAccessError("NOT_FOUND", "Consultor não encontrado.");
  }

  const manager = consultant.manager;
  const isVisible =
    consultant.role === "CONSULTANT" &&
    consultant.status === "APPROVED" &&
    manager?.role === "MANAGER" &&
    manager.status === "APPROVED" &&
    canRegionalAccessConsultant({
      regionalId: params.regionalId,
      consultantManagerRegionalId: manager.regionalManagerId,
    });

  if (!isVisible) {
    throw new ForecastAccessError(
      "FORBIDDEN",
      "Você não tem permissão para editar este consultor.",
    );
  }

  await upsertForecastByEditor({
    consultantId: params.consultantId,
    editorId: params.regionalId,
    productionValue: params.productionValue,
    insuranceValue: params.insuranceValue,
    tcValue: params.tcValue,
    noForecast: params.noForecast,
  });

  return { managerId: consultant.managerId };
}

export async function getRegionalConsultantForEdit(params: {
  regionalId: string;
  consultantId: string;
}): Promise<EditableConsultantForecast | null> {
  const consultant = await prisma.user.findUnique({
    where: { id: params.consultantId },
    select: {
      id: true,
      fullName: true,
      username: true,
      role: true,
      status: true,
      manager: {
        select: { role: true, status: true, regionalManagerId: true },
      },
    },
  });

  const manager = consultant?.manager;
  const isVisible =
    Boolean(consultant) &&
    consultant?.role === "CONSULTANT" &&
    consultant.status === "APPROVED" &&
    manager?.role === "MANAGER" &&
    manager.status === "APPROVED" &&
    canRegionalAccessConsultant({
      regionalId: params.regionalId,
      consultantManagerRegionalId: manager.regionalManagerId,
    });

  if (!consultant || !isVisible) {
    return null;
  }

  const forecast = await getConsultantForecast(consultant.id);

  return {
    consultant: {
      id: consultant.id,
      fullName: consultant.fullName,
      username: consultant.username,
    },
    forecast,
  };
}

export async function getAdminForecastPanel(params?: {
  managerId?: string;
  status?: ForecastStatus;
}): Promise<AdminForecastPanel> {
  const operationalDate = getOperationalDate();

  const [consultants, managers] = await Promise.all([
    prisma.user.findMany({
      where: { role: "CONSULTANT", status: "APPROVED" },
      orderBy: [{ fullName: "asc" }, { username: "asc" }],
      select: {
        id: true,
        fullName: true,
        username: true,
        managerId: true,
        manager: { select: { fullName: true } },
        forecasts: {
          where: { operationalDate },
          select: {
            productionValue: true,
            insuranceValue: true,
            tcValue: true,
            noForecast: true,
            submittedAt: true,
          },
          take: 1,
        },
      },
    }),
    prisma.user.findMany({
      where: { role: "MANAGER", status: "APPROVED" },
      orderBy: [{ fullName: "asc" }, { username: "asc" }],
      select: { id: true, fullName: true, username: true },
    }),
  ]);

  const allConsultants: AdminForecastConsultant[] = consultants.map((consultant) => ({
    ...buildForecastCardData({
      id: consultant.id,
      fullName: consultant.fullName,
      username: consultant.username,
      operationalDate,
      forecast: consultant.forecasts[0] ?? null,
    }),
    managerId: consultant.managerId,
    managerName: consultant.manager?.fullName ?? null,
  }));

  const managerSummaries: AdminForecastManagerSummary[] = managers.map((manager) => {
    const managerConsultants = allConsultants.filter((c) => c.managerId === manager.id);

    return {
      id: manager.id,
      fullName: manager.fullName,
      username: manager.username,
      total: managerConsultants.reduce((sum, c) => sum + c.totalValue, 0),
      consultantsCount: managerConsultants.length,
      withForecastCount: managerConsultants.filter((c) => c.status === "WITH_FORECAST")
        .length,
      noForecastCount: managerConsultants.filter((c) => c.status === "NO_FORECAST")
        .length,
      notSentCount: managerConsultants.filter((c) => c.status === "NOT_SENT").length,
    };
  });

  const filteredConsultants = allConsultants.filter((consultant) => {
    if (params?.managerId && consultant.managerId !== params.managerId) {
      return false;
    }

    if (params?.status && consultant.status !== params.status) {
      return false;
    }

    return true;
  });

  return {
    operationalDate,
    total: allConsultants.reduce((sum, c) => sum + c.totalValue, 0),
    managers: managerSummaries,
    consultants: filteredConsultants,
  };
}

export async function updateConsultantForecastByAdmin(params: {
  adminId: string;
  consultantId: string;
  productionValue: number;
  insuranceValue: number;
  tcValue: number;
  noForecast: boolean;
}): Promise<void> {
  const consultant = await prisma.user.findUnique({
    where: { id: params.consultantId },
    select: { id: true, role: true, status: true },
  });

  if (!consultant) {
    throw new ForecastAccessError("NOT_FOUND", "Consultor não encontrado.");
  }

  if (consultant.role !== "CONSULTANT" || consultant.status !== "APPROVED") {
    throw new ForecastAccessError(
      "FORBIDDEN",
      "Você não tem permissão para editar este consultor.",
    );
  }

  await upsertForecastByEditor({
    consultantId: params.consultantId,
    editorId: params.adminId,
    productionValue: params.productionValue,
    insuranceValue: params.insuranceValue,
    tcValue: params.tcValue,
    noForecast: params.noForecast,
  });
}

export async function getAdminConsultantForEdit(params: {
  consultantId: string;
}): Promise<EditableConsultantForecast | null> {
  const consultant = await prisma.user.findUnique({
    where: { id: params.consultantId },
    select: { id: true, fullName: true, username: true, role: true, status: true },
  });

  if (!consultant || consultant.role !== "CONSULTANT" || consultant.status !== "APPROVED") {
    return null;
  }

  const forecast = await getConsultantForecast(consultant.id);

  return {
    consultant: {
      id: consultant.id,
      fullName: consultant.fullName,
      username: consultant.username,
    },
    forecast,
  };
}
