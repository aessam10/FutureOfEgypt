import * as signalR from '@microsoft/signalr';

const apiBaseURL = import.meta.env.VITE_API_BASE_URL as string;
const hubBaseURL = apiBaseURL.replace(/\/api\/?$/, '');
const NOTIFICATIONS_HUB_URL = `${hubBaseURL}/hubs/notifications`;

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  createdAtUtc: string;
}

export function createNotificationHubConnection(
  onNotificationReceived: (notification: AppNotification) => void,
  getToken: () => string | null
): signalR.HubConnection {
  const connection = new signalR.HubConnectionBuilder()
    .withUrl(NOTIFICATIONS_HUB_URL, {
      accessTokenFactory: () => getToken() ?? '',
      withCredentials: true,
    })
    .withAutomaticReconnect([0, 2000, 10000, 30000]) // Retry immediately, 2s, 10s, 30s
    .configureLogging(signalR.LogLevel.Information)
    .build();

  connection.on('ReceiveNotification', (notification: AppNotification) => {
    onNotificationReceived(notification);
  });

  return connection;
}
