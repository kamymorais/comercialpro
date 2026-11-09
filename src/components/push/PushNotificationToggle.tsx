"use client";

import { useEffect, useState } from "react";
import {
  isPushSupported,
  registerServiceWorker,
  subscribeToPush,
} from "@/lib/push-client";

type ToggleState =
  | "checking"
  | "unsupported"
  | "denied"
  | "off"
  | "loading"
  | "on"
  | "error";

const buttonClassName =
  "inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60";

// Ativação discreta de notificações push para o CONSULTANT lembrar de
// preencher a previsão diária. Não bloqueia a tela em navegadores/
// plataformas sem suporte — nesse caso o componente não renderiza nada.
export function PushNotificationToggle() {
  const [state, setState] = useState<ToggleState>("checking");

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!isPushSupported()) {
        if (!cancelled) setState("unsupported");
        return;
      }

      if (Notification.permission === "denied") {
        if (!cancelled) setState("denied");
        return;
      }

      const registration = await registerServiceWorker();

      if (!registration) {
        if (!cancelled) setState("unsupported");
        return;
      }

      const existing = await registration.pushManager.getSubscription();

      if (!cancelled) {
        setState(existing ? "on" : "off");
      }
    }

    void init();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleActivate() {
    setState("loading");

    try {
      const permission = await Notification.requestPermission();

      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off");
        return;
      }

      const subscription = await subscribeToPush();

      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });

      if (!response.ok) {
        throw new Error("Falha ao registrar assinatura.");
      }

      setState("on");
    } catch {
      setState("error");
    }
  }

  async function handleDeactivate() {
    setState("loading");

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await fetch("/api/push/unsubscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }

      setState("off");
    } catch {
      setState("error");
    }
  }

  if (state === "checking" || state === "unsupported") {
    return null;
  }

  if (state === "denied") {
    return (
      <p className="text-xs text-slate-500">
        Notificações bloqueadas no navegador. Ative nas configurações do site
        para receber o lembrete diário.
      </p>
    );
  }

  if (state === "on") {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-emerald-700">
          ✓ Notificações ativadas
        </span>
        <button
          type="button"
          onClick={handleDeactivate}
          className="text-xs font-medium text-slate-500 underline-offset-2 hover:text-slate-700 hover:underline"
        >
          Desativar
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleActivate}
        disabled={state === "loading"}
        className={buttonClassName}
      >
        {state === "loading" ? "Ativando..." : "🔔 Ativar notificações"}
      </button>
      {state === "error" ? (
        <span className="text-xs text-red-600">
          Não foi possível ativar agora.
        </span>
      ) : null}
    </div>
  );
}
