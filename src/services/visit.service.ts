import type { Role, VisitEventType, VisitStatus } from "@/generated/prisma/client";
import {
  findAgreementLocation,
  getAgreementOptions,
  type AgreementLocation,
} from "@/data/agreement-locations";
import { canManagerAccessConsultant } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import {
  createVisitPhotoUploadTargets,
  deleteVisitPhotoBlobs,
  validateUploadedVisitPhoto,
  validateVisitPhotoCount,
  verifyUploadedVisitPhotoBlob,
  type UploadedVisitPhotoInput,
  type VisitPhotoUploadTarget,
  type VisitPhotoUploadTargetInput,
} from "@/services/visit-photo.service";

export type VisitDiaryErrorCode =
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "INVALID_STATUS"
  | "INVALID_DATA";

export class VisitDiaryError extends Error {
  code: VisitDiaryErrorCode;

  constructor(code: VisitDiaryErrorCode, message: string) {
    super(message);
    this.name = "VisitDiaryError";
    this.code = code;
  }
}

export type VisitSummary = {
  total: number;
  assigned: number;
  revisionRequested: number;
  submitted: number;
  completed: number;
};

export type VisitListItem = {
  id: string;
  agreementName: string;
  unitName: string;
  unitAddress: string;
  unitLatitude: number;
  unitLongitude: number;
  status: VisitStatus;
  assignedAt: Date;
  submittedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  consultantName: string;
  consultantUsername: string;
  managerName: string;
  latestNote: string | null;
};

export type VisitEventView = {
  id: string;
  type: VisitEventType;
  note: string | null;
  createdAt: Date;
  author: {
    id: string;
    fullName: string;
    username: string;
    role: Role | null;
  };
  photos: VisitPhotoView[];
};

export type VisitPhotoView = {
  id: string;
  originalName: string;
  contentType: string;
  sizeBytes: number;
  createdAt: Date;
};

export type VisitAssignmentDetails = VisitListItem & {
  agreementCode: string;
  unitId: string;
  events: VisitEventView[];
};

export type ManagerVisitConsultant = {
  id: string;
  fullName: string;
  username: string;
  summary: VisitSummary;
};

export type ManagerVisitDashboard = {
  consultants: ManagerVisitConsultant[];
};

export type ManagerConsultantVisitDetails = {
  consultant: {
    id: string;
    fullName: string;
    username: string;
  };
  summary: VisitSummary;
  visits: VisitListItem[];
  agreements: ReturnType<typeof getAgreementOptions>;
};

export type ConsultantVisitDashboard = {
  summary: VisitSummary;
  visits: VisitListItem[];
};

export type OversightConsultant = {
  id: string;
  fullName: string;
  username: string;
  summary: VisitSummary;
  visits: VisitAssignmentDetails[];
};

export type OversightManager = {
  id: string;
  fullName: string;
  username: string;
  consultantsCount: number;
  summary: VisitSummary;
};

export type OversightDashboard = {
  managers: OversightManager[];
  summary: VisitSummary;
};

export type OversightManagerDetails = {
  manager: {
    id: string;
    fullName: string;
    username: string;
  };
  summary: VisitSummary;
  consultants: OversightConsultant[];
};

export type ConsultantPendingVisitNotice = {
  total: number;
  assigned: number;
  revisionRequested: number;
};

const MAX_NOTE_LENGTH = 2000;

const visitWithRelationsSelect = {
  id: true,
  consultantId: true,
  managerId: true,
  agreementCode: true,
  agreementName: true,
  unitId: true,
  unitName: true,
  unitAddress: true,
  unitLatitude: true,
  unitLongitude: true,
  status: true,
  assignedAt: true,
  submittedAt: true,
  completedAt: true,
  createdAt: true,
  consultant: {
    select: {
      id: true,
      fullName: true,
      username: true,
      role: true,
      status: true,
      managerId: true,
    },
  },
  manager: {
    select: {
      id: true,
      fullName: true,
      username: true,
      role: true,
      status: true,
      regionalManagerId: true,
    },
  },
  events: {
    orderBy: { createdAt: "asc" as const },
    select: {
      id: true,
      type: true,
      note: true,
      createdAt: true,
      author: {
        select: {
          id: true,
          fullName: true,
          username: true,
          role: true,
        },
      },
      photos: {
        orderBy: { createdAt: "asc" as const },
        select: {
          id: true,
          originalName: true,
          contentType: true,
          sizeBytes: true,
          createdAt: true,
        },
      },
    },
  },
};

