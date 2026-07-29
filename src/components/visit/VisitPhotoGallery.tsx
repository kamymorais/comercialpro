"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import type { VisitPhotoView } from "@/services/visit.service";

type VisitPhotoGalleryProps = {
  photos: VisitPhotoView[];
};

function formatDateTimeBR(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

function formatFileSize(sizeBytes: number) {
  if (sizeBytes >= 1024 * 1024) {
    return `${(sizeBytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
  }

  return `${Math.max(1, Math.round(sizeBytes / 1024))} KB`;
}

function getPhotoUrl(photoId: string) {
  return `/api/diario-visita/fotos/${photoId}`;
}

export function VisitPhotoGallery({ photos }: VisitPhotoGalleryProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<VisitPhotoView | null>(null);

  if (photos.length === 0) {
    return null;
  }

  return (
    <section className="mt-4 space-y-3">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h4 className="text-sm font-bold text-slate-950">Fotos da visita</h4>
          <p className="text-xs text-slate-500">
            {photos.length} foto{photos.length === 1 ? "" : "s"} neste relatório
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {photos.map((photo) => (
          <button
            key={photo.id}
            type="button"
            className="rounded-lg border border-slate-200 bg-white p-2 text-left transition hover:border-blue-200 hover:bg-blue-50"
            onClick={() => setSelectedPhoto(photo)}
          >
            <span className="relative block aspect-video w-full overflow-hidden rounded-md">
              <Image
                src={getPhotoUrl(photo.id)}
                alt={photo.originalName}
                fill
                sizes="(min-width: 640px) 50vw, 100vw"
                className="object-cover"
                unoptimized
              />
            </span>
            <span className="mt-2 block break-words text-xs font-semibold text-slate-950">
              {photo.originalName}
            </span>
            <span className="mt-1 block text-xs text-slate-500">
              {formatFileSize(photo.sizeBytes)} · {formatDateTimeBR(photo.createdAt)}
            </span>
          </button>
        ))}
      </div>

      {selectedPhoto ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/70 px-4 py-6 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label={`Foto ${selectedPhoto.originalName}`}
        >
          <div className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-lg bg-white p-4 shadow-xl">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="break-words text-lg font-bold text-slate-950">
                  {selectedPhoto.originalName}
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  {formatFileSize(selectedPhoto.sizeBytes)} ·{" "}
                  {formatDateTimeBR(selectedPhoto.createdAt)}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                className="min-h-10 px-3 py-2"
                onClick={() => setSelectedPhoto(null)}
              >
                Fechar
              </Button>
            </div>
            <div className="relative h-[70vh] w-full overflow-hidden rounded-md">
              <Image
                src={getPhotoUrl(selectedPhoto.id)}
                alt={selectedPhoto.originalName}
                fill
                sizes="100vw"
                className="object-contain"
                unoptimized
              />
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
