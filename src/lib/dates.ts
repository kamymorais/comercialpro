import { APP_TIMEZONE, DAILY_RESET_HOUR } from "@/lib/constants";

type BrazilDateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

const brazilDateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: APP_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

export function getBrazilNow(): Date {
  return new Date();
}

export function getBrazilDateParts(date = new Date()): BrazilDateParts {
  const parts = brazilDateFormatter.formatToParts(date);
  const valueByType = new Map(parts.map((part) => [part.type, part.value]));

  return {
    year: Number(valueByType.get("year")),
    month: Number(valueByType.get("month")),
    day: Number(valueByType.get("day")),
    hour: Number(valueByType.get("hour")),
    minute: Number(valueByType.get("minute")),
    second: Number(valueByType.get("second")),
  };
}

/**
 * Retorna a data do ciclo operacional: antes das 19h em Sao Paulo usa o dia atual;
 * a partir das 19h usa o dia seguinte, normalizado em meia-noite UTC para o Prisma.
 */
export function getOperationalDate(date = new Date()): Date {
  const parts = getBrazilDateParts(date);
  const dayOffset = parts.hour >= DAILY_RESET_HOUR ? 1 : 0;

  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day + dayOffset));
}

export function formatDateBR(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function isAfterDailyResetHour(date = new Date()): boolean {
  return getBrazilDateParts(date).hour >= DAILY_RESET_HOUR;
}
