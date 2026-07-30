import type { MarginRubricEntryType, MarginRubricLine } from "@/types/margin";

// Fallback puro em TypeScript, usado apenas quando a Python Function devolve
// `rubricas: []` para um contracheque SIAPE mesmo havendo texto extraído
// (ex.: resposta antiga em cache, ou layout que escapou do parser Python).
// Repete as mesmas heurísticas tolerantes do parser Python em
// api/margin_extract.py: código de 3 a 10 dígitos, separador por espaço ou
// hífen, descrição/valor podendo continuar por até duas linhas seguintes, e
// valores com sinal antes ou depois do número.

const SIAPE_CODE_LINE_PATTERN = /^(\d{3,10})[\s-]+(.+)$/;
const MONEY_TOKEN_PATTERN = /-?\d{1,3}(?:\.\d{3})*,\d{2}-?/g;

const TOTAL_LABEL_KEYWORDS = [
  "total de rendimentos",
  "rendimentos",
  "remuneracao",
  "bruto",
  "total de descontos",
  "descontos",
  "valor liquido",
  "liquido",
  "margem",
];

const DISCOUNT_KEYWORDS_PATTERN =
  /\b(desconto|emprestimo|consignad\w*|irrf|imposto|previd\w*|pss|rpps|inss|pensao|plano|seguro|sindicato|cartao|rmc|rcc)\b/;

function normalizeLabel(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function isTotalLabelLine(line: string): boolean {
  const normalized = normalizeLabel(line);
  return TOTAL_LABEL_KEYWORDS.some((keyword) => normalized.startsWith(keyword));
}

function normalizeMoneyToken(token: string): string {
  const isNegative = token.startsWith("-") || token.endsWith("-");
  const cleaned = token.replace(/-/g, "");
  return isNegative ? `-${cleaned}` : cleaned;
}

function moneyTokenToNumber(token: string): number | null {
  const cleaned = token.replace(/-/g, "").replaceAll(".", "").replace(",", ".");
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

function isZeroMoney(token: string): boolean {
  const value = moneyTokenToNumber(token);
  return value !== null && value === 0;
}

function inferEntryType(
  text: string,
  valueToken: string | null,
): MarginRubricEntryType {
  if (valueToken?.startsWith("-")) {
    return "DISCOUNT";
  }

  if (DISCOUNT_KEYWORDS_PATTERN.test(normalizeLabel(text))) {
    return "DISCOUNT";
  }

  if (valueToken) {
    return "EARNING";
  }

  return "UNKNOWN";
}

function parseRemainder(
  remainder: string,
  moneyTokens: string[],
): { value: string | null; entryType: MarginRubricEntryType; description: string } {
  const normalizedTokens = moneyTokens.map(normalizeMoneyToken);
  const description = remainder
    .replace(MONEY_TOKEN_PATTERN, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (normalizedTokens.length === 0) {
    return { value: null, entryType: "UNKNOWN", description };
  }

  if (normalizedTokens.length === 1) {
    const value = normalizedTokens[0];
    return { value, entryType: inferEntryType(remainder, value), description };
  }

  // Duas colunas na mesma linha (provento e desconto lado a lado): assume a
  // convenção "primeira coluna = provento, última = desconto" e usa a coluna
  // não-zero. Em caso de ambíguidade, desempata por palavra-chave.
  const earningToken = normalizedTokens[0];
  const discountToken = normalizedTokens[normalizedTokens.length - 1];
  const earningIsZero = isZeroMoney(earningToken);
  const discountIsZero = isZeroMoney(discountToken);

  if (!earningIsZero && discountIsZero) {
    return { value: earningToken, entryType: "EARNING", description };
  }

  if (earningIsZero && !discountIsZero) {
    return { value: discountToken, entryType: "DISCOUNT", description };
  }

  if (inferEntryType(remainder, discountToken) === "DISCOUNT") {
    return { value: discountToken, entryType: "DISCOUNT", description };
  }

  return { value: earningToken, entryType: "EARNING", description };
}

export function extractSiapeRubricsFromText(text: string): MarginRubricLine[] {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const rubrics: MarginRubricLine[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const codeMatch = SIAPE_CODE_LINE_PATTERN.exec(line);

    if (!codeMatch) {
      index += 1;
      continue;
    }

    const code = codeMatch[1];
    let remainder = codeMatch[2].trim();
    let combinedLine = line;
    let moneyTokens = remainder.match(MONEY_TOKEN_PATTERN) ?? [];
    let lookahead = 0;

    while (moneyTokens.length === 0 && lookahead < 2 && index + 1 + lookahead < lines.length) {
      const nextLine = lines[index + 1 + lookahead];

      if (SIAPE_CODE_LINE_PATTERN.test(nextLine) || isTotalLabelLine(nextLine)) {
        break;
      }

      remainder = `${remainder} ${nextLine}`.trim();
      combinedLine = `${combinedLine} ${nextLine}`;
      moneyTokens = remainder.match(MONEY_TOKEN_PATTERN) ?? [];
      lookahead += 1;
    }

    const parsed = parseRemainder(remainder, moneyTokens);

    rubrics.push({
      linha: combinedLine,
      codigo: code,
      descricao: parsed.description || remainder || line,
      valor: parsed.value ?? undefined,
      tipoLancamento: parsed.entryType,
      secaoOrigem: "rubricas",
    });

    index += 1 + lookahead;
  }

  return rubrics;
}