type VisitRecord = Awaited<ReturnType<typeof findVisitById>>;

function normalizeNote(value: unknown, required: boolean): string | null {
  const note = String(value ?? "").trim().replace(/\s+/g, " ");

  if (!note) {
    if (required) {
      throw new VisitDiaryError("INVALID_DATA", "Informe uma observação.");
    }

    return null;
  }

  if (note.length > MAX_NOTE_LENGTH) {
    throw new VisitDiaryError(
      "INVALID_DATA",
      `A observação deve ter no máximo ${MAX_NOTE_LENGTH} caracteres.`,
    );
  }

  return note;
}

function emptySummary(): VisitSummary {
  return {
    total: 0,
    assigned: 0,
    revisionRequested: 0,
    submitted: 0,
    completed: 0,
  };
}

function buildSummary(visits: Array<{ status: VisitStatus }>): VisitSummary {
  return visits.reduce((summary, visit) => {
    summary.total += 1;

    if (visit.status === "ASSIGNED") {
      summary.assigned += 1;
    }

    if (visit.status === "REVISION_REQUESTED") {
      summary.revisionRequested += 1;
    }

    if (visit.status === "SUBMITTED") {
      summary.submitted += 1;
    }

    if (visit.status === "COMPLETED") {
      summary.completed += 1;
    }

    return summary;
  }, emptySummary());
}

function mergeSummaries(summaries: VisitSummary[]): VisitSummary {
  return summaries.reduce((total, summary) => ({
    total: total.total + summary.total,
    assigned: total.assigned + summary.assigned,
    revisionRequested: total.revisionRequested + summary.revisionRequested,
    submitted: total.submitted + summary.submitted,
    completed: total.completed + summary.completed,
  }), emptySummary());
}

function getLatestNote(
  events: Array<{ note: string | null; createdAt: Date }>,
): string | null {
  return events
    .filter((event) => event.note)
    .sort((current, next) => next.createdAt.getTime() - current.createdAt.getTime())[0]
    ?.note ?? null;
}

function mapVisitToListItem(visit: NonNullable<VisitRecord>): VisitListItem {
  return {
    id: visit.id,
    agreementName: visit.agreementName,
    unitName: visit.unitName,
    unitAddress: visit.unitAddress,
    unitLatitude: visit.unitLatitude,
    unitLongitude: visit.unitLongitude,
    status: visit.status,
    assignedAt: visit.assignedAt,
    submittedAt: visit.submittedAt,
    completedAt: visit.completedAt,
    createdAt: visit.createdAt,
    consultantName: visit.consultant.fullName,
    consultantUsername: visit.consultant.username,
    managerName: visit.manager.fullName,
    latestNote: getLatestNote(visit.events),
  };
}

function mapVisitToDetails(visit: NonNullable<VisitRecord>): VisitAssignmentDetails {
  return {
    ...mapVisitToListItem(visit),
    agreementCode: visit.agreementCode,
    unitId: visit.unitId,
    events: visit.events,
  };
}

function sortVisitsForConsultant(visits: VisitListItem[]): VisitListItem[] {
  const weights: Record<VisitStatus, number> = {
    REVISION_REQUESTED: 0,
    ASSIGNED: 1,
    SUBMITTED: 2,
    COMPLETED: 3,
  };

  return [...visits].sort((current, next) => {
    const statusDiff = weights[current.status] - weights[next.status];

    if (statusDiff !== 0) {
      return statusDiff;
    }

    return next.createdAt.getTime() - current.createdAt.getTime();
  });
}

function getMapsUrl(location: { unitLatitude: number; unitLongitude: number }) {
  return `https://www.google.com/maps/search/?api=1&query=${location.unitLatitude},${location.unitLongitude}`;
}

async function findVisitById(visitId: string) {
  return prisma.visitAssignment.findUnique({
    where: { id: visitId },
    select: visitWithRelationsSelect,
  });
}

