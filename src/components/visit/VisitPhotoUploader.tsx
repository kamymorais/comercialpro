"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { put } from "@vercel/blob/client";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import {
  cleanupUnsubmittedVisitPhotosAction,
  prepareVisitPhotoUploadsAction,
  submitConsultantVisitReportAction,
} from "@/app/diario-visita/registrar/actions";
import {
  VISIT_PHOTO_ALLOWED_TYPES,
  VISIT_PHOTO_MAX_FILES,
  VISIT_PHOTO_MAX_SIZE_BYTES,
} from "@/lib/visit-photo-constraints";
import { cn } from "@/lib/cn";
import type { UploadedVisitPhotoInput } from "@/services/visit-photo.service";

type VisitPhotoUploaderProps = {
  visitId: string;
  photosEnabled: boolean;
};

type SelectedPhoto = {
  id: string;
  file: File;
  previewUrl: string;
  error: string | null;
  progress: number;
};

const ACCEPT = "image/*";
const UNSUPPORTED_HEIC_MESSAGE =
  "Fotos HEIC/HEIF do iPhone ainda não são aceitas neste envio. Converta para JPEG, PNG ou WebP antes de anexar.";
const UNSUPPORTED_IMAGE_MESSAGE =
  "Formato de imagem não aceito. Envie fotos JPEG, PNG ou WebP.";

