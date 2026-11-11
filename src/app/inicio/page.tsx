import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { LogoutButton } from "@/components/ui/LogoutButton";
import { getDashboardPathByRole, requireRole } from "@/lib/auth";
import type { Role } from "@/generated/prisma/client";
import { getBrazilDateParts } from "@/lib/dates";
import { formatBRL } from "@/lib/money";
import {
  getAdminForecastPanel,
  getConsultantForecast,
  getManagerForecastSummary,
  getRegionalForecastSummary,
} from "@/services/forecast.service";
import { getConsultantPendingVisitNotice } from "@/services/visit.service";

export default async function InicioPage() {
  const user = await requireRole([
    "ADMIN",
    "CONSULTANT",
    "MANAGER",
    "REGIONAL_MANAGER",
  ]);

  if (!user.role) {
    return null;
  }

  const previsaoHref = getDashboardPathByRole(user.role);
  const [visitNotice, forecast] = await Promise.all([
    user.role === "CONSULTANT"
      ? getConsultantPendingVisitNotice(user.id)
      : Promise.resolve(null),
    getHomeForecast(user.role, user.id),
  ]);
  const greeting = getTimeGreeting(getBrazilDateParts().hour);

  return (
    <main className="min-h-dvh bg-slate-50 px-5 py-6 text-slate-950 sm:py-10">
      <div className="mx-auto max-w-3xl space-y-8">
        <header className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-500">ComercialPro</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
              Olá, {user.fullName.split(" ")[0]}! {greeting}!
            </h1>
          </div>
          <LogoutButton />
        </header>

        <Card variant="highlight" className="flex items-center justify-between gap-4 py-5">
          <div>
            <p className="text-sm font-medium text-blue-900">{forecast.label}</p>
            {forecast.note ? (
              <p className="mt-1 text-xs text-slate-600">{forecast.note}</p>
            ) : null}
          </div>
          <p className="text-right text-2xl font-bold tracking-tight text-blue-950 sm:text-3xl">
            {formatBRL(forecast.amount)}
          </p>
        </Card>

        {visitNotice ? (
          <Link href="/diario-visita/registrar" className="block">
            <Card
              variant="highlight"
              className="flex items-center justify-between gap-3 py-4"
            >
              <span className="font-semibold text-blue-950">
                Visitas pendentes
              </span>
              <span className="flex items-center gap-2 text-sm font-semibold text-blue-900">
                <Badge variant="warning">{visitNotice.total}</Badge>
                Ver <span aria-hidden="true">→</span>
              </span>
            </Card>
          </Link>
        ) : null}

        <section
          aria-label="Menu principal"
          className="grid grid-cols-2 gap-3 sm:gap-4"
        >
          <MenuCard href={previsaoHref} title="Previsão" icon="forecast" />
          <MenuCard
            href="/verificador-margem"
            title="Verificador de Margem"
            icon="margin"
          />
          <MenuCard
            href="/diario-visita"
            title="Diário de visita"
            icon="visits"
            badge={visitNotice?.total}
          />
          <MenuCard
            href="/operacao-perdida"
            title="Operação perdida"
            icon="lost"
          />
        </section>
      </div>
    </main>
  );
}

async function getHomeForecast(role: Role, userId: string) {
  switch (role) {
    case "CONSULTANT": {
      const forecast = await getConsultantForecast(userId);
      return {
        label: "Sua previsão hoje",
        amount: forecast.totalValue,
        note: forecast.submittedAt ? null : "Previsão ainda não enviada",
      };
    }
    case "MANAGER": {
      const forecast = await getManagerForecastSummary(userId);
      return {
        label: "Previsão da equipe hoje",
        amount: forecast.paymentForecastTotal,
        note: null,
      };
    }
    case "REGIONAL_MANAGER": {
      const forecast = await getRegionalForecastSummary({ regionalId: userId });
      return { label: "Previsão total hoje", amount: forecast.total, note: null };
    }
    case "ADMIN": {
      const forecast = await getAdminForecastPanel();
      return { label: "Previsão total hoje", amount: forecast.total, note: null };
    }
  }
}

function getTimeGreeting(hour: number): string {
  if (hour >= 5 && hour < 12) {
    return "Bom dia";
  }

  if (hour >= 12 && hour < 18) {
    return "Boa tarde";
  }

  return "Boa noite";
}

function MenuCard({
  href,
  title,
  icon,
  badge,
}: {
  href: string;
  title: string;
  icon: "forecast" | "margin" | "visits" | "lost";
  badge?: number;
}) {
  return (
    <Link
      href={href}
      className="group block rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-900"
    >
      <Card className="flex h-full min-h-32 flex-col justify-between gap-5 p-4 transition hover:border-blue-300 hover:bg-blue-50 sm:min-h-36 sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-900 group-hover:bg-white">
            <MenuIcon name={icon} />
          </span>
          {badge ? <Badge variant="warning">{badge}</Badge> : null}
        </div>
        <div className="flex items-end justify-between gap-2">
          <h2 className="text-base font-bold leading-snug sm:text-lg">
            {title}
          </h2>
          <span
            className="shrink-0 text-lg text-blue-900 transition-transform group-hover:translate-x-1"
            aria-hidden="true"
          >
            →
          </span>
        </div>
      </Card>
    </Link>
  );
}

function MenuIcon({ name }: { name: "forecast" | "margin" | "visits" | "lost" }) {
  const paths = {
    forecast: (
      <>
        <path d="M4 19V5" />
        <path d="M4 19h16" />
        <path d="m7 14 4-4 3 2 5-6" />
      </>
    ),
    margin: (
      <>
        <path d="M12 3v18" />
        <path d="M17 7.5c0-1.4-1.8-2.5-4.5-2.5S8 6.1 8 7.5 9.8 10 12.5 10 17 11.1 17 12.5 15.2 15 12.5 15 8 13.9 8 12.5" />
        <path d="M17 16.5c0 1.4-1.8 2.5-4.5 2.5S8 17.9 8 16.5" />
      </>
    ),
    visits: (
      <>
        <rect x="4" y="5" width="16" height="16" rx="2" />
        <path d="M8 3v4M16 3v4M4 10h16M8 14h3M8 17h6" />
      </>
    ),
    lost: (
      <>
        <path d="M12 3 3.5 7.5v9L12 21l8.5-4.5v-9L12 3Z" />
        <path d="m8.5 9 7 7m0-7-7 7" />
      </>
    ),
  };

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
