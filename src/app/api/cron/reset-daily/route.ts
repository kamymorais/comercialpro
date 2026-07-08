import { NextResponse } from "next/server";
import { runDailyReset } from "@/services/reset.service";

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

  const result = await runDailyReset({ triggeredBy: "cron" });

  return NextResponse.json(result);
}