async function assertManagerCanUseConsultant(params: {
  managerId: string;
  consultantId: string;
}) {
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

  if (!consultant) {
    throw new VisitDiaryError("NOT_FOUND", "Consultor não encontrado.");
  }

  if (
    consultant.role !== "CONSULTANT" ||
    consultant.status !== "APPROVED" ||
    !canManagerAccessConsultant(params.managerId, consultant.managerId)
  ) {
    throw new VisitDiaryError(
      "FORBIDDEN",
      "Você não tem permissão para acessar este consultor.",
    );
  }

  return consultant;
}

function assertManagerCanOperateVisit(params: {
  visit: NonNullable<VisitRecord>;
  managerId: string;
}) {
  if (
    params.visit.managerId !== params.managerId ||
    params.visit.consultant.role !== "CONSULTANT" ||
    params.visit.consultant.status !== "APPROVED" ||
    params.visit.consultant.managerId !== params.managerId
  ) {
    throw new VisitDiaryError(
      "FORBIDDEN",
      "Você não tem permissão para alterar esta atividade.",
    );
  }
}

function assertVisitVisible(params: {
  visit: NonNullable<VisitRecord>;
  viewerId: string;
  viewerRole: Role;
}) {
  if (params.viewerRole === "ADMIN") {
    return;
  }

  if (params.viewerRole === "CONSULTANT") {
    if (params.visit.consultantId === params.viewerId) {
      return;
    }

    throw new VisitDiaryError(
      "FORBIDDEN",
      "Você não tem permissão para acessar esta atividade.",
    );
  }

  if (params.viewerRole === "MANAGER") {
    if (
      params.visit.managerId === params.viewerId &&
      params.visit.consultant.role === "CONSULTANT" &&
      params.visit.consultant.status === "APPROVED" &&
      params.visit.consultant.managerId === params.viewerId
    ) {
      return;
    }

    throw new VisitDiaryError(
      "FORBIDDEN",
      "Você não tem permissão para acessar esta atividade.",
    );
  }

  if (
    params.viewerRole === "REGIONAL_MANAGER" &&
    params.visit.manager.role === "MANAGER" &&
    params.visit.manager.status === "APPROVED"
  ) {
    return;
  }

  throw new VisitDiaryError(
    "FORBIDDEN",
    "Você não tem permissão para acessar esta atividade.",
  );
}

function assertRequiredStatus(
  currentStatus: VisitStatus,
  allowedStatuses: VisitStatus[],
  message: string,
) {
  if (!allowedStatuses.includes(currentStatus)) {
    throw new VisitDiaryError("INVALID_STATUS", message);
  }
}

function validateUploadedPhotos(photos: UploadedVisitPhotoInput[]) {
  const countError = validateVisitPhotoCount(photos.length);

  if (countError) {
    throw new VisitDiaryError("INVALID_DATA", countError);
  }

  for (const photo of photos) {
    const error = validateUploadedVisitPhoto(photo);

    if (error) {
      throw new VisitDiaryError("INVALID_DATA", error);
    }
  }
}

function getValidatedLocation(params: {
  agreementCode: string;
  unitId: string;
}): AgreementLocation {
  const location = findAgreementLocation(params);

  if (!location) {
    throw new VisitDiaryError("INVALID_DATA", "Unidade de convênio inválida.");
  }

  return location;
}

export function getVisitStatusLabel(status: VisitStatus): string {
  const labels: Record<VisitStatus, string> = {
    ASSIGNED: "Aguardando visita",
    SUBMITTED: "Enviada para análise",
    REVISION_REQUESTED: "Refazer visita",
    COMPLETED: "Concluída",
  };

  return labels[status];
}

export function getVisitEventLabel(type: VisitEventType): string {
  const labels: Record<VisitEventType, string> = {
    ASSIGNED: "Atividade atribuída",
    CONSULTANT_SUBMITTED: "Relatório enviado",
    REVISION_REQUESTED: "Refazer visita solicitado",
    COMPLETED: "Atividade concluída",
  };

  return labels[type];
}

export function getVisitMapsUrl(visit: Pick<VisitListItem, "unitLatitude" | "unitLongitude">) {
  return getMapsUrl(visit);
}

export async function getManagerVisitDashboard(
  managerId: string,
): Promise<ManagerVisitDashboard> {
  const consultants = await prisma.user.findMany({
    where: { managerId, role: "CONSULTANT", status: "APPROVED" },
    orderBy: [{ fullName: "asc" }, { username: "asc" }],
    select: {
      id: true,
      fullName: true,
      username: true,
      assignedVisits: {
        where: { managerId },
        select: { status: true },
      },
    },
  });

  return {
    consultants: consultants.map((consultant) => ({
      id: consultant.id,
      fullName: consultant.fullName,
      username: consultant.username,
      summary: buildSummary(consultant.assignedVisits),
    })),
  };
}

