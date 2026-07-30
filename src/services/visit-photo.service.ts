import crypto from "node:crypto";
import { del, get } from "@vercel/blob";
import { generateClientTokenFromReadWriteToken } from "@vercel/blob/client";
import {
  VISIT_PHOTO_ALLOWED_TYPES,
  VISIT_PHOTO_MAX_FILES,
  VISIT_PHOTO_MAX_SIZE_BYTES,
  type VisitPhotoAllowedContentType,
} from "@/lib/visit-photo-constraints";

export {
  VISIT_PHOTO_ALLOWED_TYPES,
  VISIT_PHOTO_MAX_FILES,
  VISIT_PHOTO_MAX_SIZE_BYTES,
  type VisitPhotoAllowedContentType,
};

export type VisitPhotoUploadTargetInput = {
  originalName: string;
  contentType: string;
  sizeBytes: number;
};

export type VisitPhotoUploadTarget = VisitPhotoUploadTargetInput & {
  pathname: string;
  clientToken: string;
};

export type UploadedVisitPhotoInput = VisitPhotoUploadTargetInput & {
  pathname: string;
  blobUrl: string;
};

const EXTENSION_BY_TYPE: Record<VisitPhotoAllowedContentType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const UNSUPPORTED_HEIC_MESSAGE =
  "Fotos HEIC/HEIF do iPhone ainda não são aceitas neste envio. Converta para JPEG, PNG ou WebP antes de anexar.";
const UNSUPPORTED_IMAGE_MESSAGE =
  "Formato de imagem não aceito. Envie fotos JPEG, PNG ou WebP.";

export function isVisitPhotoStorageConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export function isAllowedVisitPhotoContentType(
  contentType: string,
): contentType is VisitPhotoAllowedContentType {
  return VISIT_PHOTO_ALLOWED_TYPES.includes(
    contentType as VisitPhotoAllowedContentType,
  );
}

export function sanitizeOriginalPhotoName(originalName: string): string {
  const normalized = originalName.trim().replace(/[^\w .()_-]/g, "_").slice(0, 120);

  return normalized || "foto-da-visita";
}

export function validateVisitPhotoFile(input: VisitPhotoUploadTargetInput): string | null {
  if (!input.originalName.trim()) {
    return "Uma das fotos está sem nome de arquivo.";
  }

  const originalName = input.originalName.toLowerCase();

  if (
    input.contentType === "image/heic" ||
    input.contentType === "image/heif" ||
    originalName.endsWith(".heic") ||
    originalName.endsWith(".heif")
  ) {
    return UNSUPPORTED_HEIC_MESSAGE;
  }

  if (!isAllowedVisitPhotoContentType(input.contentType)) {
    return UNSUPPORTED_IMAGE_MESSAGE;
  }

  if (!Number.isInteger(input.sizeBytes) || input.sizeBytes <= 0) {
    return "Uma das fotos está vazia ou inválida.";
  }

  if (input.sizeBytes > VISIT_PHOTO_MAX_SIZE_BYTES) {
    return "Cada foto deve ter no máximo 5 MB.";
  }

  return null;
}

export function validateVisitPhotoCount(count: number): string | null {
  if (count < 0 || count > VISIT_PHOTO_MAX_FILES) {
    return `Envie no máximo ${VISIT_PHOTO_MAX_FILES} fotos por relatório.`;
  }

  return null;
}

export function validateUploadedVisitPhoto(input: UploadedVisitPhotoInput): string | null {
  const fileError = validateVisitPhotoFile(input);

  if (fileError) {
    return fileError;
  }

  if (!isSafeVisitPhotoPathname(input.pathname)) {
    return "Identificador de foto inválido.";
  }

  if (!input.blobUrl.startsWith("https://")) {
    return "URL interna da foto inválida.";
  }

  return null;
}

function hasExpectedImageSignature(bytes: Uint8Array, contentType: string): boolean {
  if (contentType === "image/jpeg") {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }

  if (contentType === "image/png") {
    return (
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
    );
  }

  if (contentType === "image/webp") {
    const riff = String.fromCharCode(...bytes.slice(0, 4));
    const webp = String.fromCharCode(...bytes.slice(8, 12));

    return riff === "RIFF" && webp === "WEBP";
  }

  return false;
}