function formatFileSize(sizeBytes: number) {
  if (sizeBytes >= 1024 * 1024) {
    return `${(sizeBytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
  }

  return `${Math.max(1, Math.round(sizeBytes / 1024))} KB`;
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

async function validatePhotoFile(file: File): Promise<string | null> {
  const fileName = file.name.toLowerCase();

  if (
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    fileName.endsWith(".heic") ||
    fileName.endsWith(".heif")
  ) {
    return UNSUPPORTED_HEIC_MESSAGE;
  }

  if (!file.type.startsWith("image/")) {
    return "Envie apenas arquivos de imagem.";
  }

  if (!VISIT_PHOTO_ALLOWED_TYPES.includes(file.type as never)) {
    return UNSUPPORTED_IMAGE_MESSAGE;
  }

  if (file.size <= 0) {
    return "A foto está vazia.";
  }

  if (file.size > VISIT_PHOTO_MAX_SIZE_BYTES) {
    return "Cada foto deve ter no máximo 5 MB.";
  }

  const firstBytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());

  if (!hasExpectedImageSignature(firstBytes, file.type)) {
    return "O arquivo não parece ser uma imagem válida.";
  }

  return null;
}

export function VisitPhotoUploader({
  visitId,
  photosEnabled,
}: VisitPhotoUploaderProps) {
  const generatedInputId = useId().replace(/:/g, "");
  const safeVisitId = visitId.replace(/[^a-zA-Z0-9_-]/g, "_");
  const inputId = `visit-photos-${safeVisitId}-${generatedInputId}`;
  const router = useRouter();
  const [note, setNote] = useState("");
  const [photos, setPhotos] = useState<SelectedPhoto[]>([]);
  const photosRef = useRef<SelectedPhoto[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const hasPhotoErrors = photos.some((photo) => photo.error);
  const isBusy =
    isSubmitting || photos.some((photo) => photo.progress > 0 && photo.progress < 100);
  const canAddPhotos =
    photosEnabled && photos.length < VISIT_PHOTO_MAX_FILES && !isBusy;

  const selectedCountLabel = useMemo(
    () => `${photos.length} de ${VISIT_PHOTO_MAX_FILES} fotos`,
    [photos.length],
  );

  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

  useEffect(() => {
    return () => {
      for (const photo of photosRef.current) {
        URL.revokeObjectURL(photo.previewUrl);
      }
    };
  }, []);

  async function handlePhotoSelection(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const incoming = Array.from(input.files ?? []);

    if (incoming.length === 0) {
      return;
    }

    setMessage(null);

    const remainingSlots = VISIT_PHOTO_MAX_FILES - photos.length;

    if (incoming.length > remainingSlots) {
      setMessage(`Envie no máximo ${VISIT_PHOTO_MAX_FILES} fotos por relatório.`);
    }

    const accepted = incoming.slice(0, Math.max(0, remainingSlots));
    const mapped: SelectedPhoto[] = [];

    for (const file of accepted) {
      mapped.push({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
        error: await validatePhotoFile(file),
        progress: 0,
      });
    }

    setPhotos((current) => [...current, ...mapped]);

    input.value = "";
  }

  function removePhoto(photoId: string) {
    setPhotos((current) => {
      const photo = current.find((item) => item.id === photoId);

      if (photo) {
        URL.revokeObjectURL(photo.previewUrl);
      }

      return current.filter((item) => item.id !== photoId);
    });
  }

  async function uploadPhotos(): Promise<UploadedVisitPhotoInput[]> {
    if (photos.length === 0) {
      return [];
    }

    if (!photosEnabled) {
      throw new Error("O envio de fotos ainda não está configurado.");
    }

    if (hasPhotoErrors) {
      throw new Error("Remova ou corrija as fotos com erro antes de enviar.");
    }

    const targets = await prepareVisitPhotoUploadsAction({
      visitId,
      files: photos.map((photo) => ({
        originalName: photo.file.name,
        contentType: photo.file.type,
        sizeBytes: photo.file.size,
      })),
    });
    const uploadedPhotos: UploadedVisitPhotoInput[] = [];

    for (const [index, photo] of photos.entries()) {
      const target = targets[index];

      try {
        const blob = await put(target.pathname, photo.file, {
          access: "private",
          token: target.clientToken,
          contentType: photo.file.type,
          multipart: false,
          onUploadProgress: (progress) => {
            setPhotos((current) =>
              current.map((item) =>
                item.id === photo.id
                  ? { ...item, progress: progress.percentage }
                  : item,
              ),
            );
          },
        });

        uploadedPhotos.push({
          originalName: target.originalName,
          contentType: target.contentType,
          sizeBytes: target.sizeBytes,
          pathname: blob.pathname,
          blobUrl: blob.url,
        });
      } catch {
        await cleanupUnsubmittedVisitPhotosAction({
          visitId,
          photos: uploadedPhotos.map((uploadedPhoto) => ({
            pathname: uploadedPhoto.pathname,
          })),
        }).catch(() => undefined);
        throw new Error(`${photo.file.name}: não foi possível enviar esta foto.`);
      }
    }

    return uploadedPhotos;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    if (!note.trim()) {
      setMessage("Informe o relatório ou observação.");
      return;
    }

    setIsSubmitting(true);

    void (async () => {
      try {
        const uploadedPhotos = await uploadPhotos();
        const formData = new FormData();
        formData.set("visitId", visitId);
        formData.set("note", note);
        formData.set("uploadedPhotos", JSON.stringify(uploadedPhotos));
        const result = await submitConsultantVisitReportAction(formData);

        if (result.ok && result.redirectPath) {
          router.push(result.redirectPath);
          router.refresh();
          return;
        }

        setMessage(result.message ?? "Não foi possível enviar o relatório.");
        setIsSubmitting(false);
      } catch (error) {
        setMessage(
          error instanceof Error
            ? error.message
            : "Não foi possível enviar o relatório.",
        );
        setIsSubmitting(false);
      }
    })();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input type="hidden" name="visitId" value={visitId} />
      <div>
        <h2 className="text-xl font-bold">Enviar relatório</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          Descreva o que foi realizado na visita. O histórico anterior será
          preservado.
        </p>
      </div>

      <Textarea
        label="Relatório ou observação"
        name="note"
        required
        maxLength={2000}
        value={note}
        onChange={(event) => setNote(event.target.value)}
        helperText="Obrigatório. Máximo de 2.000 caracteres."
      />

      <section className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-950">
              Fotos da visita — opcional
            </h3>
            <p className="mt-1 text-xs text-slate-500">{selectedCountLabel}</p>
          </div>
          <input
            id={inputId}
            type="file"
            accept={ACCEPT}
            multiple
            disabled={!canAddPhotos}
            className="peer sr-only"
            onChange={handlePhotoSelection}
          />
          <label
            htmlFor={inputId}
            aria-disabled={!canAddPhotos}
            className={cn(
              "inline-flex min-h-12 items-center justify-center rounded-lg border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-900 shadow-sm transition-colors hover:bg-slate-50",
              "peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-slate-600",
              canAddPhotos
                ? "cursor-pointer"
                : "pointer-events-none cursor-not-allowed opacity-60",
            )}
          >
            Adicionar fotos
          </label>
        </div>

        {!photosEnabled ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            O envio de fotos ainda não está configurado. O relatório sem fotos
            continua funcionando normalmente.
          </div>
        ) : null}

        {photos.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="rounded-lg border border-slate-200 bg-slate-50 p-3"
              >
                <span className="relative block aspect-video w-full overflow-hidden rounded-md">
                  <Image
                    src={photo.previewUrl}
                    alt={`Prévia de ${photo.file.name}`}
                    fill
                    sizes="(min-width: 640px) 50vw, 100vw"
                    className="object-cover"
                    unoptimized
                  />
                </span>
                <div className="mt-3 space-y-2">
                  <p className="break-words text-sm font-semibold text-slate-950">
                    {photo.file.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatFileSize(photo.file.size)}
                  </p>
                  {photo.progress > 0 ? (
                    <div>
                      <div className="h-2 rounded-full bg-slate-200">
                        <div
                          className="h-2 rounded-full bg-blue-900"
                          style={{ width: `${Math.min(100, photo.progress)}%` }}
                        />
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        Enviando {Math.round(photo.progress)}%
                      </p>
                    </div>
                  ) : null}
                  {photo.error ? (
                    <p className="text-xs font-semibold text-red-700">
                      {photo.error}
                    </p>
                  ) : null}
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={isBusy}
                    className="min-h-10 w-full"
                    onClick={() => removePhoto(photo.id)}
                  >
                    Remover foto
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      {message ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {message}
        </div>
      ) : null}

      <Button
        type="submit"
        className="w-full sm:w-auto"
        loading={isBusy}
        disabled={hasPhotoErrors}
      >
        Enviar relatório
      </Button>
    </form>
  );
}
