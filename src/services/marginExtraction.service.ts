import { spawn } from "node:child_process";
import path from "node:path";
import { MARGIN_EXTRACT_ENDPOINT_PATH } from "@/lib/margin/constants";
import type {
  MarginCandidateFields,
  MarginExtractionResult,
  MarginPageText,
  MarginRubricLine,
  MarginUploadDebug,
} from "@/types/margin";

// Este service é exclusivamente server-side: lê MARGIN_EXTRACT_SECRET e faz a
// chamada servidor-a-servidor para a Python Function. Em desenvolvimento local,
// caso o `next dev` não sirva api/margin_extract.py, usa o mesmo arquivo Python
// via subprocesso para manter o upload testável sem implementar cálculo.

const GENERIC_EXTRACTION_ERROR_MESSAGE =
  "Não foi possível processar o arquivo agora.";

const LOCAL_FALLBACK_ENABLED = process.env.NODE_ENV !== "production";

export class MarginExtractionError extends Error {
  status: number;
  debug: MarginUploadDebug;

  constructor(message: string, status: number, debug: MarginUploadDebug) {
    super(message);
    this.name = "MarginExtractionError";
    this.status = status;
    this.debug = debug;
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

function toExtractionResult(
  data: PythonExtractionResponse,
  responseStatus: number,
): MarginExtractionResult {
  if (!data.success) {
    throw new MarginExtractionError(
      data.message || "Não foi possível extrair texto suficiente do PDF.",
      422,
      {
        stage: "PYTHON_EXTRACTION",
        status: responseStatus,
        detail:
          data.message ||
          "Python Function não conseguiu extrair texto suficiente.",
      },
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

async function extractWithLocalPython(file: File): Promise<PythonExtractionResponse> {
  const pdfBuffer = Buffer.from(await file.arrayBuffer());
  const pythonCommand = process.platform === "win32" ? "python" : "python3";
  const scriptPath = path.join(process.cwd(), "api", "margin_extract.py");

  return new Promise((resolve, reject) => {
    const child = spawn(pythonCommand, [scriptPath, "--stdin"], {
      cwd: process.cwd(),
      windowsHide: true,
    });

    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];

    child.stdout.on("data", (chunk: Buffer) => stdout.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => stderr.push(chunk));
    child.on("error", (error) => {
      reject(
        new MarginExtractionError(GENERIC_EXTRACTION_ERROR_MESSAGE, 502, {
          stage: "PYTHON_FUNCTION_CALL",
          status: 502,
          detail: `Falha ao iniciar Python local: ${error.message}`,
        }),
      );
    });
    child.on("close", () => {
      const output = Buffer.concat(stdout).toString("utf-8").trim();

      try {
        resolve(JSON.parse(output) as PythonExtractionResponse);
      } catch {
        const safeError = Buffer.concat(stderr)
          .toString("utf-8")
          .trim()
          .slice(0, 180);

        reject(
          new MarginExtractionError(GENERIC_EXTRACTION_ERROR_MESSAGE, 502, {
            stage: "PYTHON_RESPONSE_PARSE",
            status: 502,
            detail: safeError
              ? `Python local não retornou JSON válido: ${safeError}`
              : "Python local não retornou JSON válido.",
          }),
        );
      }
    });

    child.stdin.end(pdfBuffer);
  });
}

export async function extractMarginPdfText(params: {
  file: File;
  requestUrl: string;
}): Promise<MarginExtractionResult> {
  const secret = process.env.MARGIN_EXTRACT_SECRET;

  if (!secret) {
    throw new MarginExtractionError(GENERIC_EXTRACTION_ERROR_MESSAGE, 502, {
      stage: "SERVER_CONFIG",
      status: 500,
      detail: "MARGIN_EXTRACT_SECRET não foi configurado no servidor.",
    });
  }

  const endpoint = new URL(
    MARGIN_EXTRACT_ENDPOINT_PATH,
    params.requestUrl,
  ).toString();
  const formData = new FormData();
  formData.append("file", params.file, params.file.name);

  let response: Response;

  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
      },
      body: formData,
    });
  } catch (error) {
    if (LOCAL_FALLBACK_ENABLED) {
      const localData = await extractWithLocalPython(params.file);
      return toExtractionResult(localData, 200);
    }

    throw new MarginExtractionError(GENERIC_EXTRACTION_ERROR_MESSAGE, 502, {
      stage: "PYTHON_FUNCTION_CALL",
      status: 502,
      detail:
        error instanceof Error
          ? `Falha ao chamar a Python Function: ${error.message}`
          : "Falha ao chamar a Python Function.",
    });
  }

  if (response.status === 401) {
    throw new MarginExtractionError(GENERIC_EXTRACTION_ERROR_MESSAGE, 502, {
      stage: "PYTHON_FUNCTION_CALL",
      status: response.status,
      detail: "Python Function recusou a autenticação do backend.",
    });
  }

  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    if (LOCAL_FALLBACK_ENABLED) {
      const localData = await extractWithLocalPython(params.file);
      return toExtractionResult(localData, 200);
    }

    throw new MarginExtractionError(GENERIC_EXTRACTION_ERROR_MESSAGE, 502, {
      stage: "PYTHON_RESPONSE_PARSE",
      status: response.status,
      detail: "Python Function retornou uma resposta que não é JSON válido.",
    });
  }

  let data: PythonExtractionResponse;

  try {
    data = (await response.json()) as PythonExtractionResponse;
  } catch {
    if (LOCAL_FALLBACK_ENABLED) {
      const localData = await extractWithLocalPython(params.file);
      return toExtractionResult(localData, 200);
    }

    throw new MarginExtractionError(GENERIC_EXTRACTION_ERROR_MESSAGE, 502, {
      stage: "PYTHON_RESPONSE_PARSE",
      status: response.status,
      detail: "Python Function retornou uma resposta que não é JSON válido.",
    });
  }

  if (!response.ok) {
    if (response.status === 404 && LOCAL_FALLBACK_ENABLED) {
      const localData = await extractWithLocalPython(params.file);
      return toExtractionResult(localData, 200);
    }

    const failureMessage = data.success ? null : data.message;

    throw new MarginExtractionError(
      failureMessage || GENERIC_EXTRACTION_ERROR_MESSAGE,
      response.status,
      {
        stage: "PYTHON_FUNCTION_CALL",
        status: response.status,
        detail:
          failureMessage ||
          `Python Function retornou HTTP ${response.status}.`,
      },
    );
  }

  return toExtractionResult(data, response.status);
}
