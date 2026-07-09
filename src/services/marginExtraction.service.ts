import { MARGIN_EXTRACT_ENDPOINT_PATH } from "@/lib/margin/constants";
import type {
  MarginCandidateFields,
  MarginExtractionResult,
  MarginPageText,
  MarginRubricLine,
} from "@/types/margin";

// Este service é exclusivamente server-side: lê MARGIN_EXTRACT_SECRET e faz a
// chamada servidor-a-servidor para a Python Function. Nunca deve ser
// importado por um componente "use client".

const GENERIC_EXTRACTION_ERROR_MESSAGE =
  "Não foi possível processar o arquivo agora.";

export class MarginExtractionError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "MarginExtractionError";
    this.status = status;
  }
}

type PythonExtractionSuccess = {
  success: true;
  pages: number;
  text: string;
  pagesText?: MarginPageText[];
  candidateFields?: MarginCandidateFields;
  rubricas?: MarginRubricLine[];
  warnings?: string[];
};

type PythonExtractionFailure = {
  success: false;
  message: string;
  pages?: number;
  warnings?: string[];
};

type PythonExtractionResponse = PythonExtractionSuccess | PythonExtractionFailure;

export async function extractMarginPdfText(params: {
  file: File;
  requestUrl: string;
}): Promise<MarginExtractionResult> {
  const secret = process.env.MARGIN_EXTRACT_SECRET;

  if (!secret) {
    throw new MarginExtractionError(GENERIC_EXTRACTION_ERROR_MESSAGE, 502);
  }

  const endpoint = new URL(
    MARGIN_EXTRACT_ENDPOINT_PATH,
    params.requestUrl,
  ).toString();

  const arrayBuffer = await params.file.arrayBuffer();

  let response: Response;

  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/pdf",
        Authorization: `Bearer ${secret}`,
      },
      body: arrayBuffer,
    });
  } catch {
    throw new MarginExtractionError(GENERIC_EXTRACTION_ERROR_MESSAGE, 502);
  }

  if (response.status === 401) {
    // Segredo compartilhado ausente ou incorreto — problema de configuração
    // do servidor, não uma escolha do usuário.
    throw new MarginExtractionError(GENERIC_EXTRACTION_ERROR_MESSAGE, 502);
  }

  let data: PythonExtractionResponse;

  try {
    data = (await response.json()) as PythonExtractionResponse;
  } catch {
    throw new MarginExtractionError(GENERIC_EXTRACTION_ERROR_MESSAGE, 502);
  }

  if (!data.success) {
    throw new MarginExtractionError(
      data.message || "Não foi possível extrair texto suficiente do PDF.",
      422,
    );
  }

  return {
    pages: data.pages,
    text: data.text,
    pagesText: data.pagesText ?? [],
    candidateFields: data.candidateFields ?? {},
    rubricas: data.rubricas ?? [],
    warnings: data.warnings ?? [],
  };
}