export async function getManagerConsultantVisitDetails(params: {
  managerId: string;
  consultantId: string;
}): Promise<ManagerConsultantVisitDetails> {
  const consultant = await assertManagerCanUseConsultant(params);
  const visits = await prisma.visitAssignment.findMany({
    where: {
      managerId: params.managerId,
      consultantId: consultant.id,
    },
    orderBy: [{ createdAt: "desc" }],
    select: visitWithRelationsSelect,
  });

  const mappedVisits = visits.map(mapVisitToListItem);

  return {
    consultant: {
      id: consultant.id,
      fullName: consultant.fullName,
      username: consultant.username,
    },
    summary: buildSummary(mappedVisits),
    visits: mappedVisits,
    agreements: getAgreementOptions(),
  };
}

export async function createVisitAssignment(params: {
  managerId: string;
  consultantId: string;
  agreementCode: string;
  unitId: string;
  initialNote?: unknown;
}): Promise<{ id: string }> {
  await assertManagerCanUseConsultant(params);
  const location = getValidatedLocation({
    agreementCode: params.agreementCode,
    unitId: params.unitId,
  });
  const initialNote = normalizeNote(params.initialNote, false);

  return prisma.$transaction(async (tx) => {
    const assignment = await tx.visitAssignment.create({
      data: {
        consultantId: params.consultantId,
        managerId: params.managerId,
        agreementCode: location.agreementCode,
        agreementName: location.agreementName,
        unitId: location.id,
        unitName: location.name,
        unitAddress: location.address,
        unitLatitude: location.latitude,
        unitLongitude: location.longitude,
        status: "ASSIGNED",
      },
      select: { id: true },
    });

    await tx.visitEvent.create({
      data: {
        visitAssignmentId: assignment.id,
        authorId: params.managerId,
        type: "ASSIGNED",
        note: initialNote,
      },
      select: { id: true },
    });

    return assignment;
  });
}

export async function getConsultantVisitDashboard(
  consultantId: string,
): Promise<ConsultantVisitDashboard> {
  const visits = await prisma.visitAssignment.findMany({
    where: { consultantId },
    orderBy: [{ createdAt: "desc" }],
    select: visitWithRelationsSelect,
  });
  const mappedVisits = sortVisitsForConsultant(visits.map(mapVisitToListItem));

  return {
    summary: buildSummary(mappedVisits),
    visits: mappedVisits,
  };
}

export async function getVisitAssignmentDetails(params: {
  viewerId: string;
  viewerRole: Role;
  visitId: string;
}): Promise<VisitAssignmentDetails> {
  const visit = await findVisitById(params.visitId);

  if (!visit) {
    throw new VisitDiaryError("NOT_FOUND", "Atividade não encontrada.");
  }

  assertVisitVisible({ ...params, visit });

  return mapVisitToDetails(visit);
}

export async function submitConsultantVisitReport(params: {
  consultantId: string;
  visitId: string;
  note: unknown;
  photos?: UploadedVisitPhotoInput[];
}): Promise<void> {
  const note = normalizeNote(params.note, true);
  const photos = params.photos ?? [];
  validateUploadedPhotos(photos);
  const visit = await findVisitById(params.visitId);

  if (!visit) {
    throw new VisitDiaryError("NOT_FOUND", "Atividade não encontrada.");
  }

  if (visit.consultantId !== params.consultantId) {
    throw new VisitDiaryError(
      "FORBIDDEN",
      "Você não tem permissão para alterar esta atividade.",
    );
  }

  assertRequiredStatus(
    visit.status,
    ["ASSIGNED", "REVISION_REQUESTED"],
    "Esta atividade não está disponível para envio de relatório.",
  );
  await Promise.all(photos.map((photo) => verifyUploadedVisitPhotoBlob(photo)));

  await prisma.$transaction(async (tx) => {
    await tx.visitAssignment.update({
      where: { id: visit.id },
      data: {
        status: "SUBMITTED",
        submittedAt: new Date(),
      },
      select: { id: true },
    });

    const event = await tx.visitEvent.create({
      data: {
        visitAssignmentId: visit.id,
        authorId: params.consultantId,
        type: "CONSULTANT_SUBMITTED",
        note,
      },
      select: { id: true },
    });

    if (photos.length > 0) {
      await tx.visitPhoto.createMany({
        data: photos.map((photo) => ({
          visitEventId: event.id,
          uploadedById: params.consultantId,
          pathname: photo.pathname,
          blobUrl: photo.blobUrl,
          originalName: photo.originalName.trim().slice(0, 120),
          contentType: photo.contentType,
          sizeBytes: photo.sizeBytes,
        })),
      });
    }
  });
}