async function readFirstBytes(stream: ReadableStream<Uint8Array>, byteCount: number) {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    while (total < byteCount) {
      const result = await reader.read();

      if (result.done) {
        break;
      }

      chunks.push(result.value);
      total += result.value.length;
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }

  const output = new Uint8Array(Math.min(total, byteCount));
  let offset = 0;

  for (const chunk of chunks) {
    const slice = chunk.slice(0, Math.min(chunk.length, byteCount - offset));
    output.set(slice, offset);
    offset += slice.length;

    if (offset >= byteCount) {
      break;
    }
  }

  return output;
}

export function buildVisitPhotoPathname(params: {
  visitId: string;
  contentType: VisitPhotoAllowedContentType;
}): string {
  const extension = EXTENSION_BY_TYPE[params.contentType];
  const randomName = crypto.randomUUID();

  return `visit-photos/${params.visitId}/${randomName}.${extension}`;
}

export function isSafeVisitPhotoPathname(pathname: string): boolean {
  return /^visit-photos\/[a-zA-Z0-9_-]+\/[0-9a-fA-F-]{36}\.(jpg|png|webp)$/.test(
    pathname,
  );
}

export async function createVisitPhotoUploadTargets(params: {
  visitId: string;
  files: VisitPhotoUploadTargetInput[];
}): Promise<VisitPhotoUploadTarget[]> {
  if (!isVisitPhotoStorageConfigured()) {
    throw new Error("O envio de fotos ainda não está configurado.");
  }

  const countError = validateVisitPhotoCount(params.files.length);

  if (countError) {
    throw new Error(countError);
  }

  const targets: VisitPhotoUploadTarget[] = [];

  for (const file of params.files) {
    const error = validateVisitPhotoFile(file);

    if (error) {
      throw new Error(`${file.originalName}: ${error}`);
    }

    if (!isAllowedVisitPhotoContentType(file.contentType)) {
      throw new Error(`${file.originalName}: tipo de arquivo inválido.`);
    }

    const pathname = buildVisitPhotoPathname({
      visitId: params.visitId,
      contentType: file.contentType,
    });
    const clientToken = await generateClientTokenFromReadWriteToken({
      pathname,
      allowedContentTypes: [file.contentType],
      maximumSizeInBytes: VISIT_PHOTO_MAX_SIZE_BYTES,
      validUntil: Date.now() + 5 * 60 * 1000,
      allowOverwrite: false,
      addRandomSuffix: false,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    targets.push({
      originalName: sanitizeOriginalPhotoName(file.originalName),
      contentType: file.contentType,
      sizeBytes: file.sizeBytes,
      pathname,
      clientToken,
    });
  }

  return targets;
}

export async function deleteVisitPhotoBlobs(photos: { pathname: string }[]) {
  if (!isVisitPhotoStorageConfigured() || photos.length === 0) {
    return;
  }

  const pathnames = photos
    .map((photo) => photo.pathname)
    .filter((pathname) => isSafeVisitPhotoPathname(pathname));

  if (pathnames.length === 0) {
    return;
  }

  await del(pathnames, { token: process.env.BLOB_READ_WRITE_TOKEN });
}

export async function getPrivateVisitPhoto(pathname: string) {
  if (!isVisitPhotoStorageConfigured()) {
    throw new Error("Armazenamento de fotos não configurado.");
  }

  if (!isSafeVisitPhotoPathname(pathname)) {
    throw new Error("Identificador de foto inválido.");
  }

  return get(pathname, {
    access: "private",
    token: process.env.BLOB_READ_WRITE_TOKEN,
    useCache: true,
  });
}

export async function verifyUploadedVisitPhotoBlob(photo: UploadedVisitPhotoInput) {
  const blob = await getPrivateVisitPhoto(photo.pathname);

  if (!blob || blob.statusCode !== 200) {
    throw new Error(`${photo.originalName}: foto enviada não foi encontrada.`);
  }

  if (blob.blob.size !== photo.sizeBytes) {
    throw new Error(`${photo.originalName}: tamanho da foto não confere.`);
  }

  if (blob.blob.contentType !== photo.contentType) {
    throw new Error(`${photo.originalName}: tipo da foto não confere.`);
  }

  const firstBytes = await readFirstBytes(blob.stream, 16);

  if (!hasExpectedImageSignature(firstBytes, photo.contentType)) {
    throw new Error(`${photo.originalName}: o arquivo não parece ser uma imagem válida.`);
  }
}
