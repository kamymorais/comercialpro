import { NextResponse } from "next/server";
import { getCurrentUserFromSession } from "@/lib/auth";
import { deletePushSubscription } from "@/services/push.service";

export async function DELETE(request: Request) {
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

  const endpoint =
    typeof body === "object" && body !== null && "endpoint" in body
      ? (body as { endpoint: unknown }).endpoint
      : undefined;

  if (typeof endpoint !== "string" || endpoint.trim().length === 0) {
    return NextResponse.json({ error: "Endpoint inválido." }, { status: 400 });
  }

  // deletePushSubscription so remove se o endpoint pertencer ao usuario
  // autenticado, entao nao ha risco de apagar assinatura de outra pessoa.
  await deletePushSubscription({ userId: user.id, endpoint });

  return NextResponse.json({ success: true });
}
