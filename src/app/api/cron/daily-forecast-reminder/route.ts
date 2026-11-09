import { NextResponse } from "next/server";
import { PushConfigError, sendDailyForecastReminder } from "@/services/push.service";

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET não configurado." },
      { status: 500 },
    );
  }

  const url = new URL(request.url);
  const authHeader = request.headers.get("authorization");
  const headerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;
  const providedToken = headerToken ?? url.searchParams.get("secret");

  if (!providedToken || providedToken !== cronSecret) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  try {
    const result = await sendDailyForecastReminder();

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof PushConfigError) {
      return NextResponse.json(
        { error: "Configuração de Web Push (VAPID) ausente." },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { error: "Não foi possível enviar o lembrete diário." },
      { status: 500 },
    );
  }
}
