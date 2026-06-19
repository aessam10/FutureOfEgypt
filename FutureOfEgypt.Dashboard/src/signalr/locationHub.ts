import * as signalR from '@microsoft/signalr';
import { getAccessToken } from '../auth/tokenStorage';
import type { LocationReceivedEvent } from '../types/tracking';

const baseURL = import.meta.env.VITE_API_BASE_URL as string;

export function createLocationHubConnection(
  onLocationReceived: (location: LocationReceivedEvent) => void,
) {
  const connection = new signalR.HubConnectionBuilder()
    .withUrl(`${baseURL}/hubs/locations`, {
      accessTokenFactory: () => getAccessToken() ?? '',
    })
    .withAutomaticReconnect()
    .build();

  connection.on('locationReceived', onLocationReceived);

  return connection;
}