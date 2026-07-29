import { NextResponse } from "next/server";
import { getCurrentUserFromSession } from "@/lib/auth";
import { getPrivateVisitPhoto } from "@/services/visit-photo.service";
import {
  getVisitPhotoForViewer,
  VisitDiaryError,
} from "@/services/visit.service";

type VisitPhotoRouteProps = {
  params: Promise<{ photoId: string }>;
};

function buildContentDisposition(filename: string) {
  const safeName = filename.replace(/["\\\r\n]/g, "_");

  return `inline; filename="${safeName}"`;
}

export async function GET(_request: Request, { params }: VisitPhotoRouteProps) {
  const user = await getCurrentUserFromSession();

  if (!user?.role || user.status !== "APPROVED") {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { photoId } = await params;

  try {
    const photo = await getVisitPhotoForViewer({
      viewerId: user.id,
      viewerRole: user.role,
      photoId,
    });
    const blob = await getPrivateVisitPhoto(photo.pathname);

    if (!blob || blob.statusCode !== 200) {
      return NextResponse.json({ error: "Foto não encontrada." }, { status: 404 });
    }

    return new Response(blob.stream, {
      status: 200,
      headers: {
        "Content-Type": blob.blob.contentType,
        "Content-Length": String(blob.blob.size),
        "Content-Disposition": buildContentDisposition(photo.originalName),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof VisitDiaryError) {
      const status = error.code === "FORBIDDEN" ? 403 : 404;

      return NextResponse.json({ error: error.message }, { status });
    }

    return NextResponse.json(
      { error: "Não foi possível carregar a foto." },
      { status: 500 },
    );
  }
}