export async function prepareConsultantVisitPhotoUploads(params: {
  consultantId: string;
  visitId: string;
  files: VisitPhotoUploadTargetInput[];
}): Promise<VisitPhotoUploadTarget[]> {
  const visit = await findVisitById(params.visitId);

  if (!visit) {
    throw new VisitDiaryError("NOT_FOUND", "Atividade não encontrada.");
  }

  if (visit.consultantId !== params.consultantId) {
    throw new VisitDiaryError(
      "FORBIDDEN",
      "Você não tem permissão para enviar fotos nesta atividade.",
    );
  }

  assertRequiredStatus(
    visit.status,
    ["ASSIGNED", "REVISION_REQUESTED"],
    "Esta atividade não está disponível para envio de fotos.",
  );

  try {
    return await createVisitPhotoUploadTargets({
      visitId: visit.id,
      files: params.files,
    });
  } catch (error) {
    if (error instanceof Error) {
      throw new VisitDiaryError("INVALID_DATA", error.message);
    }

    throw error;
  }
}

export async function cleanupConsultantUnsubmittedVisitPhotos(params: {
  consultantId: string;
  visitId: string;
  photos: { pathname: string }[];
}): Promise<void> {
  const visit = await findVisitById(params.visitId);

  if (!visit) {
    throw new VisitDiaryError("NOT_FOUND", "Atividade não encontrada.");
  }

  if (visit.consultantId !== params.consultantId) {
    throw new VisitDiaryError(
      "FORBIDDEN",
      "Você não tem permissão para limpar fotos desta atividade.",
    );
  }

  assertRequiredStatus(
    visit.status,
    ["ASSIGNED", "REVISION_REQUESTED"],
    "Esta atividade não está disponível para limpeza de fotos.",
  );

  await deleteVisitPhotoBlobs(params.photos);
}

export async function requestVisitRevision(params: {
  managerId: string;
  visitId: string;
  note: unknown;
}): Promise<void> {
  const note = normalizeNote(params.note, true);
  const visit = await findVisitById(params.visitId);

  if (!visit) {
    throw new VisitDiaryError("NOT_FOUND", "Atividade não encontrada.");
  }

  assertManagerCanOperateVisit({ visit, managerId: params.managerId });
  assertRequiredStatus(
    visit.status,
    ["SUBMITTED"],
    "Somente atividades enviadas para análise podem receber solicitação para refazer visita.",
  );

  await prisma.$transaction([
    prisma.visitAssignment.update({
      where: { id: visit.id },
      data: { status: "REVISION_REQUESTED" },
      select: { id: true },
    }),
    prisma.visitEvent.create({
      data: {
        visitAssignmentId: visit.id,
        authorId: params.managerId,
        type: "REVISION_REQUESTED",
        note,
      },
      select: { id: true },
    }),
  ]);
}

export async function completeVisitAssignment(params: {
  managerId: string;
  visitId: string;
  note?: unknown;
}): Promise<void> {
  const note = normalizeNote(params.note, false);
  const visit = await findVisitById(params.visitId);

  if (!visit) {
    throw new VisitDiaryError("NOT_FOUND", "Atividade não encontrada.");
  }

  assertManagerCanOperateVisit({ visit, managerId: params.managerId });
  assertRequiredStatus(
    visit.status,
    ["SUBMITTED"],
    "Somente atividades enviadas para análise podem ser concluídas.",
  );

  await prisma.$transaction([
    prisma.visitAssignment.update({
      where: { id: visit.id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
      },
      select: { id: true },
    }),
    prisma.visitEvent.create({
      data: {
        visitAssignmentId: visit.id,
        authorId: params.managerId,
        type: "COMPLETED",
        note,
      },
      select: { id: true },
    }),
  ]);
}

