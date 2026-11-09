// Formato enviado pelo navegador ao criar uma PushSubscription
// (PushSubscription.toJSON()).
export type PushSubscriptionPayload = {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
};

export type PushNotificationPayload = {
  title: string;
  body: string;
  url: string;
};
