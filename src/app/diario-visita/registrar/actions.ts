"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import {
  completeVisitAssignment,
  cleanupConsultantUnsubmittedVisitPhotos,
  createVisitAssignment,
  prepareConsultantVisitPhotoUploads,
  requestVisitRevision,
  submitConsultantVisitReport,
  VisitDiaryError,
} from "@/services/visit.service";
import {
  deleteVisitPhotoBlobs,
  type UploadedVisitPhotoInput,
  type VisitPhotoUploadTargetInput,
} from "@/services/visit-photo.service";

function withError(path: string, message: string) {
  return `${path}?erro=${encodeURIComponent(message)}`;
}

function parseUploadedPhotos(formData: FormData): UploadedVisitPhotoInput[] {
  const rawPhotos = String(formData.get("uploadedPhotos") ?? "[]");

  try {
    const parsed = JSON.parse(rawPhotos);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map((photo) => ({
      originalName: String(photo.originalName ?? ""),
      contentType: String(photo.contentType ?? ""),
      sizeBytes: Number(photo.sizeBytes ?? 0),
      pathname: String(photo.pathname ?? ""),
      blobUrl: String(photo.blobUrl ?? ""),
    }));
  } catch {
    return [];
  }
}

export async function prepareVisitPhotoUploadsAction(input: {
  visitId: string;
  files: VisitPhotoUploadTargetInput[];
}) {
  const consultant = await requireRole(["CONSULTANT"]);

  return prepareConsultantVisitPhotoUploads({
    consultantId: consultant.id,
    visitId: input.visitId,
    files: input.files,
  });
}

export async function cleanupUnsubmittedVisitPhotosAction(input: {
  visitId: string;
  photos: { pathname: string }[];
}) {
  const consultant = await requireRole(["CONSULTANT"]);

  await cleanupConsultantUnsubmittedVisitPhotos({
    consultantId: consultant.id,
    visitId: input.visitId,
    photos: input.photos,
  });
}

export async function createManagerVisitAssignmentAction(formData: FormData) {
  const manager = await requireRole(["MANAGER"]);
  const consultantId = String(formData.get("consultantId") ?? "");
  const backPath = `/diario-visita/registrar/consultores/${consultantId}`;

  try {
    await createVisitAssignment({
      managerId: manager.id,
      consultantId,
      agreementCode: String(formData.get("agreementCode") ?? ""),
      unitId: String(formData.get("unitId") ?? ""),
      initialNote: formData.get("initialNote"),
    });
  } catch (error) {
    if (error instanceof VisitDiaryError) {
      redirect(withError(backPath, error.message));
    }

    throw error;
  }

  revalidatePath("/inicio");
  revalidatePath("/diario-visita/registrar");
  revalidatePath(backPath);
  redirect(`${backPath}?criada=1`);
}

export async function submitConsultantVisitReportAction(formData: FormData) {
  const consultant = await requireRole(["CONSULTANT"]);
  const visitId = String(formData.get("visitId") ?? "");
  const backPath = `/diario-visita/registrar/visitas/${visitId}`;
  const uploadedPhotos = parseUploadedPhotos(formData);

  try {
    await submitConsultantVisitReport({
      consultantId: consultant.id,
      visitId,
      note: formData.get("note"),
      photos: uploadedPhotos,
    });
  } catch (error) {
    await deleteVisitPhotoBlobs(uploadedPhotos).catch(() => undefined);

    if (error instanceof VisitDiaryError) {
      return { ok: false, message: error.message };
    }

    throw error;
  }

  revalidatePath("/inicio");
  revalidatePath("/diario-visita/registrar");
  revalidatePath(backPath);
  return { ok: true, redirectPath: `${backPath}?sucesso=1` };
}

export async function requestVisitRevisionAction(formData: FormData) {
  const manager = await requireRole(["MANAGER"]);
  const visitId = String(formData.get("visitId") ?? "");
  const backPath = `/diario-visita/registrar/visitas/${visitId}`;

  try {
    await requestVisitRevision({
      managerId: manager.id,
      visitId,
      note: formData.get("note"),
    });
  } catch (error) {
    if (error instanceof VisitDiaryError) {
      redirect(withError(backPath, error.message));
    }

    throw error;
  }

  revalidatePath("/inicio");
  revalidatePath("/diario-visita/registrar");
  revalidatePath(backPath);
  redirect(`${backPath}?refazer=1`);
}

export async function completeVisitAssignmentAction(formData: FormData) {
  const manager = await requireRole(["MANAGER"]);
  const visitId = String(formData.get("visitId") ?? "");
  const backPath = `/diario-visita/registrar/visitas/${visitId}`;

  try {
    await completeVisitAssignment({
      managerId: manager.id,
      visitId,
      note: formData.get("note"),
    });
  } catch (error) {
    if (error instanceof VisitDiaryError) {
      redirect(withError(backPath, error.message));
    }

    throw error;
  }

  revalidatePath("/diario-visita/registrar");
  revalidatePath(backPath);
  redirect(`${backPath}?concluida=1`);
}
