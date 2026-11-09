"""Vercel Python Function - extração de texto de PDF para o módulo
Verificador de Margem (ComercialPro).

Responsabilidade única desta função: receber um PDF no campo multipart
``file``, extrair o texto selecionável página a página e devolver esse texto
para o backend Next.js. Não calcula margem, não decide aprovado/negado, não
salva o arquivo em nenhum lugar.

O campo multipart ``agreement`` (MPDFT ou SIAPE) seleciona qual parser de
rubricas é usado. Ausente ou inválido, mantém o comportamento MPDFT por
compatibilidade.

Protegida por um segredo compartilhado (MARGIN_EXTRACT_SECRET) enviado pelo
Next.js via header Authorization.
"""

import io
import json
import os
import re
import sys
import unicodedata
from email import policy
from email.parser import BytesParser
from http.server import BaseHTTPRequestHandler

from pypdf import PdfReader
from pypdf.errors import PdfReadError

MAX_PDF_SIZE_BYTES = 4 * 1024 * 1024
MIN_TEXT_LENGTH = 20
MAX_RUBRIC_LINES = 40

VALID_AGREEMENTS = {"MPDFT", "SIAPE"}

# Aceita "1.234,56", "123,45", "-123,45" e "123,45-" (sinal antes ou depois).
MONEY_PATTERN = re.compile(r"-?\d{1,3}(?:\.\d{3})*,\d{2}-?")

# Parser MPDFT original: só reconhece código de exatamente 5 dígitos no
# início da linha. Mantido sem alterações para preservar o fluxo MPDFT.
RUBRIC_LINE_PATTERN = re.compile(r"^\d{5}\s")

# Parser SIAPE: código com 3 a 10 dígitos, separado por espaço e/ou hífen.
SIAPE_CODE_LINE_PATTERN = re.compile(r"^(\d{3,10})[\s\-]+(.+)$")

DISCOUNT_KEYWORDS = re.compile(
    r"\b(desconto|emprestimo|consignado|irrf|imposto|previd|pss|rpps|inss|pensao|plano|seguro|sindicato|cartao|rmc|rcc)\b",
    re.IGNORECASE,
)


def strip_accents(text):
    return "".join(
        char
        for char in unicodedata.normalize("NFKD", text)
        if not unicodedata.combining(char)
    )


def normalize_label(text):
    return re.sub(r"\s+", " ", strip_accents(text).lower()).strip()


# Rótulos de totais de conferência (rendimentos/descontos/líquido/margem).
# Comparados por prefixo após normalizar acentuação, caixa e espaços, para
# reconhecer variações como "Total de Rendimentos", "Remuneração",
# "Total de Descontos" e "Valor Líquido" além dos rótulos originais do MPDFT.
CANDIDATE_FIELD_LABEL_KEYWORDS = {
    "bruto": ("total de rendimentos", "rendimentos", "remuneracao", "bruto"),
    "descontos": ("total de descontos", "descontos"),
    "liquido": ("valor liquido", "liquido"),
    "margemPdf": ("margem",),
}

ALL_LABEL_KEYWORDS = [
    keyword
    for keywords in CANDIDATE_FIELD_LABEL_KEYWORDS.values()
    for keyword in keywords
]


def is_total_label_line(line):
    normalized = normalize_label(line)
    return any(normalized.startswith(keyword) for keyword in ALL_LABEL_KEYWORDS)


def extract_candidate_fields(text):
    """Procura valores próximos de rótulos conhecidos, sem calcular nada."""
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    candidates = {}

    for index, line in enumerate(lines):
        normalized_line = normalize_label(line)

        for key, keywords in CANDIDATE_FIELD_LABEL_KEYWORDS.items():
            if key in candidates:
                continue
            if not any(normalized_line.startswith(keyword) for keyword in keywords):
                continue

            value_match = MONEY_PATTERN.search(line)
            if not value_match and index + 1 < len(lines):
                value_match = MONEY_PATTERN.search(lines[index + 1])

            if value_match:
                candidates[key] = value_match.group(0)

    return candidates


# --- Parser MPDFT (inalterado) -------------------------------------------


def infer_rubric_entry_type(line, amount_text):
    if amount_text and amount_text.startswith("-"):
        return "DISCOUNT"

    if DISCOUNT_KEYWORDS.search(line):
        return "DISCOUNT"

    if amount_text:
        return "EARNING"

    return "UNKNOWN"


