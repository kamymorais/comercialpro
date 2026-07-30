import {
  MARGIN_PDF_MIME_TYPE,
  MAX_MARGIN_PDF_SIZE_BYTES,
} from "@/lib/margin/constants";
import type { MarginAgreement, MarginUploadFileInfo } from "@/types/margin";

export const MARGIN_AGREEMENTS: MarginAgreement[] = ["MPDFT", "SIAPE"];

export function isMarginAgreement(value: unknown): value is MarginAgreement {
  return typeof value === "string" && MARGIN_AGREEMENTS.includes(value as MarginAgreement);
}

export type MarginPdfValidationResult = {
  valid: boolean;
  message?: string;
  file?: MarginUploadFileInfo;
};

// Validação compartilhada entre frontend (melhora a experiência) e backend
// (única validação que realmente importa). Nesta etapa, avalia apenas os
// metadados do arquivo (nome, tipo, tamanho). Não lê o conteúdo do PDF.
export async function validateMarginPdfFile(
  file: File | null | undefined,
): Promise<MarginPdfValidationResult> {
  if (!file || file.size === 0) {
    return { valid: false, message: "Selecione um arquivo PDF." };
  }

  const hasPdfExtension = file.name.toLowerCase().endsWith(".pdf");
  const hasPdfType = file.type === MARGIN_PDF_MIME_TYPE;

  if (!hasPdfType || !hasPdfExtension) {
    return {
      valid: false,
      message: "O arquivo precisa estar no formato PDF.",
    };
  }

  if (file.size > MAX_MARGIN_PDF_SIZE_BYTES) {
    return {
      valid: false,
      message: "O arquivo ultrapassa o limite de 4 MB.",
    };
  }

  return {
    valid: true,
    file: {
      name: file.name,
      size: file.size,
      type: file.type,
    },
  };
}
