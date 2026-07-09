"""Vercel Python Function - extracao de texto de PDF para o modulo
Verificador de Margem (ComercialPro).

Responsabilidade unica desta funcao: receber os bytes de um PDF, extrair o
texto selecionavel pagina a pagina e devolver esse texto (mais alguns campos
"candidatos" identificados no rodape, sem qualquer calculo) para o backend
Next.js. Nao calcula margem, nao decide aprovado/negado, nao salva o arquivo
em nenhum lugar.

Protegida por um segredo compartilhado (MARGIN_EXTRACT_SECRET) enviado pelo
Next.js via header Authorization. Chamadas sem o segredo correto sao
rejeitadas, ja que esta funcao fica publicamente acessivel na Vercel.
"""

import io
import json
import os
import re
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
    "liquido": re.compile(r"^L[íi]quido\b", re.IGNORECASE),
    "margemPdf": re.compile(r"^Margem\b", re.IGNORECASE),
}


def extract_candidate_fields(text):
    """Procura, de forma simples e sem calcular nada, valores ao lado de
    rotulos conhecidos do rodape do contracheque (Bruto, Descontos, Liquido,
    Margem). O valor pode estar na mesma linha do rotulo ou na linha
    seguinte, dependendo de como o PDF organiza as colunas. Retorna apenas o
    texto encontrado, como candidato — nunca interpreta ou soma nada."""
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
    """Identifica linhas que comecam com um codigo de rubrica de 5 digitos,
    padrao observado no modelo de referencia do contracheque. Retorna apenas
    as linhas cruas, sem interpretar ou somar valores."""
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

        pdf_bytes = self.rfile.read(content_length)

        try:
            reader = PdfReader(io.BytesIO(pdf_bytes))
            page_count = len(reader.pages)
        except (PdfReadError, ValueError):
            self._send_json(400, {
                "success": False,
                "message": "Não foi possível processar o arquivo agora.",
                "pages": 0,
                "warnings": ["Arquivo não reconhecido como PDF válido."],
            })
            return
        except Exception:
            self._send_json(400, {
                "success": False,
                "message": "Não foi possível processar o arquivo agora.",
                "pages": 0,
                "warnings": [],
            })
            return

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