def parse_rubric_line(line):
    code_match = re.match(r"^(\d{5})\s+(.*)$", line)
    code = code_match.group(1) if code_match else None
    remainder = code_match.group(2) if code_match else line
    money_matches = MONEY_PATTERN.findall(line)
    amount_text = money_matches[-1] if money_matches else None
    description = remainder

    for amount in money_matches:
        description = description.replace(amount, " ")

    description = re.sub(r"\s+", " ", description).strip()

    return {
        "linha": line,
        "codigo": code,
        "descricao": description or line,
        "valor": amount_text,
        "tipoLancamento": infer_rubric_entry_type(line, amount_text),
        "secaoOrigem": "rubricas",
    }


def extract_rubric_lines(text, limit=MAX_RUBRIC_LINES):
    """Identifica linhas que começam com código de rubrica de 5 dígitos."""
    lines = []
    for raw_line in text.splitlines():
        line = raw_line.strip()
        if RUBRIC_LINE_PATTERN.match(line):
            lines.append(parse_rubric_line(line))
        if len(lines) >= limit:
            break

    return lines


# --- Parser SIAPE ----------------------------------------------------------
#
# Contracheques SIAPE variam bastante no layout: código com 3 a 10 dígitos,
# separado por espaço ou hífen, descrição e valor às vezes quebrados em
# linhas consecutivas, e tabelas com colunas separadas de provento/desconto.
# Este parser é deliberadamente tolerante e documenta as heurísticas usadas
# em vez de assumir um layout único e não verificado.


def normalize_money_token(token):
    is_negative = token.startswith("-") or token.endswith("-")
    cleaned = token.replace("-", "")
    return "-" + cleaned if is_negative else cleaned


def money_token_to_float(token):
    cleaned = token.replace("-", "").replace(".", "").replace(",", ".")
    try:
        return float(cleaned)
    except ValueError:
        return None


def is_zero_money(token):
    value = money_token_to_float(token)
    return value is not None and value == 0.0


def infer_siape_entry_type(text, value_token):
    if value_token and value_token.startswith("-"):
        return "DISCOUNT"

    if DISCOUNT_KEYWORDS.search(text):
        return "DISCOUNT"

    if value_token:
        return "EARNING"

    return "UNKNOWN"


def parse_siape_remainder(remainder, money_tokens):
    normalized_tokens = [normalize_money_token(token) for token in money_tokens]
    # Usa o regex para remover os valores em uma única passada: substituir
    # token a token com str.replace corrompe a descrição quando um valor é
    # substring de outro (ex.: "0,00" dentro de "200,00").
    description = re.sub(r"\s+", " ", MONEY_PATTERN.sub(" ", remainder)).strip()

    if not normalized_tokens:
        return None, "UNKNOWN", description

    if len(normalized_tokens) == 1:
        value = normalized_tokens[0]
        return value, infer_siape_entry_type(remainder, value), description

    # Duas colunas na mesma linha (ex.: provento e desconto lado a lado):
    # assume-se a convenção "primeira coluna = provento, última = desconto"
    # e usa-se a coluna não-zero. Quando ambas têm valor, o desempate usa
    # palavras-chave de desconto na descrição.
    earning_token = normalized_tokens[0]
    discount_token = normalized_tokens[-1]
    earning_is_zero = is_zero_money(earning_token)
    discount_is_zero = is_zero_money(discount_token)

    if not earning_is_zero and discount_is_zero:
        return earning_token, "EARNING", description

    if earning_is_zero and not discount_is_zero:
        return discount_token, "DISCOUNT", description

    if infer_siape_entry_type(remainder, discount_token) == "DISCOUNT":
        return discount_token, "DISCOUNT", description

    return earning_token, "EARNING", description


def extract_siape_rubric_lines(pages_text, limit=MAX_RUBRIC_LINES):
    """Extrai rubricas do SIAPE por página, aceitando código de 3 a 10
    dígitos e permitindo que descrição/valor continuem em até duas linhas
    seguintes quando a linha do código não contém nenhum valor monetário."""
    rubrics = []

    for page_entry in pages_text:
        page_number = page_entry.get("page")
        lines = [
            line.strip()
            for line in page_entry.get("text", "").splitlines()
            if line.strip()
        ]
        index = 0

        while index < len(lines) and len(rubrics) < limit:
            line = lines[index]
            code_match = SIAPE_CODE_LINE_PATTERN.match(line)

            if not code_match:
                index += 1
                continue

            code = code_match.group(1)
            remainder = code_match.group(2).strip()
            combined_line = line
            money_tokens = MONEY_PATTERN.findall(remainder)
            lookahead = 0

            while (
                not money_tokens
                and lookahead < 2
                and index + 1 + lookahead < len(lines)
            ):
                next_line = lines[index + 1 + lookahead]

                if SIAPE_CODE_LINE_PATTERN.match(next_line) or is_total_label_line(
                    next_line
                ):
                    break

                remainder = "{0} {1}".format(remainder, next_line).strip()
                combined_line = "{0} {1}".format(combined_line, next_line)
                money_tokens = MONEY_PATTERN.findall(remainder)
                lookahead += 1

            value, entry_type, description = parse_siape_remainder(
                remainder, money_tokens
            )

            rubrics.append(
                {
                    "linha": combined_line,
                    "codigo": code,
                    "descricao": description or remainder or line,
                    "valor": value,
                    "tipoLancamento": entry_type,
                    "secaoOrigem": "rubricas",
                    "pagina": page_number,
                }
            )

            index += 1 + lookahead

    return rubrics


