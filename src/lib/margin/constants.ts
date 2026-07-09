export const MAX_MARGIN_PDF_SIZE_BYTES = 4 * 1024 * 1024;

export const MARGIN_PDF_MIME_TYPE = "application/pdf";

// Rota da Python Function (Vercel Function em api/margin_extract.py) que faz
// a extração real do texto do PDF. Chamada apenas pelo servidor Next.js.
export const MARGIN_EXTRACT_ENDPOINT_PATH = "/api/margin_extract";
