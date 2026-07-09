import { NextResponse } from "next/server";
import type { Role } from "@/generated/prisma/client";
import { getCurrentUserFromSession } from "@/lib/auth";
import {
  extractMarginPdfText,
  MarginExtractionError,
} from "@/services/marginExtraction.service";
import { validateMarginPdfFile } from "@/services/margin.service";
import type { MarginUploadResponse } from "@/types/margin";

const ALLOWED_ROLES: Role[] = [
  "ADMIN",
  "CONSULTANT",
  "MANAGER",
  "REGIONAL_MANAGER",
];

export async function POST(request: Request) {
  const user = await getCurrentUserFromSession();

  if (!user || user.status !== "APPROVED" || !user.role) {
    return NextResponse.json<MarginUploadResponse>(
      { success: false, message: "Sessão inválida. Faça login novamente." },
      { status: 401 },
    );
  }

  if (!ALLOWED_ROLES.includes(user.role)) {
    return NextResponse.json<MarginUploadResponse>(
      {
        success: false,
        message: "Você não tem permissão para usar este módulo.",
      },
      { status: 403 },
    );
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json<MarginUploadResponse>(
      {
        success: false,
        message: "Não foi possível enviar o arquivo agora.",
        debug: {
          stage: "FORM_DATA",
          status: 400,
          detail: "Requisição não chegou como multipart/form-data válido.",
        },
      },
      { status: 400 },
    );
  }

  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json<MarginUploadResponse>(
      {
        success: false,
        message: "Selecione um arquivo PDF.",
        debug: {
          stage: "FILE_VALIDATION",
          status: 400,
          detail: "Campo multipart 'file' ausente ou inválido.",
        },
      },
      { status: 400 },
    );
  }

  const validation = await validateMarginPdfFile(file);

  if (!validation.valid || !validation.file) {
    return NextResponse.json<MarginUploadResponse>(
      {
        success: false,
        message: validation.message ?? "Não foi possível enviar o arquivo agora.",
        debug: {
          stage: "FILE_VALIDATION",
          status: 400,
          detail: validation.message ?? "Arquivo rejeitado pela validação.",
        },
      },
      { status: 400 },
    );
  }

  // O PDF nunca é salvo em disco/banco/storage. Ele passa apenas pela memória
  // desta requisição e da Python Function chamada abaixo, e é descartado em
  // seguida. A extração de texto acontece em api/margin_extract.py.

  try {
    const extraction = await extractMarginPdfText({
      file,
      requestUrl: request.url,
    });

    return NextResponse.json<MarginUploadResponse>({
      success: true,
      message:
        "Texto extraído com sucesso. Confira o cálculo da margem abaixo.",
      file: validation.file,
      extraction,
      nextStep: "CALCULATION_AVAILABLE",
    });
  } catch (error) {
    if (error instanceof MarginExtractionError) {
      return NextResponse.json<MarginUploadResponse>(
        {
          success: false,
          message: error.message,
          file: validation.file,
          debug: error.debug,
        },
        { status: error.status },
      );
    }

    return NextResponse.json<MarginUploadResponse>(
      {
        success: false,
        message: "Não foi possível processar o arquivo agora.",
        file: validation.file,
        debug: {
          stage: "PYTHON_FUNCTION_CALL",
          status: 502,
          detail: "Erro inesperado ao processar o PDF.",
        },
      },
      { status: 502 },
    );
  }
}
