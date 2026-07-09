"""Vercel Python Function - extração de texto de PDF para o módulo
Verificador de Margem (ComercialPro).

Responsabilidade única desta função: receber um PDF no campo multipart
``file``, extrair o texto selecionável página a página e devolver esse texto
para o backend Next.js. Não calcula margem, não decide aprovado/negado, não
salva o arquivo em nenhum lugar.

Protegida por um segredo compartilhado (MARGIN_EXTRACT_SECRET) enviado pelo
Next.js via header Authorization.
"""

import io
import json
import os
import re
import sys
from email import policy
from email.parser import BytesParser
from http.server import BaseHTTPRequestHandler

from pypdf import PdfReader
from pypdf.errors import PdfReadError

MAX_PDF_SIZE_BYTES = 4 * 1024 * 1024
MIN_TEXT_LENGTH = 20
MAX_RUBRIC_LINES = 40

MONEY_PATTERN = re.compile(r"-?\d{1,3}(?:\.\d{3})*,\d{2}")
RUBRIC_LINE_PATTERN = re.compile(r"^\d{5}\s")

CANDIDATE_FIELD_LABELS = {
    "bruto": re.compile(r"^Bruto\b", re.IGNORECASE),
    "descontos": re.compile(r"^Descontos\b", re.IGNORECASE),
    "liquido": re.compile(r"^L[ií]quido\b", re.IGNORECASE),
    "margemPdf": re.compile(r"^Margem\b", re.IGNORECASE),
}


def extract_candidate_fields(text):
    """Procura valores próximos de rótulos conhecidos, sem calcular nada."""
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    candidates = {}

    for index, line in enumerate(lines):
        for key, label_pattern in CANDIDATE_FIELD_LABELS.items():
            if key in candidates or not label_pattern.match(line):
                continue

            value_match = MONEY_PATTERN.search(line)
            if not value_match and index + 1 < len(lines):
                value_match = MONEY_PATTERN.search(lines[index + 1])

            if value_match:
                candidates[key] = value_match.group(0)

    return candidates


def extract_rubric_lines(text, limit=MAX_RUBRIC_LINES):
    """Identifica linhas que começam com código de rubrica de 5 dígitos."""
    lines = []
    for raw_line in text.splitlines():
        line = raw_line.strip()
        if RUBRIC_LINE_PATTERN.match(line):
            lines.append(line)
        if len(lines) >= limit:
            break

    return lines


def is_authorized(headers):
    expected_secret = os.environ.get("MARGIN_EXTRACT_SECRET")
    if not expected_secret:
        return False

    auth_header = headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return False

    provided_secret = auth_header[len("Bearer "):]
    return provided_secret == expected_secret


def get_file_bytes_from_multipart(content_type, body):
    header = (
        "Content-Type: {0}\r\n"
        "MIME-Version: 1.0\r\n"
        "\r\n"
    ).format(content_type).encode("utf-8")
    message = BytesParser(policy=policy.default).parsebytes(header + body)

    if not message.is_multipart():
        return None

    for part in message.iter_parts():
        disposition = part.get_content_disposition()
        name = part.get_param("name", header="content-disposition")
        if disposition == "form-data" and name == "file":
            payload = part.get_payload(decode=True)
            return payload or b""

    return None


def get_pdf_bytes(headers, body):
    content_type = headers.get("Content-Type", "")

    if content_type.startswith("multipart/form-data"):
      return get_file_bytes_from_multipart(content_type, body)

    # Compatibilidade com chamadas antigas que enviavam application/pdf bruto.
    if content_type.startswith("application/pdf"):
        return body

    return None


