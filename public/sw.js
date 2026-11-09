// Service Worker do ComercialPro dedicado a Web Push.
//
// Escopo restrito: apenas recebe notificacoes push e trata o clique nelas.
// Nao implementa cache/offline — isso fica fora do escopo desta tarefa.

const DEFAULT_TITLE = "ComercialPro";
const DEFAULT_ICON = "/icons/icon-192.png";
const DEFAULT_URL = "/";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};

  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data = { body: event.data.text() };
    }
  }

  const title = data.title || DEFAULT_TITLE;
  const url = data.url || DEFAULT_URL;

  const options = {
    body: data.body || "",
    icon: DEFAULT_ICON,
    badge: DEFAULT_ICON,
    data: { url },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = (event.notification.data && event.notification.data.url) || DEFAULT_URL;
  const targetAbsoluteUrl = new URL(targetUrl, self.location.origin).href;

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      const existingClient = allClients.find(
        (client) => new URL(client.url).origin === self.location.origin,
      );

      if (existingClient) {
        await existingClient.focus();

        if ("navigate" in existingClient) {
          try {
            await existingClient.navigate(targetAbsoluteUrl);
          } catch {
            // Se a navegacao falhar (ex.: navegador nao suporta), a janela
            // ja foi focada e o usuario consegue navegar manualmente.
          }
        }

        return;
      }

      if (self.clients.openWindow) {
        await self.clients.openWindow(targetAbsoluteUrl);
      }
    })(),
  );
});