async function getApprovedManagersWithVisits() {
  return prisma.user.findMany({
    where: { role: "MANAGER", status: "APPROVED" },
    orderBy: [{ fullName: "asc" }, { username: "asc" }],
    select: {
      id: true,
      fullName: true,
      username: true,
      consultants: {
        where: { role: "CONSULTANT", status: "APPROVED" },
        orderBy: [{ fullName: "asc" }, { username: "asc" }],
        select: {
          id: true,
          fullName: true,
          username: true,
          assignedVisits: {
            orderBy: [{ createdAt: "desc" }],
            select: visitWithRelationsSelect,
          },
        },
      },
    },
  });
}

export async function getVisitOversightDashboard(): Promise<OversightDashboard> {
  const managers = await getApprovedManagersWithVisits();
  const managerSummaries = managers.map((manager) => {
    const visits = manager.consultants.flatMap((consultant) =>
      consultant.assignedVisits.filter((visit) => visit.managerId === manager.id),
    );
    const summary = buildSummary(visits);

    return {
      id: manager.id,
      fullName: manager.fullName,
      username: manager.username,
      consultantsCount: manager.consultants.length,
      summary,
    };
  });

  return {
    managers: managerSummaries,
    summary: mergeSummaries(managerSummaries.map((manager) => manager.summary)),
  };
}

export async function getVisitOversightManagerDetails(
  managerId: string,
): Promise<OversightManagerDetails | null> {
  const manager = await prisma.user.findUnique({
    where: { id: managerId },
    select: {
      id: true,
      fullName: true,
      username: true,
      role: true,
      status: true,
      consultants: {
        where: { role: "CONSULTANT", status: "APPROVED" },
        orderBy: [{ fullName: "asc" }, { username: "asc" }],
        select: {
          id: true,
          fullName: true,
          username: true,
          assignedVisits: {
            where: { managerId },
            orderBy: [{ createdAt: "desc" }],
            select: visitWithRelationsSelect,
          },
        },
      },
    },
  });

  if (!manager || manager.role !== "MANAGER" || manager.status !== "APPROVED") {
    return null;
  }

  const consultants = manager.consultants.map((consultant) => {
    const visits = consultant.assignedVisits.map(mapVisitToDetails);

    return {
      id: consultant.id,
      fullName: consultant.fullName,
      username: consultant.username,
      summary: buildSummary(visits),
      visits,
    };
  });

  return {
    manager: {
      id: manager.id,
      fullName: manager.fullName,
      username: manager.username,
    },
    summary: mergeSummaries(consultants.map((consultant) => consultant.summary)),
    consultants,
  };
}

export async function getConsultantPendingVisitNotice(
  consultantId: string,
): Promise<ConsultantPendingVisitNotice | null> {
  const visits = await prisma.visitAssignment.findMany({
    where: {
      consultantId,
      status: { in: ["ASSIGNED", "REVISION_REQUESTED"] },
    },
    select: { status: true },
  });

  if (visits.length === 0) {
    return null;
  }

  const summary = buildSummary(visits);

  return {
    total: visits.length,
    assigned: summary.assigned,
    revisionRequested: summary.revisionRequested,
  };
}

export async function getVisitPhotoForViewer(params: {
  viewerId: string;
  viewerRole: Role;
  photoId: string;
}): Promise<{
  pathname: string;
  originalName: string;
  contentType: string;
  sizeBytes: number;
}> {
  const photo = await prisma.visitPhoto.findUnique({
    where: { id: params.photoId },
    select: {
      pathname: true,
      originalName: true,
      contentType: true,
      sizeBytes: true,
      visitEvent: {
        select: {
          visitAssignment: {
            select: visitWithRelationsSelect,
          },
        },
      },
    },
  });

  if (!photo) {
    throw new VisitDiaryError("NOT_FOUND", "Foto não encontrada.");
  }

  assertVisitVisible({
    visit: photo.visitEvent.visitAssignment,
    viewerId: params.viewerId,
    viewerRole: params.viewerRole,
  });

  return {
    pathname: photo.pathname,
    originalName: photo.originalName,
    contentType: photo.contentType,
    sizeBytes: photo.sizeBytes,
  };
}
