import webpush from "web-push";
import { getBrazilCalendarDate } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import type { PushNotificationPayload, PushSubscriptionPayload } from "@/types/push";

const DAILY_FORECAST_REMINDER: PushNotificationPayload = {
  title: "ComercialPro",
  body: "Olá, que o seu dia seja incrível!! Não se esqueça de colocar sua previsão!! ❤",
  url: "/consultor",
};

export class PushConfigError extends Error {}

let vapidConfigured = false;

function isPushConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
      process.env.VAPID_PRIVATE_KEY &&
      process.env.VAPID_SUBJECT,
  );
}

function configureWebPush(): void {
  if (vapidConfigured) {
    return;
  }

  if (!isPushConfigured()) {
    throw new PushConfigError(
      "Variáveis de ambiente do Web Push (VAPID) não configuradas.",
    );
  }

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT as string,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string,
    process.env.VAPID_PRIVATE_KEY as string,
  );

  vapidConfigured = true;
}

// Upsert por endpoint: o endpoint identifica o par dispositivo+navegador de
// forma unica, entao reenviar a mesma assinatura apenas atualiza as chaves e
// realinha o dono para o usuario logado no momento — evita duplicidade sem
// precisar de nenhuma verificacao extra no cliente.
export async function savePushSubscription(params: {
  userId: string;
  subscription: PushSubscriptionPayload;
}): Promise<void> {
  const { userId, subscription } = params;

  await prisma.pushSubscription.upsert({
    where: { endpoint: subscription.endpoint },
    create: {
      userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
    update: {
      userId,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
  });
}

// So remove a assinatura se ela pertencer ao usuario autenticado — nunca
// aceita apagar pelo endpoint sem checar o dono.
export async function deletePushSubscription(params: {
  userId: string;
  endpoint: string;
}): Promise<void> {
  await prisma.pushSubscription.deleteMany({
    where: { userId: params.userId, endpoint: params.endpoint },
  });
}

type EligibleSubscription = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

async function getDailyForecastReminderRecipients(): Promise<EligibleSubscription[]> {
  const subscriptions = await prisma.pushSubscription.findMany({
    where: {
      user: {
        status: "APPROVED",
        role: "CONSULTANT",
      },
    },
    select: { id: true, endpoint: true, p256dh: true, auth: true },
  });

  return subscriptions;
}

async function sendPushNotification(
  subscription: EligibleSubscription,
  payload: PushNotificationPayload,
): Promise<{ ok: true } | { ok: false; shouldRemove: boolean }> {
  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify(payload),
    );

    return { ok: true };
  } catch (error) {
    // 404/410 = inscricao removida ou expirada permanentemente no provedor
    // (navegador desinstalado, dados apagados, etc.). Qualquer outro status
    // (rede, 5xx do provedor, etc.) e tratado como falha transitoria e a
    // assinatura e mantida para a proxima tentativa.
    const statusCode =
      typeof error === "object" && error !== null && "statusCode" in error
        ? (error as { statusCode?: number }).statusCode
        : undefined;

    const shouldRemove = statusCode === 404 || statusCode === 410;

    return { ok: false, shouldRemove };
  }
}

export type DailyForecastReminderResult = {
  status: "SUCCESS" | "SKIPPED";
  sentDate: Date;
  recipientCount: number;
  message: string;
};

export async function sendDailyForecastReminder(): Promise<DailyForecastReminderResult> {
  const sentDate = getBrazilCalendarDate();

  const existing = await prisma.pushReminderLog.findUnique({
    where: { sentDate },
    select: { status: true },
  });

  if (existing?.status === "SUCCESS") {
    return {
      status: "SKIPPED",
      sentDate,
      recipientCount: 0,
      message: "Lembrete já foi enviado para esta data.",
    };
  }

  configureWebPush();

  const recipients = await getDailyForecastReminderRecipients();

  const results = await Promise.allSettled(
    recipients.map((subscription) =>
      sendPushNotification(subscription, DAILY_FORECAST_REMINDER),
    ),
  );

  const invalidSubscriptionIds: string[] = [];
  let sentCount = 0;

  results.forEach((result, index) => {
    if (result.status === "fulfilled" && result.value.ok) {
      sentCount += 1;
      return;
    }

    if (result.status === "fulfilled" && !result.value.ok && result.value.shouldRemove) {
      invalidSubscriptionIds.push(recipients[index].id);
    }
  });

  if (invalidSubscriptionIds.length > 0) {
    await prisma.pushSubscription.deleteMany({
      where: { id: { in: invalidSubscriptionIds } },
    });
  }

  const message = `Lembrete enviado para ${sentCount} de ${recipients.length} inscrição(ões). ${invalidSubscriptionIds.length} inscrição(ões) inválida(s) removida(s).`;

  await prisma.pushReminderLog.upsert({
    where: { sentDate },
    create: { sentDate, status: "SUCCESS", recipientCount: sentCount, message },
    update: { status: "SUCCESS", recipientCount: sentCount, message, executedAt: new Date() },
    select: { id: true },
  });

  return { status: "SUCCESS", sentDate, recipientCount: sentCount, message };
}