def normalize_agreement(value):
    if not value:
        return "MPDFT"

    candidate = value.strip().upper()
    return candidate if candidate in VALID_AGREEMENTS else "MPDFT"


def is_authorized(headers):
    expected_secret = os.environ.get("MARGIN_EXTRACT_SECRET")
    if not expected_secret:
        return False

    auth_header = headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return False

    provided_secret = auth_header[len("Bearer "):]
    return provided_secret == expected_secret


def parse_multipart_form(content_type, body):
    header = (
        "Content-Type: {0}\r\n"
        "MIME-Version: 1.0\r\n"
        "\r\n"
    ).format(content_type).encode("utf-8")
    message = BytesParser(policy=policy.default).parsebytes(header + body)

    if not message.is_multipart():
        return None, None

    file_bytes = None
    agreement_value = None

    for part in message.iter_parts():
        disposition = part.get_content_disposition()
        name = part.get_param("name", header="content-disposition")

        if disposition != "form-data":
            continue

        if name == "file":
            file_bytes = part.get_payload(decode=True) or b""
        elif name == "agreement":
            payload = part.get_payload(decode=True)
            if payload is not None:
                charset = part.get_content_charset() or "utf-8"
                agreement_value = payload.decode(charset, errors="replace").strip()

    return file_bytes, agreement_value


def get_pdf_bytes_and_agreement(headers, body):
    content_type = headers.get("Content-Type", "")

    if content_type.startswith("multipart/form-data"):
        return parse_multipart_form(content_type, body)

    # Compatibilidade com chamadas antigas que enviavam application/pdf bruto.
    if content_type.startswith("application/pdf"):
        return body, None

    return None, None


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


def insufficient_text_message(agreement):
    if agreement == "SIAPE":
        return (
            "Não foi possível ler os valores deste contracheque. "
            "O PDF pode estar escaneado como imagem."
        )

    return (
        "Não foi possível extrair texto suficiente do PDF. "
        "O arquivo pode estar escaneado como imagem."
    )


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
        pdf_bytes, agreement_raw = get_pdf_bytes_and_agreement(self.headers, body)
        agreement = normalize_agreement(agreement_raw)

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
                "message": insufficient_text_message(agreement),
                "pages": page_count,
                "warnings": warnings + ["OCR não está disponível nesta versão."],
            })
            return

        rubricas = (
            extract_siape_rubric_lines(pages_text)
            if agreement == "SIAPE"
            else extract_rubric_lines(full_text)
        )

        self._send_json(200, {
            "success": True,
            "pages": page_count,
            "text": full_text,
            "pagesText": pages_text,
            "candidateFields": extract_candidate_fields(full_text),
            "rubricas": rubricas,
            "warnings": warnings,
        })

    def _send_json(self, status, payload):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def build_extraction_response(pdf_bytes, agreement="MPDFT"):
    agreement = normalize_agreement(agreement)

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
            "message": insufficient_text_message(agreement),
            "pages": page_count,
            "warnings": warnings + ["OCR não está disponível nesta versão."],
        }

    rubricas = (
        extract_siape_rubric_lines(pages_text)
        if agreement == "SIAPE"
        else extract_rubric_lines(full_text)
    )

    return {
        "success": True,
        "pages": page_count,
        "text": full_text,
        "pagesText": pages_text,
        "candidateFields": extract_candidate_fields(full_text),
        "rubricas": rubricas,
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

    cli_agreement = "MPDFT"
    for arg in sys.argv:
        if arg.startswith("--agreement="):
            cli_agreement = arg.split("=", 1)[1]

    pdf_content = sys.stdin.buffer.read()
    response = build_extraction_response(pdf_content, cli_agreement)
    print(json.dumps(response, ensure_ascii=False))
    sys.exit(0)
