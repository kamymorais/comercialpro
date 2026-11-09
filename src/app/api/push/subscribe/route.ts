import { NextResponse } from "next/server";
import { getCurrentUserFromSession } from "@/lib/auth";
import { savePushSubscription } from "@/services/push.service";
import type { PushSubscriptionPayload } from "@/types/push";

function isValidSubscriptionPayload(
  value: unknown,
): value is PushSubscriptionPayload {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  if (typeof candidate.endpoint !== "string" || candidate.endpoint.trim().length === 0) {
    return false;
  }

  if (typeof candidate.keys !== "object" || candidate.keys === null) {
    return false;
  }

  const keys = candidate.keys as Record<string, unknown>;

  return (
    typeof keys.p256dh === "string" &&
    keys.p256dh.trim().length > 0 &&
    typeof keys.auth === "string" &&
    keys.auth.trim().length > 0
  );
}

// Somente o CONSULTANT usa o lembrete diario de previsao — restringir o
// cadastro a esse papel mantem o escopo minimo desta funcionalidade.
export async function POST(request: Request) {
  const user = await getCurrentUserFromSession();

  if (!user || user.status !== "APPROVED" || !user.role) {
    return NextResponse.json({ error: "Sessão inválida. Faça login novamente." }, { status: 401 });
  }

  if (user.role !== "CONSULTANT") {
    return NextResponse.json({ error: "Você não tem permissão para usar este recurso." }, { status: 403 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corpo da requisição inválido." }, { status: 400 });
  }

  if (!isValidSubscriptionPayload(body)) {
    return NextResponse.json({ error: "Assinatura inválida." }, { status: 400 });
  }

  await savePushSubscription({ userId: user.id, subscription: body });

  return NextResponse.json({ success: true });
}
