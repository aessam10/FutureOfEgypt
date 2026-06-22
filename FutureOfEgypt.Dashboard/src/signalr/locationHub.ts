import * as signalR from '@microsoft/signalr';
import { getAccessToken } from '../auth/tokenStorage';
import type { LocationReceivedEvent } from '../types/tracking';

const baseURL = import.meta.env.VITE_API_BASE_URL as string;

export function createLocationHubConnection(
  onLocationReceived: (location: LocationReceivedEvent) => void,
  onLocationHidden?: (devicePublicId: string) => void,
  onLocationUnhidden?: (devicePublicId: string) => void,
) {
  const connection = new signalR.HubConnectionBuilder()
    .withUrl(`${baseURL}/hubs/locations`, {
      accessTokenFactory: () => getAccessToken() ?? '',
    })
    .withAutomaticReconnect()
    .build();

  connection.on('locationReceived', onLocationReceived);
  if (onLocationHidden) {
    connection.on('locationHidden', onLocationHidden);
  }
  if (onLocationUnhidden) {
    connection.on('locationUnhidden', onLocationUnhidden);
  }

  return connection;
}