def extract_pdf_text(pdf_bytes):
    trimmed_pdf = pdf_bytes.strip()
    if not trimmed_pdf.startswith(b"%PDF") or b"%%EOF" not in trimmed_pdf[-4096:]:
        raise PdfReadError("PDF header or EOF marker not found.")

    reader = PdfReader(io.BytesIO(pdf_bytes))
    page_count = len(reader.pages)
    pages_text = []
    warnings = []

    for index, page in enumerate(reader.pages, start=1):
        try:
            page_text = (page.extract_text() or "").strip()
        except Exception:
            page_text = ""
            warnings.append("Não foi possível ler a página {0}.".format(index))

        pages_text.append({"page": index, "text": page_text})

    full_text = "\n".join(item["text"] for item in pages_text).strip()
    return page_count, pages_text, full_text, warnings


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        if not is_authorized(self.headers):
            self._send_json(401, {
                "success": False,
                "message": "Não autorizado.",
                "pages": 0,
                "warnings": [],
            })
            return

        try:
            content_length = int(self.headers.get("Content-Length", 0))
        except ValueError:
            content_length = 0

        if content_length <= 0:
            self._send_json(400, {
                "success": False,
                "message": "Nenhum arquivo recebido.",
                "pages": 0,
                "warnings": [],
            })
            return

        if content_length > MAX_PDF_SIZE_BYTES:
            self._send_json(400, {
                "success": False,
                "message": "O arquivo ultrapassa o limite de 4 MB.",
                "pages": 0,
                "warnings": [],
            })
            return

        body = self.rfile.read(content_length)
        pdf_bytes = get_pdf_bytes(self.headers, body)

        if not pdf_bytes:
            self._send_json(400, {
                "success": False,
                "message": "Envie um PDF no campo multipart file.",
                "pages": 0,
                "warnings": [],
            })
            return

        if len(pdf_bytes) > MAX_PDF_SIZE_BYTES:
            self._send_json(400, {
                "success": False,
                "message": "O arquivo ultrapassa o limite de 4 MB.",
                "pages": 0,
                "warnings": [],
            })
            return

        try:
            page_count, pages_text, full_text, warnings = extract_pdf_text(pdf_bytes)
        except (PdfReadError, ValueError):
            self._send_json(400, {
                "success": False,
                "message": "Não foi possível processar o arquivo agora.",
                "pages": 0,
                "warnings": ["Arquivo não reconhecido como PDF válido."],
            })
            return
        except Exception:
            self._send_json(500, {
                "success": False,
                "message": "Não foi possível processar o arquivo agora.",
                "pages": 0,
                "warnings": [],
            })
            return

        if len(full_text) < MIN_TEXT_LENGTH:
            self._send_json(200, {
                "success": False,
                "message": (
                    "Não foi possível extrair texto suficiente do PDF. "
                    "O arquivo pode estar escaneado como imagem."
                ),
                "pages": page_count,
                "warnings": warnings + ["OCR não está disponível nesta versão."],
            })
            return

        self._send_json(200, {
            "success": True,
            "pages": page_count,
            "text": full_text,
            "pagesText": pages_text,
            "candidateFields": extract_candidate_fields(full_text),
            "rubricas": [
                {"linha": line} for line in extract_rubric_lines(full_text)
            ],
            "warnings": warnings,
        })

    def _send_json(self, status, payload):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def build_extraction_response(pdf_bytes):
    try:
        page_count, pages_text, full_text, warnings = extract_pdf_text(pdf_bytes)
    except (PdfReadError, ValueError):
        return {
            "success": False,
            "message": "Não foi possível processar o arquivo agora.",
            "pages": 0,
            "warnings": ["Arquivo não reconhecido como PDF válido."],
        }
    except Exception:
        return {
            "success": False,
            "message": "Não foi possível processar o arquivo agora.",
            "pages": 0,
            "warnings": [],
        }

    if len(full_text) < MIN_TEXT_LENGTH:
        return {
            "success": False,
            "message": (
                "Não foi possível extrair texto suficiente do PDF. "
                "O arquivo pode estar escaneado como imagem."
            ),
            "pages": page_count,
            "warnings": warnings + ["OCR não está disponível nesta versão."],
        }

    return {
        "success": True,
        "pages": page_count,
        "text": full_text,
        "pagesText": pages_text,
        "candidateFields": extract_candidate_fields(full_text),
        "rubricas": [
            {"linha": line} for line in extract_rubric_lines(full_text)
        ],
        "warnings": warnings,
    }


if __name__ == "__main__":
    if "--stdin" not in sys.argv:
        print(json.dumps({
            "success": False,
            "message": "Modo CLI inválido.",
            "pages": 0,
            "warnings": [],
        }, ensure_ascii=False))
        sys.exit(1)

    pdf_content = sys.stdin.buffer.read()
    response = build_extraction_response(pdf_content)
    print(json.dumps(response, ensure_ascii=False))
    sys.exit(0)
